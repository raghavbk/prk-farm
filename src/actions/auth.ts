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

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  // /auth/resume decides where to send the user based on their memberships
  // and platform-admin status.
  redirect("/auth/resume");
}

export async function setPassword(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const next = (formData.get("next") as string | null)?.trim() ?? "";

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  // If the invite flow passed a `next` URL (accept-invite with a token),
  // honour it so the invitee lands on the acceptance handler. Only allow
  // same-origin paths so this can't be turned into an open redirect.
  if (next && next.startsWith("/")) {
    redirect(next);
  }
  // Default: /auth/resume picks the right destination from memberships.
  redirect("/auth/resume");
}

