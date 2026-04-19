import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

// Is the calling user a platform admin? cache()'d per request so the sidebar,
// layout, and page can all call this without fanning out to Supabase.
export const isCurrentUserPlatformAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) return false;
  return data === true;
});

// Is the caller a tenant admin (role='admin') for the given tenant?
// Memoised per tenantId per request.
export async function isCurrentUserTenantAdmin(tenantId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.role === "admin";
}

// Can the caller perform tenant-admin operations (invite, remove, set
// ownership) on this tenant? Tenant admin OR platform admin passes.
export async function canManageTenant(tenantId: string): Promise<boolean> {
  if (await isCurrentUserPlatformAdmin()) return true;
  return isCurrentUserTenantAdmin(tenantId);
}
