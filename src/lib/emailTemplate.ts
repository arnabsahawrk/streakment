import { SITE_URL } from "./config";
import { esc } from "./email";
import { dayWord, fmtNum, typeLabel } from "./format";
import { pickQuote, quoteKindFor, type EmailKind } from "./quotes";
import { DAY_MS, kindOf } from "./streak";
import { TIERS, ZERO_STATE, getTier, nextTier, type Paint } from "./tiers";
import { fmtDateTime, isValidZone, zoneLabel } from "./zone";

export type { EmailKind };

export interface EmailStreak {
  id: string;
  name: string;
  why_note: string;
  type: string;
  goal_days: number | null;
  start_date: string | Date;
  max_streak: number;
  fail_count: number;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  /** A plain-text copy for mail apps that can't show the card. */
  text: string;
  /** The preview line shown beside the subject in an inbox. */
  preheader: string;
}

/**
 * The three streakment emails: created, milestone, challenge complete.
 *
 * Built from nested tables with inline styles (no <style> block, no media
 * queries), so it looks the same in Gmail, Apple Mail and Outlook, on a phone
 * and on a desktop. The one rule that makes that possible: every detail is TWO
 * rows, the label and then its value underneath, each the full width of the
 * card. Nothing is ever side by side, so nothing has to reflow.
 *
 * Gradients appear only on shapes (the top band, the step strip, the
 * progress bar, the quote bar), each with a solid colour behind it for the
 * mail apps that ignore gradients. Text is always a plain solid colour: gradient
 * text (`color: transparent`) would vanish where it isn't supported.
 */

const PAGE = "#14110E";
const CARD = "#1C1815";
const LINE = "#2E2620";
const INK = "#F2ECE3";
const DIM = "#A79C8C";
const FAINT = "#7A6F62";
const FLAME = "#FF6B35";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const MONO = "'SF Mono',SFMono-Regular,ui-monospace,Menlo,Consolas,'Roboto Mono','Courier New',monospace";
const SERIF = "Georgia,'Times New Roman',serif";

/** Long names, long unbroken links and multi-line text wrap inside the card. */
const WRAP = "word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;";

/** A solid stand-in for "this colour at `amount` over the card", for the many
 *  mail apps that ignore transparency. */
