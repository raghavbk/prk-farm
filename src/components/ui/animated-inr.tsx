"use client";

import { useEffect, useRef, useState } from "react";
import { formatInr } from "@/lib/format";

type Props = {
  value: number;
  duration?: number;
  className?: string;
  decimals?: number;
  withSymbol?: boolean;
};

export function AnimatedInr({ value, duration = 650, className = "", decimals = 0, withSymbol = true }: Props) {
  const [v, setV] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const start = prev.current;
    const end = value;
    if (start === end) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(start + (end - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={`tnum ${className}`}>{formatInr(v, { decimals, withSymbol })}</span>;
}
