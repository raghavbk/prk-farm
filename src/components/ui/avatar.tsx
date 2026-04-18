import { hueForId, initialsOf } from "@/lib/format";

type Props = {
  name: string;
  id: string;
  size?: number;
  ring?: boolean;
  className?: string;
};

export function Avatar({ name, id, size = 32, ring = false, className = "" }: Props) {
  const hue = hueForId(id);
  const bg = `oklch(0.92 0.04 ${hue})`;
  const fg = `oklch(0.38 0.06 ${hue})`;
  return (
    <span
      className={className}
      aria-label={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        fontSize: Math.max(10, size * 0.38),
        letterSpacing: "-0.02em",
        flexShrink: 0,
        boxShadow: ring ? `0 0 0 2px var(--card), 0 0 0 3px ${fg}` : "none",
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
