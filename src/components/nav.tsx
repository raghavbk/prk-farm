import Link from "next/link";
import { TenantSwitcher } from "./tenant-switcher";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white" style={{ viewTransitionName: "site-nav" }}>
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold text-gray-900">
            Farm Ledger
          </Link>
          <TenantSwitcher />
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/groups"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Groups
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
