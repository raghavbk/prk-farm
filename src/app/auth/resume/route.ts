import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Central "where to send the user after login / on a stale cookie" decision:
//   - not signed in        → /login
//   - platform admin       → /platform (they belong on the operator console)
//   - 0 memberships        → /tenants (empty-state; the app will tell them
//                             they need an invite)
//   - exactly 1 membership → set the cookie to that tenant, go to /
//   - >1 memberships       → /tenants (let them pick)
//
// Important subtleties:
// - cache()-wrapped helpers (`isCurrentUserPlatformAdmin`) blow up outside
//   Server Components' render cycle, so the RPC gets called inline here.
// - To actually persist a cookie from a Route Handler, it must be set on the
//   outgoing `NextResponse` itself — cookies().set() from next/headers
//   doesn't attach to a response we construct manually.
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

  // Platform admin check — inline so we don't depend on the cache()'d helper.
  const { data: isPlatform } = await supabase.rpc("is_platform_admin");
  if (isPlatform === true) {
    base.pathname = "/platform";
    return NextResponse.redirect(base);
  }

  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id);

  const tenantIds = (memberships ?? []).map((m) => m.tenant_id as string);

  if (tenantIds.length === 0) {
    base.pathname = "/tenants";
    return NextResponse.redirect(base);
  }

  if (tenantIds.length === 1) {
    base.pathname = "/";
    const res = NextResponse.redirect(base);
    res.cookies.set("active_tenant_id", tenantIds[0], {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }

  base.pathname = "/tenants";
  return NextResponse.redirect(base);
}
