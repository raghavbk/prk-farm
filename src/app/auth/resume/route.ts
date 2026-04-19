import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setActiveTenantId } from "@/lib/tenant";
import { isCurrentUserPlatformAdmin } from "@/lib/platform";

// Central "where to send the user after login / on a stale cookie" decision:
//   - not signed in        → /login
//   - platform admin       → /platform (they belong on the operator console)
//   - 0 memberships        → /tenants (empty-state; the app will tell them
//                             they need an invite)
//   - exactly 1 membership → set the cookie to that tenant, go to /
//   - >1 memberships       → /tenants (let them pick)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (await isCurrentUserPlatformAdmin()) {
    const url = request.nextUrl.clone();
    url.pathname = "/platform";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id);

  const tenantIds = (memberships ?? []).map((m) => m.tenant_id as string);
  const next = request.nextUrl.clone();
  next.search = "";

  if (tenantIds.length === 0) {
    next.pathname = "/tenants";
    return NextResponse.redirect(next);
  }
  if (tenantIds.length === 1) {
    await setActiveTenantId(tenantIds[0]);
    next.pathname = "/";
    return NextResponse.redirect(next);
  }
  next.pathname = "/tenants";
  return NextResponse.redirect(next);
}
