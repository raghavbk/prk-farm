import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteAcceptOutcome =
  | { ok: true; tenantId: string }
  | { ok: false; reason: "not_found" | "wrong_state" | "expired" | "wrong_account" | "insert_failed" };

// Accept an invite on behalf of a just-verified Supabase user.
//
// Used by /auth/callback (right after verifyOtp establishes a session) so
// the membership is materialized in the same hop as the sign-in. That
// avoids an extra Server-Action redirect through /auth/accept-invite,
// which was losing cookies and bouncing the user to /login.
//
// Idempotent: a pre-existing tenant_members row for this (tenant, user) is
// treated as a successful accept.
export async function acceptInviteForUser(
  user: User,
  token: string,
): Promise<InviteAcceptOutcome> {
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("tenant_invites")
    .select("id, tenant_id, email, role, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.status !== "pending") return { ok: false, reason: "wrong_state" };
  if (new Date(invite.expires_at) < new Date()) {
    await admin.from("tenant_invites").update({ status: "expired" }).eq("id", invite.id);
    return { ok: false, reason: "expired" };
  }

  const userEmail = (user.email ?? "").toLowerCase();
  if (userEmail !== invite.email.toLowerCase()) {
    return { ok: false, reason: "wrong_account" };
  }

  const { data: existingMember } = await admin
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", invite.tenant_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMember) {
    const { error } = await admin
      .from("tenant_members")
      .insert({ tenant_id: invite.tenant_id, user_id: user.id, role: invite.role });
    if (error) return { ok: false, reason: "insert_failed" };
  }

  await admin
    .from("tenant_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invite.id);

  await admin.from("audit_log").insert({
    tenant_id: invite.tenant_id,
    actor_user_id: user.id,
    action: "invite.accepted",
    resource_type: "tenant_invite",
    resource_id: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  return { ok: true, tenantId: invite.tenant_id };
}
