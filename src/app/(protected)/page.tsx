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

  const [summaryRes, profileRes, tenantRes, groupsRes] = await Promise.all([
    supabase.rpc("tenant_summary", { p_tenant_id: tenantId, p_user_id: user.id }),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("tenants").select("name").eq("id", tenantId).single(),
    supabase.from("groups").select("id, name, group_members(user_id)").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
  ]);
  const totals = summaryRes.data?.[0] ?? { total_you_owe: 0, total_owed_to_you: 0 };
  const profile = profileRes.data;
  const tenant = tenantRes.data;
  const groups = groupsRes.data;

  const groupIds = (groups ?? []).map((g) => g.id);
  let recentExpenses: { id: string; group_id: string; description: string; amount: number; date: string; paidByName: string; groupName: string }[] = [];
  if (groupIds.length > 0) {
    const { data: expenses } = await supabase
      .from("expenses")
      .select("id, group_id, description, amount, date, profiles!expenses_paid_by_fkey(display_name), groups!inner(name)")
      .in("group_id", groupIds)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8);
    recentExpenses = (expenses ?? []).map((e) => ({
      id: e.id, group_id: e.group_id, description: e.description, amount: e.amount, date: e.date,
      paidByName: (e.profiles as unknown as { display_name: string })?.display_name ?? "Unknown",
      groupName: (e.groups as unknown as { name: string })?.name ?? "Unknown",
    }));
  }

  const firstName = profile?.display_name?.split(" ")[0] ?? "there";
  const groupGradients = [
    "linear-gradient(135deg, #111118 0%, #16213e 100%)",
    "linear-gradient(135deg, #111118 0%, #0f2027 100%)",
    "linear-gradient(135deg, #111118 0%, #1e1225 100%)",
    "linear-gradient(135deg, #111118 0%, #1f1a0e 100%)",
  ];
  const groupAccents = ["#818cf8", "#34d399", "#f472b6", "#fbbf24"];

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
    <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
      {/* Header — stacks on mobile */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-ink-faint">{tenant?.name}</p>
          <h1 className="mt-1 font-display text-2xl sm:text-[32px] font-bold text-white leading-tight">
            Hi, {firstName}
          </h1>
        </div>
        <Link href="/groups/new" transitionTypes={["nav-forward"]} className="btn-primary btn-press text-[13px] self-start sm:self-auto">
          + New Group
        </Link>
      </div>

      {/* Stats */}
      <section className="mt-8">
        <DashboardSummary totalYouOwe={Number(totals.total_you_owe)} totalOwedToYou={Number(totals.total_owed_to_you)} />
      </section>

      {/* Content — stacks on mobile, 2-col on desktop */}
      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        {/* Groups */}
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-muted">Your Groups</h2>
            <Link href="/groups" transitionTypes={["nav-forward"]} className="text-[12px] font-medium text-primary hover:text-primary-light transition-colors">
              View all →
            </Link>
          </div>
          {!groups || groups.length === 0 ? (
            <div className="card p-10 sm:p-12 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary-wash flex items-center justify-center mb-4">
                <span className="font-display text-2xl text-primary">+</span>
              </div>
              <p className="font-display text-[15px] font-semibold text-ink-muted">No groups yet</p>
              <p className="mt-2 text-[13px] text-ink-faint max-w-[240px] mx-auto">Create your first group to start splitting expenses</p>
              <Link href="/groups/new" transitionTypes={["nav-forward"]} className="btn-primary btn-press inline-block mt-6 text-[13px]">
                Create Group
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {groups.map((g, i) => (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  transitionTypes={["nav-forward"]}
                  className="group relative rounded-2xl p-5 overflow-hidden card-hover border border-white/[0.04]"
                  style={{ background: groupGradients[i % groupGradients.length] }}
                >
                  <div className="absolute top-5 right-5 h-2 w-2 rounded-full" style={{ background: groupAccents[i % groupAccents.length] }} />
                  <p className="font-display text-[17px] font-bold text-white/90 leading-snug">{g.name}</p>
                  <p className="mt-3 text-[12px] text-white/30 font-medium">{g.group_members?.length ?? 0} members</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Activity */}
        <section className="lg:col-span-2">
          <h2 className="font-display text-[15px] font-semibold text-ink-muted mb-5">Recent Activity</h2>
          <RecentExpenses expenses={recentExpenses} />
        </section>
      </div>
    </main>
    </ViewTransition>
  );
}
