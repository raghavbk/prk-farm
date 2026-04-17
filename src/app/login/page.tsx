import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  // If no users exist yet, redirect to setup
  const { data: hasUsers } = await supabase.rpc("has_any_user");
  if (!hasUsers) redirect("/setup");

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 bg-[#050506]">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #d4a853, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-header.svg" alt="VibeNaturals" className="h-14 w-auto" />
        </div>

        <h1 className="mt-8 text-center font-display text-[28px] font-bold text-white leading-tight">
          Welcome to<br />VibeNaturals
        </h1>
        <p className="mt-3 text-center text-sm text-ink-faint leading-relaxed">
          One ledger for your entire farm circle
        </p>

        {/* Form */}
        <div className="mt-10">
          <LoginForm />
        </div>

        <p className="mt-8 text-center text-[13px] text-ink-faint">
          Invite only — ask your farm admin for access
        </p>
      </div>
    </main>
  );
}
