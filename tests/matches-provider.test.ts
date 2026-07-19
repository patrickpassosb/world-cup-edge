import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Fixture } from "@/lib/txline/types";
import type { GammaEvent, GammaMarket } from "@/lib/polymarket/types";

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    fixtureId: 18257865,
    participant1: "France",
    participant2: "England",
    participant1IsHome: true,
    startTime: 1784408400000,
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
      makeFixture({ fixtureId: 1, startTime: 1784408400000 }),
      makeFixture({ fixtureId: 2, startTime: 1784149200000 }),
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
    expect(result[0].polymarketHomeMarketSlug).toBeNull();
    expect(result[0].polymarketDrawMarketSlug).toBeNull();
    expect(result[0].polymarketAwayMarketSlug).toBeNull();
  });

  it("marks hasPolymarketMarket=true and carries 3 market slugs when a match is found", async () => {
    fetchFixturesMock.mockResolvedValue([makeFixture()]);
    findPolymarketMatchForTeamsMock.mockResolvedValue({
      eventSlug: "fifwc-fra-eng-2026-07-15",
      homeMarketSlug: "fifwc-fra-eng-2026-07-15-fra",
      drawMarketSlug: "fifwc-fra-eng-2026-07-15-draw",
      awayMarketSlug: "fifwc-fra-eng-2026-07-15-eng",
    });
    const { fetchAvailableMatches } = await import("@/lib/data/matches-provider");
    const result = await fetchAvailableMatches();
    expect(result[0].hasPolymarketMarket).toBe(true);
    expect(result[0].polymarketEventSlug).toBe("fifwc-fra-eng-2026-07-15");
    expect(result[0].polymarketHomeMarketSlug).toBe("fifwc-fra-eng-2026-07-15-fra");
    expect(result[0].polymarketDrawMarketSlug).toBe("fifwc-fra-eng-2026-07-15-draw");
    expect(result[0].polymarketAwayMarketSlug).toBe("fifwc-fra-eng-2026-07-15-eng");
  });

  it("skips fixtures whose startTime is not a valid timestamp", async () => {
    fetchFixturesMock.mockResolvedValue([
      makeFixture({ fixtureId: 1, startTime: NaN }),
      makeFixture({ fixtureId: 2, startTime: 1784408400000 }),
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

  it("returns null when the event slug does not exist", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams(
      "France",
      "England",
      "2026-07-15T19:00:00.000Z",
    );
    expect(result).toBeNull();
  });

  it("finds the event by slug and returns all 3 market slugs", async () => {
    vi.resetModules();
    const event = makeEvent({
      slug: "fifwc-fra-eng-2026-07-15",
      markets: [
        makeMarket({
          slug: "fifwc-fra-eng-2026-07-15-fra",
          question: "Will France win on 2026-07-15?",
        }),
        makeMarket({
          slug: "fifwc-fra-eng-2026-07-15-draw",
          question: "Will the match end in a draw?",
        }),
        makeMarket({
          slug: "fifwc-fra-eng-2026-07-15-eng",
          question: "Will England win on 2026-07-15?",
        }),
      ],
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [event],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams(
      "France",
      "England",
      "2026-07-15T19:00:00.000Z",
    );
    expect(result).not.toBeNull();
    expect(result?.eventSlug).toBe("fifwc-fra-eng-2026-07-15");
    expect(result?.homeMarketSlug).toBe("fifwc-fra-eng-2026-07-15-fra");
    expect(result?.drawMarketSlug).toBe("fifwc-fra-eng-2026-07-15-draw");
    expect(result?.awayMarketSlug).toBe("fifwc-fra-eng-2026-07-15-eng");
  });

  it("strips accents when building the team code", async () => {
    vi.resetModules();
    const event = makeEvent({
      slug: "fifwc-civ-gha-2026-07-15",
      markets: [
        makeMarket({
          slug: "fifwc-civ-gha-2026-07-15-civ",
          question: "Will Côte d'Ivoire win on 2026-07-15?",
        }),
        makeMarket({
          slug: "fifwc-civ-gha-2026-07-15-draw",
          question: "Will Côte d'Ivoire vs Ghana end in a draw on 2026-07-15?",
        }),
        makeMarket({
          slug: "fifwc-civ-gha-2026-07-15-gha",
          question: "Will Ghana win on 2026-07-15?",
        }),
      ],
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [event],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams(
      "Côte d'Ivoire",
      "Ghana",
      "2026-07-15T19:00:00.000Z",
    );
    expect(result).not.toBeNull();
    expect(result?.eventSlug).toBe("fifwc-civ-gha-2026-07-15");
    expect(result?.homeMarketSlug).toBe("fifwc-civ-gha-2026-07-15-civ");
    expect(result?.drawMarketSlug).toBe("fifwc-civ-gha-2026-07-15-draw");
    expect(result?.awayMarketSlug).toBe("fifwc-civ-gha-2026-07-15-gha");
  });

  it("returns match with null sibling slugs when only one market exists (no fabrication)", async () => {
    vi.resetModules();
    const event = makeEvent({
      slug: "fifwc-civ-gha-2026-07-15",
      markets: [
        makeMarket({
          slug: "fifwc-civ-gha-2026-07-15-civ",
          question: "Will Côte d'Ivoire win on 2026-07-15?",
        }),
      ],
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [event],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams(
      "Côte d'Ivoire",
      "Ghana",
      "2026-07-15T19:00:00.000Z",
    );
    expect(result).not.toBeNull();
    expect(result?.homeMarketSlug).toBe("fifwc-civ-gha-2026-07-15-civ");
    expect(result?.drawMarketSlug).toBeNull();
    expect(result?.awayMarketSlug).toBeNull();
  });

  it("returns null when none of the three expected markets exist", async () => {
    vi.resetModules();
    const event = makeEvent({
      slug: "fifwc-civ-gha-2026-07-15",
      markets: [
        makeMarket({ slug: "some-other-market" }),
      ],
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [event],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams(
      "Côte d'Ivoire",
      "Ghana",
      "2026-07-15T19:00:00.000Z",
    );
    expect(result).toBeNull();
  });

  it("returns null when the event is closed", async () => {
    vi.resetModules();
    const event = makeEvent({ closed: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [event],
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams(
      "France",
      "England",
      "2026-07-15T19:00:00.000Z",
    );
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    const result = await findPolymarketMatchForTeams(
      "France",
      "England",
      "2026-07-15T19:00:00.000Z",
    );
    expect(result).toBeNull();
  });

  it("returns null when called with empty team names or kickoff", async () => {
    vi.resetModules();
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
    const { findPolymarketMatchForTeams } = await import(
      "@/lib/polymarket/client"
    );
    expect(
      await findPolymarketMatchForTeams("", "England", "2026-07-15T19:00:00.000Z"),
    ).toBeNull();
    expect(
      await findPolymarketMatchForTeams("France", "", "2026-07-15T19:00:00.000Z"),
    ).toBeNull();
    expect(
      await findPolymarketMatchForTeams("France", "England", ""),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
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