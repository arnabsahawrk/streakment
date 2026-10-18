"use client";

import { now, useDisplay } from "@/lib/clock";
import { dayWord, fmtNum } from "@/lib/format";
import { reducedMotion } from "@/lib/motion";
import { BLOCKS, BLOCK_HOURS, GRID_DAYS, buildStats, type StatFail, type StatStreak } from "@/lib/stats";
import { statsCache } from "@/lib/statsCache";
import { FOIL_PAINT, GOLD, TIERS, getTier } from "@/lib/tiers";
import { Flag, Flame, X } from "lucide-react";
import { animate } from "motion/react";
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import InfiniteMark from "./InfiniteMark";
import Loading from "./Loading";
import Modal from "./Modal";

interface Data {
  streaks: StatStreak[];
  fails: StatFail[];
}

/** One read, kept for 60 seconds in memory and dropped on any change (see
 *  dropStatsCache). Stats never write to the database. */
const CACHE_MS = 60_000;
const cached = (): Data | null =>
  statsCache.data && Date.now() - statsCache.at < CACHE_MS ? (statsCache.data as Data) : null;

const FLAME = "#FF6B35";
const FLAME_TO = "#FFA060";
const MUTED = "#4A3F36";
const PAUSED = "#CFC4B2";
const ARCHIVED = "#857869";
const delay = (i: number, step = 55): CSSProperties => ({ animationDelay: `${i * step}ms` });

