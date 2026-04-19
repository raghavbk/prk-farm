"use server";

import { randomBytes } from "node:crypto";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { canManageTenant } from "@/lib/platform";
import { logAction } from "@/lib/audit";
import { schemeFor } from "@/lib/platform-hosts";
import { revalidatePath } from "next/cache";

export type AdminActionResult = { error?: string; success?: string } | void;

type InviteRole = "admin" | "member";

function normaliseRole(raw: string | null | undefined): InviteRole {
  return raw === "admin" ? "admin" : "member";
}

function makeInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Delete the auth user only when no memberships, pending invites, or
// platform-admin row reference them. Best-effort: ON DELETE RESTRICT on
// tenants/groups/expenses they authored can block deletion, which is
// acceptable — zero memberships already blocks sign-in.
async function deleteAuthUserIfOrphan(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  const { count: memberCount } = await admin
    .from("tenant_members")
    .select("tenant_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((memberCount ?? 0) > 0) return;

  const { data: platform } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (platform) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.email) {
    const { count: inviteCount } = await admin
      .from("tenant_invites")
      .select("id", { count: "exact", head: true })
      .eq("email", profile.email.toLowerCase())
      .eq("status", "pending");
    if ((inviteCount ?? 0) > 0) return;
  }

  await admin.auth.admin.deleteUser(userId);
}

// Re-probes `profiles` each call because the invitee may have signed up
// between first invite and a resend, flipping the email path from
// inviteUserByEmail → signInWithOtp.
async function issuePendingInvite(params: {
  tenantId: string;
  email: string;
  role: InviteRole;
  inviterId: string;
  displayName?: string;
  existingInviteId?: string;
}): Promise<{ inviteId: string; acceptUrl: string; emailSent: boolean; emailError: string | null }> {
  const { tenantId, email, role, inviterId, displayName, existingInviteId } = params;
  const admin = createAdminClient();

  const token = makeInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  // Probe-then-upsert. Can't use ON CONFLICT because the uniqueness guarantee
  // is a partial expression index (tenant_id, lower(email)) WHERE status='pending'.
  let rowId = existingInviteId;
  if (!rowId) {
    const { data: existing } = await admin
      .from("tenant_invites")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();
    rowId = existing?.id;
  }

  const payload = { token, role, invited_by: inviterId, expires_at: expiresAt, status: "pending" as const };
  const writeRes = rowId
    ? await admin.from("tenant_invites").update(payload).eq("id", rowId).select("id").single()
    : await admin.from("tenant_invites").insert({ tenant_id: tenantId, email, ...payload }).select("id").single();
  if (writeRes.error || !writeRes.data) {
    throw new Error(writeRes.error?.message ?? "Could not save invite.");
  }
  const inviteId = writeRes.data.id;

  const { data: primary } = await admin
    .from("tenant_domains")
    .select("domain")
    .eq("tenant_id", tenantId)
    .eq("is_primary", true)
    .maybeSingle();
  const host = primary?.domain ?? (process.env.NEXT_PUBLIC_SITE_URL ?? "chukta.in").replace(/^https?:\/\//, "");
  const callbackUrl = `${schemeFor(host)}://${host}/auth/callback`;
  const callbackWithInviteUrl = `${callbackUrl}?invite_token=${encodeURIComponent(token)}`;
  const acceptUrl = `${schemeFor(host)}://${host}/auth/accept-invite?token=${token}`;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let emailSent = false;
  let emailError: string | null = null;

  if (!profile) {
    // invite_token travels via user_metadata because it's only writable at
    // account creation.
    const name = displayName?.trim() || email.split("@")[0];
    const { error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: name,
        display_name: name,
        email,
        invite_token: token,
        invited_to_tenant: tenantId,
      },
      redirectTo: callbackUrl,
    });
    if (error) emailError = error.message;
    else emailSent = true;
  } else {
    // inviteUserByEmail 422s on confirmed accounts — magic link instead.
    const anon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { error } = await anon.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: callbackWithInviteUrl },
    });
    if (error) emailError = error.message;
    else emailSent = true;
  }

  return { inviteId, acceptUrl, emailSent, emailError };
}

