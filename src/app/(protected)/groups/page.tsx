import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";

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
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Groups</h1>
        <Link
          href="/groups/new"
          transitionTypes={["nav-forward"]}
          className="btn-primary btn-press text-sm"
        >
          New Group
        </Link>
      </div>

      {!groups || groups.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-border py-10 text-center">
          <p className="text-sm text-ink-faint">
            No groups yet. Create one to start tracking expenses.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                transitionTypes={["nav-forward"]}
                className="card-surface card-hover block px-4 py-3.5"
              >
                <span className="font-medium text-ink">{group.name}</span>
                <span className="ml-2 text-xs text-ink-faint">
                  {group.group_members?.length ?? 0} members
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
    </ViewTransition>
  );
}
