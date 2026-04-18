import { AnimatedInr } from "./animated-inr";
import { Sparkline } from "./sparkline";

type Tone = "pos" | "neg" | "neutral";

type Props = {
  label: string;
  amount: number;
  tone?: Tone;
  spark?: number[];
};

export function MiniStat({ label, amount, tone = "neutral", spark }: Props) {
  const color = tone === "pos" ? "var(--pos)" : tone === "neg" ? "var(--neg)" : "var(--ink)";
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="mono tnum" style={{ fontSize: 18, fontWeight: 500, color, letterSpacing: "-0.01em" }}>
          <AnimatedInr value={amount} />
        </span>
        {spark && <Sparkline values={spark} w={60} h={16} color={color} />}
      </div>
    </div>
  );
}
