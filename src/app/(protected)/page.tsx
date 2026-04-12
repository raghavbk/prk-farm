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

  const { data: summary } = await supabase.rpc("tenant_summary", {
    p_tenant_id: tenantId,
    p_user_id: user.id,
  });

  const totals = summary?.[0] ?? { total_you_owe: 0, total_owed_to_you: 0 };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, group_members(user_id)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

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
        (e.profiles as unknown as { display_name: string })?.display_name ?? "Unknown",
      groupName:
        (e.groups as unknown as { name: string })?.name ?? "Unknown",
    }));
  }

  const firstName = profile?.display_name?.split(" ")[0] ?? "there";
  const groupColors = ["from-violet-500 to-purple-600", "from-emerald-500 to-teal-600", "from-orange-500 to-amber-600", "from-pink-500 to-rose-600", "from-cyan-500 to-blue-600"];

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
    <main className="mx-auto max-w-4xl px-6 py-8">
      {/* Welcome hero */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%)" }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-24 h-24 rounded-full bg-white/5" />
        <p className="text-sm font-medium text-white/70">
          {tenant?.name}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Here&apos;s your financial overview
        </p>
      </div>

      {/* Balance cards */}
      <section className="mt-6">
        <DashboardSummary
          totalYouOwe={Number(totals.total_you_owe)}
          totalOwedToYou={Number(totals.total_owed_to_you)}
        />
      </section>

      {/* Quick actions */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <Link
          href="/groups/new"
          transitionTypes={["nav-forward"]}
          className="card-surface card-hover flex items-center gap-3 px-4 py-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-wash text-primary">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">New Group</p>
            <p className="text-xs text-ink-faint">Create &amp; track</p>
          </div>
        </Link>
        <Link
          href="/admin"
          transitionTypes={["nav-forward"]}
          className="card-surface card-hover flex items-center gap-3 px-4 py-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-wash text-warning">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Manage Farm</p>
            <p className="text-xs text-ink-faint">Invite &amp; admin</p>
          </div>
        </Link>
      </section>

      {/* Groups */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-ink">Your Groups</h2>
          <Link
            href="/groups"
            transitionTypes={["nav-forward"]}
            className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            View all →
          </Link>
        </div>
        {!groups || groups.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-wash text-primary mb-4">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
            </div>
            <p className="text-sm font-medium text-ink-muted">No groups yet</p>
            <p className="mt-1 text-xs text-ink-faint">Create your first group to start splitting expenses</p>
            <Link href="/groups/new" transitionTypes={["nav-forward"]} className="btn-primary btn-press inline-block mt-4 text-sm">
              Create Group
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((g, i) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                transitionTypes={["nav-forward"]}
                className="group relative rounded-2xl p-4 text-white overflow-hidden card-hover"
                style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${groupColors[i % groupColors.length]}`} />
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
                <div className="relative">
                  <p className="font-display text-lg font-bold">{g.name}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="flex -space-x-1">
                      {(g.group_members ?? []).slice(0, 3).map((_, j) => (
                        <div key={j} className="h-5 w-5 rounded-full bg-white/30 border-2 border-white/20" />
                      ))}
                    </div>
                    <span className="text-xs text-white/70 font-medium">
                      {g.group_members?.length ?? 0} members
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section className="mt-8">
        <h2 className="text-sm font-bold text-ink mb-3">Recent Activity</h2>
        <RecentExpenses expenses={recentExpenses} />
      </section>
    </main>
    </ViewTransition>
  );
}
