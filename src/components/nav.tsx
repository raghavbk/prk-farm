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
    const { data } = await supabase
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .single();
    isTenantOwner = data?.role === "owner";
  }

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        viewTransitionName: "site-nav",
        background: "rgba(10, 10, 15, 0.6)",
        backdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
                boxShadow: "0 0 16px rgba(99,102,241,0.3)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-display text-base font-bold text-ink">
              FarmLedger
            </span>
          </Link>
          <div className="h-5 w-px bg-white/10" />
          <TenantSwitcher />
        </div>

        <nav className="flex items-center gap-1">
          <Link href="/" className="rounded-xl px-3.5 py-2 text-sm font-medium text-ink-muted hover:text-primary hover:bg-primary-wash transition-all">
            Dashboard
          </Link>
          <Link href="/groups" className="rounded-xl px-3.5 py-2 text-sm font-medium text-ink-muted hover:text-primary hover:bg-primary-wash transition-all">
            Groups
          </Link>
          {isTenantOwner && (
            <Link href="/admin" className="rounded-xl px-3.5 py-2 text-sm font-medium text-ink-muted hover:text-warning hover:bg-warning-wash transition-all">
              Admin
            </Link>
          )}
          <div className="ml-2 h-5 w-px bg-white/10" />
          <form action="/auth/signout" method="post" className="ml-1">
            <button
              type="submit"
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-ink-faint hover:text-danger hover:bg-danger-wash transition-all"
            >
              Sign Out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
