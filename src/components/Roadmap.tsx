"use client";

import { dayWord } from "@/lib/format";
import { PAUSED_LINE, type StreakView } from "@/lib/progress";
import { TIERS, ZERO_STATE, getTier, type Tier } from "@/lib/tiers";
import { Check, Flame, Lock } from "lucide-react";
import { motion } from "motion/react";

const STEPS: Tier[] = [ZERO_STATE, ...TIERS];
const INK = "#14110E";
const OFF = "#2E2620";

/** The station a Legend stands on, or -1 while it is paused. */
function standingOn(v: StreakView): number {
  if (v.isPaused) return -1;
  let idx = 0;
  STEPS.forEach((s, i) => {
    if (v.days >= s.min) idx = i;
  });
  return idx;
}

/** The climb: ten stations in their own gradients, joined by a rope. Every
 *  station already passed is filled and lit, the one you stand on glows and
 *  says "here now", and what is ahead stays readable but cold. A completed
 *  Legend has every station reached. */
export function LegendRoadmap({ view }: { view: StreakView }) {
  const current = standingOn(view);

  return (
    <div>
      {view.isPaused && (
        <p className="mb-4 text-xs text-paper-dim">
          {PAUSED_LINE}
          {view.best ? ` Best: ${view.best} ${dayWord(view.best)}.` : ""}
        </p>
      )}
      <ul className="flex flex-col">
        {STEPS.map((step, i) => {
          const reached = i <= current;
          const here = i === current;
          const isLast = i === STEPS.length - 1;
          const nextReached = i + 1 <= current;
          const foilName = step.foil && reached;

          return (
            <li key={step.name} className="flex gap-4">
              <div className="flex shrink-0 flex-col items-center self-stretch">
                <motion.span
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.045, duration: 0.3 }}
                  className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full"
                  style={{
                    background: reached ? step.css : "transparent",
                    border: reached ? "none" : `2px solid ${OFF}`,
                    boxShadow: here && !view.isCompleted ? `0 0 0 5px ${step.glow}` : undefined,
                  }}
                >
                  {here && !view.isCompleted ? (
                    <Flame size={13} style={{ color: INK }} />
                  ) : reached ? (
                    <Check size={13} strokeWidth={3} style={{ color: INK }} />
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
                      background: nextReached ? `linear-gradient(to bottom, ${step.solid}, ${STEPS[i + 1].solid})` : OFF,
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
                  <span
                    className={`text-sm font-semibold ${foilName ? "gradient-text" : ""}`}
                    style={foilName ? { backgroundImage: step.css } : { color: reached ? step.solid : "#6B6358" }}
                  >
                    {step.name}
                  </span>
                  <span className="font-mono text-[11px] text-paper-dim">
                    {step.min === 0 ? "the start" : `day ${step.min}`}
                  </span>
                  {here && (
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide"
                      style={{ color: step.solid, backgroundColor: step.glow }}
                    >
                      {view.isCompleted ? "completed" : "here now"}
                    </span>
                  )}
                </div>
              </motion.div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A challenge has no ladder, only the distance: one stone per day, each lit
 *  in the colour of its own day on the same scale. A completed challenge is
 *  full. Past 60 days a bar takes over, so it never becomes a wall of stones. */
export function ChallengeRoadmap({ view }: { view: StreakView }) {
  const goal = view.goalDays ?? 0;
  const done = Math.min(view.days, goal);
  const toGo = Math.max(0, goal - done);

  return (
    <div>
      <p className="mb-4 text-xs text-paper-dim">
        {view.isCompleted
          ? `Completed. ${goal} of ${goal} ${dayWord(goal)}.`
          : `${toGo} ${dayWord(toGo)} to go.`}
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
                className="flex h-7 w-7 items-center justify-center rounded-md font-mono text-[10px] font-semibold"
                style={{
                  background: filled ? getTier(i + 1).css : "transparent",
                  border: filled ? "none" : `1px solid ${OFF}`,
                  color: filled ? INK : "#6B6358",
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
              style={{ background: getTier(done).css }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-paper-dim">
            {done} / {goal}
          </p>
        </div>
      )}
    </div>
  );
}
