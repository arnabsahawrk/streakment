"use client";

import { now, useDisplay } from "@/lib/clock";
import { dayWord } from "@/lib/format";
import { reducedMotion } from "@/lib/motion";
import { GOLD } from "@/lib/progress";
import { BLOCKS, BLOCK_HOURS, buildStats, type StatReset, type StatStreak } from "@/lib/stats";
import { statsCache } from "@/lib/statsCache";
import { TIERS, getTier } from "@/lib/tiers";
import { WEEKDAYS } from "@/lib/zone";
import { animate } from "motion/react";
import { Flame, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Loading from "./Loading";
import Modal from "./Modal";

interface Data {
  streaks: StatStreak[];
  resets: StatReset[];
}

const CACHE_MS = 60_000;
const cached = (): Data | null =>
  statsCache.data && Date.now() - statsCache.at < CACHE_MS ? (statsCache.data as Data) : null;

const FLAME = "#FF6B35";
const MUTED = "#4A3F36";
const PAUSED = "#CFC4B2";
const ARCHIVED = "#857869";
const delay = (i: number, step = 55) => ({ animationDelay: `${i * step}ms` });

/** A number that counts up to its value when it appears. Frames go straight
 *  into the page, not through React state. */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (to === 0 || reducedMotion()) {
      el.textContent = to.toLocaleString("en-US");
      return;
    }
    const controls = animate(0, to, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = Math.round(v).toLocaleString("en-US");
      },
    });
    return () => controls.stop();
  }, [to]);
  return <span ref={ref}>0</span>;
}

function Section({ i, title, children }: { i: number; title: string; children: ReactNode }) {
  return (
    <section className="sm-rise" style={delay(i, 70)}>
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden className="h-3 w-0.5 rounded-full bg-flame" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper-dim">{title}</p>
      </div>
      {children}
    </section>
  );
}

