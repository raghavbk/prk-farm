"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { I } from "./icons";

type Tab = {
  href: string;
  label: string;
  Icon: (p: { size?: number }) => React.ReactElement;
  match: (pathname: string) => boolean;
};

const tabs: Tab[] = [
  { href: "/", label: "Home", Icon: I.home, match: (p) => p === "/" },
  { href: "/groups", label: "Groups", Icon: I.users, match: (p) => p.startsWith("/groups") },
  { href: "/balances", label: "Balances", Icon: I.scale, match: (p) => p.startsWith("/balances") },
  { href: "/profile", label: "You", Icon: I.user, match: (p) => p.startsWith("/profile") || p.startsWith("/admin") || p.startsWith("/tenants") },
];

export function TabBar() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      className="flex md:hidden"
      aria-label="Primary"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        padding: "8px 8px calc(env(safe-area-inset-bottom, 0px) + 12px)",
        background: "color-mix(in oklch, var(--card) 88%, transparent)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--rule)",
        justifyContent: "space-around",
      }}
    >
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "8px 0",
              textDecoration: "none",
              color: active ? "var(--ink)" : "var(--ink-4)",
              transition: "color 0.2s",
            }}
          >
            <t.Icon size={20} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
