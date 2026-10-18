"use client";

import type { Paint } from "@/lib/tiers";
import { useEffect, useId, useState, type ReactNode } from "react";

/** A ring whose stroke is the milestone's gradient. The gradient gets an id
 *  of its own per ring, so two cards on one screen never share or overwrite
 *  each other's colours. */
export default function ProgressRing({
  progress,
  paint,
  size = 210,
  stroke = 8,
  children,
}: {
  progress: number;
  paint: Paint;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  // Starts empty and fills on the next frame, so the ring sweeps round when
  // a card appears and glides to its new length when the progress changes.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(progress));
    return () => cancelAnimationFrame(id);
  }, [progress]);

  const gradientId = `ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, shown)));
  const mid = size / 2;

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {paint.stops.map((s) => (
              <stop key={s.at} offset={`${s.at}%`} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
        <circle cx={mid} cy={mid} r={r} fill="none" stroke="#2E2620" strokeWidth={stroke} />
        <circle
          cx={mid}
          cy={mid}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${mid} ${mid})`}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
