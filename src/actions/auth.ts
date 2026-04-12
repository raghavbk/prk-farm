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
  redirect("/");
}

export async function signup(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;

  if (!displayName?.trim()) return { error: "Name is required" };
  if (!email?.trim()) return { error: "Email is required" };
  if (!password) return { error: "Password is required" };
  if (password.length < 6) return { error: "Password must be at least 6 characters" };

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: displayName.trim(),
        display_name: displayName.trim(),
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}
