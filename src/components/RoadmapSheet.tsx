"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import Heatmap from "./Heatmap";
import Loading from "./Loading";
import { AscentRoadmap, SprintRoadmap } from "./Roadmap";
import { viewOf } from "@/lib/progress";
import { kindLabel } from "@/lib/format";
import type { Streak, ResetEntry } from "@/lib/types";

/** The climb (or the challenge) plus the heatmap. Only ever opened for a
 *  streak that's currently running — archived streaks show History
 *  instead, since there's no more road ahead to draw. */
export default function RoadmapSheet({
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
      <Modal title="Roadmap" onClose={onClose} wide>
        <Loading label="Loading the roadmap" />
      </Modal>
    );
  }

  const s = data.streak;
  const v = viewOf(s);

  return (
    <Modal title={`${s.name} · ${kindLabel(v.isSprint)}`} onClose={onClose} wide>
      {v.isSprint && v.goalDays ? (
        <SprintRoadmap days={v.days} goal={v.goalDays} paused={v.isPaused} color={v.color} />
      ) : (
        <AscentRoadmap days={v.days} paused={v.isPaused} />
      )}
      <div className="mt-6 border-t border-ember-line pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-paper-dim">
          Every day so far
        </p>
        <Heatmap streak={s} resets={data.resets} color={v.color} />
      </div>
    </Modal>
  );
}
