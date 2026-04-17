"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export type AdminActionResult = { error?: string; success?: string } | void;

export async function inviteMember(
  _prev: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No active tenant" };

  const email = formData.get("email") as string;
  const displayName = formData.get("displayName") as string;
  const role = (formData.get("role") as string) || "member";

  if (!email?.trim()) return { error: "Email is required" };

  const supabase = await createClient();

  // Verify caller is tenant owner
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "owner") {
    return { error: "Only tenant owners can invite members" };
  }

  // Check if user already exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("email", email.trim())
    .single();

  if (profile) {
    // Existing user — check if already a member
    const { data: existing } = await supabase
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", profile.id)
      .single();

    if (existing) {
      return { error: "This user is already a member of this farm" };
    }

    // Add existing user directly
    const { error: insertError } = await supabase
      .from("tenant_members")
      .insert({
        tenant_id: tenantId,
        user_id: profile.id,
        role: role === "owner" ? "owner" : "member",
      });

    if (insertError) return { error: insertError.message };

    revalidatePath("/admin");
    return { success: `${profile.display_name} has been added to the farm` };
  }

  // New user — send invite email via Supabase
  const name = displayName?.trim() || email.split("@")[0];
  const admin = createAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.trim(),
    {
      data: {
        full_name: name,
        display_name: name,
        email: email.trim(),
        invited_to_tenant: tenantId,
        invited_role: role === "owner" ? "owner" : "member",
      },
      redirectTo: `${siteUrl}/auth/callback`,
    }
  );

  if (inviteError) return { error: inviteError.message };

  // Add to tenant now (they'll set password when they click the email link)
  const userId = inviteData.user.id;

  // Ensure profile exists
  await supabase.from("profiles").upsert({
    id: userId,
    display_name: name,
    email: email.trim(),
  });

  const { error: insertError } = await supabase
    .from("tenant_members")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role: role === "owner" ? "owner" : "member",
    });

  if (insertError) return { error: insertError.message };

  revalidatePath("/admin");
  return { success: `Invite sent to ${email}. They'll receive an email to set up their account.` };
}

export async function removeMember(memberId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No active tenant" };

  if (memberId === user.id) {
    return { error: "You cannot remove yourself" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("tenant_members")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("user_id", memberId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
}

export async function updateMemberRole(memberId: string, newRole: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No active tenant" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("tenant_members")
    .update({ role: newRole })
    .eq("tenant_id", tenantId)
    .eq("user_id", memberId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
}
