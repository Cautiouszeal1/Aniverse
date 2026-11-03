import { useId } from "react";

/**
 * Original, deterministic placeholder art for the free demo provider.
 * The same seed always draws the same abstract figure. It is NOT AI output
 * and is always labelled "Demo".
 */

const MOOD_PALETTES: Record<string, [string, string, string, string]> = {
  // [background top, background bottom, primary, accent]
  heroic: ["#1d2b6b", "#0a0f24", "#f5b942", "#2ee6f6"],
  playful: ["#4d2bc9", "#13173a", "#ff7ab6", "#7cf2c9"],
  mysterious: ["#14193a", "#050816", "#9a82ff", "#2ee6f6"],
  gentle: ["#2a3768", "#0e1530", "#ffd6a5", "#a8f6ff"],
  fierce: ["#5a1630", "#120614", "#ff5a4e", "#ffcf5a"],
};

function rng(seedHex: string) {
  let s = parseInt(seedHex.slice(0, 8), 16) || 1;
  return () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const ASPECT_SIZE: Record<string, [number, number]> = {
  "1:1": [400, 400],
  "3:4": [360, 480],
  "16:9": [480, 270],
};

export function DemoArt({
  seed,
  style,
  mood,
  aspect,
  className,
  label = true,
}: {
  seed: string;
  style: string;
  mood: string;
  aspect: string;
  className?: string;
  label?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const r = rng(seed);
  const [w, h] = ASPECT_SIZE[aspect] ?? ASPECT_SIZE["1:1"];
  const [bgTop, bgBottom, primary, accent] = MOOD_PALETTES[mood] ?? MOOD_PALETTES.heroic;

  const cx = w / 2 + (r() - 0.5) * w * 0.12;
  const scale = Math.min(w, h) / 400;
  const headR = (42 + r() * 18) * scale;
  const headY = h * 0.38 + (r() - 0.5) * 20 * scale;
  const bodyW = (90 + r() * 60) * scale;
  const bodyH = (110 + r() * 50) * scale;
  const bodyTop = headY + headR * 0.85;
  const eyeGap = headR * (0.32 + r() * 0.12);
  const eyeY = headY - headR * 0.05;
  const hairKind = Math.floor(r() * 4);
  const propSide = r() > 0.5 ? 1 : -1;
  const pixel = style === "pixel";
  const rounded = style === "claymation" || style === "2d-cartoon" ? 28 : style === "anime" ? 10 : 18;
  const stars = Array.from({ length: 14 }, () => [r() * w, r() * h * 0.6, r() * 1.6 + 0.4]);

  const ids = { bg: `bg-${uid}`, glow: `glow-${uid}`, body: `body-${uid}`, px: `px-${uid}` };

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label="Demo placeholder character (not AI-generated)"
    >
      <defs>
        <linearGradient id={ids.bg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={bgTop} />
          <stop offset="1" stopColor={bgBottom} />
        </linearGradient>
        <radialGradient id={ids.glow} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={accent} stopOpacity="0.55" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.body} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={primary} />
          <stop offset="1" stopColor={accent} stopOpacity="0.85" />
        </linearGradient>
        {pixel ? (
          <pattern id={ids.px} width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="none" stroke="#000" strokeOpacity="0.25" />
          </pattern>
        ) : null}
      </defs>

      <rect width={w} height={h} fill={`url(#${ids.bg})`} />
      {stars.map(([x, y, s], i) => (
        <circle key={i} cx={x} cy={y} r={s} fill="#fff" opacity={0.35} />
      ))}
      <circle cx={cx} cy={headY + 30 * scale} r={150 * scale} fill={`url(#${ids.glow})`} />
      <ellipse cx={cx} cy={h - 18 * scale} rx={w * 0.42} ry={14 * scale} fill="#000" opacity="0.35" />

      {/* body */}
      <rect
        x={cx - bodyW / 2}
        y={bodyTop}
        width={bodyW}
        height={bodyH}
        rx={rounded * scale}
        fill={`url(#${ids.body})`}
      />
      {/* head */}
      <circle cx={cx} cy={headY} r={headR} fill={primary} />
      {/* hair */}
      {hairKind === 0 ? (
        <path d={`M ${cx - headR} ${headY - headR * 0.1} Q ${cx} ${headY - headR * 1.8} ${cx + headR} ${headY - headR * 0.1} Z`} fill={bgBottom} opacity="0.85" />
      ) : hairKind === 1 ? (
        <>
          <circle cx={cx - headR * 0.75} cy={headY - headR * 0.75} r={headR * 0.38} fill={bgBottom} opacity="0.85" />
          <circle cx={cx + headR * 0.75} cy={headY - headR * 0.75} r={headR * 0.38} fill={bgBottom} opacity="0.85" />
        </>
      ) : hairKind === 2 ? (
        <path d={`M ${cx - headR * 0.9} ${headY - headR * 0.4} L ${cx - headR * 0.4} ${headY - headR * 1.45} L ${cx} ${headY - headR * 0.8} L ${cx + headR * 0.45} ${headY - headR * 1.5} L ${cx + headR * 0.9} ${headY - headR * 0.4} Z`} fill={bgBottom} opacity="0.85" />
      ) : (
        <rect x={cx - headR * 1.05} y={headY - headR * 1.15} width={headR * 2.1} height={headR * 0.55} rx={headR * 0.2} fill={accent} opacity="0.9" />
      )}
      {/* eyes */}
      <ellipse cx={cx - eyeGap} cy={eyeY} rx={headR * 0.12} ry={headR * (style === "anime" ? 0.22 : 0.15)} fill="#0a0f24" />
      <ellipse cx={cx + eyeGap} cy={eyeY} rx={headR * 0.12} ry={headR * (style === "anime" ? 0.22 : 0.15)} fill="#0a0f24" />
      <circle cx={cx - eyeGap + headR * 0.04} cy={eyeY - headR * 0.05} r={headR * 0.04} fill="#fff" />
      <circle cx={cx + eyeGap + headR * 0.04} cy={eyeY - headR * 0.05} r={headR * 0.04} fill="#fff" />
      {/* prop: floating orb */}
      <circle cx={cx + propSide * (bodyW / 2 + 34 * scale)} cy={bodyTop + bodyH * 0.35} r={16 * scale} fill={accent} />
      <circle cx={cx + propSide * (bodyW / 2 + 34 * scale)} cy={bodyTop + bodyH * 0.35} r={30 * scale} fill={accent} opacity="0.2" />

      {pixel ? <rect width={w} height={h} fill={`url(#${ids.px})`} /> : null}
      {style === "storybook" ? <rect width={w} height={h} fill="#f5e6c8" opacity="0.12" /> : null}

      {label ? (
        <g>
          <rect x={10} y={10} width={58} height={22} rx={11} fill="#050816" opacity="0.75" />
          <text x={39} y={25} textAnchor="middle" fontSize="11" fontFamily="sans-serif" fontWeight="700" fill="#ffcf5a" letterSpacing="1.5">
            DEMO
          </text>
        </g>
      ) : null}
    </svg>
  );
}
