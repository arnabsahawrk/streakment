"use client";

import { motion } from "motion/react";
import { Lock, Check, Flame } from "lucide-react";
import { TIERS, ZERO_STATE, type Tier } from "@/lib/tiers";
import { dayWord } from "@/lib/format";

const STEPS: Tier[] = [ZERO_STATE, ...TIERS];

function reachedIndex(days: number, paused: boolean) {
  if (paused) return -1;
  let idx = 0;
  STEPS.forEach((s, i) => { if (days >= s.min) idx = i; });
  return idx;
}

/** The climb, drawn as a rope of lit and unlit stations. Everything you
 *  have passed burns in its own tier colour, where you stand now pulses,
 *  and what's ahead stays readable but cold - the point is to see where
 *  this goes, not to hide it. */
export function LegendRoadmap({ days, paused }: { days: number; paused: boolean }) {
  const current = reachedIndex(days, paused);

  return (
    <ul className="flex flex-col">
      {STEPS.map((step, i) => {
        const reached = i <= current;
        const isCurrent = i === current;
        const nextReached = i + 1 <= current;
        const isLast = i === STEPS.length - 1;

        return (
          <li key={step.name} className="flex gap-4">
            <div className="flex shrink-0 flex-col items-center self-stretch">
              <motion.span
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.045, duration: 0.3 }}
                className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2"
                style={{
                  backgroundColor: reached ? `${step.color}26` : "transparent",
                  borderColor: reached ? step.color : "#2E2620",
                  boxShadow: isCurrent ? `0 0 0 5px ${step.color}22` : undefined,
                }}
              >
                {isCurrent ? (
                  <Flame size={13} style={{ color: step.color }} />
                ) : reached ? (
                  <Check size={13} style={{ color: step.color }} />
                ) : (
                  <Lock size={11} className="text-paper-dim opacity-60" />
                )}
              </motion.span>
              {!isLast && (
                <motion.span
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.045 + 0.1, duration: 0.3 }}
                  className="my-1 w-0.5 flex-1 rounded-full"
                  style={{
                    transformOrigin: "top",
                    backgroundColor: nextReached ? STEPS[i + 1].color : "#2E2620",
                  }}
                />
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.045, duration: 0.3 }}
              className={isLast ? "pb-1" : "pb-6"}
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold" style={{ color: reached ? step.color : "#6B6358" }}>
                  {step.name}
                </span>
                <span className="font-mono text-[11px] text-paper-dim">
                  {step.min === 0 ? "the start" : `day ${step.min}`}
                </span>
                {isCurrent && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide"
                    style={{ color: step.color, backgroundColor: `${step.color}1A` }}
                  >
                    here now
                  </span>
                )}
              </div>
            </motion.div>
          </li>
        );
      })}
    </ul>
  );
}

/** A challenge has no ladder - just the distance. Rendered as lit stones so
 *  progress is countable at a glance. */
export function ChallengeRoadmap({
  days,
  goal,
  paused,
  color,
}: {
  days: number;
  goal: number;
  paused: boolean;
  color: string;
}) {
  const done = paused ? 0 : Math.min(days, goal);
  const complete = done >= goal;

  return (
    <div>
      <p className="mb-4 text-xs text-paper-dim">
        {complete
          ? `Set ${goal} ${dayWord(goal)}. Reached it.`
          : paused
            ? `Paused. ${goal} ${dayWord(goal)} once begun.`
            : `${goal - done} ${dayWord(goal - done)} to go.`}
      </p>

      {goal <= 60 ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: goal }, (_, i) => {
            const filled = i < done;
            return (
              <motion.span
                key={i}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: Math.min(i * 0.025, 0.5), duration: 0.25 }}
                className="flex h-7 w-7 items-center justify-center rounded-md border font-mono text-[10px]"
                style={{
                  backgroundColor: filled ? `${color}26` : "transparent",
                  borderColor: filled ? color : "#2E2620",
                  color: filled ? color : "#6B6358",
                }}
              >
                {i + 1}
              </motion.span>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-ember-line">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(done / goal) * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-paper-dim">{done} / {goal}</p>
        </div>
      )}
    </div>
  );
}
