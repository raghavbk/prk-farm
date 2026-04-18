import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";

const gradients = [
  "linear-gradient(135deg, #111118 0%, #16213e 100%)",
  "linear-gradient(135deg, #111118 0%, #0f2027 100%)",
  "linear-gradient(135deg, #111118 0%, #1e1225 100%)",
  "linear-gradient(135deg, #111118 0%, #1f1a0e 100%)",
  "linear-gradient(135deg, #111118 0%, #0e1f1a 100%)",
  "linear-gradient(135deg, #111118 0%, #1a0e1f 100%)",
];
const accents = ["#818cf8", "#34d399", "#f472b6", "#fbbf24", "#2dd4bf", "#c084fc"];

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
    <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-[32px] font-bold text-white">Groups</h1>
          <p className="mt-1 text-[13px] text-ink-faint">Manage expense groups and ownership splits</p>
        </div>
        <Link href="/groups/new" transitionTypes={["nav-forward"]} className="btn btn-accent btn-press self-start sm:self-auto">
          + New Group
        </Link>
      </div>

      {!groups || groups.length === 0 ? (
        <div className="mt-12 card p-10 sm:p-16 text-center max-w-md mx-auto">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary-wash flex items-center justify-center mb-5">
            <span className="font-display text-3xl text-primary">+</span>
          </div>
          <p className="font-display text-lg font-semibold text-ink-muted">No groups yet</p>
          <p className="mt-2 text-[13px] text-ink-faint max-w-[280px] mx-auto">Groups let you track expenses for farm activities</p>
          <Link href="/groups/new" transitionTypes={["nav-forward"]} className="btn btn-accent btn-press mt-6 inline-flex">
            Create your first group
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, i) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              transitionTypes={["nav-forward"]}
              className="group relative rounded-2xl p-6 overflow-hidden card-hover border border-white/[0.04]"
              style={{ background: gradients[i % gradients.length] }}
            >
              <div className="absolute top-6 right-6 h-2.5 w-2.5 rounded-full" style={{ background: accents[i % accents.length] }} />
              <p className="font-display text-[18px] font-bold text-white/90">{group.name}</p>
              <p className="mt-4 text-[12px] text-white/25 font-medium">{group.group_members?.length ?? 0} members</p>
            </Link>
          ))}
        </div>
      )}
    </main>
    </ViewTransition>
  );
}
