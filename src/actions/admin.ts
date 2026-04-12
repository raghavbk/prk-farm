"use server";

import { createClient } from "@/lib/supabase/server";
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

  // Find the user by email
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("email", email.trim())
    .single();

  if (!profile) {
    return { error: "No user found with that email. They need to sign up first." };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", profile.id)
    .single();

  if (existing) {
    return { error: "This user is already a member of this farm" };
  }

  // Add as member
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
