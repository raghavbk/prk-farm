import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { CreateGroupForm } from "./create-group-form";

export default async function NewGroupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tenantId = await getActiveTenantId();
  if (!tenantId) redirect("/tenants");

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">Create Group</h1>
      <p className="mt-1 text-sm text-gray-600">
        Add members and set ownership percentages for expense splitting.
      </p>
      <CreateGroupForm currentUserId={user.id} />
    </main>
  );
}
