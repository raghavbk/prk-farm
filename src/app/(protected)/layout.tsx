import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Nav } from "@/components/nav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const activeTenantId = await getActiveTenantId();
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onTenantPicker = pathname.startsWith("/tenants");

  // If no active tenant, send users with memberships to the picker —
  // unless they're already there, otherwise we loop forever.
  if (!activeTenantId && !onTenantPicker) {
    const { data: memberships } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1);

    if (memberships && memberships.length > 0) {
      redirect(`/tenants`);
    }
  }

  return (
    <>
      <Nav />
      {children}
    </>
  );
}
