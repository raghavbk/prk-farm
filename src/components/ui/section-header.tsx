import Link from "next/link";
import { I } from "./icons";

type Props = {
  title: string;
  trailing?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function SectionHeader({ title, trailing, actionLabel, actionHref }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: 14,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
        <h2
          className="serif"
          style={{
            fontSize: "clamp(22px, 4vw, 26px)",
            margin: 0,
            letterSpacing: "-0.015em",
            whiteSpace: "nowrap",
            color: "var(--ink)",
          }}
        >
          {title}
        </h2>
        {trailing && (
          <span className="eyebrow hidden sm:inline" style={{ color: "var(--ink-4)" }}>
            {trailing}
          </span>
        )}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {actionLabel}
          <I.arrow size={12} />
        </Link>
      )}
    </div>
  );
}
