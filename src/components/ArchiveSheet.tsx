"use client";

import { dayWord, formatDate, typeLabel } from "@/lib/format";
import { currentStreakDays } from "@/lib/streak";
import { getTier } from "@/lib/tiers";
import type { Streak } from "@/lib/types";
import { useEffect, useState } from "react";
import HistorySheet from "./HistorySheet";
import Loading from "./Loading";
import Modal from "./Modal";

/** Everything the app keeps about a finished streakment: what it was,
 *  why it started, how far it got, how often it broke, and how it
 *  ended. No roadmap here — that's only for a streak that's still
 *  running — but the full journey stays one tap away. */
export default function ArchiveSheet({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Streak[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/streaks?archived=true")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  return (
    <>
      <Modal title="Archive" onClose={onClose} wide>
        {items === null ? (
          <Loading label="Loading" />
        ) : items.length === 0 ? (
          <p className="text-sm text-paper-dim">
            Nothing archived yet. Finished streakments land here, whole story attached.
          </p>
        ) : (
          <ul className="flex flex-col gap-5">
            {items.map((s) => {
              const isChallenge = s.type === "challenge" && !!s.goal_days;
              const finalRun = s.archived_at ? currentStreakDays(s.start_date, s.archived_at) : 0;
              const best = Math.max(s.max_streak, 0);
              return (
                <li key={s.id} className="rounded-xl border border-ember-line bg-ash p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="break-words font-semibold">{s.name}</h3>
                    <span className="shrink-0 rounded-full border border-ember-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-paper-dim">
                      {typeLabel(isChallenge)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-justify text-xs text-paper-dim">{s.why_note}</p>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-paper-dim">
                        Started
                      </dt>
                      <dd>{formatDate(s.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-paper-dim">
                        Archived
                      </dt>
                      <dd>{s.archived_at ? formatDate(s.archived_at) : "—"}</dd>
                    </div>
                    {!isChallenge && (
                      <div className="col-span-2">
                        <dt className="text-[10px] uppercase tracking-wide text-paper-dim">Best</dt>
                        <dd>
                          {best} {dayWord(best)} — reached {getTier(best).name}
                        </dd>
                      </div>
                    )}
                    {isChallenge && (
                      <div className="col-span-2">
                        <dt className="text-[10px] uppercase tracking-wide text-paper-dim">
                          Result
                        </dt>
                        <dd>
                          {finalRun >= (s.goal_days ?? 0)
                            ? `Reached — ${s.max_streak} of ${s.goal_days} ${dayWord(s.goal_days ?? 0)}`
                            : `Not reached — ${s.max_streak} of ${s.goal_days} ${dayWord(s.goal_days ?? 0)}`}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-paper-dim">Break</dt>
                      <dd>{s.reset_count}</dd>
                    </div>
                  </dl>

                  {s.archive_reason && (
                    <div className="mt-3 border-t border-ember-line pt-3">
                      <p className="text-[10px] uppercase tracking-wide text-paper-dim">
                        Closing note
                      </p>
                      <p className="prose-text mt-1 text-xs text-paper">{s.archive_reason}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setOpenId(s.id)}
                    className="mt-3 text-[11px] text-flame hover:text-paper"
                  >
                    The journey →
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>

      {openId && <HistorySheet streakId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
