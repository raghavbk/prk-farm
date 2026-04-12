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
    <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
      <div>
        <h1 className="font-display text-2xl sm:text-[32px] font-bold text-white">Farm Admin</h1>
        <p className="mt-1 text-[13px] text-ink-faint">
          Manage <span className="font-semibold text-ink">{tenant?.name}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card px-5 py-4 text-center">
          <p className="font-display text-2xl font-bold text-primary">{memberList.length}</p>
          <p className="text-[12px] text-ink-faint font-medium mt-1">Members</p>
        </div>
        <div className="card px-5 py-4 text-center">
          <p className="font-display text-2xl font-bold text-success">{groupCount ?? 0}</p>
          <p className="text-[12px] text-ink-faint font-medium mt-1">Groups</p>
        </div>
        <div className="card px-5 py-4 text-center">
          <p className="font-display text-2xl font-bold text-warning">{expenseCount}</p>
          <p className="text-[12px] text-ink-faint font-medium mt-1">Expenses</p>
        </div>
      </div>

      {/* Invite */}
      <section className="mt-8">
        <h2 className="section-label">Invite Member</h2>
        <div className="mt-3 card p-5 sm:p-6 overflow-hidden">
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
