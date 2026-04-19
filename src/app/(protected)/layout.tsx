import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId, isPlatformHostRequest } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserPlatformAdmin } from "@/lib/platform";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { Sidebar } from "@/components/ui/sidebar";
import { TabBar } from "@/components/ui/tab-bar";
import { MobileTopBar } from "@/components/ui/mobile-top-bar";
import { SessionSwitchBanner } from "@/components/ui/session-switch-banner";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Non-admins on the platform apex get an inline notice rather than a
  // redirect — /login bounces already-signed-in users back here, looping.
  if (await isPlatformHostRequest()) {
    if (await isCurrentUserPlatformAdmin()) {
      redirect("/platform");
    }
    return <WrongHostNotice />;
  }

  const supabase = await createClient();
  const activeTenantId = await getActiveTenantId();
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onTenantPicker = pathname.startsWith("/tenants");

  // Picker renders with its own minimal frame so stale-cookie users can
  // still pick a tenant.
  if (onTenantPicker) {
    return <>{children}</>;
  }

  if (!activeTenantId) {
    redirect("/auth/resume");
  }

  const [tenantRes, memberCountRes, profileRes, membershipRes, summaryRes, myTenantCountRes, isPlatform] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", activeTenantId).single(),
    supabase.from("tenant_members").select("user_id", { count: "exact", head: true }).eq("tenant_id", activeTenantId),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("tenant_members").select("role").eq("tenant_id", activeTenantId).eq("user_id", user.id).maybeSingle(),
    supabase.rpc("tenant_summary", { p_tenant_id: activeTenantId, p_user_id: user.id }),
    supabase.from("tenant_members").select("tenant_id", { count: "exact", head: true }).eq("user_id", user.id),
    isCurrentUserPlatformAdmin(),
  ]);

  // Stale cookie (tenant deleted, env swap) — /auth/resume rewrites it.
  if (!tenantRes.data || !membershipRes.data) {
    redirect("/auth/resume");
  }

  const tenantName = tenantRes.data.name;
  const tenantMemberCount = memberCountRes.count ?? 0;
  const userName = profileRes.data?.display_name ?? user.email ?? "You";
  const role = membershipRes.data.role;
  const roleLabel = role === "admin" ? "Tenant Admin" : "Member";
  const isAdmin = role === "admin" || isPlatform;
  const totals = summaryRes.data?.[0] ?? { total_you_owe: 0, total_owed_to_you: 0 };
  const hasMultipleTenants = (myTenantCountRes.count ?? 0) > 1;

  // Flash set by /auth/callback when an invite link swapped in a new session.
  const cookieStore = await cookies();
  const previousEmail = cookieStore.get("flash_prev_user_email")?.value ?? "";
  const showSwitchBanner =
    !!previousEmail &&
    !!user.email &&
    previousEmail.toLowerCase() !== user.email.toLowerCase();

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
        hasMultipleTenants={hasMultipleTenants}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <MobileTopBar tenantName={tenantName} />
        {showSwitchBanner && user.email && (
          <SessionSwitchBanner previousEmail={previousEmail} currentEmail={user.email} />
        )}
        <main style={{ flex: 1, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }} className="md:!pb-0">
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  );
}

function WrongHostNotice() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(24px, 4vw, 48px)",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      <div className="mesh" style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.5 }} />
      <div style={{ position: "relative", maxWidth: 460, textAlign: "center" }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Wrong door
        </div>
        <h1
          className="serif"
          style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.15 }}
        >
          This host is the <em>platform console</em>.
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "14px auto 24px", maxWidth: 380, lineHeight: 1.55 }}>
          You&rsquo;re signed in, but this account isn&rsquo;t a platform admin for this app.
          Go to your tenant&rsquo;s URL, or sign out to try a different account.
        </p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-ghost">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
