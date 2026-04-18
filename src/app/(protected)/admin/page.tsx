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
    <main
      className="mx-auto"
      style={{ maxWidth: 1120, padding: "clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 56px", width: "100%" }}
    >
      {/* Header */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Tenant administration
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <h1
          className="serif"
          style={{
            fontSize: "clamp(28px, 5vw, 44px)",
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            color: "var(--ink)",
          }}
        >
          Who belongs to <em>{tenant?.name}</em>.
        </h1>
      </div>
      <p
        style={{
          fontSize: 14,
          color: "var(--ink-3)",
          margin: "0 0 28px",
          maxWidth: 560,
        }}
      >
        Only Owners and Admins can manage who has access. Invites expire after 7 days.
      </p>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <StatCard label="Members" value={memberList.length} />
        <StatCard label="Groups" value={groupCount ?? 0} />
        <StatCard label="Expenses" value={expenseCount} />
      </div>

      {/* Invite */}
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Invite people
      </div>
      <div className="card" style={{ padding: 20, marginBottom: 28 }}>
        <InviteMemberForm />
      </div>

      {/* Members */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
          gap: 10,
        }}
      >
        <h2 className="serif" style={{ fontSize: 22, margin: 0, letterSpacing: "-0.015em" }}>
          Members
        </h2>
        <span className="eyebrow" style={{ color: "var(--ink-4)" }}>
          {memberList.length} {memberList.length === 1 ? "person" : "people"}
        </span>
      </div>
      <MemberList members={memberList} currentUserId={user.id} />
    </main>
    </ViewTransition>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="card"
      style={{
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div className="eyebrow">{label}</div>
      <div
        className="serif"
        style={{ fontSize: 28, lineHeight: 1, letterSpacing: "-0.01em", color: "var(--ink)" }}
      >
        {value}
      </div>
    </div>
  );
}
