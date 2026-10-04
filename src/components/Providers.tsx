"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";

/** App-wide behaviour that has to live in a client component. */
export default function Providers({ children }: { children: ReactNode }) {
  // iOS Safari only paints :active (the press feedback on buttons) when
  // something on the page is listening for touches. A passive no-op does it.
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  // "user" = every animation quietly turns into a simple fade for anyone
  // who has Reduce Motion switched on.
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
