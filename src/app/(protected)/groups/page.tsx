import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";

const groupColors = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
];

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
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Groups</h1>
          <p className="mt-1 text-sm text-ink-faint">Manage your expense groups and ownership splits</p>
        </div>
        <Link
          href="/groups/new"
          transitionTypes={["nav-forward"]}
          className="btn-primary btn-press text-sm"
        >
          + New Group
        </Link>
      </div>

      {!groups || groups.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border p-14 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-wash text-primary mb-5">
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
          </div>
          <p className="text-base font-semibold text-ink">No groups yet</p>
          <p className="mt-2 text-sm text-ink-faint max-w-xs mx-auto">
            Groups let you track expenses for farm activities like crop seasons, land development, and utilities
          </p>
          <Link href="/groups/new" transitionTypes={["nav-forward"]} className="btn-primary btn-press inline-block mt-5">
            Create your first group
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, i) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              transitionTypes={["nav-forward"]}
              className="group relative rounded-2xl p-5 text-white overflow-hidden card-hover border border-white/5"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${groupColors[i % groupColors.length]}`} />
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-black/10 translate-y-1/3 -translate-x-1/3" />
              <div className="relative">
                <p className="font-display text-xl font-bold leading-tight">{group.name}</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {(group.group_members ?? []).slice(0, 4).map((_, j) => (
                      <div key={j} className="h-6 w-6 rounded-full bg-white/25 border-2 border-white/10" />
                    ))}
                  </div>
                  <span className="text-xs text-white/70 font-medium">
                    {group.group_members?.length ?? 0} members
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
    </ViewTransition>
  );
}
