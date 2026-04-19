import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInviteForUser, type InviteAcceptOutcome } from "@/lib/invites";

// Banner landing target. The user is already signed in on some tenant host
// and clicks "Accept <other tenant>" — we materialize their membership and
// redirect to that tenant's primary host so they land on the right app.
//
// /auth/callback handles the brand-new-user case inline (same route, same
// cookie scope, one less hop) — this route only needs to cover the
// already-signed-in banner-click path.
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
    // Banner-only surface, so hitting this logged-out is a stale bookmark
    // or direct link. Send them to /login and let the usual flow take over;
    // if they re-open the same invite email, /auth/callback handles it.
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

  // Land them on the accepted tenant's primary host.
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
  const scheme = primary.domain.startsWith("localhost") || primary.domain.startsWith("127.") ? "http" : "https";
  return NextResponse.redirect(`${scheme}://${primary.domain}/`);
}

function reasonToParam(reason: Exclude<InviteAcceptOutcome, { ok: true }>["reason"]): string {
  switch (reason) {
    case "wrong_account":
      return "invite_wrong_account";
    case "expired":
      return "invite_expired";
    case "wrong_state":
      return "invite_used";
    case "not_found":
      return "invite";
    case "insert_failed":
      return "invite_failed";
  }
}
