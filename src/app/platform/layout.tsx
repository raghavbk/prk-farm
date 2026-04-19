import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isCurrentUserPlatformAdmin } from "@/lib/platform";
import { isPlatformHostRequest } from "@/lib/tenant";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // The operator console only serves on the platform apex. A platform admin
  // landing on /platform from a tenant host (e.g. expense.vibenaturals.in)
  // goes to the tenant dashboard instead — they can still reach the console
  // by navigating to chukta.in.
  if (!(await isPlatformHostRequest())) redirect("/");

  const isPlatform = await isCurrentUserPlatformAdmin();
  if (!isPlatform) redirect("/");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--rule)",
          padding: "14px clamp(20px, 4vw, 40px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          background: "var(--card)",
        }}
      >
        <Link
          href="/platform"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/chukta-mark.svg" alt="" aria-hidden="true" style={{ height: 28, width: 28 }} />
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              color: "var(--ink)",
              lineHeight: 1,
            }}
          >
            chukta
          </span>
          <span className="eyebrow" style={{ color: "var(--ink-3)", marginLeft: 4 }}>
            platform
          </span>
        </Link>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-ghost" style={{ height: 32, fontSize: 12 }}>
            Sign out
          </button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  );
}
