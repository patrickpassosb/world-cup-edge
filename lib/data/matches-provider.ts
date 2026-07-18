import { fetchFixtures } from "@/lib/txline/client";
import { findPolymarketMatchForTeams } from "@/lib/polymarket/client";
import type { MatchEntry } from "@/lib/types";
import type { Fixture } from "@/lib/txline/types";

export async function fetchAvailableMatches(): Promise<MatchEntry[]> {
  const fixtures = await fetchFixtures();

  const worldCup = fixtures.filter(
    (f) =>
      f.competition.toLowerCase().includes("world cup") &&
      f.gameState === 1,
  );

  const enriched = await Promise.all(
    worldCup.map(async (fixture: Fixture) => {
      const startMs = Number(fixture.startTime);
      const polyMatch = await findPolymarketMatchForTeams(
        fixture.participant1IsHome ? fixture.participant1 : fixture.participant2,
        fixture.participant1IsHome ? fixture.participant2 : fixture.participant1,
      );
      return { fixture, startMs, polyMatch };
    }),
  );

  const matches: MatchEntry[] = [];
  for (const { fixture, startMs, polyMatch } of enriched) {
    if (!Number.isFinite(startMs)) continue;
    const home = fixture.participant1IsHome
      ? fixture.participant1
      : fixture.participant2;
    const away = fixture.participant1IsHome
      ? fixture.participant2
      : fixture.participant1;
    matches.push({
      fixtureId: fixture.fixtureId,
      homeTeam: home,
      awayTeam: away,
      kickoffUTC: new Date(startMs).toISOString(),
      competition: fixture.competition,
      gameState: fixture.gameState,
      polymarketEventSlug: polyMatch?.eventSlug ?? null,
      polymarketMarketSlug: polyMatch?.marketSlug ?? null,
      hasPolymarketMarket: polyMatch !== null,
    });
  }

  matches.sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC));
  return matches;
}