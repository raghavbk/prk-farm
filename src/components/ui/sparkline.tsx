type Props = {
  values: number[];
  w?: number;
  h?: number;
  color?: string;
};

export function Sparkline({ values, w = 120, h = 30, color = "var(--accent)" }: Props) {
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `${pts} ${w},${h} 0,${h}`;
  return (
    <svg width={w} height={h} aria-hidden="true">
      <polygon points={area} fill={color} opacity="0.1" />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
