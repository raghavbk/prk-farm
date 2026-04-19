import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";
import { GroupCard, type GroupCardMember } from "@/components/ui/group-card";
import { I } from "@/components/ui/icons";

type BalanceRow = { group_id: string; creditor_id: string; debtor_id: string; net_amount: number };

function humanUpdated(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");

  const supabase = await createClient();

  const groupsRes = await supabase
    .from("groups")
    .select("id, name, created_at, updated_at, group_members(user_id, profiles(id, display_name))")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  type GroupRow = {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    group_members:
      | { user_id: string; profiles: { id: string; display_name: string } | null }[]
      | null;
  };
  const groups: GroupRow[] = (groupsRes.data ?? []) as unknown as GroupRow[];
  const groupIds = groups.map((g) => g.id);

  const [balancesRes, totalsRes] = groupIds.length
    ? await Promise.all([
        supabase.from("group_balances").select("*").in("group_id", groupIds),
        supabase.from("expenses").select("group_id, amount").in("group_id", groupIds),
      ])
    : [{ data: [] as BalanceRow[] }, { data: [] as { group_id: string; amount: number }[] }];

  const balances = (balancesRes.data ?? []) as BalanceRow[];
  const totals = (totalsRes.data ?? []) as { group_id: string; amount: number }[];

  const totalsByGroup = new Map<string, { total: number; count: number }>();
  for (const e of totals) {
    const cur = totalsByGroup.get(e.group_id) ?? { total: 0, count: 0 };
    cur.total += Number(e.amount);
    cur.count += 1;
    totalsByGroup.set(e.group_id, cur);
  }

  const myBalanceByGroup = new Map<string, number>();
  for (const b of balances) {
    if (b.creditor_id !== user.id && b.debtor_id !== user.id) continue;
    const cur = myBalanceByGroup.get(b.group_id) ?? 0;
    const delta = b.creditor_id === user.id ? Number(b.net_amount) : -Number(b.net_amount);
    myBalanceByGroup.set(b.group_id, cur + delta);
  }

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
      <div style={{ viewTransitionName: "screen" }}>
        <div
          className="mx-auto"
          style={{ maxWidth: 1120, padding: "clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 56px" }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              marginBottom: 28,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Tenant · {groups.length} {groups.length === 1 ? "group" : "groups"}
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
                Groups
              </h1>
            </div>
            <Link
              href="/groups/new"
              transitionTypes={["nav-forward"]}
              className="btn btn-primary"
            >
              <I.plus size={14} /> New group
            </Link>
          </div>

          {groups.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "clamp(32px, 6vw, 56px) clamp(24px, 4vw, 40px)",
                textAlign: "center",
                maxWidth: 520,
                margin: "24px auto 0",
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                No groups yet
              </div>
              <div
                className="serif"
                style={{
                  fontSize: "clamp(22px, 3.5vw, 28px)",
                  letterSpacing: "-0.015em",
                  lineHeight: 1.1,
                  margin: "0 0 10px",
                }}
              >
                Start with your first <em>activity</em>.
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 20px", maxWidth: 320, marginInline: "auto" }}>
                Groups organize expenses by farm project — crops, land, water,
                equipment — each with its own ownership split.
              </p>
              <Link
                href="/groups/new"
                transitionTypes={["nav-forward"]}
                className="btn btn-primary"
              >
                <I.plus size={14} /> Create your first group
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
              }}
            >
              {groups.map((g, i) => {
                const members: GroupCardMember[] = (g.group_members ?? [])
                  .map((gm) =>
                    gm.profiles ? { id: gm.profiles.id, name: gm.profiles.display_name } : null,
                  )
                  .filter((m): m is GroupCardMember => m !== null);
                const summary = totalsByGroup.get(g.id) ?? { total: 0, count: 0 };
                const myBal = myBalanceByGroup.get(g.id);
                return (
                  <GroupCard
                    key={g.id}
                    id={g.id}
                    name={g.name}
                    members={members}
                    expenseCount={summary.count}
                    totalInr={summary.total}
                    myBalance={myBal ?? null}
                    updatedLabel={humanUpdated(g.updated_at)}
                    idx={i}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ViewTransition>
  );
}
