import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import Link from "next/link";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 bg-ink">
      {/* Animated gradient mesh background */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.3) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(244,63,94,0.15) 0%, transparent 50%), radial-gradient(ellipse 50% 50% at 0% 50%, rgba(16,185,129,0.15) 0%, transparent 50%)",
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              boxShadow: "0 0 40px rgba(99,102,241,0.4)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Sign in to your FarmLedger account
          </p>
        </div>

        {/* Glass card */}
        <div
          className="mt-8 rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
        >
          <LoginForm />
          <div className="mt-6 text-center">
            <p className="text-sm text-white/40">
              New here?{" "}
              <Link href="/signup" className="font-semibold text-primary-light hover:text-white transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Feature badges */}
        <div className="mt-8 flex justify-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/40 border border-white/5">
            <div className="h-1.5 w-1.5 rounded-full bg-success" />
            Ownership Splits
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/40 border border-white/5">
            <div className="h-1.5 w-1.5 rounded-full bg-warning" />
            Expense Tracking
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/40 border border-white/5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Balances
          </div>
        </div>
      </div>
    </main>
  );
}
