import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { I } from "@/components/ui/icons";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  // If no users exist yet, send the first visitor to setup.
  const { data: hasUsers } = await supabase.rpc("has_any_user");
  if (!hasUsers) redirect("/setup");

  return (
    <main
      className="login-grid"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      {/* Left: brand + form */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "clamp(28px, 6vw, 64px)",
          maxWidth: 560,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* chukta primary lockup */}
        <div style={{ paddingTop: "clamp(12px, 4vw, 40px)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/chukta-logo.svg"
            alt="chukta"
            style={{ height: "clamp(72px, 9vw, 96px)", width: "auto", display: "block" }}
          />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 40, paddingBottom: 40 }}>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(40px, 7vw, 68px)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              margin: "0 0 20px",
              color: "var(--ink)",
            }}
          >
            Money divides.
            <br />
            <em style={{ color: "var(--accent)" }}>Chukta settles.</em>
          </h1>
          <p
            style={{
              fontSize: "clamp(14px, 1.6vw, 17px)",
              lineHeight: 1.55,
              color: "var(--ink-2)",
              margin: "0 0 32px",
              maxWidth: 420,
            }}
          >
            A quiet, auditable ledger of what you all paid — split fairly by the
            ownership you already agreed on. Hisaab khatam, dosti kayam.
          </p>

          <LoginForm />

          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              color: "var(--ink-3)",
              fontSize: 12,
            }}
          >
            <span>Private by design</span>
            <span style={{ color: "var(--ink-4)" }}>·</span>
            <span>INR ledger</span>
            <span style={{ color: "var(--ink-4)" }}>·</span>
            <span>Auditable splits</span>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: "var(--ink-3)" }}>
            Invite only — ask your platform admin for access.
          </p>
        </div>

        <div
          className="mono"
          style={{
            paddingTop: 24,
            fontSize: 11,
            color: "var(--ink-4)",
            letterSpacing: "0.04em",
          }}
        >
          v0.1 &nbsp;·&nbsp; tenant-scoped &nbsp;·&nbsp; rls enforced
        </div>
      </section>

      {/* Right: accent value-prop panel (desktop only) */}
      <aside
        className="login-aside"
        aria-hidden="true"
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          padding: 48,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(at 20% 0%, color-mix(in oklch, #ffffff 25%, transparent) 0, transparent 55%), radial-gradient(at 100% 100%, color-mix(in oklch, #000000 20%, transparent) 0, transparent 55%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", maxWidth: 420, marginTop: 32 }}>
          <div className="eyebrow" style={{ color: "var(--accent-ink)", opacity: 0.7, marginBottom: 24 }}>
            Hisaab khatam. Dosti kayam.
          </div>
          <h2
            className="serif"
            style={{
              fontSize: "clamp(28px, 3.5vw, 40px)",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
              margin: "0 0 28px",
            }}
          >
            From confused to <em>chukta</em>.
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <ValueProp title="Unequal ownership" body="Each co-owner carries the stake you actually agreed on." />
            <ValueProp title="Per-activity groups" body="Crop seasons, land, water, equipment — each with their own ledger." />
            <ValueProp title="Auditable ledger" body="Every balance is derived from entries. No spreadsheets, no guesswork." />
          </ul>
        </div>
      </aside>

      <style>{`
        .login-grid {
          display: grid;
          grid-template-columns: 1fr;
        }
        .login-aside { display: none; }
        @media (min-width: 960px) {
          .login-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
          .login-aside { display: block; }
        }
      `}</style>
    </main>
  );
}

function ValueProp({ title, body }: { title: string; body: string }) {
  return (
    <li style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "color-mix(in oklch, #ffffff 25%, transparent)",
          color: "var(--accent-ink)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <I.check size={12} />
      </span>
      <div>
        <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.005em", marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, opacity: 0.82 }}>{body}</div>
      </div>
    </li>
  );
}
