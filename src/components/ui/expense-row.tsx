import Link from "next/link";
import { Avatar } from "./avatar";
import { formatInr, firstName } from "@/lib/format";

type Props = {
  href: string;
  description: string;
  amount: number;
  date: string;
  paidById: string;
  paidByName: string;
  groupName?: string;
  isLast?: boolean;
  compact?: boolean;
};

export function ExpenseRow({
  href,
  description,
  amount,
  date,
  paidById,
  paidByName,
  groupName,
  isLast = false,
  compact = false,
}: Props) {
  const day = new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <Link
      href={href}
      style={{
        width: "100%",
        padding: compact ? "10px 14px" : "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        textDecoration: "none",
        borderBottom: isLast ? "none" : "1px solid var(--rule-2)",
        color: "var(--ink)",
      }}
      className="expense-row"
    >
      <Avatar name={paidByName} id={paidById} size={compact ? 28 : 36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: compact ? 13 : 14.5,
            fontWeight: 450,
            color: "var(--ink)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "-0.005em",
          }}
        >
          {description}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--ink-3)",
            marginTop: 3,
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>{firstName(paidByName)} paid</span>
          {groupName && (
            <>
              <span style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--ink-4)" }} />
              <span>{groupName}</span>
            </>
          )}
          <span style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--ink-4)" }} />
          <span className="mono">{day}</span>
        </div>
      </div>
      <div className="serif tnum" style={{ fontSize: 20, color: "var(--ink)", letterSpacing: "-0.01em" }}>
        {formatInr(amount)}
      </div>
    </Link>
  );
}
