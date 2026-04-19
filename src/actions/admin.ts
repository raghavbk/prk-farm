"use server";

import { randomBytes } from "node:crypto";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { canManageTenant } from "@/lib/platform";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type AdminActionResult = { error?: string; success?: string } | void;

type InviteRole = "admin" | "member";

function normaliseRole(raw: string | null | undefined): InviteRole {
  return raw === "admin" ? "admin" : "member";
}

function makeInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

// Hard-delete the Supabase auth user if nothing else references them:
// no tenant memberships, no pending invites on their email, not a
// platform admin. Called after removing the last membership or revoking
// the last invite so orphan accounts don't linger in auth.users.
//
// Best-effort: if `auth.admin.deleteUser` fails (e.g., the profile is
// still referenced by tenants/groups/expenses the user created — those
// FKs are ON DELETE RESTRICT), we swallow the error. The user is
// already sign-in-blocked because they have zero memberships; keeping
// the auth row around for audit history is acceptable.
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
      .ilike("email", profile.email)
      .eq("status", "pending");
    if ((inviteCount ?? 0) > 0) return;
  }

  await admin.auth.admin.deleteUser(userId);
}

// Shared: upsert a pending tenant_invites row and send the activation email.
// Used by both the initial invite and the resend flow so the logic can't
// drift. The caller is responsible for auth + admin-role checks.
//
// Re-probes `profiles` each call: between first invite and a resend, the
// invitee may have finished sign-up (profile row exists), which flips the
// email path from inviteUserByEmail → signInWithOtp.
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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // UPSERT against the partial unique index (tenant_id, lower(email)) WHERE
  // status='pending'. Can't use onConflict because Postgres won't infer a
  // partial expression index — so probe+branch.
  let inviteId: string;
  if (existingInviteId) {
    const { data, error } = await admin
      .from("tenant_invites")
      .update({ token, role, invited_by: inviterId, expires_at: expiresAt, status: "pending" })
      .eq("id", existingInviteId)
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not refresh invite.");
    inviteId = data.id;
  } else {
    const { data: existing } = await admin
      .from("tenant_invites")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) {
      const { data, error } = await admin
        .from("tenant_invites")
        .update({ token, role, invited_by: inviterId, expires_at: expiresAt })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Could not refresh invite.");
      inviteId = data.id;
    } else {
      const { data, error } = await admin
        .from("tenant_invites")
        .insert({
          tenant_id: tenantId,
          email,
          role,
          token,
          invited_by: inviterId,
          status: "pending",
          expires_at: expiresAt,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Could not create invite.");
      inviteId = data.id;
    }
  }

  const { data: primary } = await admin
    .from("tenant_domains")
    .select("domain")
    .eq("tenant_id", tenantId)
    .eq("is_primary", true)
    .maybeSingle();
  const host = primary?.domain ?? (process.env.NEXT_PUBLIC_SITE_URL ?? "chukta.in").replace(/^https?:\/\//, "");
  const scheme = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const callbackUrl = `${scheme}://${host}/auth/callback`;
  const callbackWithInviteUrl = `${callbackUrl}?invite_token=${encodeURIComponent(token)}`;
  const acceptUrl = `${scheme}://${host}/auth/accept-invite?token=${token}`;

  // Route based on current profile state, not a cached earlier read.
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let emailSent = false;
  let emailError: string | null = null;

  if (!profile) {
    // Brand-new user — inviteUserByEmail sends the sign-up + verify email.
    // The invite_token travels via user_metadata (only writable at account
    // creation) so the callback can pick it up for existing users too.
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
    // Existing user — inviteUserByEmail would 422 on a confirmed account.
    // Magic link through the same SMTP carries the token in the callback URL.
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

// Tenant-scoped invite flow.
//
// Creates (or refreshes) a pending tenant_invites row. Membership is only
// conferred when the invitee follows the link and /auth/callback calls
// acceptInviteForUser() — never silently.
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

// Regenerate token, reset expiry, and re-send the email for an existing
// invite. Works on pending OR expired rows; refuses accepted/revoked.
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

  // Collapse to one pending row per (tenant, email). If an explicit-expired
  // row is clicked but a separate pending row already exists for the same
  // email (possible when the admin re-used the dialog before resending),
  // refresh the pending one and retire the stale row. Otherwise the flip
  // to 'pending' would collide with the partial unique index.
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

// Mark an invite as revoked. Soft-delete via status flip so the audit log
// keeps its FK, and the partial unique index frees up the (tenant, email)
// slot for a fresh invite. If the revoked invite left behind an orphan
// auth.users row (brand-new invitee who never accepted), clean that up too.
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
    .ilike("email", data.email)
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
