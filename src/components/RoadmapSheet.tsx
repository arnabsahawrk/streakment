"use client";

import { now } from "@/lib/clock";
import { viewOf } from "@/lib/progress";
import type { Streak } from "@/lib/types";
import { useEffect, useState } from "react";
import Loading from "./Loading";
import Modal from "./Modal";
import { ChallengeRoadmap, LegendRoadmap } from "./Roadmap";

/** The climb (or the stones) for a streakment that is still on the home
 *  screen. An archived one has no road left to draw, so it only offers its
 *  Journey. */
export default function RoadmapSheet({ streakId, onClose }: { streakId: string; onClose: () => void }) {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let off = false;
    fetch(`/api/streaks/${streakId}/detail`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !off && setStreak(d.streak))
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, [streakId]);

  if (!streak) {
    return (
      <Modal title="Roadmap" onClose={onClose} wide>
        {failed ? <p className="pb-4 text-sm text-paper-dim">Couldn&apos;t load the roadmap.</p> : <Loading label="Loading" />}
      </Modal>
    );
  }

  const v = viewOf(streak, now());

  return (
    <Modal title={streak.name} onClose={onClose} wide>
      <div className="sm-fade">
        {v.detail && <p className="mb-4 text-xs text-paper-dim">{v.detail}</p>}
        {v.kind === "challenge" ? <ChallengeRoadmap view={v} /> : <LegendRoadmap view={v} />}
      </div>
    </Modal>
  );
}
