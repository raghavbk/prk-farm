import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ExpenseForm } from "./expense-form";

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", groupId)
    .single();

  if (!group) notFound();

  // Get group members for "paid by" dropdown
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, profiles(display_name)")
    .eq("group_id", groupId);

  const memberOptions = (members ?? []).map((m) => ({
    userId: m.user_id,
    displayName:
      (m.profiles as unknown as { display_name: string })?.display_name ??
      "Unknown",
  }));

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">Add Expense</h1>
      <p className="mt-1 text-sm text-gray-600">to {group.name}</p>
      <ExpenseForm
        groupId={groupId}
        members={memberOptions}
        currentUserId={user.id}
      />
    </main>
  );
}
