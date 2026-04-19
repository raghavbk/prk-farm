"use server";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { canManageTenant } from "@/lib/platform";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type AdminActionResult = { error?: string; success?: string } | void;

function normaliseRole(raw: string | null | undefined): "admin" | "member" {
  return raw === "admin" ? "admin" : "member";
}

function makeInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

// Tenant-scoped invite flow.
//
// Creates a `tenant_invites` row with a random token. The invitee must
// explicitly accept the invite at /auth/accept-invite?token=<token> before
// a `tenant_members` row exists for them — membership is never conferred
// silently, not even when the inviter knows an existing user's email.
//
// Email delivery:
//   - Brand-new user  → Supabase's inviteUserByEmail sends a sign-up link
//     that (via our /auth/callback → /auth/accept-invite flow) lands them
//     on the acceptance page with the token.
//   - Existing user   → no email goes out through the default SMTP (it
//     would confuse Supabase's inviteUserByEmail, which refuses to
//     re-invite a confirmed user). The invite sits pending; the dashboard
//     surfaces it on their next login via the "You have pending invitations"
//     banner. If/when Resend SMTP is wired up, this branch gets a real
//     email instead.
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

  const email = formData.get("email") as string;
  const displayName = formData.get("displayName") as string;
  const role = normaliseRole(formData.get("role") as string | null);
  if (!email?.trim()) return { error: "Email is required" };

  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  // If they're already a member of this tenant, short-circuit.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, display_name")
    .eq("email", normalizedEmail)
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

  // Reuse or create the pending invite row. The (tenant_id, lower(email)) unique
  // partial index makes sure a tenant can't stack multiple pending invites
  // for the same email — the conflict path just updates the token + expiry
  // so the most recent invite is the one that works.
  const token = makeInviteToken();
  const { data: invite, error: inviteErr } = await admin
    .from("tenant_invites")
    .upsert(
      {
        tenant_id: tenantId,
        email: normalizedEmail,
        role,
        token,
        invited_by: user.id,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "tenant_id,email", ignoreDuplicates: false },
    )
    .select("id, token")
    .single();
  if (inviteErr || !invite) {
    return { error: inviteErr?.message ?? "Could not create invite." };
  }

  // Primary domain → invitee lands on the tenant host after accept.
  const { data: primary } = await admin
    .from("tenant_domains")
    .select("domain")
    .eq("tenant_id", tenantId)
    .eq("is_primary", true)
    .maybeSingle();
  const host = primary?.domain ?? (process.env.NEXT_PUBLIC_SITE_URL ?? "chukta.in").replace(/^https?:\/\//, "");
  const scheme = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const acceptUrl = `${scheme}://${host}/auth/accept-invite?token=${invite.token}`;

  let emailSent = false;
  if (!existingProfile) {
    // Brand-new user — Supabase sends the sign-up email. The invite token
    // travels via user_metadata so /auth/callback can forward to accept.
    const name = displayName?.trim() || normalizedEmail.split("@")[0];
    const { error: mailErr } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        full_name: name,
        display_name: name,
        email: normalizedEmail,
        invite_token: invite.token,
        invited_to_tenant: tenantId,
      },
      // Callback hands off to /auth/accept-invite once they're signed in.
      redirectTo: acceptUrl,
    });
    if (mailErr) {
      // Clean up the invite row so the operator can retry after fixing SMTP.
      await admin.from("tenant_invites").delete().eq("id", invite.id);
      return { error: `Could not send invite email: ${mailErr.message}` };
    }
    emailSent = true;
  }

  await logAction({
    tenantId,
    action: emailSent ? "invite.sent" : "invite.queued",
    resourceType: "tenant_invite",
    resourceId: invite.id,
    metadata: { email: normalizedEmail, role, accept_url: acceptUrl, email_sent: emailSent },
  });

  revalidatePath("/admin");
  return {
    success: emailSent
      ? `Invite sent to ${normalizedEmail}. They'll receive an email with a link to join.`
      : `Invite recorded for ${normalizedEmail}. Since they already have a chukta account, they'll see the pending invite the next time they sign in. (Or share this link: ${acceptUrl})`,
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
