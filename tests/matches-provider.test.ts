import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Fixture } from "@/lib/txline/types";
import type { GammaEvent, GammaMarket } from "@/lib/polymarket/types";

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    fixtureId: 18257865,
    participant1: "France",
    participant2: "England",
    participant1IsHome: true,
    startTime: "1784408400000",
    gameState: 1,
    competition: "World Cup",
    competitionId: 72,
    ...overrides,
  };
}

function makeMarket(overrides: Partial<GammaMarket> = {}): GammaMarket {
  return {
    id: "m1",
    question: "Will France win on 2026-07-15?",
    conditionId: "0x1",
    slug: "fifwc-fra-eng-2026-07-15-fra",
    description: "France to win in regulation time",
    outcomes: '["Yes", "No"]',
    outcomePrices: '["0.5", "0.5"]',
    clobTokenIds: '["token-yes", "token-no"]',
    active: true,
    closed: false,
    acceptingOrders: true,
    bestBid: 0.49,
    bestAsk: 0.51,
    startDate: "2026-07-12T10:00:00Z",
    endDate: "2026-07-15T19:00:00Z",
    closedTime: null,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<GammaEvent> = {}): GammaEvent {
  return {
    id: "e1",
    slug: "fifwc-fra-eng-2026-07-15",
    title: "France vs. England",
    description: "World Cup fixture",
    active: true,
    closed: false,
    restricted: false,
    negRisk: true,
    negRiskMarketID: "0xneg",
    startDate: "2026-07-12T10:00:00Z",
    endDate: "2026-07-15T19:00:00Z",
    markets: [makeMarket()],
    ...overrides,
  };
}

describe("fetchAvailableMatches", () => {
  let fetchFixturesMock: ReturnType<typeof vi.fn>;
  let findPolymarketMatchForTeamsMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchFixturesMock = vi.fn();
    findPolymarketMatchForTeamsMock = vi.fn();
    vi.doMock("@/lib/txline/client", () => ({
      fetchFixtures: fetchFixturesMock,
    }));
    vi.doMock("@/lib/polymarket/client", () => ({
      findPolymarketMatchForTeams: findPolymarketMatchForTeamsMock,
    }));
  });

  afterEach(() => {
    vi.doUnmock("@/lib/txline/client");
    vi.doUnmock("@/lib/polymarket/client");
    vi.restoreAllMocks();
  });

  it("returns empty array when no World Cup fixtures exist", async () => {
    fetchFixturesMock.mockResolvedValue([
      makeFixture({ competition: "Premier League" }),
    ]);
    findPolymarketMatchForTeamsMock.mockResolvedValue(null);
    const { fetchAvailableMatches } = await import("@/lib/data/matches-provider");
    const result = await fetchAvailableMatches();
    expect(result).toEqual([]);
  });

  it("filters out non-World-Cup fixtures", async () => {
    fetchFixturesMock.mockResolvedValue([
      makeFixture({ fixtureId: 1, competition: "Premier League" }),
      makeFixture({ fixtureId: 2, competition: "World Cup" }),
    ]);
    findPolymarketMatchForTeamsMock.mockResolvedValue(null);
    const { fetchAvailableMatches } = await import("@/lib/data/matches-provider");
    const result = await fetchAvailableMatches();
    expect(result).toHaveLength(1);
    expect(result[0].fixtureId).toBe(2);
  });

  it("filters out cancelled fixtures (gameState=6)", async () => {
    fetchFixturesMock.mockResolvedValue([
      makeFixture({ fixtureId: 1, gameState: 6 }),
      makeFixture({ fixtureId: 2, gameState: 1 }),
    ]);
    findPolymarketMatchForTeamsMock.mockResolvedValue(null);
    const { fetchAvailableMatches } = await import("@/lib/data/matches-provider");
    const result = await fetchAvailableMatches();
    expect(result).toHaveLength(1);
    expect(result[0].fixtureId).toBe(2);
  });

  it("respects participant1IsHome=false by swapping home and away", async () => {
    fetchFixturesMock.mockResolvedValue([
      makeFixture({
        fixtureId: 1,
        participant1: "England",
        participant2: "France",
        participant1IsHome: false,
      }),
    ]);
    findPolymarketMatchForTeamsMock.mockResolvedValue(null);
    const { fetchAvailableMatches } = await import("@/lib/data/matches-provider");
    const result = await fetchAvailableMatches();
    expect(result[0].homeTeam).toBe("France");
    expect(result[0].awayTeam).toBe("England");
  });

  it("sorts by kickoffUTC ascending", async () => {
    fetchFixturesMock.mockResolvedValue([
      makeFixture({ fixtureId: 1, startTime: "1784408400000" }),
      makeFixture({ fixtureId: 2, startTime: "1784149200000" }),
    ]);
    findPolymarketMatchForTeamsMock.mockResolvedValue(null);
    const { fetchAvailableMatches } = await import("@/lib/data/matches-provider");
    const result = await fetchAvailableMatches();
    expect(result[0].fixtureId).toBe(2);
    expect(result[1].fixtureId).toBe(1);
    expect(result[0].kickoffUTC <= result[1].kickoffUTC).toBe(true);
  });

  it("marks hasPolymarketMarket=false and slugs null when no match found", async () => {
    fetchFixturesMock.mockResolvedValue([makeFixture()]);
    findPolymarketMatchForTeamsMock.mockResolvedValue(null);
    const { fetchAvailableMatches } = await import("@/lib/data/matches-provider");
    const result = await fetchAvailableMatches();
    expect(result[0].hasPolymarketMarket).toBe(false);
    expect(result[0].polymarketEventSlug).toBeNull();
    expect(result[0].polymarketMarketSlug).toBeNull();
  });

  it("marks hasPolymarketMarket=true and carries slugs when a match is found", async () => {
    fetchFixturesMock.mockResolvedValue([makeFixture()]);
    findPolymarketMatchForTeamsMock.mockResolvedValue({
      eventSlug: "fifwc-fra-eng-2026-07-15",
      marketSlug: "fifwc-fra-eng-2026-07-15-fra",
    });
    const { fetchAvailableMatches } = await import("@/lib/data/matches-provider");
    const result = await fetchAvailableMatches();
    expect(result[0].hasPolymarketMarket).toBe(true);
    expect(result[0].polymarketEventSlug).toBe("fifwc-fra-eng-2026-07-15");
    expect(result[0].polymarketMarketSlug).toBe("fifwc-fra-eng-2026-07-15-fra");
  });

  it("skips fixtures whose startTime is not a valid timestamp", async () => {
    fetchFixturesMock.mockResolvedValue([
      makeFixture({ fixtureId: 1, startTime: "not-a-number" }),
      makeFixture({ fixtureId: 2, startTime: "1784408400000" }),
    ]);
    findPolymarketMatchForTeamsMock.mockResolvedValue(null);
    const { fetchAvailableMatches } = await import("@/lib/data/matches-provider");
    const result = await fetchAvailableMatches();
    expect(result).toHaveLength(1);
    expect(result[0].fixtureId).toBe(2);
  });

  it("rethrows when fetchFixtures throws", async () => {
    fetchFixturesMock.mockRejectedValue(new Error("txline down"));
    const { fetchAvailableMatches } = await import("@/lib/data/matches-provider");
    await expect(fetchAvailableMatches()).rejects.toThrow("txline down");
  });
});

