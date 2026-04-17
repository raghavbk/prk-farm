import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";
import { formatINR } from "@/lib/format";
import { GroupBalances } from "@/components/group-balances";

export default async function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");

  const supabase = await createClient();
  const { data: group } = await supabase.from("groups").select("*").eq("id", groupId).eq("tenant_id", tenantId).single();
  if (!group) notFound();

  const { data: members } = await supabase.from("group_members").select("user_id, ownership_pct, profiles(display_name, email)").eq("group_id", groupId);
  const { data: expenses } = await supabase.from("expenses").select("*, profiles!expenses_paid_by_fkey(display_name)").eq("group_id", groupId).order("date", { ascending: false }).order("created_at", { ascending: false });
  const { data: membership } = await supabase.from("tenant_members").select("role").eq("tenant_id", tenantId).eq("user_id", user.id).single();
  const isTenantOwner = membership?.role === "owner";

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
          <Link href="/groups" transitionTypes={["nav-back"]} className="text-[12px] font-medium text-ink-faint hover:text-ink-muted transition-colors">
            ← Back to Groups
          </Link>
          <h1 className="mt-2 font-display text-2xl sm:text-[32px] font-bold text-white">{group.name}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {isTenantOwner && (
            <Link href={`/groups/${groupId}/edit`} transitionTypes={["nav-forward"]} className="btn-secondary btn-press text-[13px]">
              Edit Group
            </Link>
          )}
          <Link href={`/groups/${groupId}/expenses/new`} transitionTypes={["nav-forward"]} className="btn-primary btn-press text-[13px]">
            + Add Expense
          </Link>
        </div>
      </div>

      {/* Content — stacks on mobile, side-by-side on desktop */}
      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <h2 className="section-label mb-3">Members</h2>
            <div className="card divide-y divide-white/[0.04] overflow-hidden">
              {(members ?? []).map((m) => (
                <div key={m.user_id} className="flex items-center justify-between px-5 py-4">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-[14px] font-medium text-ink/90 truncate">
                      {(m.profiles as unknown as { display_name: string })?.display_name}
                    </p>
                    <p className="text-[12px] text-ink-faint truncate">
                      {(m.profiles as unknown as { email: string })?.email}
                    </p>
                  </div>
                  <span className="font-display text-[14px] font-bold text-primary shrink-0">{m.ownership_pct}%</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="section-label mb-3">Balances</h2>
            <GroupBalances groupId={groupId} />
          </section>
        </div>

        <section className="lg:col-span-3">
          <h2 className="section-label mb-3">Expenses</h2>
          {!expenses || expenses.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-[13px] text-ink-faint">No expenses yet. Add your first one above.</p>
            </div>
          ) : (
            <div className="card divide-y divide-white/[0.04] overflow-hidden">
              {expenses.map((e) => {
                const canEdit = e.created_by === user.id || isTenantOwner;
                return (
                  <div key={e.id} className="flex items-center justify-between px-5 py-4 gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-ink/90 truncate">{e.description}</p>
                      <p className="mt-1 text-[12px] text-ink-faint truncate">
                        {(e.profiles as unknown as { display_name: string })?.display_name ?? "Unknown"} · {e.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <p className="font-display text-[15px] font-bold text-primary">{formatINR(e.amount)}</p>
                      {canEdit && (
                        <Link href={`/groups/${groupId}/expenses/${e.id}/edit`} transitionTypes={["nav-forward"]} className="text-[12px] text-ink-faint hover:text-primary transition-colors">
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
      </div>
    </main>
    </ViewTransition>
  );
}
