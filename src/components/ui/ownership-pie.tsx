"use client";

import { useState } from "react";
import { hueForId } from "@/lib/format";

type PieMember = { id: string; pct: number; name?: string };

type Props = {
  members: PieMember[];
  size?: number;
  highlightId?: string | null;
};

export function OwnershipPie({ members, size = 160, highlightId = null }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = members.reduce((a, m) => a + m.pct, 0) || 1;
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const rad = (deg: number) => (deg * Math.PI) / 180;

  const sweeps = members.map((m) => (m.pct / total) * 360);
  const starts = sweeps.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? -90 : acc[i - 1] + sweeps[i - 1]);
    return acc;
  }, []);
  const slices = members.map((m, i) => {
    const a1 = starts[i];
    const sweep = sweeps[i];
    const a2 = a1 + sweep;
    const large = sweep > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos(rad(a1));
    const y1 = cy + r * Math.sin(rad(a1));
    const x2 = cx + r * Math.cos(rad(a2));
    const y2 = cy + r * Math.sin(rad(a2));
    return {
      id: m.id,
      name: m.name,
      pct: m.pct,
      path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`,
      mid: (a1 + a2) / 2,
    };
  });

  const hoveredSlice = hovered ? slices.find((s) => s.id === hovered) : null;

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {slices.map((s) => {
        const hi = highlightId === s.id || hovered === s.id;
        const dim = (highlightId && highlightId !== s.id) || (hovered && hovered !== s.id);
        const hue = hueForId(s.id);
        const push = hi ? 4 : 0;
        const tx = Math.cos((s.mid * Math.PI) / 180) * push;
        const ty = Math.sin((s.mid * Math.PI) / 180) * push;
        return (
          <path
            key={s.id}
            d={s.path}
            fill={`oklch(${hi ? 0.74 : 0.84} 0.06 ${hue})`}
            stroke="var(--card)"
            strokeWidth={2}
            style={{
              transform: `translate(${tx}px, ${ty}px)`,
              transformOrigin: `${cx}px ${cy}px`,
              transition: "transform 0.3s cubic-bezier(0.2,0.8,0.2,1), fill 0.2s, opacity 0.2s",
              opacity: dim ? 0.4 : 1,
              cursor: "pointer",
            }}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--card)" />

      {hoveredSlice ? (
        <>
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fontSize="20"
            fontFamily="var(--font-serif)"
            fill="var(--ink)"
          >
            {Math.round(hoveredSlice.pct)}%
          </text>
          {hoveredSlice.name && (
            <text
              x={cx}
              y={cy + 12}
              textAnchor="middle"
              fontSize="10"
              fontFamily="var(--font-sans)"
              fill="var(--ink-3)"
            >
              {hoveredSlice.name.length > 12
                ? hoveredSlice.name.slice(0, 11) + "…"
                : hoveredSlice.name}
            </text>
          )}
        </>
      ) : (
        <>
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--font-mono)"
            fill="var(--ink-3)"
            letterSpacing="0.14em"
          >
            OWNERSHIP
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="22" fontFamily="var(--font-serif)" fill="var(--ink)">
            {members.length}{" "}
            <tspan fontSize="14" fill="var(--ink-3)">
              {members.length === 1 ? "person" : "people"}
            </tspan>
          </text>
        </>
      )}
    </svg>
  );
}
