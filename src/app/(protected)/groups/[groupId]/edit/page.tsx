import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EditGroupForm } from "./edit-group-form";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");

  const supabase = await createClient();

  // Verify tenant owner
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "owner") redirect(`/groups/${groupId}`);

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group) notFound();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, ownership_pct, profiles(display_name, email)")
    .eq("group_id", groupId);

  const existingMembers = (members ?? []).map((m) => ({
    userId: m.user_id,
    email:
      (m.profiles as unknown as { email: string })?.email ?? "",
    displayName:
      (m.profiles as unknown as { display_name: string })?.display_name ??
      "Unknown",
    ownershipPct: Number(m.ownership_pct),
  }));

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">Edit Group</h1>
      <EditGroupForm
        groupId={groupId}
        groupName={group.name}
        existingMembers={existingMembers}
      />
    </main>
  );
}