/** A number that counts up to its value when it appears. Frames go straight
 *  into the page, not through React state. */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (to === 0 || reducedMotion()) {
      el.textContent = fmtNum(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = fmtNum(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [to]);
  return <span ref={ref}>0</span>;
}

function Section({ i, title, note, children }: { i: number; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="sm-rise" style={delay(i, 70)}>
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden className="h-3 w-0.5 rounded-full bg-flame" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper-dim">{title}</p>
      </div>
      {note && <p className="-mt-1 mb-3 text-[11px] text-paper-dim/80">{note}</p>}
      {children}
    </section>
  );
}

/** A soft coloured glow tucked into a card. */
function Glow({ color, className = "" }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-28 w-28 rounded-full ${className}`}
      style={{ background: `radial-gradient(circle, ${color}33, transparent 70%)` }}
    />
  );
}

const CARD = "relative overflow-hidden rounded-2xl";
const CARD_BG = "linear-gradient(160deg, #241E19 0%, #19150F 100%)";

/** A card with a hairline border in a gradient of its own. */
const hairline = (from: string, to: string): CSSProperties => ({
  border: "1px solid transparent",
  backgroundImage: `${CARD_BG}, linear-gradient(135deg, ${from}, ${to})`,
  backgroundOrigin: "padding-box, border-box",
  backgroundClip: "padding-box, border-box",
});
const flat: CSSProperties = { border: "1px solid #2E2620", background: CARD_BG };

const BIG = "gradient-text font-mono text-4xl font-bold leading-none tabular-nums";
const LABEL = "text-[10px] uppercase tracking-[0.18em] text-paper-dim";

export default function StatsSheet({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Data | null>(cached);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const d = useDisplay();

  useEffect(() => {
    if (data) return;
    let off = false;
    fetch("/api/stats")
      .then((r) => {
        if (!r.ok) throw new Error("stats");
        return r.json() as Promise<Data>;
      })
      .then((next) => {
        if (off) return;
        statsCache.at = Date.now();
        statsCache.data = next;
        setData(next);
      })
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, [data, attempt]);

  const model = useMemo(() => (data ? buildStats(data.streaks, data.fails, now(), d.tz) : null), [data, d.tz]);

  let body: ReactNode;
  if (failed) {
    body = (
      <div className="py-6 text-center">
        <p className="mb-4 text-sm text-paper-dim">Couldn&apos;t load the stats.</p>
        <button
          onClick={() => {
            setFailed(false);
            setAttempt((a) => a + 1);
          }}
          className="press rounded-full border border-ember-line px-5 py-2 text-sm hover:border-flame"
        >
          Try again
        </button>
      </div>
    );
  } else if (!model) {
    body = <Loading label="Counting" />;
  } else {
    const o = model.overview;
    const p = model.pattern;
    const maxFailed = Math.max(1, ...model.mostFailed.map((b) => b.count));
    const longest = o.longest;
    const longestPaint = longest ? (longest.badge === "Infinite" ? FOIL_PAINT : getTier(longest.days)) : null;
    // Alive, paused, completed-but-not-yet-archived and archived: together exactly "started".
    const waiting = Math.max(0, o.started - o.alive - o.paused - o.archived);
    const challenges = o.challengesCompleted + o.challengesFailed;

    const steps = [
      {
        name: "Accept Challenge",
        node: (
          <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: TIERS[1].css }}>
            <Flag size={16} aria-hidden style={{ color: "#14110E" }} />
          </span>
        ),
        lines: [[o.challengesCompleted, "completed"]] as [number, string][],
        color: TIERS[1].solid,
      },
      {
        name: "Become Legend",
        node: (
          <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: FOIL_PAINT.css }}>
            <Flame size={16} aria-hidden style={{ color: "#14110E" }} />
          </span>
        ),
        lines: [[o.legendsReached, "reached"]] as [number, string][],
        color: GOLD,
      },
      {
        name: "Infinite Streakment",
        node: (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              border: "1px solid transparent",
              backgroundImage: `linear-gradient(#1C1815, #1C1815), ${FOIL_PAINT.css}`,
              backgroundOrigin: "padding-box, border-box",
              backgroundClip: "padding-box, border-box",
            }}
          >
            <InfiniteMark width={20} stroke={2.6} />
          </span>
        ),
        lines: [
          [o.infiniteRunning, "running"],
          [o.infiniteStopped, "stopped"],
        ] as [number, string][],
        color: "#A58BFF",
      },
    ];

    body = (
      <div className="flex flex-col gap-7 pb-1">
        {/* 1. Two hero cards, values centred. */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className={`${CARD} sm-rise flex flex-col items-center justify-center p-4 text-center`} style={hairline(FLAME, FLAME_TO)}>
            <Glow color={FLAME} className="left-1/2 -top-12 h-32 w-32 -translate-x-1/2" />
            <span
              className="relative flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: `${FLAME}1F`, border: `1px solid ${FLAME}55` }}
            >
              <X size={14} aria-hidden style={{ color: FLAME }} />
            </span>
            <p className={`${BIG} relative mt-3`} style={{ backgroundImage: `linear-gradient(135deg, ${FLAME}, ${FLAME_TO})` }}>
              <CountUp to={o.failed} />
            </p>
            <p className={`${LABEL} relative mt-2.5`}>Failed</p>
            <p className="relative mt-1 text-[11px] text-paper-dim/70">all time</p>
          </div>

          <div
            className={`${CARD} sm-rise flex flex-col items-center p-4 text-center`}
            style={{ ...hairline(GOLD, "#FF8A3D"), ...delay(1) }}
          >
            <Glow color={GOLD} className="left-1/2 -top-12 h-32 w-32 -translate-x-1/2" />
            <span
              className="relative flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: `${GOLD}1F`, border: `1px solid ${GOLD}55` }}
            >
              <Flame size={14} aria-hidden style={{ color: GOLD }} />
            </span>
            <p className={`${BIG} relative mt-3`} style={{ backgroundImage: `linear-gradient(135deg, ${GOLD}, #FF8A3D)` }}>
              <CountUp to={o.started} />
            </p>
            <p className={`${LABEL} relative mt-2.5`}>Streakments</p>
            {o.started > 0 && (
              <div className="relative mt-2.5 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
                {o.alive > 0 && <span className="rounded-full" style={{ flex: o.alive, background: FLAME }} />}
                {o.paused > 0 && <span className="rounded-full" style={{ flex: o.paused, background: PAUSED }} />}
                {waiting > 0 && <span className="rounded-full" style={{ flex: waiting, background: GOLD }} />}
                {o.archived > 0 && <span className="rounded-full" style={{ flex: o.archived, background: ARCHIVED }} />}
              </div>
            )}
            <div className="relative mt-2.5 flex w-full justify-between gap-1">
              {(
                [
                  ["alive", o.alive, FLAME],
                  ["paused", o.paused, PAUSED],
                  ["archived", o.archived, ARCHIVED],
                ] as const
              ).map(([label, n, color]) => (
                <div key={label}>
                  <p className="font-mono text-sm font-semibold leading-none tabular-nums" style={{ color }}>
                    {n}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-wide text-paper-dim">{label}</p>
                </div>
              ))}
            </div>
            <p className="relative mt-3 border-t border-ember-line pt-2 text-[11px]" style={{ color: GOLD }}>
              <span className="font-mono font-semibold tabular-nums">{o.completed}</span> completed in total
            </p>
          </div>
        </div>

        {/* 2. The path. */}
        <Section i={2} title="The path">
          <div className={`${CARD} p-4`} style={flat}>
            <ol className="flex items-start">
              {steps.map((s, i) => (
                <Fragment key={s.name}>
                  <li className="flex min-w-0 flex-1 flex-col items-center text-center">
                    {s.node}
                    <p className="mt-2 break-words text-[11px] font-medium leading-tight">{s.name}</p>
                    <div className="mt-1.5 flex flex-col gap-0.5">
                      {s.lines.map(([n, label], j) => (
                        <p key={label} className={j === 0 ? "text-[11px]" : "text-[10px] text-paper-dim/80"}>
                          <span
                            className="font-mono font-semibold tabular-nums"
                            style={{ color: j === 0 ? s.color : undefined }}
                          >
                            {n}
                          </span>{" "}
                          <span className="text-paper-dim">{label}</span>
                        </p>
                      ))}
                    </div>
                  </li>
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden
                      className="mt-[17px] h-0.5 w-4 shrink-0 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${s.color}, ${steps[i + 1].color})` }}
                    />
                  )}
                </Fragment>
              ))}
            </ol>
          </div>
        </Section>

        {/* 3. Longest run. */}
        {longest && longestPaint && (
          <div
            className={`${CARD} sm-rise p-4`}
            style={{
              border: `1px solid ${longestPaint.solid}55`,
              background: `linear-gradient(135deg, ${longestPaint.solid}22 0%, #19150F 70%)`,
              ...delay(3),
            }}
          >
            <Glow color={longestPaint.solid} className="-right-6 -top-10 h-36 w-36" />
            <div className="relative flex items-start justify-between gap-3">
              <p className={LABEL}>Longest run</p>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                style={{ borderColor: `${longestPaint.solid}77`, color: longestPaint.solid, background: `${longestPaint.solid}14` }}
              >
                <Flame size={12} aria-hidden />
                {longest.badge}
              </span>
            </div>
            <p className="relative mt-3 flex items-baseline gap-2">
              <span
                className={`gradient-text font-mono text-5xl font-bold leading-none tabular-nums ${longestPaint.foil ? "sm-foil-slide" : ""}`}
                style={{ backgroundImage: longestPaint.css }}
              >
                <CountUp to={longest.days} />
              </span>
              <span className="text-sm text-paper-dim">{dayWord(longest.days)}</span>
            </p>
            <p className="relative mt-2.5 break-words text-sm">{longest.name}</p>
          </div>
        )}

        {/* 4. Challenges: completed or failed. */}
        {challenges > 0 && (
          <Section i={4} title="Challenges">
            <div className={`${CARD} p-4`} style={flat}>
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                {o.challengesCompleted > 0 && (
                  <span className="rounded-full" style={{ flex: o.challengesCompleted, background: GOLD }} />
                )}
                {o.challengesFailed > 0 && (
                  <span className="rounded-full" style={{ flex: o.challengesFailed, background: MUTED }} />
                )}
              </div>
              <p className="mt-3 flex justify-between text-xs">
                <span style={{ color: GOLD }}>
                  <span className="font-mono font-semibold tabular-nums">{o.challengesCompleted}</span> completed
                </span>
                <span className="text-paper-dim">
                  <span className="font-mono font-semibold tabular-nums">{o.challengesFailed}</span> failed
                </span>
              </p>
            </div>
          </Section>
        )}

        {/* 5. Milestones reached: the chips. */}
        {o.started > 0 && (
          <Section i={5} title="Milestones reached" note="Times each one was reached, across every Become Legend run.">
            <div className="flex flex-wrap gap-1.5">
              {TIERS.map((t, i) => {
                const n = model.tiers[i];
                return (
                  <span
                    key={t.name}
                    className={`sm-pop inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${n > 0 ? "" : "opacity-45"}`}
                    style={{ borderColor: n > 0 ? `${t.solid}78` : "#2E2620", ...delay(i, 40) }}
                  >
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: t.css }} />
                    {t.name}
                    {n > 0 && <span className="font-mono text-paper-dim">×{n}</span>}
                  </span>
                );
              })}
            </div>
          </Section>
        )}

        {/* 6. When I failed: weekday by time of day. */}
        {p.total > 0 && (
          <Section i={6} title="When I failed">
            <div className={`${CARD} p-4`} style={flat}>
              <div className="grid grid-cols-[2.5rem_repeat(4,minmax(0,1fr))] gap-1 text-[10px]">
                <span />
                {BLOCKS.map((b, c) => (
                  <div key={b} className="min-w-0 text-center leading-tight">
                    <p className="text-paper-dim max-[379px]:text-[9px] max-[379px]:tracking-tighter">{b}</p>
                    <p className="text-[9px] text-paper-dim/60">{BLOCK_HOURS[c]}</p>
                  </div>
                ))}
                {GRID_DAYS.map((day, r) => (
                  <Fragment key={day}>
                    <span className="flex items-center text-paper-dim">{day}</span>
                    {p.grid[r].map((n, c) => {
                      const k = p.max > 0 ? n / p.max : 0;
                      return (
                        <span
                          key={c}
                          className="sm-pop flex h-8 items-center justify-center rounded-md text-[11px] font-semibold"
                          style={{
                            background: n === 0 ? "#241E19" : `rgba(255,107,53,${0.22 + 0.78 * k})`,
                            color: k > 0.55 ? "#14110E" : "#F2ECE3",
                            ...delay(r * 4 + c, 14),
                          }}
                        >
                          {n > 0 ? n : ""}
                        </span>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
              <p className="mt-4 border-t border-ember-line pt-3 text-xs text-paper-dim">{p.line}</p>
            </div>
          </Section>
        )}

        {/* 7. Failed most. */}
        {model.mostFailed.length > 0 && (
          <Section i={7} title="Failed most">
            <ul className="flex flex-col gap-3.5">
              {model.mostFailed.map((b, i) => (
                <li key={`${b.name}-${i}`} className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]"
                    style={{
                      borderColor: i === 0 ? `${FLAME}88` : "#2E2620",
                      color: i === 0 ? FLAME : "#A79C8C",
                      background: i === 0 ? `${FLAME}14` : "transparent",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate">{b.name}</span>
                      <span className="font-mono tabular-nums text-paper-dim">{b.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ember-line/70">
                      <div
                        className="sm-grow h-full rounded-full"
                        style={{
                          width: `${(b.count / maxFailed) * 100}%`,
                          background: i === 0 ? `linear-gradient(90deg, ${FLAME}, ${FLAME_TO})` : "#7A5A48",
                          ...delay(i, 90),
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {o.started === 0 && (
          <p className="text-sm text-paper-dim">The rest fills in once there&apos;s a streakment to count.</p>
        )}
      </div>
    );
  }

  return (
    <Modal title="Stats" onClose={onClose} wide>
      {body}
    </Modal>
  );
}
