"use client";

import { useState } from "react";
import { Avatar } from "./avatar";
import { BalanceRibbon } from "./balance-ribbon";
import { I } from "./icons";
import { formatInr, formatInrSigned, firstName } from "@/lib/format";

export type TabMember = {
  id: string;
  name: string;
  email: string;
  ownership_pct: number;
  net_in_group: number;
  role?: string | null;
};

export type TabExpense = {
  id: string;
  description: string;
  date: string;
  amount: number;
  paid_by: string;
  paid_by_name: string;
  can_edit: boolean;
  edit_href: string;
};

export type TabTransfer = { from: string; to: string; amount: number };

type Tab = "expenses" | "members" | "balances";

type Props = {
  initial?: Tab;
  expenses: TabExpense[];
  members: TabMember[];
  transfers: TabTransfer[];
  currentUserId: string;
  groupId: string;
};

export function GroupDetailTabs({
  initial = "expenses",
  expenses,
  members,
  transfers,
  currentUserId,
  groupId,
}: Props) {
  const [tab, setTab] = useState<Tab>(initial);
  const [hovered, setHovered] = useState<string | null>(null);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "expenses", label: "Expenses", count: expenses.length },
    { id: "members", label: "Members", count: members.length },
    { id: "balances", label: "Balances" },
  ];

  return (
    <>
      <div
        role="tablist"
        aria-label="Group sections"
        style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--rule)", marginBottom: 16 }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === t.id ? 500 : 400,
              color: tab === t.id ? "var(--ink)" : "var(--ink-3)",
              borderBottom: "2px solid",
              borderColor: tab === t.id ? "var(--accent)" : "transparent",
              marginBottom: -1,
              transition: "all 0.15s",
            }}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="mono" style={{ marginLeft: 6, color: "var(--ink-4)", fontSize: 11 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "expenses" && <ExpensesTab expenses={expenses} groupId={groupId} />}
      {tab === "members" && (
        <MembersTab members={members} hovered={hovered} setHovered={setHovered} currentUserId={currentUserId} />
      )}
      {tab === "balances" && (
        <BalancesTab transfers={transfers} members={members} currentUserId={currentUserId} />
      )}
    </>
  );
}

function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ padding: "36px 20px", textAlign: "center" }}>
      <div className="serif" style={{ fontSize: 22, color: "var(--ink-2)", marginBottom: 4 }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ExpensesTab({ expenses, groupId }: { expenses: TabExpense[]; groupId: string }) {
  if (expenses.length === 0) {
    return (
      <div className="card" style={{ overflow: "hidden" }}>
        <EmptyState title="No expenses yet" sub="When someone adds one, it'll appear here." />
      </div>
    );
  }
  return (
    <div className="card" style={{ overflow: "hidden", padding: 0 }}>
      {expenses.map((e, i) => {
        const day = new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        return (
          <div
            key={e.id}
            style={{
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              borderBottom: i === expenses.length - 1 ? "none" : "1px solid var(--rule-2)",
            }}
          >
            <Avatar name={e.paid_by_name} id={e.paid_by} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14.5,
                  fontWeight: 450,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  letterSpacing: "-0.005em",
                }}
              >
                {e.description}
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
                <span>{firstName(e.paid_by_name)} paid</span>
                <span style={{ width: 2, height: 2, borderRadius: "50%", background: "var(--ink-4)" }} />
                <span className="mono">{day}</span>
              </div>
            </div>
            <div className="serif tnum" style={{ fontSize: 20, color: "var(--ink)", letterSpacing: "-0.01em" }}>
              {formatInr(e.amount)}
            </div>
            {e.can_edit && (
              <a
                href={e.edit_href}
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  textDecoration: "none",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "6px 8px",
                }}
              >
                Edit
              </a>
            )}
          </div>
        );
      })}
      <div style={{ borderTop: "1px solid var(--rule-2)", padding: "10px 14px", textAlign: "right" }}>
        <a
          href={`/groups/${groupId}/expenses/new`}
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--accent)",
            textDecoration: "none",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          + Add expense
        </a>
      </div>
    </div>
  );
}

function MembersTab({
  members,
  hovered,
  setHovered,
  currentUserId,
}: {
  members: TabMember[];
  hovered: string | null;
  setHovered: (id: string | null) => void;
  currentUserId: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
      }}
    >
      {members.map((m, i) => (
        <div
          key={m.id}
          onMouseEnter={() => setHovered(m.id)}
          onMouseLeave={() => setHovered(null)}
          className="rise"
          style={{
            animationDelay: `${i * 40}ms`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 14,
            borderRadius: 12,
            background: "var(--card)",
            border: "1px solid var(--rule)",
            outline: hovered === m.id ? "2px solid var(--accent)" : "none",
            outlineOffset: "-1px",
            transition: "outline 0.15s",
          }}
        >
          <Avatar name={m.name} id={m.id} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
              {m.name}
              {m.id === currentUserId && (
                <span className="badge badge-muted" style={{ marginLeft: 8, fontSize: 9 }}>
                  YOU
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.email}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono tnum" style={{ fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>
              {m.ownership_pct}%
            </div>
            <div className="eyebrow">ownership</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BalancesTab({
  transfers,
  members,
  currentUserId,
}: {
  transfers: TabTransfer[];
  members: TabMember[];
  currentUserId: string;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "minmax(260px, 320px) 1fr",
      }}
      className="balances-grid"
    >
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          background: "var(--card)",
          border: "1px solid var(--rule)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div className="eyebrow">Who owes whom</div>
        {transfers.length > 0 ? (
          <BalanceRibbon
            transfers={transfers}
            members={members.map((m) => ({ id: m.id, name: m.name }))}
            size={260}
            highlightId={sel}
          />
        ) : (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div className="serif" style={{ fontSize: 22, color: "var(--ink-2)", marginBottom: 4 }}>
              All square
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
              No transfers needed.
            </div>
          </div>
        )}
        {transfers.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
            {transfers.length} simplified transfers
          </div>
        )}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--rule-2)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span className="eyebrow">Settlement plan</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            minimized
          </span>
        </div>
        {transfers.length === 0 ? (
          <EmptyState title="All square" sub="No transfers needed." />
        ) : (
          transfers.map((t, i) => {
            const from = memberById.get(t.from);
            const to = memberById.get(t.to);
            if (!from || !to) return null;
            const involvesMe = t.from === currentUserId || t.to === currentUserId;
            const signed = t.from === currentUserId ? -t.amount : t.to === currentUserId ? t.amount : 0;
            return (
              <div
                key={i}
                onMouseEnter={() => setSel(from.id)}
                onMouseLeave={() => setSel(null)}
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: i === transfers.length - 1 ? "none" : "1px solid var(--rule-2)",
                  background: involvesMe ? "color-mix(in oklch, var(--accent-wash) 60%, transparent)" : "transparent",
                }}
              >
                <Avatar name={from.name} id={from.id} size={28} />
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{firstName(from.name)}</span>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, color: "var(--ink-4)" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
                  <span
                    className="mono"
                    style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}
                  >
                    pays
                  </span>
                  <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
                  <I.arrow size={14} stroke="var(--accent)" />
                </div>
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{firstName(to.name)}</span>
                <Avatar name={to.name} id={to.id} size={28} />
                <div
                  className="mono tnum"
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: involvesMe ? (signed >= 0 ? "var(--pos)" : "var(--neg)") : "var(--ink)",
                    minWidth: 90,
                    textAlign: "right",
                  }}
                >
                  {involvesMe ? formatInrSigned(signed) : formatInr(t.amount)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
