import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/tenant";

// cache() deduplicates repeated calls within a single request render —
// layout, nav, and page can all call this without triggering N auth
// requests to Supabase.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Standard protected-page guard: bounces to /login without a user and to
// /tenants without an active tenant.
export async function requireUserAndTenant() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");
  return { user, tenantId };
}
