import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const [tenantRes, membersRes] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", tenantId).single(),
    supabase
      .from("tenant_members")
      .select("user_id, role, joined_at, profiles(display_name, email)")
      .eq("tenant_id", tenantId)
      .order("joined_at", { ascending: true }),
  ]);

  type MemberRow = {
    user_id: string;
    role: string;
    joined_at: string;
    profiles: { display_name: string; email: string } | null;
  };
  const rows = (membersRes.data ?? []) as unknown as MemberRow[];
  const memberUserIds = rows.map((r) => r.user_id);

  // A pending invite = a tenant_members row whose Supabase Auth user has not
  // confirmed their email yet. Probe auth.users via the service-role admin
  // client and classify by email_confirmed_at.
  const pendingUserIds = new Set<string>();
  if (memberUserIds.length > 0) {
    try {
      const admin = createAdminClient();
      // admin.listUsers returns up to perPage; a tenant will be small so 1000 is plenty.
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of list?.users ?? []) {
        if (memberUserIds.includes(u.id) && !u.email_confirmed_at) {
          pendingUserIds.add(u.id);
        }
      }
    } catch {
      // Admin API unavailable (missing service role key) — treat everyone as confirmed.
    }
  }

  const members: AdminMember[] = [];
  const pendingInvites: PendingInvite[] = [];
  for (const r of rows) {
    const displayName = r.profiles?.display_name ?? "Unknown";
    const email = r.profiles?.email ?? "";
    const role = (r.role === "admin" ? "admin" : "member") as "admin" | "member";
    if (pendingUserIds.has(r.user_id)) {
      pendingInvites.push({
        userId: r.user_id,
        email,
        displayName,
        role,
        invitedAt: r.joined_at,
      });
    } else {
      members.push({
        userId: r.user_id,
        role,
        joinedAt: r.joined_at,
        displayName,
        email,
      });
    }
  }

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
