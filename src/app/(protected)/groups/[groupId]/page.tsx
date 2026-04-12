import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";
import { formatINR } from "@/lib/format";
import { GroupBalances } from "@/components/group-balances";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");

  const supabase = await createClient();

  // Fetch group with members
  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .eq("tenant_id", tenantId)
    .single();

  if (!group) notFound();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, ownership_pct, profiles(display_name, email)")
    .eq("group_id", groupId);

  // Fetch expenses (most recent first)
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*, profiles!expenses_paid_by_fkey(display_name)")
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  // Check if current user is tenant owner (for edit permissions)
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();

  const isTenantOwner = membership?.role === "owner";

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/groups"
            transitionTypes={["nav-back"]}
            className="text-xs font-medium text-ink-faint hover:text-ink-muted transition-colors"
          >
            &larr; Groups
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">{group.name}</h1>
        </div>
        {isTenantOwner && (
          <Link
            href={`/groups/${groupId}/edit`}
            transitionTypes={["nav-forward"]}
            className="btn-secondary btn-press"
          >
            Edit
          </Link>
        )}
      </div>

      <section className="mt-8">
        <h2 className="section-label">Members</h2>
        <div className="mt-2 card-surface divide-y divide-border overflow-hidden">
          {(members ?? []).map((m) => (
            <div key={m.user_id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  {(m.profiles as unknown as { display_name: string })?.display_name}
                </p>
                <p className="text-xs text-ink-faint">
                  {(m.profiles as unknown as { email: string })?.email}
                </p>
              </div>
              <span className="font-display text-sm font-semibold text-olive">
                {m.ownership_pct}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="section-label">Balances</h2>
        <div className="mt-2">
          <GroupBalances groupId={groupId} />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="section-label">Expenses</h2>
          <Link
            href={`/groups/${groupId}/expenses/new`}
            transitionTypes={["nav-forward"]}
            className="btn-primary btn-press text-sm"
          >
            Add Expense
          </Link>
        </div>
        {!expenses || expenses.length === 0 ? (
          <div className="mt-3 rounded-xl border-2 border-dashed border-border py-6 text-center">
            <p className="text-sm text-ink-faint">No expenses yet</p>
          </div>
        ) : (
          <div className="mt-3 card-surface divide-y divide-border overflow-hidden">
            {expenses.map((e) => {
              const canEdit = e.created_by === user.id || isTenantOwner;
              return (
                <div key={e.id} className="flex items-start justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {e.description}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      Paid by{" "}
                      {(e.profiles as unknown as { display_name: string })
                        ?.display_name ?? "Unknown"}{" "}
                      &middot; {e.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-sm font-semibold text-amber">
                      {formatINR(e.amount)}
                    </p>
                    {canEdit && (
                      <Link
                        href={`/groups/${groupId}/expenses/${e.id}/edit`}
                        transitionTypes={["nav-forward"]}
                        className="text-xs text-ink-faint hover:text-olive transition-colors"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
    </ViewTransition>
  );
}
