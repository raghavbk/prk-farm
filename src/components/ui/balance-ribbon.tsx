"use client";

import { useMemo } from "react";
import { hueForId, initialsOf } from "@/lib/format";

type Transfer = { from: string; to: string; amount: number };
type Member = { id: string; name: string };

type Props = {
  transfers: Transfer[];
  members: Member[];
  size?: number;
  highlightId?: string | null;
};

export function BalanceRibbon({ transfers, members, size = 280, highlightId = null }: Props) {
  const pos = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2 - 24;
    const out: Record<string, { x: number; y: number }> = {};
    members.forEach((m, i) => {
      const a = (i / Math.max(1, members.length)) * Math.PI * 2 - Math.PI / 2;
      out[m.id] = { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
    return out;
  }, [members, size]);

  if (!transfers.length || !members.length) return null;

  const cx = size / 2;
  const cy = size / 2;
  const maxAmt = Math.max(...transfers.map((t) => t.amount));

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {transfers.map((t, i) => {
        const from = pos[t.from];
        const to = pos[t.to];
        if (!from || !to) return null;
        const weight = 1 + (t.amount / maxAmt) * 5;
        const involved = highlightId && (t.from === highlightId || t.to === highlightId);
        const dim = highlightId && !involved;
        return (
          <path
            key={i}
            d={`M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`}
            fill="none"
            stroke={involved ? "var(--accent)" : "oklch(0.72 0.04 155)"}
            strokeWidth={weight}
            strokeLinecap="round"
            opacity={dim ? 0.2 : 0.75}
            style={{ transition: "all 0.3s" }}
          />
        );
      })}
      {members.map((m) => {
        const p = pos[m.id];
        if (!p) return null;
        const hue = hueForId(m.id);
        const hi = highlightId === m.id;
        return (
          <g key={m.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hi ? 19 : 16}
              fill={`oklch(0.92 0.04 ${hue})`}
              stroke={hi ? "var(--ink)" : "var(--card)"}
              strokeWidth={2}
              style={{ transition: "all 0.2s" }}
            />
            <text
              x={p.x}
              y={p.y + 4}
              textAnchor="middle"
              fontSize="11"
              fontWeight={500}
              fill={`oklch(0.38 0.06 ${hue})`}
              fontFamily="var(--font-sans)"
            >
              {initialsOf(m.name)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
