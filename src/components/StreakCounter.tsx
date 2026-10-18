"use client";

import { fmtNum } from "@/lib/format";
import { reducedMotion } from "@/lib/motion";
import type { Paint } from "@/lib/tiers";
import { animate } from "motion/react";
import { useEffect, useRef } from "react";

/** The big day count, in the milestone's gradient. It counts up to its value
 *  (with thousands separators), but writes each frame straight into the page
 *  instead of through React state, so a card with a counting number never
 *  re-renders sixty times a second. */
export default function StreakCounter({
  value,
  caption,
  paint,
  live = false,
  shimmer = false,
  large = false,
}: {
  value: number;
  caption: string;
  paint: Paint;
  /** A running count flickers softly, like a flame. */
  live?: boolean;
  /** The foil drifts. Only for the Legend foil, and not once stopped. */
  shimmer?: boolean;
  /** Bigger type, for the Infinite card (which has no ring to fit inside). */
  large?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    prev.current = value;
    if (from === value || reducedMotion()) {
      el.textContent = fmtNum(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = fmtNum(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value]);

  // Long numbers step down a size so they always sit inside the ring.
  const digits = fmtNum(value).length;
  const size = large
    ? digits > 6 ? "text-5xl" : "text-7xl"
    : digits <= 3 ? "text-6xl" : digits <= 5 ? "text-5xl" : "text-4xl";

  return (
    <div className="px-3 text-center">
      <p
        className={`gradient-text font-mono ${size} font-bold leading-none tabular-nums ${shimmer ? "sm-foil-slide" : ""} ${live ? "sm-flicker" : ""}`}
        style={{ backgroundImage: paint.css }}
        aria-label={`${fmtNum(value)} ${caption.toLowerCase()}`}
      >
        <span ref={ref} aria-hidden>
          0
        </span>
      </p>
      <p className="mt-2 text-[10px] uppercase leading-tight tracking-[0.25em] text-paper-dim">{caption}</p>
    </div>
  );
}
