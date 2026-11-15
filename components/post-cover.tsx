import { categoryLabel } from "@/lib/blog";

type Palette = {
  bg: string;
  ink: string;
  gold: string;
  wash: string;
};

const PALETTES: Record<string, Palette> = {
  news: { bg: "#f3f6fb", ink: "#16325c", gold: "#a7841a", wash: "#d5e2f3" },
  analysis: { bg: "#f7f4ee", ink: "#1a3358", gold: "#8d7016", wash: "#e6dcc8" },
  explainer: { bg: "#f3f7f6", ink: "#14324f", gold: "#8f7420", wash: "#d3e6e1" },
  "how-to": { bg: "#fbf6ee", ink: "#1b3356", gold: "#a07c16", wash: "#f0ddb8" },
  general: { bg: "#f6f5f2", ink: "#16325c", gold: "#a7841a", wash: "#e4dfd4" },
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function paletteFor(category: string): Palette {
  const key = category.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return PALETTES[key] ?? PALETTES.general;
}

function CoverRose({
  seed,
  ink,
  gold,
  paper,
}: {
  seed: number;
  ink: string;
  gold: string;
  paper: string;
}) {
  const spokes = 8 + ((seed >> 6) % 3) * 4;
  const lines = [];
  for (let i = 0; i < spokes; i++) {
    const step = spokes / 4;
    const major = i % step === 0;
    const mid = i % 2 === 0;
    const length = major ? 188 : mid ? 140 : 104;
    lines.push(
      <line
        key={i}
        y2={-length}
        transform={`rotate(${(360 / spokes) * i})`}
        stroke={major ? gold : ink}
        strokeWidth={major ? 2.6 : 1.15}
        strokeLinecap="round"
        strokeOpacity={major ? 0.95 : 0.4}
      />
    );
  }

  return (
    <g transform={`rotate(${seed % 360})`}>
      <circle r="204" fill="none" stroke={ink} strokeOpacity="0.22" strokeWidth="1.2" />
      <circle r="154" fill="none" stroke={gold} strokeOpacity="0.75" strokeWidth="1.5" />
      <circle r="86" fill="none" stroke={ink} strokeOpacity="0.3" strokeWidth="1" />
      {lines}
      <polygon points="0,-218 18,-76 0,-98 -18,-76" fill={ink} />
      <polygon points="0,218 18,76 0,98 -18,76" fill={ink} />
      <polygon points="-218,0 -76,-18 -98,0 -76,18" fill={gold} />
      <polygon points="218,0 76,-18 98,0 76,18" fill={gold} />
      <circle r="15" fill={paper} stroke={gold} strokeWidth="3" />
      <circle r="4.5" fill={ink} />
    </g>
  );
}

export function PostCover({
  slug,
  category,
  title,
  crop = "meet",
}: {
  slug: string;
  category: string;
  title: string;
  crop?: "meet" | "end";
}) {
  const seed = hashString(slug);
  const palette = paletteFor(category);
  const label = categoryLabel(category).toUpperCase();
  const initial = (title.match(/[A-Za-z0-9]/)?.[0] ?? "W").toUpperCase();
  const uid = `cov-${slug.replace(/[^a-z0-9-]/g, "")}`;
  const cx = 860 + (seed % 70);
  const cy = 338 + ((seed >> 4) % 36);
  const rings = 2 + (seed % 3);

  return (
    <svg
      className="post-cover-svg"
      viewBox="0 0 1200 675"
      preserveAspectRatio={crop === "end" ? "xMaxYMid slice" : "xMidYMid meet"}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${uid}-wash`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.wash} stopOpacity="0.95" />
          <stop offset="100%" stopColor={palette.wash} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="675" fill={palette.bg} />
      <circle cx={cx - 80} cy={cy + 20} r={250 + (seed % 40)} fill={`url(#${uid}-wash)`} />
      {Array.from({ length: 6 }, (_, index) => (
        <line
          key={index}
          x1="48"
          x2="1152"
          y1={96 + index * 96}
          y2={96 + index * 96}
          stroke={palette.ink}
          strokeOpacity="0.07"
        />
      ))}
      <g transform={`translate(${cx} ${cy}) scale(0.82)`}>
        <g fill="none" stroke={palette.ink} strokeOpacity="0.16">
          {Array.from({ length: rings }, (_, index) => (
            <circle key={index} r={96 + index * 70} strokeWidth="1" />
          ))}
        </g>
        <CoverRose seed={seed} ink={palette.ink} gold={palette.gold} paper={palette.bg} />
      </g>
      <text className="cover-initial" x="68" y="598" fill={palette.ink} opacity="0.13" fontSize="280">
        {initial}
      </text>
      <text className="cover-label" x="72" y="118" fill={palette.ink} fontSize="46" letterSpacing="5">
        {label}
      </text>
      <line x1="72" y1="146" x2="168" y2="146" stroke={palette.gold} strokeWidth="5" strokeLinecap="round" />
      <rect x="36" y="36" width="1128" height="603" fill="none" stroke={palette.ink} strokeOpacity="0.16" />
    </svg>
  );
}
