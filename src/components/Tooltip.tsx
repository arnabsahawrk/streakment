"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Custom tooltip, rendered through a portal straight onto <body>. That's
 *  the fix for the clipping bug: a normal absolutely-positioned tooltip
 *  gets cut off by any ancestor card that has overflow-hidden (needed
 *  there to keep rounded corners clean), because CSS overflow clips
 *  descendants regardless of z-index. Escaping to the body sidesteps
 *  that entirely - it opens on hover, focus and tap, so it works on a
 *  phone too. */
export default function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      x: rect.left + rect.width / 2,
      y: side === "top" ? rect.top - 8 : rect.bottom + 8,
    });
  }, [open, side]);

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onTouchStart={() => setOpen((v) => !v)}
    >
      {children}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: "fixed",
              left: pos.x,
              top: pos.y,
              transform: side === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            }}
            className="pointer-events-none z-[100] whitespace-nowrap rounded-md border border-ember-line bg-ash-sunk px-2 py-1 text-[11px] font-medium text-paper shadow-lg sm-rise"
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
