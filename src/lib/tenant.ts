import { cookies, headers } from "next/headers";

const ACTIVE_TENANT_COOKIE = "active_tenant_id";

// Source of truth for a request's tenant id.
// 1. x-tenant-id injected by middleware from the resolved host
//    (acme.farmledger.app → <uuid>).
// 2. active_tenant_id cookie — only meaningful on the platform-admin console
//    or during local dev when the host doesn't have a domain mapping yet.
export async function getActiveTenantId(): Promise<string | null> {
  const headerTenant = (await headers()).get("x-tenant-id");
  if (headerTenant) return headerTenant;
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_TENANT_COOKIE)?.value ?? null;
}

export async function setActiveTenantId(tenantId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

export async function clearActiveTenantId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_TENANT_COOKIE);
}

// True when middleware resolved a tenant from the request host. Used to know
// whether we should hide the tenant picker / cookie machinery.
export async function isTenantFromHost(): Promise<boolean> {
  return (await headers()).get("x-tenant-id") !== null;
}

export async function getRequestHost(): Promise<string | null> {
  return (await headers()).get("x-host");
}
