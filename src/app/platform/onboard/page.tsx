import Link from "next/link";
import { getPlatformApex } from "@/lib/platform-hosts";
import { I } from "@/components/ui/icons";
import { OnboardForm } from "./onboard-form";

export default function OnboardPage() {
  const apex = getPlatformApex();
  return (
    <div
      className="mx-auto"
      style={{ maxWidth: 640, padding: "clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 56px" }}
    >
      <Link
        href="/platform"
        className="mono"
        style={{
          color: "var(--ink-3)",
          fontSize: 12,
          textDecoration: "none",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
        }}
      >
        <I.chevronL size={12} /> Platform
      </Link>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        New tenant
      </div>
      <h1
        className="serif"
        style={{
          fontSize: "clamp(28px, 5vw, 40px)",
          margin: 0,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color: "var(--ink)",
        }}
      >
        Onboard a <em>farm</em>.
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "12px 0 28px", maxWidth: 520 }}>
        Creates the tenant, maps its domain, and emails the owner a sign-up link.
        Leave the custom domain blank to use the free <code className="mono">&lt;slug&gt;.{apex}</code>{" "}
        subdomain.
      </p>
      <OnboardForm platformApex={apex} />
    </div>
  );
}
