"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { setActiveTenantId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = { error?: string } | void;

export async function createTenant(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { error: "Tenant name is required" };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (tenantError) {
    return { error: tenantError.message };
  }

  // Add creator as owner
  const { error: memberError } = await supabase
    .from("tenant_members")
    .insert({ tenant_id: tenant.id, user_id: user.id, role: "owner" });

  if (memberError) {
    return { error: memberError.message };
  }

  // Set as active tenant and redirect to dashboard
  await setActiveTenantId(tenant.id);
  revalidatePath("/");
  redirect("/");
}

export async function switchTenant(tenantId: string) {
  await setActiveTenantId(tenantId);
  revalidatePath("/");
  redirect("/");
}
