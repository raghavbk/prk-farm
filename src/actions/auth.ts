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

  // Backfill the password_set flag for accounts that predate it. Once set,
  // future invite-link clicks correctly skip /auth/set-password.
  const meta = (data.user?.user_metadata ?? {}) as { password_set?: boolean };
  if (data.user && meta.password_set !== true) {
    await supabase.auth.updateUser({ data: { ...meta, password_set: true } });
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

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();

  // Mark the account as "password set" and drop the invite_token (it served
  // its purpose — carrying the first-invite acceptance — so we don't want it
  // hanging around and re-triggering accept logic on future callback hits).
  const { data: userRes } = await supabase.auth.getUser();
  const existing = (userRes.user?.user_metadata ?? {}) as Record<string, unknown>;
  const nextMeta = { ...existing, password_set: true };
  delete (nextMeta as { invite_token?: string }).invite_token;

  const { error } = await supabase.auth.updateUser({ password, data: nextMeta });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  // Invite acceptance already happened in /auth/callback, so at this point
  // the user is a full member of their tenant. /auth/resume handles the
  // single-vs-multi-tenant routing and lands them on the right host.
  redirect("/auth/resume");
}
