import dynamic from "next/dynamic";

/** Everything a card opens only now and then loads on demand, so the page you
 *  land on stays light. The dashboard warms these a few seconds after it
 *  settles, so by the time one is tapped it is already there. */
export const loadDialogs = () => import("./Dialogs");
export const loadJourney = () => import("./HistorySheet");
export const loadRoadmap = () => import("./RoadmapSheet");

export const FailLegendDialog = dynamic(() => loadDialogs().then((m) => m.FailLegendDialog), { ssr: false });
export const FailChallengeDialog = dynamic(() => loadDialogs().then((m) => m.FailChallengeDialog), { ssr: false });
export const FinishDialog = dynamic(() => loadDialogs().then((m) => m.FinishDialog), { ssr: false });
export const ArchiveInfiniteDialog = dynamic(() => loadDialogs().then((m) => m.ArchiveInfiniteDialog), { ssr: false });
export const ArchiveEarlyDialog = dynamic(() => loadDialogs().then((m) => m.ArchiveEarlyDialog), { ssr: false });
export const StopDialog = dynamic(() => loadDialogs().then((m) => m.StopDialog), { ssr: false });
export const RenameDialog = dynamic(() => loadDialogs().then((m) => m.RenameDialog), { ssr: false });
export const JourneySheet = dynamic(loadJourney, { ssr: false });
export const RoadmapSheet = dynamic(loadRoadmap, { ssr: false });
