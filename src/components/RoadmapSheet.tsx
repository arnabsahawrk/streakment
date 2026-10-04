"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import Loading from "./Loading";
import { LegendRoadmap, ChallengeRoadmap } from "./Roadmap";
import { now } from "@/lib/clock";
import { viewOf } from "@/lib/progress";
import type { Streak } from "@/lib/types";

/** The climb (or the challenge) ahead. Only ever opened for a streak
 *  that's currently running — an archived one shows Journey instead,
 *  since there's no more road left to draw. */
export default function RoadmapSheet({
  streakId,
  onClose,
}: {
  streakId: string;
  onClose: () => void;
}) {
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    fetch(`/api/streaks/${streakId}/detail`)
      .then((r) => r.json())
      .then((d) => setStreak(d.streak))
      .catch(() => setStreak(null));
  }, [streakId]);

  if (!streak) {
    return (
      <Modal title="Roadmap" onClose={onClose} wide>
        <Loading label="Loading" />
      </Modal>
    );
  }

  const v = viewOf(streak, now());

  return (
    <Modal title={streak.name} onClose={onClose} wide>
      <div className="sm-fade">
        {v.isChallenge && v.goalDays ? (
          <ChallengeRoadmap days={v.days} goal={v.goalDays} paused={v.isPaused} color={v.color} />
        ) : (
          <LegendRoadmap days={v.days} paused={v.isPaused} />
        )}
      </div>
    </Modal>
  );
}
