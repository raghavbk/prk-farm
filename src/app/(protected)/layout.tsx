import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  // If no active tenant, check if user has any tenants
  if (!activeTenantId) {
    const { data: memberships } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1);

    if (memberships && memberships.length > 0) {
      // Auto-select first tenant
      redirect(`/tenants`);
    }
    // No tenants at all — tenants page will show empty state
  }

  return <>{children}</>;
}
