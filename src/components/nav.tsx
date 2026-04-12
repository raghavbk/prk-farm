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
      className="sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur-xl"
      style={{ viewTransitionName: "site-nav" }}
    >
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-display text-sm font-bold text-ink">
              FarmLedger
            </span>
          </Link>
          <div className="h-5 w-px bg-border" />
          <TenantSwitcher />
        </div>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-primary hover:bg-primary-wash transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/groups"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-primary hover:bg-primary-wash transition-colors"
          >
            Groups
          </Link>
          {isTenantOwner && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-primary hover:bg-primary-wash transition-colors"
            >
              Admin
            </Link>
          )}
          <form action="/auth/signout" method="post" className="ml-1">
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm text-ink-faint hover:text-danger hover:bg-danger-wash transition-colors"
            >
              Sign Out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
