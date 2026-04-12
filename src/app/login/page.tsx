import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginButton } from "./login-button";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Farm Share Ledger
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Track shared farm expenses and balances
          </p>
        </div>
        <LoginButton />
      </div>
    </main>
  );
}
