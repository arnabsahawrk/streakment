import crypto from "crypto";

/** Constant-time string compare: both sides are hashed to the same length
 *  first, so neither the length nor the first wrong character shows up in how
 *  long the compare takes. */
export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}
