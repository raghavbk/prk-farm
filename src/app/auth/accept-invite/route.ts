import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInviteForUser, reasonToParam } from "@/lib/invites";
import { schemeFor } from "@/lib/platform-hosts";

// Landing target for the "Accept <other tenant>" banner. /auth/callback
// handles the brand-new-user case inline, so this route only covers the
// already-signed-in click path.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const here = request.nextUrl.clone();
  here.search = "";

  if (!token) {
    here.pathname = "/tenants";
    return NextResponse.redirect(here);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  const outcome = await acceptInviteForUser(user, token);
  if (!outcome.ok) {
    here.pathname = "/tenants";
    here.searchParams.set("error", reasonToParam(outcome.reason));
    return NextResponse.redirect(here);
  }

  const admin = createAdminClient();
  const { data: primary } = await admin
    .from("tenant_domains")
    .select("domain")
    .eq("tenant_id", outcome.tenantId)
    .eq("is_primary", true)
    .maybeSingle();
  if (!primary?.domain) {
    here.pathname = "/";
    return NextResponse.redirect(here);
  }
  return NextResponse.redirect(`${schemeFor(primary.domain)}://${primary.domain}/`);
}
