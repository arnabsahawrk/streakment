"use client";

import { motion } from "motion/react";

/** A pill-shaped choice between a few options, with a highlight that
 *  glides to whichever one is picked. `id` keeps two of these on one
 *  screen from sharing a highlight. */
export default function Segmented<T extends string>({
  id,
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  id: string;
  value: T;
  options: readonly { key: T; label: string }[];
  onChange: (key: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex rounded-full border border-ember-line bg-ash-raised p-0.5 ${className}`}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={`press relative flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium ${
              active ? "text-ash" : "text-paper-dim hover:text-paper"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-flame"
                transition={{ type: "spring", damping: 30, stiffness: 420 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
