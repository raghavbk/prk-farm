"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

type ImportSplit = {
  user_id: string;
  share_pct: number;
  share_amount: number;
};

type ImportExpense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  paid_by: string;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  splits: ImportSplit[];
  tag_ids: string[];
};

type ImportTag = {
  id: string;
  name: string;
  color: string;
};

export type ImportPayload = {
  version: number;
  group: { id: string; name: string };
  tenant_id: string;
  tags: ImportTag[];
  expenses: ImportExpense[];
};

export type ImportResult =
  | { imported: number; skipped: number; errors: string[] }
  | { error: string };

export async function importExpenses(
  groupId: string,
  payload: ImportPayload
): Promise<ImportResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const tenantId = await getActiveTenantId();
  if (!tenantId) return { error: "No active tenant" };

  if (payload.version !== 1) return { error: `Unsupported file version: ${payload.version}` };
  if (!Array.isArray(payload.expenses)) return { error: "Invalid file: missing expenses array" };

  const supabase = await createClient();
  const admin = createAdminClient();

  // Verify group belongs to this tenant.
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("tenant_id", tenantId)
    .single();
  if (!group) return { error: "Group not found or does not belong to this tenant" };

  // Verify user is a tenant member.
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();
  if (!membership) return { error: "You are not a member of this tenant" };

  // Resolve tags: match by name (case-insensitive), create if missing.
  // Build old-ID → new-ID map for expense_tags reconstruction.
  const tagIdMap = new Map<string, string>();
  for (const tag of payload.tags ?? []) {
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("name", tag.name)
      .maybeSingle();

    if (existing) {
      tagIdMap.set(tag.id, existing.id);
    } else {
      const { data: created } = await admin
        .from("tags")
        .insert({ tenant_id: tenantId, name: tag.name, color: tag.color, created_by: user.id })
        .select("id")
        .single();
      if (created) tagIdMap.set(tag.id, created.id);
    }
  }

  // Collect IDs already in this group to skip duplicates.
  const { data: existing } = await supabase
    .from("expenses")
    .select("id")
    .eq("group_id", groupId);
  const existingIds = new Set((existing ?? []).map((e) => e.id));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const expense of payload.expenses) {
    if (existingIds.has(expense.id)) {
      skipped++;
      continue;
    }

    // Insert expense preserving original ID so re-imports stay idempotent.
    const { data: inserted, error: expenseError } = await admin
      .from("expenses")
      .insert({
        id: expense.id,
        group_id: groupId,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        paid_by: expense.paid_by,
        created_by: expense.created_by,
        created_at: expense.created_at,
        updated_at: expense.updated_at,
      })
      .select("id")
      .single();

    if (expenseError || !inserted) {
      errors.push(`"${expense.description}": ${expenseError?.message ?? "unknown error"}`);
      continue;
    }

    // Splits.
    if (expense.splits.length > 0) {
      const { error: splitsError } = await admin.from("expense_splits").insert(
        expense.splits.map((s) => ({
          expense_id: inserted.id,
          user_id: s.user_id,
          share_pct: s.share_pct,
          share_amount: s.share_amount,
        }))
      );
      if (splitsError) errors.push(`Splits for "${expense.description}": ${splitsError.message}`);
    }

    // Tags — map old IDs to resolved IDs, skip any that couldn't be resolved.
    const resolvedTagIds = expense.tag_ids
      .map((tid) => tagIdMap.get(tid))
      .filter((id): id is string => Boolean(id));
    if (resolvedTagIds.length > 0) {
      await admin.from("expense_tags").insert(
        resolvedTagIds.map((tid) => ({ expense_id: inserted.id, tag_id: tid }))
      );
    }

    imported++;
  }

  revalidatePath(`/groups/${groupId}`);
  return { imported, skipped, errors };
}
