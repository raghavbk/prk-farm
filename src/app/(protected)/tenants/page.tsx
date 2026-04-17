import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { ViewTransition } from "react";
import { switchTenant } from "@/actions/tenant";
import { CreateTenantForm } from "./create-tenant-form";
import { TenantSwitchButton } from "./tenant-switch-button";

export default async function TenantsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const activeTenantId = await getActiveTenantId();

  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, tenants(id, name, created_at)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const tenants =
    memberships?.map((m) => ({
      ...(m.tenants as unknown as { id: string; name: string; created_at: string }),
      role: m.role,
    })) ?? [];

  return (
    <ViewTransition enter="fade-in" exit="fade-out" default="none">
    <main className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 py-8 sm:py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">Your Farms</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Choose a farm to work in, or create a new one.
      </p>

      {tenants.length === 0 ? (
        <div className="mt-8 rounded-xl border-2 border-dashed border-border py-10 text-center">
          <p className="text-sm text-ink-faint">
            You don&apos;t belong to any farms yet. Create one to get started.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {tenants.map((tenant) => (
            <li key={tenant.id}>
              <form action={switchTenant.bind(null, tenant.id)}>
                <TenantSwitchButton
                  isActive={tenant.id === activeTenantId}
                  name={tenant.name}
                  role={tenant.role}
                />
              </form>
            </li>
          ))}
        </ul>
      )}

      <CreateTenantForm />
    </main>
    </ViewTransition>
  );
}
