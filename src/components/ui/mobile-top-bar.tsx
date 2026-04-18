import Link from "next/link";
import { I } from "./icons";
import { ThemeToggle } from "./theme-toggle";

type Props = {
  tenantName: string;
};

export function MobileTopBar({ tenantName }: Props) {
  return (
    <header
      className="flex md:hidden"
      style={{
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderBottom: "1px solid var(--rule)",
        background: "var(--bg)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <Link
        href="/tenants"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
          color: "var(--ink)",
          minWidth: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <I.leaf size={13} />
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {tenantName}
        </span>
        <I.chevronD size={14} stroke="var(--ink-3)" />
      </Link>
      <ThemeToggle compact />
    </header>
  );
}
