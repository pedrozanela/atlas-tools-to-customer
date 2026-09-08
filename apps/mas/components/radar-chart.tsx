/**
 * Lightweight SVG radar chart — no chart library dependency.
 * Renders N axes (one per session) with a 1–5 scale, plots the score
 * polygon, labels axes and prints on both screen and paper cleanly.
 */

/** Minimal session data required for rendering the radar chart */
interface RadarSession {
  key: string;
  title: string;
  score: number;
}

interface Props {
  sessions: RadarSession[];
  size?: number;
}

export function RadarChart({ sessions, size = 480 }: Props) {
  // Extra horizontal padding for labels
  const labelPadding = 100;
  const viewWidth = size + labelPadding * 2;
  const viewHeight = size;
  const cx = viewWidth / 2;
  const cy = viewHeight / 2;
  const padding = 72;
  const radius = size / 2 - padding;
  const n = sessions.length;
  if (n === 0) return null;

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const point = (i: number, value: number) => {
    const a = angleFor(i);
    const r = (value / 5) * radius;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const polyPoints = sessions
    .map((s, i) => point(i, s.score).join(","))
    .join(" ");

  const ringValues = [1, 2, 3, 4, 5];

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="w-full h-auto mx-auto"
      aria-label="Radar of session scores"
    >
      {/* Rings */}
      {ringValues.map((v) => (
        <circle
          key={v}
          cx={cx}
          cy={cy}
          r={(v / 5) * radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={v === 5 ? 0.5 : 0.15}
          strokeWidth={v === 5 ? 1.5 : 1}
        />
      ))}

      {/* Axes + axis labels */}
      {sessions.map((s, i) => {
        const [x, y] = point(i, 5);
        const [lx, ly] = point(i, 5 + 0.6);
        const anchor =
          Math.abs(lx - cx) < 4 ? "middle" : lx > cx ? "start" : "end";
        // Wrap long titles to 2 lines max.
        const words = s.title.split(" ");
        const lines: string[] = [];
        let line = "";
        for (const w of words) {
          if ((line + " " + w).trim().length > 18) {
            if (line) lines.push(line);
            line = w;
          } else {
            line = (line + " " + w).trim();
          }
        }
        if (line) lines.push(line);
        return (
          <g key={s.key}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.15}
            />
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-[var(--color-foreground)] text-[10px]"
              style={{ fontSize: 10 }}
            >
              {lines.map((ln, idx) => (
                <tspan key={idx} x={lx} dy={idx === 0 ? 0 : 12}>
                  {ln}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}

      {/* Score polygon */}
      <polygon
        points={polyPoints}
        fill="#ff3621"
        fillOpacity={0.25}
        stroke="#ff3621"
        strokeWidth={2}
        className="radar-stroke"
      />

      {/* Score dots */}
      {sessions.map((s, i) => {
        const [px, py] = point(i, s.score);
        return (
          <circle
            key={`pt-${s.key}`}
            cx={px}
            cy={py}
            r={3.5}
            fill="#ff3621"
          />
        );
      })}

      {/* Center label: overall not rendered here (let parent show it). */}
    </svg>
  );
}
