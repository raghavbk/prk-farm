"use server";

import { createClient } from "@/lib/supabase/server";
import { getRequestHost, setActiveTenantId } from "@/lib/tenant";
import { isPlatformHost } from "@/lib/platform-hosts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// createTenant() is retired. Tenant creation is a platform-admin operation
// that runs through /platform/onboard (onboardTenant) or the CLI
// (npm run tenant:create).

export async function switchTenant(tenantId: string) {
  // Cookie acts as a fallback on hosts without a tenant mapping (platform
  // apex, localhost without a domain row, Vercel preview URLs). On a real
  // tenant host the middleware's resolve_tenant_by_domain wins, so we also
  // redirect the browser to the target tenant's primary domain — otherwise
  // picking PRK while on test.chukta.in would silently drop you back on
  // Test Farm because the host wins.
  await setActiveTenantId(tenantId);
  revalidatePath("/");

  const supabase = await createClient();
  const { data: primary } = await supabase
    .from("tenant_domains")
    .select("domain")
    .eq("tenant_id", tenantId)
    .eq("is_primary", true)
    .maybeSingle();

  const currentHost = await getRequestHost();
  const targetHost = primary?.domain ?? null;

  // Same host already — a plain redirect is enough; the cookie (or the host
  // match) will resolve the right tenant.
  if (!targetHost || (currentHost && targetHost === currentHost)) {
    redirect("/");
  }

  // Localhost dev and platform-apex hosts can't "host-switch" usefully;
  // rely on the cookie and stay put. On real hosts, cross over.
  if (currentHost && (isPlatformHost(currentHost) || currentHost.startsWith("localhost") || currentHost.startsWith("127."))) {
    redirect("/");
  }

  const scheme = targetHost.startsWith("localhost") || targetHost.startsWith("127.") ? "http" : "https";
  redirect(`${scheme}://${targetHost}/`);
}
