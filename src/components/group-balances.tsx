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

  // Build lookup for display names
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
    return <p className="text-sm text-gray-400">No expenses yet</p>;
  }

  return (
    <ul className="space-y-2">
      {balances.map((b, i) => (
        <li key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <span className="font-medium">
            {nameMap.get(b.debtor_id) ?? "Unknown"}
          </span>{" "}
          owes{" "}
          <span className="font-medium">
            {nameMap.get(b.creditor_id) ?? "Unknown"}
          </span>{" "}
          <span className="font-bold text-gray-900">
            {formatINR(b.net_amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
