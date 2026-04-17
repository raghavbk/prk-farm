import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SetPasswordForm } from "./set-password-form";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Must have a session (from the invite link)
  if (!user) redirect("/login");

  const name = user.user_metadata?.display_name || user.user_metadata?.full_name || "there";

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 bg-[#050506]">
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #3dd68c, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-[380px]">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-success">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <h1 className="mt-6 text-center font-display text-[28px] font-bold text-white leading-tight">
          Welcome, {name}!
        </h1>
        <p className="mt-3 text-center text-sm text-ink-faint leading-relaxed">
          Set a password to complete your account setup
        </p>

        <div className="mt-10">
          <SetPasswordForm />
        </div>
      </div>
    </main>
  );
}
