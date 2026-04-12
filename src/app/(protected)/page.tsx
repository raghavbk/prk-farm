import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";
import { DashboardSummary } from "@/components/dashboard-summary";
import { RecentExpenses } from "@/components/recent-expenses";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");

  const supabase = await createClient();

  // Get tenant summary (total you owe / owed to you)
  const { data: summary } = await supabase.rpc("tenant_summary", {
    p_tenant_id: tenantId,
    p_user_id: user.id,
  });

  const totals = summary?.[0] ?? { total_you_owe: 0, total_owed_to_you: 0 };

  // Get groups in this tenant
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, group_members(user_id)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  // Get recent expenses across all groups in tenant
  const groupIds = (groups ?? []).map((g) => g.id);
  let recentExpenses: {
    id: string;
    group_id: string;
    description: string;
    amount: number;
    date: string;
    paidByName: string;
    groupName: string;
  }[] = [];

  if (groupIds.length > 0) {
    const { data: expenses } = await supabase
      .from("expenses")
      .select("id, group_id, description, amount, date, profiles!expenses_paid_by_fkey(display_name), groups!inner(name)")
      .in("group_id", groupIds)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);

    recentExpenses = (expenses ?? []).map((e) => ({
      id: e.id,
      group_id: e.group_id,
      description: e.description,
      amount: e.amount,
      date: e.date,
      paidByName:
        (e.profiles as unknown as { display_name: string })?.display_name ??
        "Unknown",
      groupName:
        (e.groups as unknown as { name: string })?.name ?? "Unknown",
    }));
  }

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>

      <section className="mt-6">
        <DashboardSummary
          totalYouOwe={Number(totals.total_you_owe)}
          totalOwedToYou={Number(totals.total_owed_to_you)}
        />
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="section-label">Your Groups</h2>
          <Link
            href="/groups/new"
            transitionTypes={["nav-forward"]}
            className="text-sm font-medium text-olive hover:text-olive-light transition-colors"
          >
            + New
          </Link>
        </div>
        {!groups || groups.length === 0 ? (
          <div className="mt-3 rounded-xl border-2 border-dashed border-border py-8 text-center">
            <p className="text-sm text-ink-faint">
              No groups yet.{" "}
              <Link href="/groups/new" transitionTypes={["nav-forward"]} className="font-medium text-olive underline underline-offset-2">
                Create one
              </Link>{" "}
              to start tracking expenses.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  transitionTypes={["nav-forward"]}
                  className="card-surface card-hover block px-4 py-3.5"
                >
                  <span className="font-medium text-ink">{g.name}</span>
                  <span className="ml-2 text-xs text-ink-faint">
                    {g.group_members?.length ?? 0} members
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="section-label">Recent Expenses</h2>
        <div className="mt-3">
          <RecentExpenses expenses={recentExpenses} />
        </div>
      </section>
    </main>
    </ViewTransition>
  );
}
