import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformHost } from "@/lib/platform-hosts";

// Cross-origin tenant switch. Server Actions struggle with cross-origin
// redirects (React-DOM intercepts the form response and sometimes renders
// the "reload to try again" error page on the target host's first request).
// A plain route handler returning a 303 is boring and bulletproof.
//
// Flow:
//   POST /auth/switch-tenant/<tenantId>
//   1. Confirm user + membership in the target tenant
//   2. Set active_tenant_id cookie scoped to the CURRENT host (fallback for
//      platform apex / localhost / preview URLs where host resolution can't
//      help). Also set it on the Set-Cookie for the response, scoped to the
//      target host's cookie jar — sort of: cookies only attach to the host
//      in the Set-Cookie response, so the browser writes it for the current
//      host, not the target. On the target host we rely on resolve_tenant_by_domain.
//   3. Redirect to the target tenant's primary domain.
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = await ctx.params;
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url, 303);
  }

  // RLS-backed membership check — platform admin also passes the policy.
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    // Platform admin? Service role check would be heavier; just deny.
    const url = request.nextUrl.clone();
    url.pathname = "/tenants";
    url.search = "";
    return NextResponse.redirect(url, 303);
  }

  const { data: primary } = await supabase
    .from("tenant_domains")
    .select("domain")
    .eq("tenant_id", tenantId)
    .eq("is_primary", true)
    .maybeSingle();

  const currentHost = request.headers.get("x-host") ?? request.headers.get("host")?.split(":")[0] ?? null;
  const targetHost = primary?.domain ?? null;

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };

  // No target host, same host, or we're on a platform / dev host:
  // just land on / with the cookie set.
  const stayPut =
    !targetHost ||
    (currentHost && targetHost === currentHost) ||
    (currentHost && (isPlatformHost(currentHost) || currentHost.startsWith("localhost") || currentHost.startsWith("127.")));

  if (stayPut) {
    const here = request.nextUrl.clone();
    here.pathname = "/";
    here.search = "";
    const res = NextResponse.redirect(here, 303);
    res.cookies.set("active_tenant_id", tenantId, cookieOpts);
    return res;
  }

  const scheme = targetHost.startsWith("localhost") || targetHost.startsWith("127.") ? "http" : "https";
  const res = NextResponse.redirect(`${scheme}://${targetHost}/`, 303);
  // The cookie is scoped to the current host regardless — not useful once
  // the browser is on the target host, but harmless. Kept for consistency
  // so a user who bounces back to the old host isn't in a stale state.
  res.cookies.set("active_tenant_id", tenantId, cookieOpts);
  return res;
}
