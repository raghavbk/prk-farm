"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AuthActionResult = { error?: string } | void;

export async function login(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email?.trim()) return { error: "Email is required" };
  if (!password) return { error: "Password is required" };

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Backfill password_set so future invite-link clicks skip /auth/set-password
  // for this account. updateUser merges at the top level, so no spread.
  const meta = (data.user?.user_metadata ?? {}) as { password_set?: boolean };
  if (data.user && meta.password_set !== true) {
    await supabase.auth.updateUser({ data: { password_set: true } });
  }

  revalidatePath("/");
  redirect("/auth/resume");
}

export async function setPassword(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();

  // Drop invite_token after use so it can't re-trigger accept logic on a
  // future callback hit.
  const { data: userRes } = await supabase.auth.getUser();
  const existing = (userRes.user?.user_metadata ?? {}) as Record<string, unknown>;
  const nextMeta = { ...existing, password_set: true };
  delete (nextMeta as { invite_token?: string }).invite_token;

  const { error } = await supabase.auth.updateUser({ password, data: nextMeta });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/auth/resume");
}
