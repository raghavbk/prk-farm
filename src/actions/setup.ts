"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { setActiveTenantId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SetupActionResult = { error?: string } | void;

export async function setupAdmin(
  _prev: SetupActionResult,
  formData: FormData
): Promise<SetupActionResult> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const farmName = formData.get("farmName") as string;

  if (!name?.trim()) return { error: "Name is required" };
  if (!email?.trim()) return { error: "Email is required" };
  if (!password || password.length < 6) return { error: "Password must be at least 6 characters" };
  if (!farmName?.trim()) return { error: "Farm name is required" };

  // Check if any users already exist — setup is one-time only
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (count && count > 0) {
    return { error: "Setup has already been completed" };
  }

  // Create admin user via admin API (proper password hashing)
  const admin = createAdminClient();
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name.trim(),
      display_name: name.trim(),
      email: email.trim(),
    },
  });

  if (createError) return { error: createError.message };

  const userId = newUser.user.id;

  // Ensure profile exists
  await supabase.from("profiles").upsert({
    id: userId,
    display_name: name.trim(),
    email: email.trim(),
  });

  // Create the first tenant
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name: farmName.trim(), created_by: userId })
    .select()
    .single();

  if (tenantError) return { error: tenantError.message };

  // Add creator as owner
  await admin.from("tenant_members").insert({
    tenant_id: tenant.id,
    user_id: userId,
    role: "owner",
  });

  // Sign them in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (signInError) return { error: signInError.message };

  await setActiveTenantId(tenant.id);
  revalidatePath("/");
  redirect("/");
}
