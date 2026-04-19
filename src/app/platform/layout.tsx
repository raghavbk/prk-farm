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

  // Only serve the operator console on the platform apex. A platform admin
  // landing on a tenant host (e.g. prk.chukta.in/platform) goes to the tenant
  // dashboard instead — they can still reach the console via chukta.in.
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
            alignItems: "baseline",
            gap: 10,
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          <span className="eyebrow">Platform</span>
          <span className="serif" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>
            Farm Share Ledger
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
