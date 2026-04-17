import Link from "next/link";
import { TenantSwitcher } from "./tenant-switcher";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";

export async function Nav() {
  const user = await getCurrentUser();
  const tenantId = await getActiveTenantId();

  let isTenantOwner = false;
  if (user && tenantId) {
    const supabase = await createClient();
    const { data } = await supabase.from("tenant_members").select("role").eq("tenant_id", tenantId).eq("user_id", user.id).single();
    isTenantOwner = data?.role === "owner";
  }

  return (
    <header
      className="sticky top-0 z-40"
      style={{ viewTransitionName: "site-nav", background: "rgba(5,5,6,0.7)", backdropFilter: "blur(24px) saturate(150%)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="mx-auto flex h-14 sm:h-16 max-w-[1120px] items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="font-display text-sm font-bold text-primary">F</span>
            </div>
            <span className="hidden sm:inline font-display text-[15px] font-semibold text-ink/90">FarmLedger</span>
          </Link>
          <div className="h-4 w-px bg-white/[0.06] shrink-0" />
          <TenantSwitcher />
        </div>
        <nav className="flex items-center gap-3 sm:gap-6 shrink-0">
          <Link href="/" className="text-[13px] font-medium text-ink-faint hover:text-ink transition-colors">
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Home</span>
          </Link>
          <Link href="/groups" className="text-[13px] font-medium text-ink-faint hover:text-ink transition-colors">
            Groups
          </Link>
          {isTenantOwner && (
            <Link href="/admin" className="text-[13px] font-medium text-ink-faint hover:text-primary transition-colors">
              Admin
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-[13px] font-medium text-ink-faint hover:text-danger transition-colors">
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
