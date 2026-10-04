/** True when the device asks for less motion. The animation library's own
 *  components already honour this; the few hand-driven animations (number
 *  count-ups) check it here. */
export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
