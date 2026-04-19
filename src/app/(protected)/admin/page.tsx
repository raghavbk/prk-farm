import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { canManageTenant } from "@/lib/platform";
import { redirect } from "next/navigation";
import { ViewTransition } from "react";
import { AdminShell } from "./admin-shell";
import type { AdminMember } from "./members-tab";
import type { PendingInvite } from "./invites-tab";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");

  // Tenant admin OR platform admin.
  if (!(await canManageTenant(tenantId))) redirect("/");

  const supabase = await createClient();

  const [tenantRes, membersRes, invitesRes] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", tenantId).single(),
    supabase
      .from("tenant_members")
      .select("user_id, role, joined_at, profiles(display_name, email)")
      .eq("tenant_id", tenantId)
      .order("joined_at", { ascending: true }),
    // Open invites = anything the admin can still act on. We intentionally
    // include expired rows so admins can resend them; `accepted` and
    // `revoked` are terminal and stay hidden.
    supabase
      .from("tenant_invites")
      .select("id, email, role, invited_by, created_at, expires_at, status")
      .eq("tenant_id", tenantId)
      .in("status", ["pending", "expired"])
      .order("created_at", { ascending: false }),
  ]);

  type MemberRow = {
    user_id: string;
    role: string;
    joined_at: string;
    profiles: { display_name: string; email: string } | null;
  };
  const rows = (membersRes.data ?? []) as unknown as MemberRow[];

  const members: AdminMember[] = rows.map((r) => ({
    userId: r.user_id,
    role: (r.role === "admin" ? "admin" : "member") as "admin" | "member",
    joinedAt: r.joined_at,
    displayName: r.profiles?.display_name ?? "Unknown",
    email: r.profiles?.email ?? "",
  }));

  type InviteRow = {
    id: string;
    email: string;
    role: string;
    invited_by: string | null;
    created_at: string;
    expires_at: string;
    status: "pending" | "expired" | "accepted" | "revoked";
  };
  const inviteRows = (invitesRes.data ?? []) as unknown as InviteRow[];
  const pendingInvites: PendingInvite[] = inviteRows.map((i) => ({
    inviteId: i.id,
    email: i.email,
    displayName: i.email.split("@")[0],
    role: (i.role === "admin" ? "admin" : "member") as "admin" | "member",
    invitedAt: i.created_at,
    expiresAt: i.expires_at,
    statusExpired: i.status === "expired",
  }));

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
      <div style={{ viewTransitionName: "screen" }}>
        <main
          className="mx-auto"
          style={{
            maxWidth: 1040,
            padding: "clamp(20px, 3vw, 28px) clamp(20px, 4vw, 44px) 56px",
            width: "100%",
          }}
        >
          <AdminShell
            tenantName={tenant(tenantRes.data?.name)}
            members={members}
            pendingInvites={pendingInvites}
            currentUserId={user.id}
          />
        </main>
      </div>
    </ViewTransition>
  );
}

function tenant(name: string | undefined | null): string {
  return name?.trim() ? name : "this tenant";
}
