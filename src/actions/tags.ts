"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Tag } from "@/lib/types";

export type CreateTagResult = { tag: Tag } | { error: string };

export async function createTagAction(
  tenantId: string,
  name: string,
  color: string
): Promise<CreateTagResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Tag name is required" };
  if (trimmed.length > 32) return { error: "Tag name must be 32 characters or fewer" };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tags")
    .insert({ tenant_id: tenantId, name: trimmed, color, created_by: user.id })
    .select()
    .single();

  if (error) {
    // Unique constraint violation — tag already exists; return the existing one.
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("tags")
        .select()
        .eq("tenant_id", tenantId)
        .ilike("name", trimmed)
        .single();
      if (existing) return { tag: existing as Tag };
    }
    return { error: error.message };
  }

  return { tag: data as Tag };
}
