import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatInr } from "@/lib/format";

type ExpenseRow = {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  date: string;
  paid_by: string;
  profiles: { display_name: string } | null;
  groups: { name: string } | null;
};

export default async function TimelinePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");

  const supabase = await createClient();

  const [groupsRes] = await Promise.all([
    supabase.from("groups").select("id, name").eq("tenant_id", tenantId),
  ]);
  const groups = groupsRes.data ?? [];
  const groupIds = groups.map((g) => g.id);

  const expensesRes = groupIds.length
    ? await supabase
        .from("expenses")
        .select(
          "id, group_id, description, amount, date, paid_by, profiles!expenses_paid_by_fkey(display_name), groups!inner(name)",
        )
        .in("group_id", groupIds)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
    : { data: [] as ExpenseRow[] };

  const rows = (expensesRes.data ?? []) as unknown as ExpenseRow[];

  // Running total by chronological order (oldest → newest).
  const asc = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const running = new Map<string, number>();
  let run = 0;
  for (const e of asc) {
    run += Number(e.amount);
    running.set(e.id, run);
  }
  const grandTotal = run;

  // Group by date (newest first).
  const byDate = new Map<string, ExpenseRow[]>();
  for (const e of rows) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  const dates = Array.from(byDate.keys()).sort().reverse();

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
      <div style={{ viewTransitionName: "screen" }}>
        <div
          className="mx-auto"
          style={{ maxWidth: 920, padding: "clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 56px" }}
        >
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Tenant ledger
          </div>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(34px, 6vw, 48px)",
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Timeline
          </h1>
          <div style={{ display: "flex", gap: 28, marginTop: 18, marginBottom: 32, flexWrap: "wrap" }}>
            <Stat label="Grand total" value={formatInr(grandTotal)} big />
            <Stat label="Entries" value={rows.length} />
            <Stat label="Active groups" value={groups.length} />
          </div>

          {rows.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div className="serif" style={{ fontSize: 22, color: "var(--ink-2)", marginBottom: 4 }}>
                No expenses yet
              </div>
              <p className="eyebrow" style={{ color: "var(--ink-3)", margin: "0 0 16px" }}>
                Log one to start the timeline.
              </p>
              <Link href="/groups" className="btn btn-ghost">
                Go to groups
              </Link>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 74,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: "var(--rule)",
                }}
              />
              {dates.map((d, di) => {
                const dObj = new Date(d);
                const day = dObj.getDate();
                const month = dObj.toLocaleDateString("en-IN", { month: "short" });
                const items = byDate.get(d)!;
                return (
                  <div key={d} style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                    <div style={{ width: 58, flexShrink: 0, textAlign: "right", paddingTop: 10 }}>
                      <div className="serif" style={{ fontSize: 28, lineHeight: 1, color: "var(--ink)" }}>
                        {day}
                      </div>
                      <div className="eyebrow" style={{ marginTop: 2 }}>
                        {month}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 32,
                        flexShrink: 0,
                        display: "flex",
                        justifyContent: "center",
                        paddingTop: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "var(--accent)",
                          border: "3px solid var(--bg)",
                          zIndex: 1,
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                      {items.map((e, i) => {
                        const payerName = e.profiles?.display_name ?? "Unknown";
                        const groupName = e.groups?.name ?? "";
                        return (
                          <Link
                            key={e.id}
                            href={`/groups/${e.group_id}`}
                            className="rise"
                            style={{
                              animationDelay: `${(di * 3 + i) * 40}ms`,
                              padding: 14,
                              borderRadius: 12,
                              background: "var(--card)",
                              border: "1px solid var(--rule)",
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              textDecoration: "none",
                              color: "inherit",
                              transition: "border-color 0.15s",
                            }}
                          >
                            <Avatar id={e.paid_by} name={payerName} size={32} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 450,
                                  color: "var(--ink)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {e.description}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                                {payerName.split(" ")[0]} · {groupName}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div
                                className="serif tnum"
                                style={{ fontSize: 16, color: "var(--ink)" }}
                              >
                                {formatInr(Number(e.amount))}
                              </div>
                              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
                                running · {formatInr(running.get(e.id) ?? 0)}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ViewTransition>
  );
}

function Stat({ label, value, big = false }: { label: string; value: React.ReactNode; big?: boolean }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div
        className={big ? "serif" : "mono tnum"}
        style={{
          fontSize: big ? 28 : 18,
          fontWeight: big ? 400 : 500,
          color: "var(--ink)",
          letterSpacing: big ? "-0.01em" : 0,
        }}
      >
        {value}
      </div>
    </div>
  );
}
