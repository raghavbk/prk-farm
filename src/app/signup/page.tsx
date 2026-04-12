import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignupForm } from "./signup-form";
import Link from "next/link";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 bg-[#050506]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #3dd68c, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-[380px]">
        <h1 className="text-center font-display text-[28px] font-bold text-white leading-tight">
          Create account
        </h1>
        <p className="mt-3 text-center text-sm text-ink-faint">Join your farm circle</p>

        <div className="mt-10">
          <SignupForm />
        </div>

        <p className="mt-8 text-center text-[13px] text-ink-faint">
          Have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:text-primary-light transition-colors">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
