import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");

  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, created_at, group_members(user_id)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Groups</h1>
        <Link
          href="/groups/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          New Group
        </Link>
      </div>

      {!groups || groups.length === 0 ? (
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">
            No groups yet. Create one to start tracking expenses.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{group.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {group.group_members?.length ?? 0} members
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
