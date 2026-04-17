import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const supabase = await createClient();

  // If any users exist, setup is done — go to login
  const { data: hasUsers } = await supabase.rpc("has_any_user");
  if (hasUsers) {
    redirect("/login");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 bg-[#050506]">
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #d4a853, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-[420px]">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="font-display text-xl font-bold text-primary">F</span>
          </div>
        </div>

        <h1 className="mt-6 text-center font-display text-[28px] font-bold text-white leading-tight">
          Set up FarmLedger
        </h1>
        <p className="mt-3 text-center text-sm text-ink-faint leading-relaxed">
          Create your admin account and first farm to get started
        </p>

        <div className="mt-10">
          <SetupForm />
        </div>
      </div>
    </main>
  );
}
