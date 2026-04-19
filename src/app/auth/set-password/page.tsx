import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SetPasswordForm } from "./set-password-form";
import { I } from "@/components/ui/icons";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Must have a session (from the invite link).
  if (!user) redirect("/login");

  const name = user.user_metadata?.display_name || user.user_metadata?.full_name || "there";
  const { next } = await searchParams;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
        display: "flex",
        justifyContent: "center",
        padding: "clamp(24px, 4vw, 48px)",
      }}
    >
      <div className="mesh" style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.6 }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 420, alignSelf: "center" }}>
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 12px 6px 8px",
              borderRadius: 999,
              background: "var(--pos-wash)",
              color: "var(--pos)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--pos)",
                color: "var(--bg)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.check size={12} />
            </span>
            <span className="eyebrow" style={{ color: "var(--pos)" }}>
              Invite accepted
            </span>
          </span>
        </div>

        <h1
          className="serif"
          style={{
            fontSize: "clamp(32px, 5vw, 44px)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            margin: "0 0 12px",
          }}
        >
          Welcome, <em>{name}</em>.
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 32px", maxWidth: 380 }}>
          Set a password to finish your account setup. You&rsquo;ll use this the next time you sign in.
        </p>

        <SetPasswordForm next={next} />
      </div>
    </main>
  );
}
