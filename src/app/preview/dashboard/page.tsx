import Link from "next/link";
import { AnimatedInr } from "@/components/ui/animated-inr";
import { MiniStat } from "@/components/ui/mini-stat";
import { SectionHeader } from "@/components/ui/section-header";
import { GroupCard, type GroupCardMember } from "@/components/ui/group-card";
import { ExpenseRow } from "@/components/ui/expense-row";
import { Sparkline } from "@/components/ui/sparkline";
import { I } from "@/components/ui/icons";
import { firstName } from "@/lib/format";
import { GROUPS, EXPENSES, SUMMARY, TENANT, CURRENT_USER_ID, memberById } from "../seed";

function greet() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function formatDateHeader(d: Date) {
  const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
  const day = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${weekday} · ${day}`;
}

export default function PreviewDashboardPage() {
  const me = memberById(CURRENT_USER_ID);
  const net = SUMMARY.totalOwedToYou - SUMMARY.totalYouOwe;
  const today = formatDateHeader(new Date());
  const recent = [...EXPENSES].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const groupNameById = new Map(GROUPS.map((g) => [g.id, g.name]));

  return (
    <div style={{ viewTransitionName: "screen" }}>
      <div className="mx-auto" style={{ maxWidth: 1120, padding: "clamp(18px, 3vw, 32px) clamp(18px, 4vw, 44px) 56px" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {today} · {TENANT.name}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "clamp(18px, 2.2vw, 20px)", fontWeight: 500, color: "var(--ink-2)" }}>
                {greet()},
              </span>
              <span
                className="serif"
                style={{
                  fontSize: "clamp(28px, 4.5vw, 34px)",
                  color: "var(--ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                <em>{firstName(me.name)}</em>
              </span>
            </div>
          </div>
          <div className="hidden md:flex" style={{ gap: 8 }}>
            <button className="btn btn-ghost" style={{ width: 40, padding: 0 }} aria-label="Notifications">
              <I.bell size={16} />
            </button>
            <Link href={`/preview/group`} className="btn btn-accent shimmer">
              <I.plus size={14} /> Log expense
            </Link>
          </div>
        </div>

        {/* Hero */}
        <div
          className="rise"
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "clamp(20px, 3.5vw, 40px) clamp(20px, 4vw, 44px)",
            borderRadius: 20,
            background: "var(--card)",
            border: "1px solid var(--rule)",
            marginBottom: 32,
          }}
        >
          <div className="mesh" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
          <div
            style={{
              position: "relative",
              display: "flex",
              gap: 32,
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                Your net position
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <div
                  className="serif"
                  style={{
                    fontSize: "clamp(56px, 10vw, 96px)",
                    lineHeight: 0.95,
                    color: net >= 0 ? "var(--pos)" : "var(--neg)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  <AnimatedInr value={Math.abs(net)} />
                </div>
                <div style={{ fontSize: "clamp(13px, 1.6vw, 18px)", color: "var(--ink-3)", paddingBottom: 8 }}>
                  {net === 0 ? "all squared up" : net > 0 ? "in your favor" : "you owe"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 24, flexWrap: "wrap", alignItems: "center" }}>
                <MiniStat label="People owe you" amount={SUMMARY.totalOwedToYou} tone="pos" />
                <div style={{ width: 1, alignSelf: "stretch", background: "var(--rule)" }} />
                <MiniStat label="You owe" amount={SUMMARY.totalYouOwe} tone="neg" />
                <div style={{ width: 1, alignSelf: "stretch", background: "var(--rule)" }} />
                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>This week</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="mono tnum" style={{ fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>
                      ₹1,24,500
                    </span>
                    <Sparkline values={[42, 68, 51, 89, 72, 124]} w={60} h={16} />
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:flex" style={{ flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
              <Link href="#" className="btn btn-ghost">
                View balances <I.arrow size={12} />
              </Link>
              <Link href="#" className="btn btn-ghost">
                Timeline <I.arrow size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* Groups */}
        <SectionHeader title="Groups" trailing={`${GROUPS.length} active`} actionLabel="View all" actionHref="#" />
        <div
          style={{
            display: "grid",
            gap: 12,
            marginBottom: 32,
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
          }}
        >
          {GROUPS.map((g, i) => {
            const members: GroupCardMember[] = g.memberIds.map((id) => ({
              id,
              name: memberById(id).name,
            }));
            return (
              <GroupCard
                key={g.id}
                id={g.id}
                name={g.name}
                members={members}
                expenseCount={g.expenseCount}
                totalInr={g.total}
                myBalance={g.myBalance}
                tag={g.tag}
                updatedLabel={g.updatedLabel}
                idx={i}
              />
            );
          })}
        </div>

        {/* Recent */}
        <SectionHeader title="Recent activity" trailing="last 7 days" actionLabel="Timeline" actionHref="#" />
        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          {recent.map((e, i) => {
            const payer = memberById(e.paid_by);
            return (
              <ExpenseRow
                key={e.id}
                href="#"
                description={e.description}
                amount={e.amount}
                date={e.date}
                paidById={payer.id}
                paidByName={payer.name}
                groupName={groupNameById.get(e.group_id)}
                isLast={i === recent.length - 1}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
