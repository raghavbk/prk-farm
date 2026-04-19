import { createClient } from "@/lib/supabase/server";

// Write one audit-log row via the SECURITY DEFINER `log_action` RPC.
// Best-effort — never throw, never block the caller on the audit path.
export async function logAction(params: {
  tenantId: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.rpc("log_action", {
      p_tenant_id: params.tenantId,
      p_action: params.action,
      p_resource_type: params.resourceType ?? null,
      p_resource_id: params.resourceId ?? null,
      p_metadata: (params.metadata ?? {}) as Record<string, unknown>,
    });
  } catch {
    // Swallow — audit failure must not break the user flow.
  }
}
