"use server";

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const normalizedEmail = email.trim();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, display_name, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profile) {
    const { data: authLookup } = await admin.auth.admin.getUserById(profile.id);
    const isPending = !!authLookup?.user && !authLookup.user.email_confirmed_at;

    const { data: existingMember } = await admin
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (isPending) {
      const name = displayName?.trim() || profile.display_name || normalizedEmail.split("@")[0];
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
          full_name: name,
          display_name: name,
          email: normalizedEmail,
          invited_to_tenant: tenantId,
          invited_role: role,
        },
        redirectTo: `${siteUrl}/auth/callback`,
      });
      if (inviteError) return { error: inviteError.message };

      if (!existingMember) {
        const { error: insertError } = await admin
          .from("tenant_members")
          .insert({ tenant_id: tenantId, user_id: profile.id, role });
        if (insertError) return { error: insertError.message };
      }

      await logAction({
        tenantId,
        action: "invite.resent",
        resourceType: "user",
        resourceId: profile.id,
        metadata: { email: normalizedEmail, role },
      });
      revalidatePath("/admin");
      return { success: `Invite resent to ${normalizedEmail}.` };
    }

    if (existingMember) return { error: "This user is already a member of this tenant" };

    const { error: insertError } = await admin
      .from("tenant_members")
      .insert({ tenant_id: tenantId, user_id: profile.id, role });
    if (insertError) return { error: insertError.message };

    await logAction({
      tenantId,
      action: "member.added",
      resourceType: "user",
      resourceId: profile.id,
      metadata: { email: normalizedEmail, role },
    });
    revalidatePath("/admin");
    return { success: `${profile.display_name} has been added to the tenant` };
  }

  const name = displayName?.trim() || normalizedEmail.split("@")[0];
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      data: {
        full_name: name,
        display_name: name,
        email: normalizedEmail,
        invited_to_tenant: tenantId,
        invited_role: role,
      },
      redirectTo: `${siteUrl}/auth/callback`,
    },
  );
  if (inviteError) return { error: inviteError.message };

  const userId = inviteData.user.id;

  await admin.from("profiles").upsert({
    id: userId,
    display_name: name,
    email: normalizedEmail,
  });

  const { error: insertError } = await admin
    .from("tenant_members")
    .insert({ tenant_id: tenantId, user_id: userId, role });
  if (insertError) return { error: insertError.message };

  await logAction({
    tenantId,
    action: "invite.sent",
    resourceType: "user",
    resourceId: userId,
    metadata: { email: normalizedEmail, role },
  });

  revalidatePath("/admin");
  return { success: `Invite sent to ${normalizedEmail}. They'll receive an email to set up their account.` };
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
