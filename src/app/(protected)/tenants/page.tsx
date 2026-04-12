import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { switchTenant } from "@/actions/tenant";
import { CreateTenantForm } from "./create-tenant-form";

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
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">Your Farms</h1>
      <p className="mt-1 text-sm text-gray-600">
        Choose a farm to work in, or create a new one.
      </p>

      {tenants.length === 0 ? (
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">
            You don&apos;t belong to any farms yet. Create one to get started.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {tenants.map((tenant) => (
            <li key={tenant.id}>
              <form action={switchTenant.bind(null, tenant.id)}>
                <button
                  type="submit"
                  className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-gray-50 ${
                    tenant.id === activeTenantId
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <span className="font-medium text-gray-900">
                    {tenant.name}
                  </span>
                  {tenant.id === activeTenantId && (
                    <span className="ml-2 text-xs text-gray-500">Active</span>
                  )}
                  <span className="ml-2 text-xs text-gray-400 capitalize">
                    {tenant.role}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <CreateTenantForm />
    </main>
  );
}
