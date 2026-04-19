import { requireUserAndTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ViewTransition } from "react";
import { EditGroupForm } from "./edit-group-form";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user, tenantId } = await requireUserAndTenant();

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
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
    <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Edit Group</h1>
      <EditGroupForm
        groupId={groupId}
        groupName={group.name}
        existingMembers={existingMembers}
      />
    </main>
    </ViewTransition>
  );
}
