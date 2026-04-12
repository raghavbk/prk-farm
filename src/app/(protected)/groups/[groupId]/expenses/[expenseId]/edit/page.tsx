import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EditExpenseForm } from "./edit-expense-form";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const { groupId, expenseId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: expense } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", expenseId)
    .single();

  if (!expense) notFound();

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
      <h1 className="text-xl font-bold text-gray-900">Edit Expense</h1>
      <EditExpenseForm
        expense={expense}
        groupId={groupId}
        members={memberOptions}
      />
    </main>
  );
}
