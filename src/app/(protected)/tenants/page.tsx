import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/tenant";
import { isCurrentUserPlatformAdmin } from "@/lib/platform";
import { getPlatformApex } from "@/lib/platform-hosts";
import { redirect } from "next/navigation";
import { ViewTransition } from "react";
import { TenantSwitchButton } from "./tenant-switch-button";
import { I } from "@/components/ui/icons";

export default async function TenantsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const activeTenantId = await getActiveTenantId();

  const [membershipsRes, isPlatform] = await Promise.all([
    supabase
      .from("tenant_members")
      .select("tenant_id, role, tenants(id, name, created_at)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false }),
    isCurrentUserPlatformAdmin(),
  ]);

  const memberships = membershipsRes.data ?? [];

  // The picker only makes sense when there's an actual choice. One or zero
  // memberships: /auth/resume picks the right destination (auto-select the
  // sole tenant, or show the empty state).
  if (memberships.length <= 1) {
    redirect("/auth/resume");
  }

  const tenants = memberships.map((m) => ({
    ...(m.tenants as unknown as { id: string; name: string; created_at: string }),
    role: m.role,
  }));
  const platformApex = getPlatformApex();
  const platformConsoleUrl = platformApex.startsWith("localhost") || platformApex.startsWith("127.")
    ? `http://${platformApex}/platform`
    : `https://${platformApex}/platform`;

  return (
    <ViewTransition enter="fade-in" exit="fade-out" default="none">
      <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Switch tenant · {tenants.length} memberships
        </div>
        <h1
          className="serif"
          style={{
            fontSize: "clamp(28px, 4.5vw, 40px)",
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          Your farms
        </h1>
        <p style={{ marginTop: 10, fontSize: 14, color: "var(--ink-3)" }}>
          Pick the farm you want to work in. You&rsquo;ll land on its own URL.
        </p>

        {isPlatform && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--accent-wash)",
              border: "1px solid color-mix(in oklch, var(--accent) 20%, transparent)",
              color: "var(--ink-2)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <I.leaf size={12} />
            </span>
            <span style={{ fontSize: 13 }}>
              You&rsquo;re a platform admin. Manage every tenant from{" "}
              <a href={platformConsoleUrl} style={{ color: "var(--accent)" }}>
                {platformApex}/platform
              </a>
              .
            </span>
          </div>
        )}

        <ul className="mt-6 space-y-2">
          {tenants.map((tenant) => (
            <li key={tenant.id}>
              {/* POSTs to a plain Route Handler that sets the cookie + does
                  the (possibly cross-origin) redirect to the tenant's
                  primary host. Avoids React's Server-Action form plumbing
                  for cross-origin, which has shown the "reload to try
                  again" error on the target host's first request. */}
              <form action={`/auth/switch-tenant/${tenant.id}`} method="post">
                <TenantSwitchButton
                  isActive={tenant.id === activeTenantId}
                  name={tenant.name}
                  role={tenant.role}
                />
              </form>
            </li>
          ))}
        </ul>
      </main>
    </ViewTransition>
  );
}
