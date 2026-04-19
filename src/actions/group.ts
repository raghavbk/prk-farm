"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type GroupActionResult = { error?: string } | void;

export async function createGroup(
  _prev: GroupActionResult,
  formData: FormData
): Promise<GroupActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No active tenant" };

  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Group name is required" };

  // Parse members JSON from hidden input
  const membersJson = formData.get("members") as string;
  let members: { userId: string; ownershipPct: number }[];
  try {
    members = JSON.parse(membersJson);
  } catch {
    return { error: "Invalid members data" };
  }

  if (members.length === 0) return { error: "At least one member is required" };

  const total = members.reduce((sum, m) => sum + m.ownershipPct, 0);
  if (Math.abs(total - 100) > 0.01) {
    return { error: `Ownership must total 100%, got ${total}%` };
  }

  const supabase = await createClient();

  // Verify caller is tenant owner
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "owner") {
    return { error: "Only tenant owners can create groups" };
  }

  // Create group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name: name.trim(), tenant_id: tenantId, created_by: user.id })
    .select()
    .single();

  if (groupError) return { error: groupError.message };

  // Add members with ownership
  const memberRows = members.map((m) => ({
    group_id: group.id,
    user_id: m.userId,
    ownership_pct: m.ownershipPct,
  }));

  const { error: membersError } = await supabase
    .from("group_members")
    .insert(memberRows);

  if (membersError) return { error: membersError.message };

  await logAction({
    tenantId,
    action: "group.created",
    resourceType: "group",
    resourceId: group.id,
    metadata: { name: name.trim(), member_count: members.length },
  });

  revalidatePath("/groups");
  redirect(`/groups/${group.id}`);
}

export async function updateGroup(
  _prev: GroupActionResult,
  formData: FormData
): Promise<GroupActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const groupId = formData.get("groupId") as string;
  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Group name is required" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("groups")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", groupId);

  if (error) return { error: error.message };

  await logAction({
    tenantId: await getActiveTenantId(),
    action: "group.renamed",
    resourceType: "group",
    resourceId: groupId,
    metadata: { name: name.trim() },
  });

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function setOwnership(
  _prev: GroupActionResult,
  formData: FormData
): Promise<GroupActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const groupId = formData.get("groupId") as string;
  const allocationsJson = formData.get("allocations") as string;

  let allocations: { userId: string; pct: number }[];
  try {
    allocations = JSON.parse(allocationsJson);
  } catch {
    return { error: "Invalid allocations data" };
  }

  const total = allocations.reduce((sum, a) => sum + a.pct, 0);
  if (Math.abs(total - 100) > 0.01) {
    return { error: `Ownership must total 100%, got ${total}%` };
  }

  const supabase = await createClient();

  // Delete existing members and re-insert (within deferred constraint trigger)
  const { error: deleteError } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId);

  if (deleteError) return { error: deleteError.message };

  const rows = allocations.map((a) => ({
    group_id: groupId,
    user_id: a.userId,
    ownership_pct: a.pct,
  }));

  const { error: insertError } = await supabase
    .from("group_members")
    .insert(rows);

  if (insertError) return { error: insertError.message };

  await logAction({
    tenantId: await getActiveTenantId(),
    action: "group.ownership_updated",
    resourceType: "group",
    resourceId: groupId,
    metadata: { allocations },
  });

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}
