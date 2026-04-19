import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  // Supabase's /verify bounced here with an error (expired / already used).
  if (errorParam) {
    const reason = errorCode || errorParam;
    const message = errorDescription || reason;
    redirect(`/login?error=${encodeURIComponent(reason)}&message=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();

  // After OTP verification / code exchange, decide where to send them.
  //  invite + invite_token in user_metadata → /auth/set-password?next=
  //    /auth/accept-invite?token=<token>  (the whole `next` value URL-encoded)
  //  invite (no token)                    → /auth/set-password
  //  anything else                        → /
  async function nextDestination(): Promise<string> {
    if (type === "invite") {
      const { data } = await supabase.auth.getUser();
      const token = (data.user?.user_metadata as { invite_token?: string } | null)?.invite_token;
      if (token) {
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
    if (error) {
      redirect(`/login?error=otp_failed&message=${encodeURIComponent(error.message)}`);
    }
    redirect(await nextDestination());
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirect(`/login?error=code_exchange_failed&message=${encodeURIComponent(error.message)}`);
    }
    redirect(await nextDestination());
  }

  redirect("/login?error=invalid_link");
}
