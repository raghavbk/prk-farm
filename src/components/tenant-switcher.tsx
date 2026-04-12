import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import Link from "next/link";

export async function TenantSwitcher() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const activeTenantId = await getActiveTenantId();

  let tenantName = "Select a farm";
  if (activeTenantId) {
    const { data } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", activeTenantId)
      .single();
    if (data) {
      tenantName = data.name;
    }
  }

  return (
    <Link
      href="/tenants"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
    >
      <span className="font-medium truncate max-w-[150px]">{tenantName}</span>
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
        />
      </svg>
    </Link>
  );
}