describe("findPolymarketMatchForTeams", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("returns null when searchActiveSoccerEvents returns empty array", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams("France", "England");
    expect(result).toBeNull();
  });

  it("matches an event whose title contains both team names", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [makeEvent()],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams("France", "England");
    expect(result).not.toBeNull();
    expect(result?.eventSlug).toBe("fifwc-fra-eng-2026-07-15");
  });

  it("strips accents when matching team names", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        makeEvent({ title: "Côte d'Ivoire vs. Ghana" }),
      ],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams("Cote d'Ivoire", "Ghana");
    expect(result).not.toBeNull();
  });

  it("picks the market whose question contains the home team", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        makeEvent({
          markets: [
            makeMarket({
              slug: "fifwc-fra-eng-2026-07-15-fra",
              question: "Will France win on 2026-07-15?",
            }),
            makeMarket({
              slug: "fifwc-fra-eng-2026-07-15-eng",
              question: "Will England win on 2026-07-15?",
            }),
          ],
        }),
      ],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams("France", "England");
    expect(result).not.toBeNull();
    expect(result?.marketSlug).toBe("fifwc-fra-eng-2026-07-15-fra");
  });

  it("falls back to event.markets[0] when no question matches the home team", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        makeEvent({
          markets: [
            makeMarket({
              slug: "fifwc-fra-eng-2026-07-15-draw",
              question: "Will the match end in a draw?",
            }),
          ],
        }),
      ],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams("France", "England");
    expect(result).not.toBeNull();
    expect(result?.marketSlug).toBe("fifwc-fra-eng-2026-07-15-draw");
  });

  it("returns null when no event matches", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [makeEvent({ title: "Brazil vs. Germany" })],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams("France", "England");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams("France", "England");
    expect(result).toBeNull();
  });

  it("caches events across calls within 60s", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [makeEvent()],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    await findPolymarketMatchForTeams("France", "England");
    await findPolymarketMatchForTeams("France", "England");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("searchActiveSoccerEvents", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("returns the events array on a successful 200 response", async () => {
    vi.resetModules();
    const events = [makeEvent()];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => events,
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { searchActiveSoccerEvents } = await import(
      "@/lib/polymarket/client"
    );
    const result = await searchActiveSoccerEvents();
    expect(result).toEqual(events);
  });

  it("returns empty array on non-2xx", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "fail" }),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { searchActiveSoccerEvents } = await import(
      "@/lib/polymarket/client"
    );
    const result = await searchActiveSoccerEvents();
    expect(result).toEqual([]);
  });

  it("returns empty array when response is not an array", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "unexpected" }),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { searchActiveSoccerEvents } = await import(
      "@/lib/polymarket/client"
    );
    const result = await searchActiveSoccerEvents();
    expect(result).toEqual([]);
  });
});