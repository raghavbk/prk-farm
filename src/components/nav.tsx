import Link from "next/link";
import { TenantSwitcher } from "./tenant-switcher";

export function Nav() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md"
      style={{ viewTransitionName: "site-nav" }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-olive text-surface">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-display text-sm font-semibold text-ink">
              Farm Ledger
            </span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <TenantSwitcher />
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/groups"
            className="rounded-lg px-3 py-1.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-warm transition-colors"
          >
            Groups
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-sm text-ink-faint hover:text-ink-muted hover:bg-surface-warm transition-colors"
            >
              Sign Out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