/** A soft coloured glow tucked into a card's corner. */
function Glow({ color, className = "" }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-28 w-28 rounded-full ${className}`}
      style={{ background: `radial-gradient(circle, ${color}33, transparent 70%)` }}
    />
  );
}

const CARD = "relative overflow-hidden rounded-2xl border border-ember-line";
const CARD_BG = { background: "linear-gradient(160deg, #241E19 0%, #19150F 100%)" };

/** One column per value, the tallest one lit. */
function Columns({
  values,
  labels,
  sub,
  step,
}: {
  values: number[];
  labels: readonly string[];
  sub?: readonly string[];
  step: number;
}) {
  const max = Math.max(1, ...values);
  const top = Math.max(...values);
  return (
    <div className="flex gap-1.5">
      {values.map((v, i) => (
        <div key={labels[i]} className="flex min-w-0 flex-1 flex-col items-center">
          <span className="h-4 font-mono text-[11px] tabular-nums text-paper-dim">{v || ""}</span>
          <div className="flex h-16 w-full items-end">
            <div
              className="sm-growy w-full rounded-md"
              style={{
                height: v ? `${Math.max(16, (v / max) * 100)}%` : "4px",
                background: v === 0 ? "#241E19" : v === top ? `linear-gradient(180deg, #FF9A5C, ${FLAME})` : MUTED,
                ...delay(i, step),
              }}
            />
          </div>
          <span className={`mt-2 text-[10px] ${v && v === top ? "text-paper" : "text-paper-dim"}`}>{labels[i]}</span>
          {sub && <span className="text-[9px] text-paper-dim/60">{sub[i]}</span>}
        </div>
      ))}
    </div>
  );
}

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

  const model = useMemo(
    () => (data ? buildStats(data.streaks, data.resets, now(), d.tz) : null),
    [data, d.tz],
  );

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
    const maxTier = Math.max(1, ...model.tiers);
    const maxReset = Math.max(1, ...model.mostReset.map((b) => b.count));
    const longestColor = o.longest ? (o.longest.challenge ? GOLD : getTier(o.longest.days).color) : FLAME;
    const longestName = o.longest ? (o.longest.challenge ? "Challenge" : getTier(o.longest.days).name) : "";
    const split = o.alive + o.paused + o.archived;
    const challenges = o.challengesMet + o.challengesMissed;

    body = (
      <div className="flex flex-col gap-7 pb-1">
        <div className="grid grid-cols-2 gap-2.5">
          <div className={`${CARD} sm-rise p-4`} style={CARD_BG}>
            <Glow color={FLAME} className="-right-8 -top-8" />
            <RotateCcw size={15} aria-hidden style={{ color: FLAME }} />
            <p className="mt-3 font-mono text-4xl font-bold leading-none tabular-nums">
              <CountUp to={o.resets} />
            </p>
            <p className="mt-2.5 text-[10px] uppercase tracking-[0.18em] text-paper-dim">Resets</p>
            <p className="mt-1 text-[11px] text-paper-dim/70">all time</p>
          </div>

          <div className={`${CARD} sm-rise p-4`} style={{ ...CARD_BG, ...delay(1) }}>
            <Glow color={GOLD} className="-right-8 -top-8" />
            <Flame size={15} aria-hidden style={{ color: GOLD }} />
            <p className="mt-3 font-mono text-4xl font-bold leading-none tabular-nums">
              <CountUp to={o.started} />
            </p>
            <p className="mt-2.5 text-[10px] uppercase tracking-[0.18em] text-paper-dim">Streakments</p>
            {split > 0 && (
              <div className="mt-2.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                {o.alive > 0 && <span className="rounded-full" style={{ flex: o.alive, background: FLAME }} />}
                {o.paused > 0 && <span className="rounded-full" style={{ flex: o.paused, background: PAUSED }} />}
                {o.archived > 0 && <span className="rounded-full" style={{ flex: o.archived, background: ARCHIVED }} />}
              </div>
            )}
            <div className="mt-2.5 flex flex-wrap justify-between gap-x-2 gap-y-1.5">
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
          </div>
        </div>

        {o.longest && (
          <div
            className={`${CARD} sm-rise p-4`}
            style={{
              borderColor: `${longestColor}55`,
              background: `linear-gradient(135deg, ${longestColor}22 0%, #19150F 70%)`,
              ...delay(2),
            }}
          >
            <Glow color={longestColor} className="-right-6 -top-10 h-36 w-36" />
            <div className="relative flex items-start justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-paper-dim">Longest run</p>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                style={{ borderColor: `${longestColor}77`, color: longestColor, background: `${longestColor}14` }}
              >
                <Flame size={12} aria-hidden />
                {longestName}
              </span>
            </div>
            <p className="relative mt-3 flex items-baseline gap-2">
              <span className="font-mono text-5xl font-bold leading-none tabular-nums" style={{ color: longestColor }}>
                <CountUp to={o.longest.days} />
              </span>
              <span className="text-sm text-paper-dim">{dayWord(o.longest.days)}</span>
            </p>
            <p className="relative mt-2.5 break-words text-sm">{o.longest.name}</p>
          </div>
        )}

        {challenges > 0 && (
          <Section i={3} title="Challenges">
            <div className={`${CARD} p-4`} style={CARD_BG}>
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                {o.challengesMet > 0 && <span className="rounded-full" style={{ flex: o.challengesMet, background: GOLD }} />}
                {o.challengesMissed > 0 && (
                  <span className="rounded-full" style={{ flex: o.challengesMissed, background: MUTED }} />
                )}
              </div>
              <p className="mt-3 flex justify-between text-xs">
                <span style={{ color: GOLD }}>
                  <span className="font-mono font-semibold tabular-nums">{o.challengesMet}</span> met
                </span>
                <span className="text-paper-dim">
                  <span className="font-mono font-semibold tabular-nums">{o.challengesMissed}</span> not met
                </span>
              </p>
            </div>
          </Section>
        )}

        {o.started > 0 && (
          <Section i={4} title="Milestones reached">
            <ul className="flex flex-col gap-3">
              {TIERS.map((t, i) => {
                const n = model.tiers[i];
                return (
                  <li key={t.name} className="flex items-center gap-3">
                    <span className="flex w-28 shrink-0 items-baseline gap-1.5">
                      <span className="text-xs font-medium" style={{ color: n ? t.color : "#6B6358" }}>
                        {t.name}
                      </span>
                      <span className="font-mono text-[10px] text-paper-dim/60">{t.min}d</span>
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ember-line/70">
                      {n > 0 && (
                        <div
                          className="sm-grow h-full rounded-full"
                          style={{
                            width: `${Math.max(6, (n / maxTier) * 100)}%`,
                            background: `linear-gradient(90deg, ${t.color}88, ${t.color})`,
                            boxShadow: `0 0 10px ${t.color}55`,
                            ...delay(i, 50),
                          }}
                        />
                      )}
                    </div>
                    <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-paper-dim">
                      {n || "–"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {model.pattern.total > 0 && (
          <Section i={5} title="When resets happen">
            <div className={`${CARD} flex flex-col gap-5 p-4`} style={CARD_BG}>
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-paper-dim">By day</p>
                <Columns
                  values={[1, 2, 3, 4, 5, 6, 0].map((wd) => model.pattern.byDay[wd])}
                  labels={[1, 2, 3, 4, 5, 6, 0].map((wd) => WEEKDAYS[wd])}
                  step={45}
                />
              </div>
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-paper-dim">By time</p>
                <Columns values={model.pattern.byBlock} labels={BLOCKS} sub={BLOCK_HOURS} step={70} />
              </div>
              <p className="border-t border-ember-line pt-3 text-xs text-paper-dim">
                {model.pattern.insight ?? "A pattern shows up after a few more resets."}
              </p>
            </div>
          </Section>
        )}

        {model.mostReset.length > 0 && (
          <Section i={6} title="Most reset">
            <ul className="flex flex-col gap-3.5">
              {model.mostReset.map((b, i) => (
                <li key={i} className="flex items-center gap-3">
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
                          width: `${(b.count / maxReset) * 100}%`,
                          background: i === 0 ? `linear-gradient(90deg, ${FLAME}, #FFA060)` : "#7A5A48",
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
