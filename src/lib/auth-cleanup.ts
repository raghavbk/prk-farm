import type { createAdminClient } from "@/lib/supabase/admin";

// Delete the auth user only when no memberships, pending invites, or
// platform-admin row reference them. Mirrors the rule used by removeMember:
// zero memberships AND not a platform admin AND no pending invite for their
// profile email.
export async function deleteAuthUserIfOrphan(
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
