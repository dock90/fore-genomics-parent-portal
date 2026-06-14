"use client";

import { useMemo } from "react";

/**
 * Animated, glowing DNA double-helix rendered as pure SVG.
 *
 * The strand is built from a 12-step sine period and rendered twice
 * (stacked vertically) so the flow animation loops seamlessly: the wrapper
 * translates up by exactly one unit height (UNIT) and snaps back invisibly.
 */
const WIDTH = 220;
const STEPS = 24; // 2 full periods
const SPACING = 30;
const PERIOD = 12; // steps per revolution
const UNIT = STEPS * SPACING; // 720 — seamless tiling height
const AMP = 72;
const CX = WIDTH / 2;
const FREQ = (2 * Math.PI) / PERIOD;

type Rung = { x1: number; x2: number; y: number; o: number; w: number; mint: boolean };
type Node = { x: number; y: number; r: number; o: number; delay: number };

function buildUnit() {
  const a: string[] = [];
  const b: string[] = [];
  const rungs: Rung[] = [];
  const nodes: Node[] = [];

  for (let i = 0; i <= STEPS; i++) {
    const y = i * SPACING;
    const p = i * FREQ;
    const xa = CX + AMP * Math.sin(p);
    const xb = CX + AMP * Math.sin(p + Math.PI);
    const front = (Math.cos(p) + 1) / 2; // 1 = strand A in front, 0 = behind

    a.push(`${xa.toFixed(1)},${y}`);
    b.push(`${xb.toFixed(1)},${y}`);

    if (i < STEPS) {
      rungs.push({
        x1: xa,
        x2: xb,
        y,
        o: 0.12 + front * 0.4,
        w: 1 + front * 1.5,
        mint: i % 2 === 0,
      });
    }

    const delay = (i % PERIOD) * 0.17;
    nodes.push({ x: xa, y, r: 2.4 + front * 2.6, o: 0.45 + front * 0.55, delay });
    nodes.push({ x: xb, y, r: 2.4 + (1 - front) * 2.6, o: 0.45 + (1 - front) * 0.55, delay });
  }

  return { aPath: "M " + a.join(" L "), bPath: "M " + b.join(" L "), rungs, nodes };
}

function Unit({
  data,
  yOffset,
}: {
  data: ReturnType<typeof buildUnit>;
  yOffset: number;
}) {
  return (
    <g transform={`translate(0 ${yOffset})`}>
      {data.rungs.map((r, i) => (
        <line
          key={`r${i}`}
          x1={r.x1}
          y1={r.y}
          x2={r.x2}
          y2={r.y}
          stroke={r.mint ? "#8fe9d6" : "#98cbc4"}
          strokeOpacity={r.o}
          strokeWidth={r.w}
          strokeLinecap="round"
        />
      ))}
      <path d={data.aPath} stroke="url(#fgStrand)" strokeWidth="2.4" strokeLinecap="round" />
      <path d={data.bPath} stroke="url(#fgStrand)" strokeWidth="2.4" strokeLinecap="round" />
      {data.nodes.map((n, i) => (
        <circle
          key={`n${i}`}
          cx={n.x}
          cy={n.y}
          r={n.r}
          fill="url(#fgNode)"
          fillOpacity={n.o}
          className="fg-node"
          style={{ animationDelay: `${n.delay}s` }}
        />
      ))}
    </g>
  );
}

export function DnaHelix({ className }: { className?: string }) {
  const data = useMemo(buildUnit, []);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${WIDTH} ${UNIT}`}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="fgStrand" x1="0" y1="0" x2="0" y2={UNIT} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5e9e8f" stopOpacity="0.45" />
          <stop offset="0.3" stopColor="#68b3a9" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#98cbc4" stopOpacity="1" />
          <stop offset="0.7" stopColor="#68b3a9" stopOpacity="0.9" />
          <stop offset="1" stopColor="#5e9e8f" stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id="fgNode">
          <stop offset="0" stopColor="#bfe6dc" />
          <stop offset="1" stopColor="#68b3a9" />
        </radialGradient>
      </defs>
      <g className="fg-helix-flow">
        <Unit data={data} yOffset={0} />
        <Unit data={data} yOffset={UNIT} />
      </g>
    </svg>
  );
}

export default DnaHelix;
