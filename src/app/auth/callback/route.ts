import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    // PKCE flow — exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If this was an invite, redirect to set-password
      if (type === "invite") {
        return NextResponse.redirect(`${origin}/auth/set-password`);
      }
      return NextResponse.redirect(`${origin}/`);
    }
  }

  if (token_hash) {
    // Token hash flow (email link) — verify OTP
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: (type as "invite" | "email") || "invite",
    });
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/set-password`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
