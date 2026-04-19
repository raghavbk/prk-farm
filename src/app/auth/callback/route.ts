import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInviteForUser } from "@/lib/invites";

// Short-lived, httpOnly flash cookie used to warn the user when clicking
// an invite link in a browser that was already signed in as a different
// account. Read by the protected layout once and then cleared.
const SWITCH_FLASH_COOKIE = "flash_prev_user_email";

// Auth-callback route handler.
//
// Subtlety: we use `redirect()` from "next/navigation" here instead of
// NextResponse.redirect(). Supabase-ssr's cookie adapter writes the fresh
// session cookies through next/headers' cookies().set() — Next.js only
// guarantees those mutations reach the browser when the response is
// produced by the framework-level redirect signal. A manually-constructed
// NextResponse.redirect() leaves the cookies behind, so the invitee ends
// up on /auth/set-password without a session and middleware bounces them
// back to /login.
//
// Flow shapes:
//   new user (invited, no password yet)
//     → verifyOtp/exchangeCode → accept invite → /auth/set-password
//     → setPassword updates password + sets password_set flag → /auth/resume
//     → tenant dashboard
//
//   existing user re-invite (already has a password)
//     → verifyOtp/exchangeCode → accept invite → /auth/resume → tenant dashboard
//
// The set-password decision uses `user_metadata.password_set` rather than the
// URL's `type` param because Supabase's PKCE flow often drops `type` on the
// final redirect, so a brand-new invitee would otherwise skip set-password
// and land on the dashboard without a password. The flag is written by
// setPassword and backfilled by `login` on the first successful password
// sign-in, so existing users don't get bounced to set-password.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (errorParam) {
    const reason = errorCode || errorParam;
    const message = errorDescription || reason;
    redirect(`/login?error=${encodeURIComponent(reason)}&message=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();

  // Capture the pre-verify session (if any) so we can detect an
  // account-switch. Clicking an invite link in a browser that's already
  // signed in as someone else will overwrite their session — we want to
  // surface that rather than silently sign them out.
  const { data: before } = await supabase.auth.getUser();
  const previousEmail = before.user?.email?.toLowerCase() ?? null;

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type as "invite" | "email" | "recovery" | "magiclink") || "invite",
    });
    if (error) {
      redirect(`/login?error=otp_failed&message=${encodeURIComponent(error.message)}`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirect(`/login?error=code_exchange_failed&message=${encodeURIComponent(error.message)}`);
    }
  } else {
    redirect("/login?error=invalid_link");
  }

  redirect(await nextDestination());

  async function nextDestination(): Promise<string> {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return "/login?error=session_missing";

    const newEmail = user.email?.toLowerCase() ?? null;
    if (previousEmail && newEmail && previousEmail !== newEmail) {
      // Drop a flash cookie the protected layout will pick up on the next
      // page render and turn into a banner. httpOnly because only the
      // server reads it; 5-min TTL so it doesn't linger across real
      // sign-outs.
      const store = await cookies();
      store.set(SWITCH_FLASH_COOKIE, previousEmail, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 5,
      });
    }

    // Invite token may travel via user_metadata (new users, set during
    // inviteUserByEmail) OR as a URL query param (existing users on
    // signInWithOtp — we stash it there because user_metadata is only
    // writable at account creation).
    const metadata = (user.user_metadata as { invite_token?: string; password_set?: boolean } | null) ?? {};
    const metaToken = metadata.invite_token;
    const urlToken = searchParams.get("invite_token");
    const token = metaToken ?? urlToken;
    // Only brand-new invitees need set-password: they're the ones Supabase
    // created via inviteUserByEmail with our invite_token stamped on their
    // user_metadata. Existing users re-invited via signInWithOtp have no
    // metaToken, so they skip the form even if `password_set` never got
    // backfilled on their account.
    const needsPassword = metaToken !== undefined && metadata.password_set !== true;

    if (token) {
      const outcome = await acceptInviteForUser(user, token);
      if (!outcome.ok) {
        // Surface the reason on /login so the user sees a plain-English
        // message rather than a silent bounce. We don't block the sign-in
        // itself — they still have a valid session, they're just not a
        // member of the invited tenant.
        const reason =
          outcome.reason === "wrong_account"
            ? "invite_wrong_account"
            : outcome.reason === "expired"
              ? "invite_expired"
              : outcome.reason === "wrong_state"
                ? "invite_used"
                : "invite";
        // Strand the user on /tenants so they can pick an existing tenant
        // if they belong to any; the error banner explains what went wrong.
        return `/tenants?error=${reason}`;
      }
      // Membership is now materialised. First-time invitees still need a
      // password; existing users go straight to the tenant router.
      return needsPassword ? "/auth/set-password" : "/auth/resume";
    }

    // No invite token on the link. If the account still lacks a password
    // (rare — means they got here via verifyOtp without completing onboarding)
    // send them to set-password; otherwise hand off to the tenant router.
    return needsPassword ? "/auth/set-password" : "/auth/resume";
  }
}
