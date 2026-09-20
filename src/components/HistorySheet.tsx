"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import Loading from "./Loading";
import { currentStreakDays } from "@/lib/streak";
import { getTier } from "@/lib/tiers";
import { formatDate, dayWord, kindLabel } from "@/lib/format";
import type { Streak, ResetEntry } from "@/lib/types";

/** Every number and every break, for one streak — running or archived.
 *  This is the one thing an archived streak still offers, since its
 *  roadmap is frozen and there's nowhere left to climb. */
export default function HistorySheet({
  streakId,
  onClose,
}: {
  streakId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ streak: Streak; resets: ResetEntry[] } | null>(null);

  useEffect(() => {
    fetch(`/api/streaks/${streakId}/detail`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [streakId]);

  if (!data) {
    return (
      <Modal title="History" onClose={onClose} wide>
        <Loading label="Loading the history" />
      </Modal>
    );
  }

  const s = data.streak;
  const isSprint = s.kind === "sprint" && !!s.goal_days;
  // For an archived streak, every number is fixed at the moment it was
  // archived — it must never still be counting up to today.
  const asOf = s.archived ? s.archived_at ?? undefined : undefined;
  const days = currentStreakDays(s.start_date, asOf);
  const best = Math.max(s.max_streak, s.archived ? 0 : days);

  return (
    <Modal title={s.name} onClose={onClose} wide>
      <dl className="mb-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-paper-dim">Kind</dt>
          <dd>{isSprint ? `${s.goal_days}-day ${kindLabel(true)}` : kindLabel(false)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-paper-dim">Started</dt>
          <dd>{formatDate(s.created_at)}</dd>
        </div>

        {s.archived ? (
          <div className="col-span-2">
            <dt className="text-[11px] uppercase tracking-wide text-paper-dim">Result</dt>
            <dd>
              {isSprint
                ? days >= (s.goal_days ?? 0)
                  ? `Reached the goal — ${s.goal_days} of ${s.goal_days} ${dayWord(s.goal_days ?? 0)}`
                  : `Didn't reach the goal — ${days} of ${s.goal_days} ${dayWord(s.goal_days ?? 0)}`
                : `Best streak: ${best} ${dayWord(best)} — reached ${getTier(best).name}`}
            </dd>
          </div>
        ) : (
          <>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-paper-dim">Current streak</dt>
              <dd>{s.start_date ? formatDate(s.start_date) : "Paused"}</dd>
            </div>
            {!isSprint && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-paper-dim">Best streak</dt>
                <dd>{best} {dayWord(best)}</dd>
              </div>
            )}
          </>
        )}

        <div>
          <dt className="text-[11px] uppercase tracking-wide text-paper-dim">Times reset</dt>
          <dd>{s.reset_count}</dd>
        </div>
      </dl>

      {s.archive_reason && (
        <div className="mb-5 border-t border-ember-line pt-4">
          <p className="text-[11px] uppercase tracking-wide text-paper-dim">Closing note</p>
          <p className="prose-text mt-1 text-sm text-paper">{s.archive_reason}</p>
        </div>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-paper-dim">
        Every break
      </p>
      {data.resets.length === 0 ? (
        <p className="text-sm text-paper-dim">Never broken.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.resets.map((r) => (
            <li key={r.id} className="border-b border-ember-line pb-3 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-sm">
                  {r.streak_reached} {dayWord(r.streak_reached)}
                </span>
                <span className="text-[11px] text-paper-dim">
                  {formatDate(r.run_start)} → {formatDate(r.reset_at)}
                </span>
              </div>
              {r.note && <p className="prose-text mt-1 text-xs text-paper-dim">{r.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
