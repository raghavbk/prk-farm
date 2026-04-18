import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Sidebar } from "@/components/ui/sidebar";
import { TabBar } from "@/components/ui/tab-bar";
import { MobileTopBar } from "@/components/ui/mobile-top-bar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const activeTenantId = await getActiveTenantId();
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onTenantPicker = pathname.startsWith("/tenants");

  // Always render the picker with a minimal frame — regardless of cookie state.
  // If the cookie is stale (survives env swaps or tenant deletion), picking a
  // tenant on /tenants overwrites it via the switchTenant server action.
  if (onTenantPicker) {
    return <>{children}</>;
  }

  if (!activeTenantId) {
    redirect("/tenants");
  }

  const [tenantRes, memberCountRes, profileRes, membershipRes, summaryRes] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", activeTenantId).single(),
    supabase.from("tenant_members").select("user_id", { count: "exact", head: true }).eq("tenant_id", activeTenantId),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("tenant_members").select("role").eq("tenant_id", activeTenantId).eq("user_id", user.id).maybeSingle(),
    supabase.rpc("tenant_summary", { p_tenant_id: activeTenantId, p_user_id: user.id }),
  ]);

  // Stale / orphaned cookie: tenant doesn't exist or user isn't a member in it.
  // Happens after env switches (prod ↔ UAT) or when a tenant gets deleted.
  // Server Components can't write cookies, so punt to the picker — switching
  // tenants there will overwrite the stale cookie via a server action.
  if (!tenantRes.data || !membershipRes.data) {
    redirect("/tenants");
  }

  const tenantName = tenantRes.data.name;
  const tenantMemberCount = memberCountRes.count ?? 0;
  const userName = profileRes.data?.display_name ?? user.email ?? "You";
  const role = membershipRes.data.role;
  const roleLabel = role === "owner" ? "Tenant Owner" : role === "admin" ? "Tenant Admin" : "Member";
  const isAdmin = role === "owner" || role === "admin";
  const totals = summaryRes.data?.[0] ?? { total_you_owe: 0, total_owed_to_you: 0 };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <Sidebar
        tenantName={tenantName}
        tenantMemberCount={tenantMemberCount}
        userName={userName}
        userId={user.id}
        userRoleLabel={roleLabel}
        totalYouOwe={Number(totals.total_you_owe) || 0}
        totalOwedToYou={Number(totals.total_owed_to_you) || 0}
        isTenantAdmin={isAdmin}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <MobileTopBar tenantName={tenantName} />
        <main style={{ flex: 1, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }} className="md:!pb-0">
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  );
}
