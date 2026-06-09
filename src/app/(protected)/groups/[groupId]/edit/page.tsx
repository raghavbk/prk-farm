import { requireUserAndTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ViewTransition } from "react";
import { EditGroupForm } from "./edit-group-form";
import { I } from "@/components/ui/icons";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { tenantId } = await requireUserAndTenant();
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, updated_at, created_at")
    .eq("id", groupId)
    .eq("tenant_id", tenantId)
    .single();

  if (!group) notFound();

  return (
    <ViewTransition
      enter={{ "nav-forward": "slide-from-right", "nav-back": "slide-from-left", default: "none" }}
      exit={{ "nav-forward": "slide-to-left", "nav-back": "slide-to-right", default: "none" }}
      default="none"
    >
      <main className="mx-auto w-full max-w-[1120px] px-5 py-8 sm:px-8 sm:py-10">
        <Link href={`/groups/${group.id}`} className="mono inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] text-ink-muted no-underline">
          <I.chevronL size={12} />
          Back to group
        </Link>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2">Group settings</p>
            <h1 className="serif m-0 text-[clamp(36px,6vw,58px)] leading-none tracking-[-0.025em] text-ink">
              Edit group
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              Update the basics for <span className="text-ink">{group.name}</span>.
            </p>
          </div>
        </div>

        <EditGroupForm groupId={group.id} groupName={group.name} />
      </main>
    </ViewTransition>
  );
}
