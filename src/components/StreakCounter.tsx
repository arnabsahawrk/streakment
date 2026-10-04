"use client";

import { reducedMotion } from "@/lib/motion";
import { animate } from "motion/react";
import { useEffect, useRef } from "react";

/** The big day count. It counts up to its value, but writes each frame
 *  straight into the page instead of through React state, so a card with
 *  a counting number never re-renders sixty times a second. */
export default function StreakCounter({
  value,
  label,
  caption,
  color,
}: {
  value: number;
  /** Pre-capped string ("365+"); the animation still runs on the number. */
  label: string;
  caption: string;
  color: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const capped = label.endsWith("+");

  useEffect(() => {
    const el = ref.current;
    if (!el || capped) return;
    const from = prev.current;
    prev.current = value;
    if (from === value || reducedMotion()) {
      el.textContent = String(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, capped]);

  return (
    <div className="px-3 text-center">
      <p className="font-mono text-6xl font-bold leading-none tabular-nums sm-flicker" style={{ color }}>
        {capped ? <span>{label}</span> : <span ref={ref}>0</span>}
      </p>
      <p className="mt-2 text-[10px] uppercase leading-tight tracking-[0.25em] text-paper-dim">{caption}</p>
    </div>
  );
}
