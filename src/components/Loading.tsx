"use client";

import { motion } from "motion/react";

/** Three embers pulsing in sequence. Used anywhere the app is waiting on
 *  data, instead of static "Loading…" text. */
export default function Loading({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-flame"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1, 0.85] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          />
        ))}
      </div>
      {label && <p className="text-xs text-paper-dim">{label}</p>}
    </div>
  );
}
