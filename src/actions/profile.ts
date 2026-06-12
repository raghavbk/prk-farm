"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ProfileActionResult = { error?: string; success?: boolean } | undefined;

export async function updateDisplayName(
  _prev: ProfileActionResult,
  formData: FormData
): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const name = (formData.get("displayName") as string ?? "").trim();
  if (!name) return { error: "Name cannot be empty" };
  if (name.length > 80) return { error: "Name must be 80 characters or fewer" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
