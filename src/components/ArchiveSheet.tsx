"use client";

import { useDisplay } from "@/lib/clock";
import { typeLabel } from "@/lib/format";
import { resultOf } from "@/lib/progress";
import { kindOf } from "@/lib/streak";
import type { Streak } from "@/lib/types";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import HistorySheet from "./HistorySheet";
import Loading from "./Loading";
import Modal from "./Modal";

const DT = "text-[10px] uppercase tracking-wide text-paper-dim";
const TONE = { completed: "#FFC233", failed: "#F0877F", archived: "#F2ECE3" } as const;

/** Everything the app keeps about a finished streakment: what it was, why it
 *  started, how it ended, how often it failed, and the note left at the end.
 *  The numbers are the capped ones (never past the goal, never past 365).
 *  No roadmap here (there is nowhere left to climb), but the whole journey
 *  stays one tap away. */
export default function ArchiveSheet({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Streak[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const d = useDisplay();

  useEffect(() => {
    let off = false;
    fetch("/api/streaks?archived=true")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows) => !off && setItems(Array.isArray(rows) ? rows : []))
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, []);

  return (
    <>
      <Modal title="Archive" onClose={onClose} wide>
        {failed ? (
          <p className="pb-4 text-sm text-paper-dim">Couldn&apos;t load the archive.</p>
        ) : items === null ? (
          <Loading label="Loading" />
        ) : items.length === 0 ? (
          <p className="pb-4 text-sm text-paper-dim">
            Nothing archived yet. Finished streakments land here, whole story attached.
          </p>
        ) : (
          <ul className="flex flex-col gap-5 pb-1">
            {items.map((s, idx) => {
              const result = resultOf(s);
              return (
                <li
                  key={s.id}
                  className="sm-rise rounded-xl border border-ember-line bg-ash p-4"
                  style={{ animationDelay: `${Math.min(idx, 8) * 55}ms` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words font-semibold">{s.name}</h3>
                    <span className="shrink-0 rounded-full border border-ember-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-paper-dim">
                      {typeLabel(kindOf(s))}
                    </span>
                  </div>

                  <p className="prose-text mt-1.5 text-xs text-paper-dim">{s.why_note}</p>

                  {s.continued_as_infinite && (
                    <span
                      className="mt-2.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                      style={{ borderColor: "#FFC23399", background: "#FFC2331A", color: "#FFE49A" }}
                    >
                      Continued as Infinite
                    </span>
                  )}

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className={DT}>Started</dt>
                      <dd>{d.date(s.created_at)}</dd>
                    </div>
                    <div>
                      <dt className={DT}>Archived</dt>
                      <dd>{s.archived_at ? d.date(s.archived_at) : "—"}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className={DT}>Result</dt>
                      <dd style={{ color: TONE[result.tone] }}>{result.text}</dd>
                    </div>
                    <div>
                      <dt className={DT}>Failed</dt>
                      <dd>{s.fail_count}</dd>
                    </div>
                  </dl>

                  {s.archive_reason && (
                    <div className="mt-3 border-t border-ember-line pt-3">
                      <p className={DT}>Closing note</p>
                      <p className="prose-text mt-1 text-xs text-paper">{s.archive_reason}</p>
                    </div>
                  )}

                  <button onClick={() => setOpenId(s.id)} className="press mt-3 text-[11px] text-flame hover:text-paper">
                    The journey →
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>

      <AnimatePresence>
        {openId && <HistorySheet key={openId} streakId={openId} onClose={() => setOpenId(null)} />}
      </AnimatePresence>
    </>
  );
}
