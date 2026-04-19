"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { canManageTenant } from "@/lib/platform";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ExpenseActionResult = { error?: string } | void;

export async function addExpense(
  _prev: ExpenseActionResult,
  formData: FormData
): Promise<ExpenseActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const groupId = formData.get("groupId") as string;
  const description = formData.get("description") as string;
  const amountStr = formData.get("amount") as string;
  const date = formData.get("date") as string;
  const paidBy = formData.get("paidBy") as string;
  const splitMethod = (formData.get("splitMethod") as string) || "ownership";

  if (!description?.trim()) return { error: "Description is required" };
  const amount = parseFloat(amountStr);
  if (!amount || amount <= 0) return { error: "Amount must be positive" };
  if (!date) return { error: "Date is required" };
  if (!paidBy) return { error: "Paid by is required" };

  const supabase = await createClient();

  // Verify user is a group member
  const { data: memberCheck } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!memberCheck) return { error: "You are not a member of this group" };

  // Create the expense
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      group_id: groupId,
      description: description.trim(),
      amount,
      date,
      paid_by: paidBy,
      created_by: user.id,
    })
    .select()
    .single();

  if (expenseError) return { error: expenseError.message };

  // Snapshot current ownership percentages into splits
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, ownership_pct")
    .eq("group_id", groupId);

  if (!members || members.length === 0) {
    return { error: "Group has no members" };
  }

  const splits = members.map((m) => {
    const pct =
      splitMethod === "equal"
        ? Math.round((100 / members.length) * 100) / 100
        : Number(m.ownership_pct);
    return {
      expense_id: expense.id,
      user_id: m.user_id,
      share_pct: pct,
      share_amount: Math.round(amount * pct) / 100,
    };
  });

  const { error: splitsError } = await supabase
    .from("expense_splits")
    .insert(splits);

  if (splitsError) return { error: splitsError.message };

  // Tenant id is reachable via the group — keep the read cheap since we just
  // wrote to it.
  const { data: groupRow } = await supabase
    .from("groups")
    .select("tenant_id")
    .eq("id", groupId)
    .single();
  await logAction({
    tenantId: groupRow?.tenant_id ?? null,
    action: "expense.created",
    resourceType: "expense",
    resourceId: expense.id,
    metadata: { group_id: groupId, amount, split_method: splitMethod },
  });

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function editExpense(
  _prev: ExpenseActionResult,
  formData: FormData
): Promise<ExpenseActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const expenseId = formData.get("expenseId") as string;
  const description = formData.get("description") as string;
  const amountStr = formData.get("amount") as string;
  const date = formData.get("date") as string;
  const paidBy = formData.get("paidBy") as string;

  if (!description?.trim()) return { error: "Description is required" };
  const amount = parseFloat(amountStr);
  if (!amount || amount <= 0) return { error: "Amount must be positive" };
  if (!date) return { error: "Date is required" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("expenses")
    .select("*, groups(tenant_id)")
    .eq("id", expenseId)
    .single();
  if (!existing) return { error: "Expense not found" };

  const tenantId = (existing.groups as unknown as { tenant_id: string })?.tenant_id;

  // Auth: creator, tenant admin, or platform admin.
  const isElevated = await canManageTenant(tenantId);
  if (existing.created_by !== user.id && !isElevated) {
    return { error: "You can only edit your own expenses." };
  }
  // Elevated users go through the service role so the write doesn't depend
  // on the old is_tenant_owner RLS branch; creators use their own session.
  const writer = isElevated ? createAdminClient() : supabase;

  const { error: updateError } = await writer
    .from("expenses")
    .update({
      description: description.trim(),
      amount,
      date,
      paid_by: paidBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId);
  if (updateError) return { error: updateError.message };

  if (amount !== existing.amount) {
    const { data: splits } = await writer
      .from("expense_splits")
      .select("id, share_pct")
      .eq("expense_id", expenseId);

    if (splits) {
      for (const split of splits) {
        const newAmount = Math.round(amount * Number(split.share_pct)) / 100;
        await writer
          .from("expense_splits")
          .update({ share_amount: newAmount })
          .eq("id", split.id);
      }
    }
  }

  await logAction({
    tenantId: tenantId ?? null,
    action: "expense.updated",
    resourceType: "expense",
    resourceId: expenseId,
    metadata: { amount, previous_amount: existing.amount },
  });

  revalidatePath(`/groups/${existing.group_id}`);
  redirect(`/groups/${existing.group_id}`);
}

export async function deleteExpenseAction(formData: FormData) {
  const expenseId = formData.get("expenseId") as string;
  const groupId = formData.get("groupId") as string;
  await deleteExpense(expenseId, groupId);
}

export async function deleteExpense(expenseId: string, groupId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("expenses")
    .select("created_by, group_id, groups(tenant_id)")
    .eq("id", expenseId)
    .single();
  if (!existing) return { error: "Expense not found" };

  const tenantId = (existing.groups as unknown as { tenant_id: string })?.tenant_id;

  const isElevated = await canManageTenant(tenantId);
  if (existing.created_by !== user.id && !isElevated) {
    return { error: "You can only delete your own expenses." };
  }
  const writer = isElevated ? createAdminClient() : supabase;

  const { error } = await writer.from("expenses").delete().eq("id", expenseId);
  if (error) return { error: error.message };

  await logAction({
    tenantId: tenantId ?? null,
    action: "expense.deleted",
    resourceType: "expense",
    resourceId: expenseId,
    metadata: { group_id: groupId },
  });

  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}
