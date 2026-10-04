"use client";

import { now, useDisplay } from "@/lib/clock";
import { dayWord } from "@/lib/format";
import { reducedMotion } from "@/lib/motion";
import { readOpens } from "@/lib/opens";
import { BLOCKS, buildStats, type BreakPattern, type StatReset, type StatStreak } from "@/lib/stats";
import { statsCache } from "@/lib/statsCache";
import { TIERS } from "@/lib/tiers";
import { WEEKDAYS, fmtDuration } from "@/lib/zone";
import { animate } from "motion/react";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Loading from "./Loading";
import Modal from "./Modal";

interface Data {
  streaks: StatStreak[];
  resets: StatReset[];
}

const CACHE_MS = 60_000;
const cached = (): Data | null =>
  statsCache.data && Date.now() - statsCache.at < CACHE_MS ? (statsCache.data as Data) : null;

/** A number that counts up to its value when it appears. Frames go straight
 *  into the page, not through React state. */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (to === 0 || reducedMotion()) {
      el.textContent = String(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [to]);
  return <span ref={ref}>0</span>;
}

const delay = (i: number, step = 55) => ({ animationDelay: `${i * step}ms` });

function Tile({ i, label, value, sub }: { i: number; label: string; value: number; sub?: string }) {
  return (
    <div className="sm-rise rounded-xl border border-ember-line bg-ash p-3" style={delay(i)}>
      <p className="font-mono text-2xl font-bold leading-none tabular-nums">
        <CountUp to={value} />
      </p>
      <p className="mt-1.5 text-[10px] uppercase tracking-wide text-paper-dim">{label}</p>
      {sub && <p className="mt-1 break-words text-[11px] leading-snug text-paper-dim/80">{sub}</p>}
    </div>
  );
}

function Section({ i, title, children }: { i: number; title: string; children: ReactNode }) {
  return (
    <section className="sm-rise" style={delay(i, 70)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-dim">{title}</p>
      {children}
    </section>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ember-line py-2.5 last:border-0">
      <span className="text-sm text-paper-dim">{label}</span>
      <span className="min-w-0 text-right">
        <span className="font-mono text-sm tabular-nums">{value}</span>
        {sub && <span className="mt-0.5 block truncate text-[11px] text-paper-dim/80">{sub}</span>}
      </span>
    </div>
  );
}

function BreakGrid({ pattern, h12 }: { pattern: BreakPattern; h12: boolean }) {
  const hours = h12 ? ["12a–6a", "6a–12p", "12p–6p", "6p–12a"] : ["00–06", "06–12", "12–18", "18–24"];
  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday first
  return (
    <div className="grid grid-cols-[2.5rem_repeat(4,minmax(0,1fr))] gap-1 text-[10px] text-paper-dim">
      <span />
      {BLOCKS.map((b, i) => (
        <span key={b} className="pb-1 text-center leading-tight">
          {b}
          <span className="block text-paper-dim/60">{hours[i]}</span>
        </span>
      ))}
      {order.map((wd, r) => (
        <Fragment key={wd}>
          <span className="flex items-center">{WEEKDAYS[wd]}</span>
          {pattern.grid[wd].map((n, b) => {
            const k = pattern.max ? n / pattern.max : 0;
            return (
              <span
                key={b}
                className="sm-pop flex h-8 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums"
                style={{
                  background: n ? `rgba(255,107,53,${0.22 + 0.78 * k})` : "#241E19",
                  color: k > 0.55 ? "#14110E" : "#F2ECE3",
                  animationDelay: `${(r * 4 + b) * 14}ms`,
                }}
              >
                {n || ""}
              </span>
            );
          })}
        </Fragment>
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
  const opens = useMemo(() => readOpens(), []);

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
    const maxBroken = Math.max(1, ...model.broken.map((b) => b.count));
    body = (
      <div className="flex flex-col gap-6 pb-1">
        <div className="grid grid-cols-2 gap-2">
          <Tile i={0} label="Resets" value={o.resets} sub="lifetime" />
          <Tile i={1} label="Days lit" value={o.daysLit} sub="across everything" />
          <Tile
            i={2}
            label="Streakments"
            value={o.started}
            sub={`${o.alive} alive · ${o.paused} paused · ${o.archived} archived`}
          />
          <Tile i={3} label="App opens" value={opens.count} sub="on this device" />
        </div>

        {o.started === 0 ? (
          <p className="text-sm text-paper-dim">The rest fills in once there&apos;s a streakment to count.</p>
        ) : (
          <>
            <Section i={4} title="Lately">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-ember-line bg-ash px-3 py-2.5">
                  <p className="font-mono text-lg font-bold tabular-nums">{o.litWeek}</p>
                  <p className="text-[10px] uppercase tracking-wide text-paper-dim">Days lit · 7 days</p>
                </div>
                <div className="rounded-xl border border-ember-line bg-ash px-3 py-2.5">
                  <p className="font-mono text-lg font-bold tabular-nums">{o.litMonth}</p>
                  <p className="text-[10px] uppercase tracking-wide text-paper-dim">Days lit · 30 days</p>
                </div>
              </div>
            </Section>

            <Section i={5} title="Records">
              <div>
                <Row
                  label="Longest run"
                  value={o.longest ? `${o.longest.days} ${dayWord(o.longest.days)}` : "—"}
                  sub={o.longest?.name}
                />
                <Row
                  label="Average run"
                  value={o.avgRun === null ? "—" : `${Math.round(o.avgRun * 10) / 10} days`}
                  sub={o.avgRun === null ? undefined : "before a reset"}
                />
                <Row
                  label="Comeback"
                  value={model.comeback ? fmtDuration(model.comeback.avgMs) : "—"}
                  sub={
                    model.comeback
                      ? `fastest ${fmtDuration(model.comeback.fastestMs)} · reset to next Begin`
                      : "from a reset to the next Begin"
                  }
                />
                {o.challengesMet + o.challengesMissed > 0 && (
                  <Row label="Challenges" value={`${o.challengesMet} met · ${o.challengesMissed} not`} />
                )}
              </div>
            </Section>

            <Section i={6} title="Tiers reached">
              <div className="flex flex-wrap gap-1.5">
                {TIERS.map((t, i) => {
                  const n = model.tiers[i];
                  return (
                    <span
                      key={t.name}
                      className="sm-pop inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
                      style={{
                        borderColor: n ? `${t.color}77` : "#2E2620",
                        opacity: n ? 1 : 0.45,
                        ...delay(i, 40),
                      }}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />
                      {t.name}
                      {n > 0 && <span className="font-mono tabular-nums text-paper-dim">×{n}</span>}
                    </span>
                  );
                })}
              </div>
            </Section>

            {model.pattern.total > 0 && (
              <Section i={7} title="When resets happen">
                <BreakGrid pattern={model.pattern} h12={d.h12} />
                <p className="mt-2.5 text-[11px] text-paper-dim">
                  {model.pattern.insight ?? "A pattern shows up after a few more resets."}
                </p>
              </Section>
            )}

            {model.broken.length > 0 && (
              <Section i={8} title="Most reset">
                <ul className="flex flex-col gap-3">
                  {model.broken.map((b, i) => (
                    <li key={i}>
                      <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate">{b.name}</span>
                        <span className="font-mono tabular-nums text-paper-dim">{b.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-ember-line">
                        <div
                          className="sm-grow h-full rounded-full bg-flame"
                          style={{ width: `${(b.count / maxBroken) * 100}%`, ...delay(i, 90) }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
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
