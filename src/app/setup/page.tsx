import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SetupForm } from "./setup-form";
import { I } from "@/components/ui/icons";

export default async function SetupPage() {
  const supabase = await createClient();

  // If any users exist, setup is done — go to login
  const { data: hasUsers } = await supabase.rpc("has_any_user");
  if (hasUsers) redirect("/login");

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
      <div style={{ position: "relative", width: "100%", maxWidth: 460, alignSelf: "center" }}>
        <div style={{ marginBottom: 24 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 12px 6px 8px",
              borderRadius: 999,
              background: "var(--accent-wash)",
              color: "var(--accent)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.leaf size={12} />
            </span>
            <span className="eyebrow" style={{ color: "var(--accent)" }}>
              Farm Share Ledger
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
          Set up your <em>farm</em>.
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "0 0 32px", maxWidth: 380 }}>
          Create the admin account and your first farm. You can add more co-owners later from the admin page.
        </p>

        <SetupForm />
      </div>
    </main>
  );
}
