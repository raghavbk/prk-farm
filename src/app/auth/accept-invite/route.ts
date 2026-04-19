import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Complete a tenant_invites row → materialize the tenant_members membership.
// Must be called by the signed-in user whose email matches the invite.
//
//   /auth/accept-invite?token=<token>
//
// Fail-open transitions:
//   - no token                 → /tenants
//   - not signed in            → /login?next=<this URL>
//   - token bad/expired/taken  → /tenants?error=invite
//   - email mismatch           → /tenants?error=invite_wrong_account
//
// On success: inserts tenant_members, stamps accepted_at/accepted_by,
// redirects to the tenant's primary domain.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const here = request.nextUrl.clone();
  here.search = ""; // strip params for redirect destinations

  if (!token) {
    here.pathname = "/tenants";
    return NextResponse.redirect(here);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Kick to login, preserve the invite URL so they come back here after auth.
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", `/auth/accept-invite?token=${encodeURIComponent(token)}`);
    return NextResponse.redirect(login);
  }

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("tenant_invites")
    .select("id, tenant_id, email, role, status, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!invite) {
    here.pathname = "/tenants";
    here.searchParams.set("error", "invite");
    return NextResponse.redirect(here);
  }

  // Invalidate bad states before touching anything.
  if (invite.status !== "pending") {
    here.pathname = "/tenants";
    here.searchParams.set("error", invite.status === "accepted" ? "invite_used" : "invite_revoked");
    return NextResponse.redirect(here);
  }
  if (new Date(invite.expires_at) < new Date()) {
    await admin.from("tenant_invites").update({ status: "expired" }).eq("id", invite.id);
    here.pathname = "/tenants";
    here.searchParams.set("error", "invite_expired");
    return NextResponse.redirect(here);
  }

  const userEmail = (user.email ?? "").toLowerCase();
  if (userEmail !== invite.email.toLowerCase()) {
    here.pathname = "/tenants";
    here.searchParams.set("error", "invite_wrong_account");
    return NextResponse.redirect(here);
  }

  // Idempotent: if they're already a member, treat as accept.
  const { data: existingMember } = await admin
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", invite.tenant_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existingMember) {
    const { error: insertErr } = await admin
      .from("tenant_members")
      .insert({ tenant_id: invite.tenant_id, user_id: user.id, role: invite.role });
    if (insertErr) {
      here.pathname = "/tenants";
      here.searchParams.set("error", "invite_failed");
      return NextResponse.redirect(here);
    }
  }

  await admin
    .from("tenant_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", invite.id);

  await admin.from("audit_log").insert({
    tenant_id: invite.tenant_id,
    actor_user_id: user.id,
    action: "invite.accepted",
    resource_type: "tenant_invite",
    resource_id: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  // Land them on the tenant's primary host.
  const { data: primary } = await admin
    .from("tenant_domains")
    .select("domain")
    .eq("tenant_id", invite.tenant_id)
    .eq("is_primary", true)
    .maybeSingle();
  if (!primary?.domain) {
    here.pathname = "/";
    return NextResponse.redirect(here);
  }
  const scheme = primary.domain.startsWith("localhost") || primary.domain.startsWith("127.") ? "http" : "https";
  return NextResponse.redirect(`${scheme}://${primary.domain}/`);
}
