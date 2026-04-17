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

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const normalizedEmail = email.trim();
  const normalizedRole = role === "owner" ? "owner" : "member";

  // Check if user already exists in our profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("email", normalizedEmail)
    .single();

  if (profile) {
    // Look up auth state to distinguish pending vs. onboarded users
    const { data: authLookup } = await admin.auth.admin.getUserById(profile.id);
    const isPending = !!authLookup?.user && !authLookup.user.email_confirmed_at;

    const { data: existingMember } = await supabase
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", profile.id)
      .single();

    if (isPending) {
      // Re-send a fresh invite email (new one-time token)
      const name = displayName?.trim() || profile.display_name || normalizedEmail.split("@")[0];
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
          full_name: name,
          display_name: name,
          email: normalizedEmail,
          invited_to_tenant: tenantId,
          invited_role: normalizedRole,
        },
        redirectTo: `${siteUrl}/auth/callback`,
      });
      if (inviteError) return { error: inviteError.message };

      if (!existingMember) {
        const { error: insertError } = await supabase
          .from("tenant_members")
          .insert({ tenant_id: tenantId, user_id: profile.id, role: normalizedRole });
        if (insertError) return { error: insertError.message };
      }

      revalidatePath("/admin");
      return { success: `Invite resent to ${normalizedEmail}.` };
    }

    if (existingMember) {
      return { error: "This user is already a member of this farm" };
    }

    const { error: insertError } = await supabase
      .from("tenant_members")
      .insert({ tenant_id: tenantId, user_id: profile.id, role: normalizedRole });
    if (insertError) return { error: insertError.message };

    revalidatePath("/admin");
    return { success: `${profile.display_name} has been added to the farm` };
  }

  // New user — send invite email via Supabase
  const name = displayName?.trim() || normalizedEmail.split("@")[0];
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      data: {
        full_name: name,
        display_name: name,
        email: normalizedEmail,
        invited_to_tenant: tenantId,
        invited_role: normalizedRole,
      },
      redirectTo: `${siteUrl}/auth/callback`,
    }
  );

  if (inviteError) return { error: inviteError.message };

  const userId = inviteData.user.id;

  await supabase.from("profiles").upsert({
    id: userId,
    display_name: name,
    email: normalizedEmail,
  });

  const { error: insertError } = await supabase
    .from("tenant_members")
    .insert({ tenant_id: tenantId, user_id: userId, role: normalizedRole });

  if (insertError) return { error: insertError.message };

  revalidatePath("/admin");
  return { success: `Invite sent to ${normalizedEmail}. They'll receive an email to set up their account.` };
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
