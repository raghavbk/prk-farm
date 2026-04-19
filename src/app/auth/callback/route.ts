import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  // Supabase's /verify redirected here with an error (expired / already-used token, etc.)
  if (errorParam) {
    const reason = errorCode || errorParam;
    const message = errorDescription || reason;
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(reason)}&message=${encodeURIComponent(message)}`
    );
  }

  const supabase = await createClient();

  // After verifying the OTP / exchanging the code, decide where to send them.
  // A new-user invite carries an `invite_token` in user_metadata — hop to
  // /auth/accept-invite to materialize the tenant membership before they
  // land on the dashboard. Standard invites (no token) go through the
  // set-password flow; everything else lands on /.
  async function nextDestination(): Promise<string> {
    if (type === "invite") {
      const { data } = await supabase.auth.getUser();
      const token = (data.user?.user_metadata as { invite_token?: string } | null)?.invite_token;
      if (token) {
        // Encode the whole `next` value so its inner ?token=… isn't parsed as
        // a sibling query parameter on /auth/set-password.
        const acceptPath = `/auth/accept-invite?token=${encodeURIComponent(token)}`;
        return `/auth/set-password?next=${encodeURIComponent(acceptPath)}`;
      }
      return "/auth/set-password";
    }
    return "/";
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type as "invite" | "email" | "recovery" | "magiclink") || "invite",
    });
    if (!error) return NextResponse.redirect(`${origin}${await nextDestination()}`);
    return NextResponse.redirect(
      `${origin}/login?error=otp_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${await nextDestination()}`);
    return NextResponse.redirect(
      `${origin}/login?error=code_exchange_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
