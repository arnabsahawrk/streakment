"use client";

import { motion, useDragControls } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Counted, so closing one sheet that sits on top of another can't unlock
 *  the page scroll while the sheet underneath is still open. */
let scrollLocks = 0;
function lockScroll() {
  if (scrollLocks++ === 0) document.body.style.overflow = "hidden";
}
function unlockScroll() {
  if (--scrollLocks === 0) document.body.style.overflow = "";
}

/** Open sheets, oldest first. Escape only closes the one on top. */
const stack: symbol[] = [];

const SPRING = { type: "spring", damping: 34, stiffness: 420, mass: 0.9 } as const;

/** A bottom sheet on phones, a centred card on larger screens.
 *
 *  - Slides up on a spring and slides back down when closed (parents wrap
 *    it in AnimatePresence so the exit plays).
 *  - On a phone, drag the handle or title down to dismiss.
 *  - The title bar stays put while the content scrolls.
 *  - Rendered into <body>, so a card's own transforms can never trap or
 *    clip it. */
export default function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const controls = useDragControls();
  const [desktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches,
  );
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const me = Symbol("modal");
    stack.push(me);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === me) closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(me), 1);
      unlockScroll();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.7)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        initial={desktop ? { opacity: 0, scale: 0.96, y: 12 } : { y: "100%" }}
        animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={desktop ? { opacity: 0, scale: 0.97, y: 8 } : { y: "100%" }}
        transition={SPRING}
        drag={desktop ? false : "y"}
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 650) onClose();
        }}
        className={`flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-ember-line bg-ash-raised sm:rounded-2xl ${
          wide ? "sm:max-w-lg" : "sm:max-w-sm"
        }`}
      >
        <div
          onPointerDown={(e) => !desktop && controls.start(e)}
          style={{ touchAction: "none" }}
          className="shrink-0 px-5 pt-2.5 sm:px-6 sm:pt-6"
        >
          <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-ember-line sm:hidden" />
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="break-words text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="press shrink-0 py-1 pl-2 text-sm text-paper-dim hover:text-paper"
            >
              Close
            </button>
          </div>
        </div>
        <div
          className="no-scrollbar contain-scroll min-h-0 flex-1 overflow-y-auto px-5 sm:px-6"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
