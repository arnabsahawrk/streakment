/** Brevo transactional email. Chosen over Resend because it sends from a
 *  validated sender address without requiring a verified domain, and the
 *  free tier (300/day) never expires. */
const ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export async function sendEmail(opts: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  /** A plain-text copy for mail apps that can't show the card. */
  text?: string;
}): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return false;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": key,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: process.env.BREVO_SENDER_NAME ?? "Streakment",
        },
        to: [{ email: opts.to, name: opts.toName || opts.to }],
        subject: opts.subject,
        htmlContent: opts.html,
        ...(opts.text ? { textContent: opts.text } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

import { dayWord } from "./format";
import { GOLD } from "./progress";
import { pickQuote, type QuoteKind } from "./quotes";
import { TIERS, ZERO_STATE, getTier, nextTier } from "./tiers";
import { DAY_MS, fmtDateTime, isValidZone, zoneLabel } from "./zone";

export type EmailKind = QuoteKind;

export interface EmailStreak {
  id: string;
  name: string;
  why_note: string;
  type: string;
  goal_days: number | null;
  start_date: string | Date;
  max_streak: number;
  reset_count: number;
}

const FLAME = "#FF6B35";
const INK = "#F2ECE3";
const DIM = "#A79C8C";
const LINE = "#2E2620";
const CARD = "#1C1815";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const MONO = "'SF Mono',SFMono-Regular,ui-monospace,Menlo,Consolas,'Roboto Mono','Courier New',monospace";
const SERIF = "Georgia,'Times New Roman',serif";
const SITE = "https://streakment.vercel.app";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A solid stand-in for "this colour at 14% over the card", for the many
 *  mail apps that ignore transparency. */
function tint(hex: string, amount = 0.16): string {
  const mix = (i: number) => {
    const a = parseInt(hex.slice(i, i + 2), 16);
    const b = parseInt(CARD.slice(i, i + 2), 16);
    return Math.round(b + (a - b) * amount).toString(16).padStart(2, "0");
  };
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

/** The plain wrapper the passcode-recovery email uses. */
export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#14110E;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#1C1815;border:1px solid #2E2620;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 4px;color:#FF6B35;font-size:12px;font-weight:700;letter-spacing:2px">STREAKMENT</p>
<h1 style="margin:0 0 16px;color:#F2ECE3;font-size:20px">${title}</h1>
${bodyHtml}
<p style="margin:28px 0 0;color:#A79C8C;font-size:12px;border-top:1px solid #2E2620;padding-top:16px">
Keep the streakment alive. · <a href="https://streakment.vercel.app" style="color:#FF6B35;text-decoration:none">Open Streakment</a>
</p>
</td></tr></table></td></tr></table></body></html>`;
}

/** One milestone email: a card with everything about the streakment and a
 *  single quote, nothing else. It is built from tables with inline styles,
 *  so it holds up in Gmail, Apple Mail and Outlook, and it narrows cleanly
 *  on a phone (the detail rows stack, the text wraps). */
export function buildStreakEmail(
  kind: EmailKind,
  s: EmailStreak,
  days: number,
  zone: string,
): { subject: string; html: string; text: string } {
  const tz = isValidZone(zone) ? zone : "UTC";
  const startMs = new Date(s.start_date).getTime();
  const when = (ms: number) => `${fmtDateTime(ms, tz, true)} · ${zoneLabel(tz)}`;
  const challenge = s.type === "challenge" && !!s.goal_days;
  const goal = s.goal_days ?? 0;
  const tier = challenge ? null : getTier(days);
  const tierIndex = tier ? TIERS.findIndex((t) => t.name === tier.name) : -1;
  const accent = kind === "created" ? (challenge ? GOLD : FLAME) : challenge ? GOLD : (tier ?? ZERO_STATE).color;
  const best = Math.max(s.max_streak, days);
  const breaks = s.reset_count;

  // ---- the details, in reading order
  const rows: [string, string][] = [
    ["Why", s.why_note],
    ["Kind", challenge ? "Accept Challenge" : "Become Legend"],
  ];
  if (challenge) rows.push(["Goal", `${goal} ${dayWord(goal)}`]);
  else rows.push(["Level", tier && tier.min > 0 ? `${tier.name} · ${tierIndex + 1} of ${TIERS.length}` : "Day Zero"]);
  rows.push(["Started", when(startMs)]);
  if (kind === "milestone") rows.push(["Reached", when(startMs + days * DAY_MS)]);
  if (kind === "challenge_complete") rows.push(["Completed", when(startMs + goal * DAY_MS)]);
  if (!challenge) rows.push(["Best", `${best} ${dayWord(best)}`]);
  rows.push(["Breaks", String(breaks)]);
  if (challenge) {
    if (kind === "created") rows.push(["Ends", when(startMs + goal * DAY_MS)]);
    else rows.push(["Result", "Goal reached"]);
  } else {
    const up = nextTier(days);
    rows.push([
      "Next",
      up ? `${up.name} · day ${up.min} · in ${up.min - days} ${dayWord(up.min - days)} · ${when(startMs + up.min * DAY_MS)}` : "Top level reached",
    ]);
  }

  // ---- headline pieces
  const label =
    kind === "created"
      ? challenge ? "CHALLENGE STARTED" : "STARTED"
      : kind === "challenge_complete"
        ? "CHALLENGE COMPLETE"
        : `${(tier as NonNullable<typeof tier>).name.toUpperCase()} · DAY ${days}`;
  const subject =
    kind === "created"
      ? `${s.name} · ${challenge ? "challenge started" : "started"}`
      : kind === "challenge_complete"
        ? `${s.name} · challenge complete`
        : `${s.name} · ${(tier as NonNullable<typeof tier>).name} · day ${days}`;
  const preheader =
    kind === "created"
      ? `${challenge ? `${goal} ${dayWord(goal)} · ` : ""}started ${fmtDateTime(startMs, tz, false)}`
      : `${days} ${dayWord(days)} · ${breaks} ${breaks === 1 ? "break" : "breaks"} · ${best} best`;
  const quote = pickQuote(kind, `${s.id}:${days}`);

  // ---- progress: ten milestones for a legend, a plain bar for a challenge
  const progress = challenge
    ? (() => {
        const pct = Math.max(0, Math.min(100, Math.round((days / goal) * 100)));
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>
<td width="${pct}%" style="width:${pct}%;height:8px;line-height:8px;font-size:0;background:${GOLD};border-radius:4px">&nbsp;</td>
<td width="${100 - pct}%" style="width:${100 - pct}%;height:8px;line-height:8px;font-size:0;background:${LINE};border-radius:4px">&nbsp;</td></tr></table>`;
      })()
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:3px 0;margin:0 -3px;width:calc(100% + 6px)"><tr>${TIERS.map(
        (t) =>
          `<td width="10%" style="width:10%;height:8px;line-height:8px;font-size:0;background:${days >= t.min ? t.color : LINE};border-radius:4px">&nbsp;</td>`,
      ).join("")}</tr></table>`;

  const rowHtml = rows
    .map(
      ([k, v], i) => `<tr>
