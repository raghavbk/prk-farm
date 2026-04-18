import { cookies } from "next/headers";

const ACTIVE_TENANT_COOKIE = "active_tenant_id";

export async function getActiveTenantId(): Promise<string | null> {
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
