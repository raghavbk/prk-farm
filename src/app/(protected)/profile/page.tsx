import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserPlatformAdmin } from "@/lib/platform";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { I } from "@/components/ui/icons";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const activeTenantId = await getActiveTenantId();

  const [profileRes, membershipsRes, isPlatform] = await Promise.all([
    supabase.from("profiles").select("display_name, email").eq("id", user.id).single(),
    supabase
      .from("tenant_members")
      .select("role, tenant_id, tenants(id, name)")
      .eq("user_id", user.id),
    isCurrentUserPlatformAdmin(),
  ]);

  const profile = profileRes.data;
  type Membership = { role: string; tenant_id: string; tenants: { id: string; name: string } | null };
  const memberships = (membershipsRes.data ?? []) as unknown as Membership[];

  const displayName = profile?.display_name ?? user.email ?? "You";
  const email = profile?.email ?? user.email ?? "";

  const activeMembership = memberships.find((m) => m.tenant_id === activeTenantId);
  const roleLabel =
    activeMembership?.role === "owner"
      ? "Tenant owner"
      : activeMembership?.role === "admin"
        ? "Tenant admin"
        : activeMembership
          ? "Member"
          : null;

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
      <div style={{ viewTransitionName: "screen" }}>
        <div
          className="mx-auto"
          style={{ maxWidth: 640, padding: "clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 56px" }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
            <Avatar id={user.id} name={displayName} size={72} />
            <div style={{ minWidth: 0 }}>
              <h1
                className="serif"
                style={{ fontSize: "clamp(28px, 5vw, 32px)", margin: 0, letterSpacing: "-0.01em" }}
              >
                {displayName}
              </h1>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--ink-3)",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {email}
              </div>
              {roleLabel && (
                <div className="eyebrow" style={{ marginTop: 6, color: "var(--accent)" }}>
                  {roleLabel}
                </div>
              )}
            </div>
          </div>

          {/* Tenants */}
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Your tenants
          </div>
          <div
            className="card"
            style={{
              overflow: "hidden",
              padding: 0,
              borderRadius: 14,
              marginBottom: 24,
            }}
          >
            {memberships.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                No tenants yet.
              </div>
            ) : (
              memberships.map((m, idx) => {
                const isActive = m.tenant_id === activeTenantId;
                return (
                  <Link
                    key={m.tenant_id}
                    href={`/tenants`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      borderBottom: idx === memberships.length - 1 ? "none" : "1px solid var(--rule-2)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isActive ? "var(--accent)" : "var(--surface-2)",
                        color: isActive ? "var(--accent-ink)" : "var(--ink-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <I.leaf size={14} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                        {m.tenants?.name ?? "Unnamed"}
                      </div>
                      <div className="eyebrow" style={{ marginTop: 2 }}>
                        {m.role} {isActive && "· active"}
                      </div>
                    </div>
                    <I.chevron size={14} stroke="var(--ink-4)" />
                  </Link>
                );
              })
            )}
          </div>

          {/* Settings links */}
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Settings
          </div>
          <div
            className="card"
            style={{
              overflow: "hidden",
              padding: 0,
              borderRadius: 14,
              marginBottom: 24,
            }}
          >
            {activeMembership && activeMembership.role === "owner" && (
              <Link
                href="/admin"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--rule-2)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <I.settings size={16} stroke="var(--ink-2)" />
                <span style={{ flex: 1, fontSize: 14 }}>Tenant administration</span>
                <I.chevron size={14} stroke="var(--ink-4)" />
              </Link>
            )}
            <Link
              href="/tenants"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                textDecoration: "none",
                color: "inherit",
                borderBottom: isPlatform ? "1px solid var(--rule-2)" : "none",
              }}
            >
              <I.users size={16} stroke="var(--ink-2)" />
              <span style={{ flex: 1, fontSize: 14 }}>Switch tenant</span>
              <I.chevron size={14} stroke="var(--ink-4)" />
            </Link>
            {isPlatform && (
              <Link
                href="/platform"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <I.leaf size={16} stroke="var(--accent)" />
                <span style={{ flex: 1, fontSize: 14 }}>Platform console</span>
                <I.chevron size={14} stroke="var(--ink-4)" />
              </Link>
            )}
          </div>

          {/* Sign out */}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="btn btn-ghost"
              style={{ width: "100%", color: "var(--neg)" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </ViewTransition>
  );
}
