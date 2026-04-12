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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{
        background: "linear-gradient(135deg, #fffbf5 0%, #fef5eb 30%, #e8fbf1 60%, #fff7e6 100%)"
      }}
    >
      {/* Vibrant background blobs */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #10b96d 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -left-24 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #e08a00 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-16 right-1/4 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #e5453a 0%, transparent 70%)" }}
        />
        {/* Decorative rings */}
        <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full border-2 border-olive/10" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full border-2 border-amber/10" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Colorful logo mark */}
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl"
            style={{ background: "linear-gradient(135deg, #0d9b5c 0%, #10b96d 100%)", boxShadow: "0 8px 32px rgba(13, 155, 92, 0.3)" }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight text-ink">
            Farm Share
            <br />
            <span className="bg-gradient-to-r from-olive to-sage bg-clip-text text-transparent">
              Ledger
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
            The single source of truth for shared farm expenses, ownership
            splits, and who-owes-whom balances.
          </p>
        </div>

        {/* Login card */}
        <div className="mt-10 card-surface p-6"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
        >
          <LoginButton />
          <p className="mt-4 text-center text-xs text-ink-faint">
            Private to your farm circle. Sign in to continue.
          </p>
        </div>

        {/* Colorful feature chips */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl py-3.5 px-2"
            style={{ background: "linear-gradient(135deg, #e8fbf1 0%, #d0f5e2 100%)" }}
          >
            <p className="font-display text-xl font-bold text-olive">%</p>
            <p className="mt-1 text-[10px] font-medium leading-tight text-olive/70">
              Ownership splits
            </p>
          </div>
          <div className="rounded-xl py-3.5 px-2"
            style={{ background: "linear-gradient(135deg, #fff7e6 0%, #ffeccc 100%)" }}
          >
            <p className="font-display text-xl font-bold text-amber">&#8377;</p>
            <p className="mt-1 text-[10px] font-medium leading-tight text-amber/70">
              Expense tracking
            </p>
          </div>
          <div className="rounded-xl py-3.5 px-2"
            style={{ background: "linear-gradient(135deg, #e6faf3 0%, #ccf5e8 100%)" }}
          >
            <p className="font-display text-xl font-bold text-sage">&#x21C4;</p>
            <p className="mt-1 text-[10px] font-medium leading-tight text-sage/70">
              Who owes whom
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
