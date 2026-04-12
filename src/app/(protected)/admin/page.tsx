import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ViewTransition } from "react";
import { InviteMemberForm } from "./invite-member-form";
import { MemberList } from "./member-list";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");

  const supabase = await createClient();

  // Verify tenant owner
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "owner") redirect("/");

  // Get tenant info
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  // Get all members
  const { data: members } = await supabase
    .from("tenant_members")
    .select("user_id, role, joined_at, profiles(display_name, email, avatar_url)")
    .eq("tenant_id", tenantId)
    .order("joined_at", { ascending: true });

  const memberList = (members ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role as "owner" | "member",
    joinedAt: m.joined_at,
    displayName: (m.profiles as unknown as { display_name: string })?.display_name ?? "Unknown",
    email: (m.profiles as unknown as { email: string })?.email ?? "",
    avatarUrl: (m.profiles as unknown as { avatar_url: string | null })?.avatar_url ?? null,
  }));

  // Get group count
  const { count: groupCount } = await supabase
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  // Get expense count
  const groupIds = (
    await supabase.from("groups").select("id").eq("tenant_id", tenantId)
  ).data?.map((g) => g.id) ?? [];

  let expenseCount = 0;
  if (groupIds.length > 0) {
    const { count } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .in("group_id", groupIds);
    expenseCount = count ?? 0;
  }

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Farm Admin</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Manage <span className="font-semibold text-ink">{tenant?.name}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="card-surface px-4 py-3 text-center">
          <p className="font-display text-2xl font-bold text-primary">{memberList.length}</p>
          <p className="text-xs text-ink-faint font-medium">Members</p>
        </div>
        <div className="card-surface px-4 py-3 text-center">
          <p className="font-display text-2xl font-bold text-success">{groupCount ?? 0}</p>
          <p className="text-xs text-ink-faint font-medium">Groups</p>
        </div>
        <div className="card-surface px-4 py-3 text-center">
          <p className="font-display text-2xl font-bold text-warning">{expenseCount}</p>
          <p className="text-xs text-ink-faint font-medium">Expenses</p>
        </div>
      </div>

      {/* Invite */}
      <section className="mt-8">
        <h2 className="section-label">Invite Member</h2>
        <div className="mt-3 card-surface p-5">
          <InviteMemberForm />
        </div>
      </section>

      {/* Members */}
      <section className="mt-8">
        <h2 className="section-label">Members ({memberList.length})</h2>
        <div className="mt-3">
          <MemberList members={memberList} currentUserId={user.id} />
        </div>
      </section>
    </main>
    </ViewTransition>
  );
}
