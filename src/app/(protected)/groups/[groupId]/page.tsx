import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
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
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/groups"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Groups
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
        </div>
        {isTenantOwner && (
          <Link
            href={`/groups/${groupId}/edit`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
        )}
      </div>

      {/* Members & Ownership */}
      <section className="mt-6">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Members
        </h2>
        <ul className="mt-2 divide-y divide-gray-100">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {(m.profiles as unknown as { display_name: string })?.display_name}
                </p>
                <p className="text-xs text-gray-500">
                  {(m.profiles as unknown as { email: string })?.email}
                </p>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {m.ownership_pct}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Balances */}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Balances
        </h2>
        <div className="mt-2">
          <GroupBalances groupId={groupId} />
        </div>
      </section>

      {/* Expenses */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Expenses
          </h2>
          <Link
            href={`/groups/${groupId}/expenses/new`}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Add Expense
          </Link>
        </div>
        {!expenses || expenses.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No expenses yet</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100">
            {expenses.map((e) => {
              const canEdit = e.created_by === user.id || isTenantOwner;
              return (
                <li key={e.id} className="py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {e.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        Paid by{" "}
                        {(e.profiles as unknown as { display_name: string })
                          ?.display_name ?? "Unknown"}{" "}
                        on {e.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatINR(e.amount)}
                      </p>
                      {canEdit && (
                        <Link
                          href={`/groups/${groupId}/expenses/${e.id}/edit`}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