<td class="lbl" valign="top" width="96" style="width:96px;padding:11px 12px 11px 0;${i ? `border-top:1px solid ${LINE};` : ""}font-family:${FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${DIM}">${k}</td>
<td class="val" valign="top" style="padding:11px 0;${i ? `border-top:1px solid ${LINE};` : ""}font-family:${FONT};font-size:14px;line-height:1.5;color:${INK};word-break:break-word;overflow-wrap:anywhere">${esc(v).replace(/\n/g, "<br>")}</td>
</tr>`,
    )
    .join("\n");

  const bigNumber = challenge ? `${days}` : `${days}`;
  const bigLabel = challenge ? `of ${goal} ${dayWord(goal)}` : dayWord(days);

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(subject)}</title>
<style>
  body{margin:0;padding:0;background:#14110E}
  table{border-collapse:collapse}
  @media only screen and (max-width:480px){
    .outer{padding:12px 8px!important}
    .px{padding-left:20px!important;padding-right:20px!important}
    .name{font-size:21px!important}
    .num{font-size:54px!important}
    .lbl,.val{display:block!important;width:100%!important;box-sizing:border-box!important}
    .lbl{padding:12px 0 2px!important}
    .val{padding:0 0 12px!important;border-top:0!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#14110E">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#14110E">${esc(preheader)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#14110E"><tr><td class="outer" align="center" style="padding:28px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;background:${CARD};border:1px solid ${LINE};border-radius:18px;overflow:hidden">
<tr><td style="height:5px;line-height:5px;font-size:0;background:${accent}">&nbsp;</td></tr>
<tr><td class="px" style="padding:22px 28px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-family:${MONO};font-size:12px;font-weight:700;letter-spacing:2.5px;color:${FLAME}">STREAKMENT</td>
  </tr></table>
</td></tr>
<tr><td class="px" style="padding:26px 28px 0">
  <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${tint(accent)};border:1px solid ${accent};font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:1.5px;line-height:1.3;color:${accent}">${esc(label)}</span>
  <div class="name" style="margin:14px 0 0;font-family:${FONT};font-size:24px;font-weight:700;line-height:1.25;color:${INK};word-break:break-word;overflow-wrap:anywhere">${esc(s.name)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
    <td class="num" style="font-family:${MONO};font-size:64px;font-weight:700;line-height:1;color:${accent}">${bigNumber}</td>
    <td style="padding:0 0 6px 12px;font-family:${FONT};font-size:14px;color:${DIM};vertical-align:bottom">${esc(bigLabel)}</td>
  </tr></table>
</td></tr>
<tr><td class="px" style="padding:20px 28px 0">${progress}</td></tr>
<tr><td class="px" style="padding:24px 28px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE}">
${rowHtml}
  </table>
</td></tr>
<tr><td class="px" style="padding:24px 28px 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="3" style="width:3px;font-size:0;line-height:0;background:${accent};border-radius:2px">&nbsp;</td>
    <td style="padding:2px 0 2px 16px">
      <div style="font-family:${SERIF};font-size:17px;line-height:1.5;font-style:italic;color:${INK}">&ldquo;${esc(quote.text)}&rdquo;</div>
      ${quote.by ? `<div style="margin-top:7px;font-family:${FONT};font-size:12px;letter-spacing:.5px;color:${DIM}">${esc(quote.by)}</div>` : ""}
    </td>
  </tr></table>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px"><tr><td align="center" style="padding:16px 0 4px;font-family:${FONT};font-size:12px"><a href="${SITE}" style="color:${DIM};text-decoration:none">Open Streakment</a></td></tr></table>
</td></tr></table>
</body></html>`;

  const text = [
    label,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `"${quote.text}"${quote.by ? ` ${quote.by}` : ""}`,
    "",
    SITE,
  ].join("\n");

  return { subject, html, text };
}
