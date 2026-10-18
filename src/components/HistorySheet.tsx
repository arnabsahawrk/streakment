"use client";

import { now, useDisplay } from "@/lib/clock";
import { dayWord, fmtNum, typeLabel } from "@/lib/format";
import { resultOf, viewOf } from "@/lib/progress";
import type { FailEntry, Streak } from "@/lib/types";
import { useEffect, useState } from "react";
import Loading from "./Loading";
import Modal from "./Modal";

const DT = "text-[11px] uppercase tracking-wide text-paper-dim";
const TONE = { completed: "#FFC233", failed: "#F0877F", archived: "#F2ECE3" } as const;

/** The journey of one streakment, running or archived: when it began, how
 *  often it failed, how far it got, and every fail with its dates and note.
 *  A failed Challenge shows its single fail. For an archived one every number
 *  is fixed at the moment it was archived. */
export default function HistorySheet({ streakId, onClose }: { streakId: string; onClose: () => void }) {
  const [data, setData] = useState<{ streak: Streak; fails: FailEntry[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const d = useDisplay();

  useEffect(() => {
    let off = false;
    fetch(`/api/streaks/${streakId}/detail`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((next) => !off && setData(next))
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, [streakId]);

  if (!data) {
    return (
      <Modal title="Journey" onClose={onClose} wide>
        {failed ? <p className="pb-4 text-sm text-paper-dim">Couldn&apos;t load the journey.</p> : <Loading label="Loading" />}
      </Modal>
    );
  }

  const s = data.streak;
  const v = viewOf(s, now());
  const result = s.archived ? resultOf(s) : null;

  return (
    <Modal title={s.name} onClose={onClose} wide>
      <div className="sm-fade">
        <dl className="mb-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className={DT}>Type</dt>
            <dd>
              {typeLabel(v.kind)}
              {v.goalDays ? ` · ${fmtNum(v.goalDays)} ${dayWord(v.goalDays)}` : ""}
            </dd>
          </div>
          <div>
            <dt className={DT}>Started</dt>
            <dd>{d.date(s.created_at)}</dd>
          </div>

          {result ? (
            <div className="col-span-2">
              <dt className={DT}>Result</dt>
              <dd style={{ color: TONE[result.tone] }}>{result.text}</dd>
            </div>
          ) : v.kind === "challenge" ? (
            <div className="col-span-2">
              <dt className={DT}>Reached</dt>
              <dd>
                {fmtNum(v.days)} of {fmtNum(v.goalDays ?? 0)} {dayWord(v.goalDays ?? 0)}
              </dd>
            </div>
          ) : (
            <div>
              <dt className={DT}>{v.isPaused ? "Status" : "Since"}</dt>
              <dd>{v.isPaused || !s.start_date ? "Paused" : d.date(s.start_date)}</dd>
            </div>
          )}

          <div>
            <dt className={DT}>Failed</dt>
            <dd>{s.fail_count}</dd>
          </div>
          {v.kind === "legend" && v.best !== null && (
            <div>
              <dt className={DT}>Best</dt>
              <dd>
                {fmtNum(v.best)} {dayWord(v.best)}
              </dd>
            </div>
          )}
          {s.archived && s.archived_at && (
            <div>
              <dt className={DT}>Archived</dt>
              <dd>{d.date(s.archived_at)}</dd>
            </div>
          )}
        </dl>

        {s.archive_reason && (
          <div className="mb-5 border-t border-ember-line pt-4">
            <p className={DT}>Closing note</p>
            <p className="prose-text mt-1 text-sm text-paper">{s.archive_reason}</p>
          </div>
        )}

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-dim">Every fail</p>
        {data.fails.length === 0 ? (
          <p className="pb-2 text-sm text-paper-dim">Never failed.</p>
        ) : (
          <ul className="flex flex-col gap-3 pb-2">
            {data.fails.map((f, i) => (
              <li
                key={f.id}
                className="sm-rise border-b border-ember-line pb-3 last:border-0"
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-sm">
                    {fmtNum(f.streak_reached)} {dayWord(f.streak_reached)}
                  </span>
                  <span className="text-[11px] text-paper-dim">
                    {d.date(f.run_start)} → {d.dateTime(f.failed_at)}
                  </span>
                </div>
                {f.note && <p className="prose-text mt-1 text-xs text-paper-dim">{f.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
