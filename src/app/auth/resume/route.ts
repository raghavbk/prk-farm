import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformHost } from "@/lib/platform-hosts";

// Central "where to send the user after login / on a stale cookie" decision.
//
// Subtle: redirects for tenant users must cross over to the tenant's primary
// host. If we just redirect to "/" on the current host and the current host
// is the platform apex (chukta.in), the protected layout slaps them with
// "Wrong door" because non-platform-admins aren't allowed on the apex.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const base = request.nextUrl.clone();
  base.search = "";

  if (!user) {
    base.pathname = "/login";
    return NextResponse.redirect(base);
  }

  // Platform admin goes straight to the console.
  const { data: isPlatform } = await supabase.rpc("is_platform_admin");
  if (isPlatform === true) {
    base.pathname = "/platform";
    return NextResponse.redirect(base);
  }

  // List memberships + each tenant's primary domain in one round trip
  // through the service role (so we don't get RLS-filtered to just the
  // active tenant).
  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from("tenant_members")
    .select("tenant_id, tenants!inner(id, name)")
    .eq("user_id", user.id);

  const tenantIds = (memberships ?? []).map((m) => m.tenant_id as string);

  if (tenantIds.length === 0) {
    // No membership + not a platform admin = nowhere to go. Kick them back
    // to sign-out so the session doesn't get stuck in a redirect loop
    // (the protected layout would otherwise /auth/resume → nothing here
    //  → …). signout clears the cookie and lands on /login.
    base.pathname = "/auth/signout";
    return NextResponse.redirect(base);
  }

  // Fetch primary domains for those tenants — cross-origin redirect target.
  const { data: primaries } = await admin
    .from("tenant_domains")
    .select("tenant_id, domain")
    .in("tenant_id", tenantIds)
    .eq("is_primary", true);
  const primaryByTenant = new Map<string, string>(
    (primaries ?? []).map((d) => [d.tenant_id as string, d.domain as string]),
  );

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };

  if (tenantIds.length === 1) {
    const only = tenantIds[0];
    const primary = primaryByTenant.get(only);
    let target: string;
    if (primary) {
      target = `${schemeFor(primary)}://${primary}/`;
    } else if (!isPlatformHost(request.headers.get("host"))) {
      // Current host is a tenant host — safe to land on its root.
      target = `${base.origin}/`;
    } else {
      // No primary domain and we're on the platform apex. Falling back to
      // `${base.origin}/` would trigger the protected layout's "Wrong door"
      // notice. Route to the picker instead; its layout is minimal and shows
      // the single tenant as a button.
      base.pathname = "/tenants";
      target = base.toString();
    }
    const res = NextResponse.redirect(target);
    res.cookies.set("active_tenant_id", only, cookieOpts);
    return res;
  }

  // Multi-tenant: go to /tenants picker. Pick the first membership's
  // primary domain as the host so the picker renders under a real tenant
  // host (not the platform apex, which would Wrong-door them).
  const firstPrimary = tenantIds
    .map((id) => primaryByTenant.get(id))
    .find((d): d is string => !!d);
  if (firstPrimary) {
    return NextResponse.redirect(
      `${schemeFor(firstPrimary)}://${firstPrimary}/tenants`,
    );
  }
  // No primary domain on any tenant (shouldn't happen with the onboard flow,
  // but degrade gracefully to the current origin's /tenants).
  base.pathname = "/tenants";
  return NextResponse.redirect(base);
}

function schemeFor(host: string): "http" | "https" {
  return host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
}
