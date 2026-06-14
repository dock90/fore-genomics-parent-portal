import * as React from "react";

/**
 * Detailed brand illustrations rebuilt as scalable two-tone SVG — echoing the
 * "Why Genetic Screening Is Essential" artwork on foregenomics.com
 * (DNA-magnifier + baby, medication bottle + capsule + bulb, genetic counselor
 * + speech bubbles). Drawn in the sage palette so they sit naturally in the
 * light Health Hub theme. Swap in the exact PNGs by dropping them in
 * /public/images/icons and pointing the <img> there if preferred.
 */

const OUT = "#3f7066"; // deep teal outline
const FILL = "#e4f1ec"; // pale mint fill
const FILL2 = "#cfe6df";
const DNA = "#5e9e8f"; // teal accent
const RAY = "#9cc7bb";
const WHITE = "#ffffff";

type Props = { size?: number; className?: string };

function Frame({ size = 60, className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/* ---- Early detection: DNA under a magnifier + baby ---- */
export function EarlyDetectionArt(props: Props) {
  return (
    <Frame {...props}>
      <g stroke={RAY} strokeWidth="2.3">
        <path d="M23 4v4" />
        <path d="M11 8l2.3 3.2" />
        <path d="M4 19l3.6 1.4" />
        <path d="M36 6l-1.5 3.4" />
        <path d="M6 33l3.5 1.3" />
      </g>
      <path
        d="M14.6 35.4 8.1 41.9a2.9 2.9 0 0 0 4.1 4.1l6.5-6.5"
        fill={FILL2}
        stroke={OUT}
        strokeWidth="2.6"
      />
      <circle cx="25" cy="25" r="14.5" fill={FILL} stroke={OUT} strokeWidth="2.6" />
      <path d="M15.4 19.4a10 10 0 0 1 6.6-5.2" stroke={WHITE} strokeWidth="2.4" />
      <g stroke={DNA} strokeWidth="2.1">
        <path d="M20 17c0 4 9 4.5 9 8s-9 4-9 8" />
        <path d="M29 17c0 4-9 4.5-9 8s9 4 9 8" />
        <path d="M21.4 20.5h6.2M20.4 25h8.2M21.4 29.5h6.2" />
      </g>
      <circle cx="48" cy="40" r="11" fill={FILL} stroke={OUT} strokeWidth="2.4" />
      <circle cx="59" cy="40" r="2.4" fill={FILL} stroke={OUT} strokeWidth="2.1" />
      <path d="M43 31.5c-1.6-2.7 1-5.2 3.9-4.3" stroke={OUT} strokeWidth="2.1" />
      <path d="M43.2 41q1.7-1.8 3.4 0" stroke={OUT} strokeWidth="2" />
      <path d="M50 41q1.7-1.8 3.4 0" stroke={OUT} strokeWidth="2" />
      <path d="M45.4 45q2.6 2.3 5.2 0" stroke={OUT} strokeWidth="2" />
    </Frame>
  );
}

/* ---- Medication insights: bottle + capsule + lightbulb ---- */
export function MedicationArt(props: Props) {
  return (
    <Frame {...props}>
      <g stroke={RAY} strokeWidth="2.2">
        <path d="M52 5v3" />
        <path d="M61 9l-2 2.2" />
        <path d="M63 19h-3" />
        <path d="M43 9l2 2.2" />
      </g>
      <circle cx="52" cy="19" r="7.5" fill={WHITE} stroke={OUT} strokeWidth="2.3" />
      <path
        d="M48.6 26.6v1.4a3.4 3.4 0 0 0 6.8 0v-1.4"
        fill={FILL2}
        stroke={OUT}
        strokeWidth="2.1"
      />
      <path d="M50 19l2 2 2.6-3" stroke={DNA} strokeWidth="2" />
      <rect x="13" y="25" width="25" height="31" rx="4" fill={FILL} stroke={OUT} strokeWidth="2.6" />
      <rect x="13.5" y="18.5" width="24" height="7" rx="2" fill={FILL2} stroke={OUT} strokeWidth="2.3" />
      <g stroke={OUT} strokeWidth="1.5">
        <path d="M19 20.5v3M23 20.5v3M27 20.5v3M31 20.5v3" />
      </g>
      <g stroke={DNA} strokeWidth="2">
        <path d="M21 33c0 3.5 8 3.5 8 7s-8 3.5-8 7" />
        <path d="M29 33c0 3.5-8 3.5-8 7s8 3.5 8 7" />
        <path d="M22.4 36.5h5.2M21.4 40h7.2M22.4 43.5h5.2" />
      </g>
      <g transform="rotate(38 44 48.5)">
        <path d="M44 44H39.5A4.5 4.5 0 0 0 39.5 53H44Z" fill={DNA} opacity="0.5" />
        <rect x="35" y="44" width="18" height="9" rx="4.5" fill="none" stroke={OUT} strokeWidth="2.3" />
        <path d="M44 44v9" stroke={OUT} strokeWidth="2.1" />
      </g>
    </Frame>
  );
}

/* ---- Horizontal DNA double-helix accent (sits above the sign-in form) ---- */
export function HelixStrand({ width = 150, className }: { width?: number; className?: string }) {
  const W = 150;
  const H = 36;
  const CY = 18;
  const AMP = 10;
  const TURNS = 2.5;
  const PAD = 11;
  const span = W - PAD * 2;
  const FREQ = (Math.PI * 2 * TURNS) / span;

  const a: string[] = [];
  const b: string[] = [];
  for (let x = 0; x <= span; x += 3) {
    const ax = PAD + x;
    const s = Math.sin(x * FREQ);
    a.push(`${ax.toFixed(1)},${(CY + AMP * s).toFixed(1)}`);
    b.push(`${ax.toFixed(1)},${(CY - AMP * s).toFixed(1)}`);
  }

  const rungs = Array.from({ length: 8 }, (_, i) => {
    const x = (span / 7) * i;
    const ax = PAD + x;
    const s = Math.sin(x * FREQ);
    return { ax, y1: CY + AMP * s, y2: CY - AMP * s, front: Math.cos(x * FREQ) >= 0, even: i % 2 === 0 };
  });

  return (
    <svg
      width={width}
      height={(H / W) * width}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fgHs" x1="0" y1="0" x2={W} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#98cbc4" />
          <stop offset="0.5" stopColor="#5e9e8f" />
          <stop offset="1" stopColor="#98cbc4" />
        </linearGradient>
      </defs>
      {rungs.map((r, i) => (
        <line
          key={`r${i}`}
          x1={r.ax}
          y1={r.y1}
          x2={r.ax}
          y2={r.y2}
          stroke={r.even ? "#9cc7bb" : "#cde6de"}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
      <path d={"M " + a.join(" L ")} stroke="url(#fgHs)" strokeWidth="2.2" strokeLinecap="round" />
      <path d={"M " + b.join(" L ")} stroke="url(#fgHs)" strokeWidth="2.2" strokeLinecap="round" />
      {rungs.map((r, i) => (
        <g key={`n${i}`}>
          <circle cx={r.ax} cy={r.y1} r={r.front ? 2.5 : 1.8} fill="#5e9e8f" />
          <circle cx={r.ax} cy={r.y2} r={r.front ? 1.8 : 2.5} fill="#68b3a9" />
        </g>
      ))}
    </svg>
  );
}

/* ---- Vertical DNA double-helix mark (for the corner badge) ---- */
export function HelixVert({ size = 34, className }: { size?: number; className?: string }) {
  const W = 26;
  const H = 38;
  const CX = 13;
  const AMP = 7.4;
  const TOP = 4;
  const BOT = 34;
  const TURNS = 2;
  const span = BOT - TOP;
  const FREQ = (Math.PI * 2 * TURNS) / span;

  const a: string[] = [];
  const b: string[] = [];
  for (let y = TOP; y <= BOT; y += 2) {
    const s = Math.sin((y - TOP) * FREQ);
    a.push(`${(CX + AMP * s).toFixed(1)},${y}`);
    b.push(`${(CX - AMP * s).toFixed(1)},${y}`);
  }

  const rungs = Array.from({ length: 6 }, (_, i) => {
    const y = TOP + (span / 5) * i;
    const s = Math.sin((y - TOP) * FREQ);
    return { y, x1: CX + AMP * s, x2: CX - AMP * s, front: Math.cos((y - TOP) * FREQ) >= 0 };
  });

  return (
    <svg
      width={(W / H) * size}
      height={size}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {rungs.map((r, i) => (
        <line
          key={`r${i}`}
          x1={r.x1}
          y1={r.y}
          x2={r.x2}
          y2={r.y}
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ))}
      <path d={"M " + a.join(" L ")} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d={"M " + b.join(" L ")} stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      {rungs.map((r, i) => (
        <g key={`n${i}`} fill="currentColor">
          <circle cx={r.x1} cy={r.y} r={r.front ? 2.1 : 1.5} />
          <circle cx={r.x2} cy={r.y} r={r.front ? 1.5 : 2.1} />
        </g>
      ))}
    </svg>
  );
}

/* ---- Genetic counseling: counselor with headset + speech bubbles ---- */
export function CounselingArt(props: Props) {
  return (
    <Frame {...props}>
      <g stroke={RAY} strokeWidth="2.1">
        <path d="M32 3v3.4" />
        <path d="M24 5l1.2 3.1" />
        <path d="M40 5l-1.2 3.1" />
      </g>
      <path
        d="M6 16h13a3 3 0 0 1 3 3v5.5a3 3 0 0 1-3 3h-7l-4.5 4v-4H6a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3z"
        fill={WHITE}
        stroke={OUT}
        strokeWidth="2.1"
      />
      <g stroke={DNA} strokeWidth="1.7">
        <path d="M9.5 19.5c0 2.4 5 2.4 5 4.4s-5 2-5 4.4" />
        <path d="M14.5 19.5c0 2.4-5 2.4-5 4.4s5 2 5 4.4" />
      </g>
      <path
        d="M45 14h13a3 3 0 0 1 3 3v5.5a3 3 0 0 1-3 3h-3.5l-4 4v-4H45a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3z"
        fill={WHITE}
        stroke={OUT}
        strokeWidth="2.1"
      />
      <g fill={DNA}>
        <circle cx="49" cy="19.5" r="1.4" />
        <circle cx="53.5" cy="19.5" r="1.4" />
        <circle cx="58" cy="19.5" r="1.4" />
      </g>
      <circle cx="32" cy="27" r="9.5" fill={FILL} stroke={OUT} strokeWidth="2.3" />
      <path d="M22.6 26a9.5 9.5 0 0 1 18.8 0" stroke={OUT} strokeWidth="2.4" />
      <path d="M41 28c2.2 2 2 5.2-1 6.8l-3.2 1.1" stroke={OUT} strokeWidth="2" />
      <circle cx="33.4" cy="36.4" r="1.5" fill={OUT} />
      <circle cx="29" cy="27" r="1.3" fill={OUT} />
      <circle cx="35" cy="27" r="1.3" fill={OUT} />
      <path d="M30 30.6q2 1.6 4 0" stroke={OUT} strokeWidth="1.8" />
      <path
        d="M17 53v-3.2a15 15 0 0 1 30 0V53z"
        fill={FILL}
        stroke={OUT}
        strokeWidth="2.4"
      />
      <path d="M27 39l5 6 5-6" stroke={OUT} strokeWidth="2.2" />
      <path d="M32 45.5v7.5" stroke={OUT} strokeWidth="2" />
    </Frame>
  );
}
