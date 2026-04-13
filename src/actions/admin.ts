"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export type AdminActionResult = { error?: string; success?: string } | void;

function generateTempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

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

  let userId: string;
  let tempPassword: string | null = null;
  let userName: string;

  if (profile) {
    // Existing user
    userId = profile.id;
    userName = profile.display_name;

    // Check if already a member
    const { data: existing } = await supabase
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      return { error: "This user is already a member of this farm" };
    }
  } else {
    // New user — create account via admin API
    const name = displayName?.trim() || email.split("@")[0];
    tempPassword = generateTempPassword();

    const admin = createAdminClient();
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        display_name: name,
        email: email.trim(),
      },
    });

    if (createError) {
      return { error: createError.message };
    }

    userId = newUser.user.id;
    userName = name;

    // Wait briefly for the profile trigger to fire, then ensure profile exists
    const { data: newProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!newProfile) {
      // Trigger didn't fire — insert profile manually
      await supabase.from("profiles").insert({
        id: userId,
        display_name: name,
        email: email.trim(),
      });
    }
  }

  // Add to tenant
  const { error: insertError } = await supabase
    .from("tenant_members")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role: role === "owner" ? "owner" : "member",
    });

  if (insertError) return { error: insertError.message };

  revalidatePath("/admin");

  if (tempPassword) {
    return {
      success: `${userName} has been invited! Their temporary password is: ${tempPassword} — share it with them securely. They can log in at the login page.`,
    };
  }

  return { success: `${userName} has been added to the farm` };
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
