import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/format";

type Props = {
  groupId: string;
};

export async function GroupBalances({ groupId }: Props) {
  const supabase = await createClient();

  const { data: balances } = await supabase
    .from("group_balances")
    .select("*")
    .eq("group_id", groupId);

  const userIds = new Set<string>();
  (balances ?? []).forEach((b) => {
    userIds.add(b.creditor_id);
    userIds.add(b.debtor_id);
  });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", Array.from(userIds));

  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name])
  );

  if (!balances || balances.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border py-6 text-center">
        <p className="text-sm text-ink-faint">No expenses yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {balances.map((b, i) => (
        <div key={i} className="card-surface flex items-center justify-between px-4 py-3">
          <div className="text-sm">
            <span className="font-medium text-ink">
              {nameMap.get(b.debtor_id) ?? "Unknown"}
            </span>
            <span className="mx-1.5 text-ink-faint">&rarr;</span>
            <span className="font-medium text-ink">
              {nameMap.get(b.creditor_id) ?? "Unknown"}
            </span>
          </div>
          <span className="font-display text-sm font-semibold text-terra">
            {formatINR(b.net_amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
