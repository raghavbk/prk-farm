import { requireUserAndTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { EditExpenseForm } from "./edit-expense-form";
import type { Tag } from "@/lib/types";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const { groupId, expenseId } = await params;
  const { tenantId } = await requireUserAndTenant();

  const supabase = await createClient();

  const [expenseRes, membersRes, tagsRes, expenseTagsRes] = await Promise.all([
    supabase.from("expenses").select("*").eq("id", expenseId).single(),
    supabase
      .from("group_members")
      .select("user_id, profiles(display_name)")
      .eq("group_id", groupId),
    supabase.from("tags").select("*").eq("tenant_id", tenantId).order("name"),
    supabase
      .from("expense_tags")
      .select("tag_id")
      .eq("expense_id", expenseId),
  ]);

  if (!expenseRes.data) notFound();
  const expense = expenseRes.data;

  const memberOptions = (membersRes.data ?? []).map((m) => ({
    userId: m.user_id,
    displayName:
      (m.profiles as unknown as { display_name: string })?.display_name ??
      "Unknown",
  }));

  const tags = (tagsRes.data ?? []) as Tag[];
  const selectedTagIds = (expenseTagsRes.data ?? []).map((r) => r.tag_id);

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
    <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Edit Expense</h1>
      <EditExpenseForm
        expense={expense}
        groupId={groupId}
        members={memberOptions}
        tenantId={tenantId}
        availableTags={tags}
        selectedTagIds={selectedTagIds}
      />
    </main>
    </ViewTransition>
  );
}
