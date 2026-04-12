import { formatINR } from "@/lib/format";

type Props = {
  totalYouOwe: number;
  totalOwedToYou: number;
};

export function DashboardSummary({ totalYouOwe, totalOwedToYou }: Props) {
  const net = totalOwedToYou - totalYouOwe;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg bg-red-50 p-4">
        <p className="text-xs font-medium text-red-600 uppercase tracking-wide">
          You Owe
        </p>
        <p className="mt-1 text-lg font-bold text-red-700">
          {formatINR(totalYouOwe)}
        </p>
      </div>
      <div className="rounded-lg bg-green-50 p-4">
        <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
          Owed to You
        </p>
        <p className="mt-1 text-lg font-bold text-green-700">
          {formatINR(totalOwedToYou)}
        </p>
      </div>
      <div className="col-span-2 rounded-lg bg-gray-50 p-4 text-center">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Net Balance
        </p>
        <p
          className={`mt-1 text-lg font-bold ${
            net >= 0 ? "text-green-700" : "text-red-700"
          }`}
        >
          {net >= 0 ? "+" : ""}
          {formatINR(Math.abs(net))}
          {net < 0 ? " (you owe)" : net > 0 ? " (owed to you)" : ""}
        </p>
      </div>
    </div>
  );
}