function blend(hex: string, amount: number, over = CARD): string {
  const mix = (i: number) => {
    const a = parseInt(hex.slice(i, i + 2), 16);
    const b = parseInt(over.slice(i, i + 2), 16);
    return Math.round(b + (a - b) * amount).toString(16).padStart(2, "0");
  };
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

/** A gradient along `angle`, with the solid colour behind it as the fallback. */
function shape(paint: Paint, angle: number): string {
  const stops = paint.stops.map((s) => `${s.color} ${s.at}%`).join(",");
  return `background-color:${paint.solid};background-image:linear-gradient(${angle}deg,${stops});`;
}

const paragraphs = (text: string) => esc(text).replace(/\r?\n/g, "<br>");

/** One detail: its label, then its value, as two full-width rows. */
function detail(label: string, valueHtml: string, last: boolean): string {
  return `<tr><td data-k="label" style="padding:14px 24px 0;font-family:${MONO};font-size:10px;line-height:1.4;letter-spacing:1.5px;text-transform:uppercase;color:${FAINT}">${esc(label)}</td></tr>
<tr><td data-k="value" style="padding:4px 24px 14px;${last ? "" : `border-bottom:1px solid ${LINE};`}font-family:${FONT};font-size:14px;line-height:1.55;color:${INK};${WRAP}">${valueHtml}</td></tr>`;
}

/** Ten cells, one per milestone. Every one reached is in its own gradient;
 *  what is still ahead is dark. The day each begins on sits underneath. */
function stepStrip(reachedDay: number, heroBg: string): string {
  const cells = TIERS.map((t, i) => {
    const reached = reachedDay >= t.min;
    const fill = reached ? shape(t, 90) : `background-color:${LINE};`;
    return `<td width="10%" height="8" style="width:10%;height:8px;line-height:8px;font-size:0;${i > 0 ? `border-left:3px solid ${heroBg};` : ""}${fill}">&nbsp;</td>`;
  }).join("");
  const labels = TIERS.map((t) => {
    const reached = reachedDay >= t.min;
    return `<td width="10%" align="center" style="width:10%;padding-top:6px;font-family:${MONO};font-size:9px;line-height:1.2;color:${reached ? t.solid : FAINT}">${t.min}</td>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;margin-top:20px"><tr>${cells}</tr><tr>${labels}</tr></table>`;
}

/** A challenge has no ladder: a plain progress bar, and how far it has got. */
function progressBar(done: number, goal: number, paint: Paint): string {
  const pct = goal > 0 ? Math.max(0, Math.min(100, Math.round((done / goal) * 100))) : 0;
  const fill = pct > 0 ? `<td width="${pct}%" height="8" style="width:${pct}%;height:8px;line-height:8px;font-size:0;${shape(paint, 90)}">&nbsp;</td>` : "";
  const rest = pct < 100 ? `<td height="8" style="height:8px;line-height:8px;font-size:0;background-color:${LINE}">&nbsp;</td>` : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;margin-top:20px"><tr>${fill}${rest}</tr>
<tr><td colspan="2" style="padding-top:6px;font-family:${MONO};font-size:10px;color:${DIM}">${fmtNum(done)} / ${fmtNum(goal)}</td></tr></table>`;
}

export function buildStreakEmail(kind: EmailKind, s: EmailStreak, day: number, zone: string): BuiltEmail {
  const tz = isValidZone(zone) ? zone : "UTC";
  const isChallenge = kindOf(s) === "challenge";
  const goal = s.goal_days ?? 0;
  const startMs = new Date(s.start_date).getTime();
  const when = (ms: number) => `${fmtDateTime(ms, tz, true)} · ${zoneLabel(tz)}`;

  // Where the streakment is, in this email.
  const shownDay = kind === "created" ? 0 : kind === "challenge_complete" ? goal : day;
  const tier = kind === "milestone" ? getTier(day) : kind === "challenge_complete" ? getTier(goal) : TIERS[0];
  const accent: Paint = tier;
  const tierIndex = Math.max(0, TIERS.findIndex((t) => t.name === tier.name));
  const best = Math.max(s.max_streak, shownDay);
  const failed = s.fail_count;

  const subject =
    kind === "created"
      ? `${s.name} · ${isChallenge ? "challenge started" : "started"}`
      : kind === "challenge_complete"
        ? `${s.name} · challenge complete`
        : `${s.name} · ${tier.name} · day ${day}`;

  const tag =
    kind === "created"
      ? isChallenge
        ? `CHALLENGE · ${goal} ${dayWord(goal).toUpperCase()}`
        : "DAY ZERO"
      : kind === "challenge_complete"
        ? "CHALLENGE COMPLETE"
        : `${tier.name.toUpperCase()} · DAY ${day}`;

  const caption = isChallenge ? `OF ${fmtNum(goal)} ${dayWord(goal).toUpperCase()}` : dayWord(shownDay).toUpperCase();

  const preheader =
    kind === "created"
      ? `${typeLabel(isChallenge ? "challenge" : "legend")}${isChallenge ? ` · ${goal} ${dayWord(goal)}` : ""} · started`
      : kind === "challenge_complete"
        ? `${goal} of ${goal} ${dayWord(goal)} · ${failed} failed`
        : `${tier.name} · day ${day} · ${failed} failed · best ${best} ${dayWord(best)}`;

  // The details, in order. Label first, value under it.
  const rows: [string, string, string][] = []; // label, html, plain text
  const add = (label: string, html: string, text = html) => rows.push([label, html, text]);

  add("Why", paragraphs(s.why_note), s.why_note);
  add("Type", esc(typeLabel(isChallenge ? "challenge" : "legend")), typeLabel(isChallenge ? "challenge" : "legend"));
  if (isChallenge) {
    add("Goal", `${fmtNum(goal)} ${dayWord(goal)}`);
  } else {
    const level = `${shownDay === 0 ? ZERO_STATE.name : tier.name} · ${shownDay === 0 ? 0 : tierIndex + 1} of ${TIERS.length}`;
    add("Level", level);
  }
  add("Started", esc(when(startMs)), when(startMs));
  if (kind === "milestone") add("Reached", esc(when(startMs + day * DAY_MS)), when(startMs + day * DAY_MS));
  if (kind === "challenge_complete") add("Completed", esc(when(startMs + goal * DAY_MS)), when(startMs + goal * DAY_MS));
  if (!isChallenge && best > 0) add("Best", `${fmtNum(best)} ${dayWord(best)}`);
  add("Failed", String(failed));

  if (kind === "challenge_complete") {
    add("Status", "Completed");
  } else if (isChallenge) {
    add("Ends", esc(when(startMs + goal * DAY_MS)), when(startMs + goal * DAY_MS));
  } else {
    const next = nextTier(shownDay);
    if (next) {
      const at = when(startMs + next.min * DAY_MS);
      add("Next", `${esc(next.name)} · day ${next.min}<br><span style="color:${DIM}">${esc(at)}</span>`, `${next.name} · day ${next.min}\n${at}`);
    } else {
      add("Status", "Completed");
    }
  }

  const quote = pickQuote(quoteKindFor(kind, day), `${s.id}:${day}`);
  const heroBg = blend(accent.solid, 0.14);
  const hero = `<tr><td style="padding:24px 24px 22px;background-color:${heroBg}">
<p style="margin:0 0 10px;font-family:${MONO};font-size:11px;line-height:1.4;letter-spacing:2px;color:${accent.solid};${WRAP}">${esc(tag)}</p>
<p style="margin:0;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;color:${INK};${WRAP}">${esc(s.name)}</p>
<p style="margin:18px 0 0;font-family:${MONO};font-size:64px;line-height:1;font-weight:700;color:${accent.solid}">${fmtNum(shownDay)}</p>
<p style="margin:8px 0 0;font-family:${MONO};font-size:10px;letter-spacing:2px;color:${DIM}">${esc(caption)}</p>
${isChallenge ? progressBar(shownDay, goal, accent) : stepStrip(kind === "created" ? 0 : day, heroBg)}
</td></tr>`;

  const detailRows = rows.map(([label, html], i) => detail(label, html, i === rows.length - 1)).join("\n");

  const quoteBlock = `<tr><td style="padding:22px 24px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed"><tr>
<td width="4" style="width:4px;font-size:0;line-height:0;${shape(accent, 180)}">&nbsp;</td>
<td style="padding:0 0 0 16px;${WRAP}">
<p style="margin:0;font-family:${SERIF};font-size:16px;line-height:1.55;font-style:italic;color:${INK}">&ldquo;${esc(quote.text)}&rdquo;</p>
<p style="margin:8px 0 0;font-family:${MONO};font-size:11px;line-height:1.5;color:${DIM}">&mdash; ${esc(quote.by)}</p>
</td></tr></table></td></tr>`;

  // A long run of invisible characters stops the first words of the card
  // from being pulled into the inbox preview after the preheader.
  const hidden = "&#8199;&#847; ".repeat(40);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background-color:${PAGE}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${PAGE}">${esc(preheader)}${hidden}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;background-color:${PAGE}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;max-width:540px;background-color:${CARD};border-radius:20px;overflow:hidden">
<tr><td height="6" style="height:6px;line-height:6px;font-size:0;${shape(accent, 90)}">&nbsp;</td></tr>
<tr><td style="padding:18px 24px 16px;font-family:${MONO};font-size:12px;font-weight:700;letter-spacing:2px;color:${FLAME}">STREAKMENT</td></tr>
${hero}
${detailRows}
${quoteBlock}
<tr><td style="padding:12px 24px 24px;font-family:${MONO};font-size:12px"><a href="${SITE_URL}" style="color:${accent.solid};text-decoration:none">Open Streakment</a></td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `STREAKMENT`,
    tag,
    s.name,
    `${fmtNum(shownDay)} ${caption.toLowerCase()}`,
    ...rows.map(([label, , plain]) => `\n${label}\n${plain}`),
    `\n"${quote.text}"\n— ${quote.by}`,
    `\nOpen Streakment: ${SITE_URL}`,
  ].join("\n");

  return { subject, html, text, preheader };
}
