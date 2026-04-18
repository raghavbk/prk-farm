import { Sidebar } from "@/components/ui/sidebar";
import { TabBar } from "@/components/ui/tab-bar";
import { MobileTopBar } from "@/components/ui/mobile-top-bar";
import { TENANT, SUMMARY, CURRENT_USER_ID, memberById } from "./seed";

// Auth-free layout used only to render the redesigned UI against seed data
// for visual QA. Not linked from the app and noindex'd below.

export const metadata = { robots: { index: false, follow: false } };

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  const me = memberById(CURRENT_USER_ID);
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <Sidebar
        tenantName={TENANT.name}
        tenantMemberCount={TENANT.memberCount}
        userName={me.name}
        userId={me.id}
        userRoleLabel="Tenant Owner"
        totalYouOwe={SUMMARY.totalYouOwe}
        totalOwedToYou={SUMMARY.totalOwedToYou}
        isTenantAdmin={true}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <MobileTopBar tenantName={TENANT.name} />
        <main style={{ flex: 1, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }} className="md:!pb-0">
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  );
}
