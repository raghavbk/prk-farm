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
  const nextPath = type === "invite" ? "/auth/set-password" : "/";

  // Token-hash flow (recommended for admin invites — no PKCE verifier needed)
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type as "invite" | "email" | "recovery" | "magiclink") || "invite",
    });
    if (!error) return NextResponse.redirect(`${origin}${nextPath}`);
    return NextResponse.redirect(
      `${origin}/login?error=otp_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  // PKCE code flow — only works if the browser initiated auth (OAuth / magic-link click
  // from the same browser). Admin invites won't have a verifier cookie here.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${nextPath}`);
    return NextResponse.redirect(
      `${origin}/login?error=code_exchange_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
