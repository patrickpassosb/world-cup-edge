import type { MatchEntry } from "@/lib/types";

export const REPLAY_MATCH: MatchEntry = {
  fixtureId: 18241006,
  homeTeam: "England",
  awayTeam: "Argentina",
  kickoffUTC: "2026-07-15T19:00:00Z",
  competition: "FIFA World Cup 2026 Semi-finals",
  gameState: 1,
  polymarketEventSlug: "fifwc-eng-arg-2026-07-15",
  polymarketHomeMarketSlug: "fifwc-eng-arg-2026-07-15-eng",
  polymarketDrawMarketSlug: "fifwc-eng-arg-2026-07-15-draw",
  polymarketAwayMarketSlug: "fifwc-eng-arg-2026-07-15-arg",
  hasPolymarketMarket: true,
};

export function isReplayMode(demoParam: string | null): boolean {
  return demoParam === "replay";
}