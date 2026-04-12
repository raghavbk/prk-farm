import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignupForm } from "./signup-form";
import Link from "next/link";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{
        background:
          "linear-gradient(135deg, #fffbf5 0%, #fef5eb 30%, #e8fbf1 60%, #fff7e6 100%)",
      }}
    >
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #10b96d 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/3 -left-24 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #e08a00 0%, transparent 70%)",
          }}
        />
        <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full border-2 border-olive/10" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Create your account
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Join your farm circle to start tracking expenses.
          </p>
        </div>

        <div
          className="mt-8 card-surface p-6"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >
          <SignupForm />
          <p className="mt-5 text-center text-sm text-ink-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-olive hover:text-olive-light transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
