import { PATH_LABELS } from "@/lib/format";
import type { Kind } from "@/lib/streak";

const KINDS: Kind[] = ["challenge", "legend", "infinite"];

/** Accept Challenge → Become Legend → Infinite Streakment. The three layers
 *  in order. Each step stays whole and the arrow sticks to the step before it,
 *  so when the line is too long for the space it wraps at an arrow, never in
 *  the middle of a name. With `active`, that layer is lit and the rest dim. */
export default function PathStrip({
  active,
  center = false,
  className = "",
}: {
  active?: Kind;
  center?: boolean;
  className?: string;
}) {
  return (
    <p className={`flex flex-wrap gap-x-1.5 gap-y-0.5 leading-snug ${center ? "justify-center text-center" : ""} ${className}`}>
      {PATH_LABELS.map((label, i) => (
        <span
          key={label}
          className={`whitespace-nowrap ${
            active ? (KINDS[i] === active ? "font-semibold text-paper" : "text-paper-dim/70") : ""
          }`}
        >
          {label}
          {i < PATH_LABELS.length - 1 && (
            <span aria-hidden className="ml-1.5 text-paper-dim/60">
              →
            </span>
          )}
        </span>
      ))}
    </p>
  );
}