// Membership is never conferred silently — only when the invitee follows
// the link and /auth/callback calls acceptInviteForUser().
export async function inviteMember(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No active tenant" };

  if (!(await canManageTenant(tenantId))) {
    return { error: "Only a tenant admin can invite members." };
  }

  const rawEmail = formData.get("email") as string | null;
  const displayName = (formData.get("displayName") as string | null) ?? undefined;
  const role = normaliseRole(formData.get("role") as string | null);
  if (!rawEmail?.trim()) return { error: "Email is required" };
  const email = rawEmail.trim().toLowerCase();

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingProfile) {
    const { data: existingMember } = await admin
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();
    if (existingMember) return { error: "This user is already a member of this tenant." };
  }

  let result: Awaited<ReturnType<typeof issuePendingInvite>>;
  try {
    result = await issuePendingInvite({ tenantId, email, role, inviterId: user.id, displayName });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create invite." };
  }

  await logAction({
    tenantId,
    action: result.emailSent ? "invite.sent" : "invite.queued",
    resourceType: "tenant_invite",
    resourceId: result.inviteId,
    metadata: {
      email,
      role,
      accept_url: result.acceptUrl,
      email_sent: result.emailSent,
      email_error: result.emailError,
    },
  });

  revalidatePath("/admin");
  if (result.emailSent) {
    return { success: `Invite sent to ${email}. They'll receive an email with a link to join.` };
  }
  return {
    success: `Invite saved for ${email}, but the email didn't send${
      result.emailError ? ` (${result.emailError})` : ""
    }. Share this link with them directly: ${result.acceptUrl}`,
  };
}

export async function resendInvite(inviteId: string): Promise<AdminActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No active tenant" };

  if (!(await canManageTenant(tenantId))) {
    return { error: "Only a tenant admin can resend invites." };
  }

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("tenant_invites")
    .select("id, email, role, status, tenant_id")
    .eq("id", inviteId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!invite) return { error: "Invite not found." };
  if (invite.status === "accepted") return { error: "This invite has already been accepted." };
  if (invite.status === "revoked") return { error: "This invite was revoked. Send a new one instead." };

  // If a separate pending row already exists for the same email, refresh it
  // and retire the clicked row — flipping both to 'pending' would collide
  // with the partial unique index.
  const { data: sibling } = await admin
    .from("tenant_invites")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", invite.email)
    .eq("status", "pending")
    .neq("id", invite.id)
    .maybeSingle();

  if (sibling) {
    await admin.from("tenant_invites").update({ status: "revoked" }).eq("id", invite.id);
  }
  const targetId = sibling?.id ?? invite.id;

  let result: Awaited<ReturnType<typeof issuePendingInvite>>;
  try {
    result = await issuePendingInvite({
      tenantId,
      email: invite.email,
      role: normaliseRole(invite.role),
      inviterId: user.id,
      existingInviteId: targetId,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not resend invite." };
  }

  await logAction({
    tenantId,
    action: result.emailSent ? "invite.resent" : "invite.resend_queued",
    resourceType: "tenant_invite",
    resourceId: result.inviteId,
    metadata: {
      email: invite.email,
      role: invite.role,
      accept_url: result.acceptUrl,
      email_sent: result.emailSent,
      email_error: result.emailError,
    },
  });

  revalidatePath("/admin");
  if (result.emailSent) {
    return { success: `Invite re-sent to ${invite.email}.` };
  }
  return {
    success: `Invite refreshed, but email didn't send${
      result.emailError ? ` (${result.emailError})` : ""
    }. Share this link: ${result.acceptUrl}`,
  };
}

export async function removeMember(memberId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No active tenant" };

  if (!(await canManageTenant(tenantId))) {
    return { error: "Only a tenant admin can remove members." };
  }
  if (memberId === user.id) return { error: "You cannot remove yourself" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_members")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("user_id", memberId);
  if (error) return { error: error.message };

  await logAction({
    tenantId,
    action: "member.removed",
    resourceType: "user",
    resourceId: memberId,
  });

  await deleteAuthUserIfOrphan(admin, memberId);

  revalidatePath("/admin");
}

// Soft-delete (status flip) so the audit log keeps its FK and the partial
// unique index frees the (tenant, email) slot for a fresh invite.
export async function revokeInvite(inviteId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No active tenant" };

  if (!(await canManageTenant(tenantId))) {
    return { error: "Only a tenant admin can revoke invites." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenant_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "expired"])
    .select("id, email")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Invite not found or already accepted." };

  await logAction({
    tenantId,
    action: "invite.revoked",
    resourceType: "tenant_invite",
    resourceId: data.id,
    metadata: { email: data.email },
  });

  const { data: orphanProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", data.email.toLowerCase())
    .maybeSingle();
  if (orphanProfile?.id) {
    await deleteAuthUserIfOrphan(admin, orphanProfile.id);
  }

  revalidatePath("/admin");
}

export async function updateMemberRole(memberId: string, newRole: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No active tenant" };

  if (!(await canManageTenant(tenantId))) {
    return { error: "Only a tenant admin can change member roles." };
  }

  const role = normaliseRole(newRole);
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_members")
    .update({ role })
    .eq("tenant_id", tenantId)
    .eq("user_id", memberId);
  if (error) return { error: error.message };

  await logAction({
    tenantId,
    action: "member.role_changed",
    resourceType: "user",
    resourceId: memberId,
    metadata: { new_role: role },
  });

  revalidatePath("/admin");
}
