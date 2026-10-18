import { FOIL_PAINT } from "@/lib/tiers";
import { useId } from "react";

/** The ∞ mark, drawn as a stroke so it can take the Legend foil (or the
 *  surrounding text colour). The same shape everywhere it appears. */
export default function InfiniteMark({
  width = 58,
  stroke = 2.2,
  foil = true,
  faded = false,
}: {
  width?: number;
  stroke?: number;
  /** The Legend foil gradient; otherwise the current text colour. */
  foil?: boolean;
  faded?: boolean;
}) {
  const id = `inf-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      width={width}
      height={Math.round((width * 12) / 22)}
      viewBox="1 6 22 12"
      fill="none"
      aria-hidden
      style={{ opacity: faded ? 0.7 : 1 }}
    >
      {foil && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            {FOIL_PAINT.stops.map((s) => (
              <stop key={s.at} offset={`${s.at}%`} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>
      )}
      <path
        d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8"
        stroke={foil ? `url(#${id})` : "currentColor"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
