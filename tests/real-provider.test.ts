import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Fixture, OddsPayload } from "@/lib/txline/types";
import type { ClobBook, ClobMarketInfo, GammaEvent, GammaMarket } from "@/lib/polymarket/types";

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

function makeOdds(overrides: Partial<OddsPayload> = {}): OddsPayload {
  return {
    fixtureId: 18257865,
    messageId: "msg-001",
    ts: Date.now() - 5_000,
    bookmaker: "consensus",
    bookmakerId: 1,
    superOddsType: "1X2_PARTICIPANT_RESULT",
    gameState: "1",
    inRunning: false,
    marketParameters: null,
    marketPeriod: null,
    priceNames: ["part1", "draw", "part2"],
    prices: ["2.10", "3.20", "3.50"],
    pct: ["47.000", "28.000", "25.000"],
    serviceLevel: 12,
    ...overrides,
  } as OddsPayload;
}

function makeMarket(overrides: Partial<GammaMarket> = {}): GammaMarket {
  return {
    id: "m1",
    question: "Will France win on 2026-07-18?",
    conditionId: "0xc41f543ccb7a1a35a200c28096cc2e5c2351c54546087f4f6cf5c4ef3e0c1aa5",
    slug: "fifwc-fra-eng-2026-07-18-fra",
    description:
      "This market refers only to the outcome within the first 90 minutes of regular play plus stoppage time (excludes extra time).",
    outcomes: '["Yes", "No"]',
    outcomePrices: '["0.1185", "0.8815"]',
    clobTokenIds:
      '["27017352779469567119021515174282416893555366624071034758236558815968401338728", "24700818764893371447983775874874488061572200819525844393509377284018768095208"]',
    active: true,
    closed: false,
    acceptingOrders: true,
    bestBid: 0.106,
    bestAsk: 0.107,
    startDate: "2026-07-16T02:52:00.90295Z",
    endDate: "2026-07-18T21:00:00Z",
    closedTime: null,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<GammaEvent> = {}): GammaEvent {
  return {
    id: "e1",
    slug: "fifwc-fra-eng-2026-07-18",
    title: "France vs. England",
    description: "FIFA World Cup third-place playoff.",
    active: true,
    closed: false,
    restricted: true,
    negRisk: true,
    negRiskMarketID: "0xneg",
    startDate: "2026-07-16T02:52:00.90295Z",
    endDate: "2026-07-18T21:00:00Z",
    markets: [makeMarket()],
    ...overrides,
  };
}

function makeBook(): ClobBook {
  return {
    market: "0xmarket",
    asset_id: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
    bids: [{ price: "0.106", size: "100" }],
    asks: [{ price: "0.119", size: "80" }],
    timestamp: String(Date.now() - 4_000),
    hash: "0xhash",
  };
}

function makeClobInfo(overrides: Partial<ClobMarketInfo> = {}): ClobMarketInfo {
  return {
    conditionId: "0xc41f543ccb7a1a35a200c28096cc2e5c2351c54546087f4f6cf5c4ef3e0c1aa5",
    takerBaseFee: 1000,
    makerBaseFee: 1000,
    feesEnabled: null,
    fd: { r: 0.05, e: 1, to: true },
    ...overrides,
  };
}

describe("RealDataProvider gap gating (BUG: gap requires equivalence + fee)", () => {
  let fetchOddsForMatchMock: ReturnType<typeof vi.fn>;
  let fetchPolymarketDataMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchOddsForMatchMock = vi.fn();
    fetchPolymarketDataMock = vi.fn();
    vi.doMock("@/lib/txline/client", () => ({
      fetchOddsForMatch: fetchOddsForMatchMock,
    }));
    vi.doMock("@/lib/polymarket/client", () => ({
      fetchPolymarketData: fetchPolymarketDataMock,
    }));
  });

  afterEach(() => {
    vi.doUnmock("@/lib/txline/client");
    vi.doUnmock("@/lib/polymarket/client");
    vi.restoreAllMocks();
  });

  async function makeProvider() {
    const { RealDataProvider } = await import("@/lib/data/real-provider");
    return new RealDataProvider(
      18257865,
      "fifwc-fra-eng-2026-07-18-fra",
      "home",
      "France",
      "England",
      "2026-07-18T21:00:00.000Z",
      "fifwc-fra-eng-2026-07-18-draw",
      "fifwc-fra-eng-2026-07-18-eng",
      "fifwc-fra-eng-2026-07-18",
    );
  }

  it("computes grossGap and gapAfterFee when equivalence passes and fee is available", async () => {
    fetchOddsForMatchMock.mockResolvedValue({
      fixture: makeFixture(),
      odds: [makeOdds()],
    });
    fetchPolymarketDataMock.mockResolvedValue({
      event: makeEvent(),
      market: makeMarket(),
      book: makeBook(),
      yesTokenId: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
      clobInfo: makeClobInfo(),
      identityValid: true,
      identityFailures: [],
    });

    const provider = await makeProvider();
    const snapshot = await provider.getSnapshot();

    expect(snapshot.equivalence).not.toBeNull();
    expect(snapshot.equivalence!.passed).toBe(true);
    expect(snapshot.checks.teams).toBe(true);
    expect(snapshot.checks.token).toBe(true);
    expect(snapshot.checks.fee).toBe(true);
    expect(snapshot.gap.grossGap).not.toBeNull();
    expect(snapshot.gap.gapAfterFee).not.toBeNull();
    expect(snapshot.polymarket.feeRate).toBeCloseTo(0.05);
  });

  it("nulls grossGap and gapAfterFee when equivalence fails", async () => {
    fetchOddsForMatchMock.mockResolvedValue({
      fixture: makeFixture({ participant1: "Spain", participant2: "Germany" }),
      odds: [makeOdds()],
    });
    fetchPolymarketDataMock.mockResolvedValue({
      event: makeEvent({ title: "Spain vs. Germany" }),
      market: makeMarket({ question: "Will France win on 2026-07-18?" }),
      book: makeBook(),
      yesTokenId: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
      clobInfo: makeClobInfo(),
      identityValid: true,
      identityFailures: [],
    });

    const provider = await makeProvider();
    const snapshot = await provider.getSnapshot();

    expect(snapshot.equivalence).not.toBeNull();
    expect(snapshot.equivalence!.passed).toBe(false);
    expect(snapshot.gap.grossGap).toBeNull();
    expect(snapshot.gap.gapAfterFee).toBeNull();
    expect(snapshot.checks.token).toBe(false);
    expect(snapshot.alert.active).toBe(false);
  });

  it("nulls gapAfterFee but keeps grossGap when fee is unavailable", async () => {
    fetchOddsForMatchMock.mockResolvedValue({
      fixture: makeFixture(),
      odds: [makeOdds()],
    });
    fetchPolymarketDataMock.mockResolvedValue({
      event: makeEvent(),
      market: makeMarket(),
      book: makeBook(),
      yesTokenId: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
      clobInfo: makeClobInfo({ fd: null }),
      identityValid: true,
      identityFailures: [],
    });

    const provider = await makeProvider();
    const snapshot = await provider.getSnapshot();

    expect(snapshot.equivalence!.passed).toBe(true);
    expect(snapshot.polymarket.feeRate).toBeNull();
    expect(snapshot.gap.grossGap).not.toBeNull();
    expect(snapshot.gap.gapAfterFee).toBeNull();
    expect(snapshot.checks.fee).toBe(false);
    expect(snapshot.alert.active).toBe(false);
    expect(snapshot.alert.suppressedReason).toContain("fee rate");
  });

  it("accepts plain Yes token label for home outcome when market question confirms team", async () => {
    fetchOddsForMatchMock.mockResolvedValue({
      fixture: makeFixture(),
      odds: [makeOdds()],
    });
    fetchPolymarketDataMock.mockResolvedValue({
      event: makeEvent(),
      market: makeMarket({ outcomes: '["Yes", "No"]' }),
      book: makeBook(),
      yesTokenId: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
      clobInfo: makeClobInfo(),
      identityValid: true,
      identityFailures: [],
    });

    const provider = await makeProvider();
    const snapshot = await provider.getSnapshot();

    expect(snapshot.equivalence!.passed).toBe(true);
    expect(snapshot.checks.token).toBe(true);
  });

  it("accepts null MarketPeriod for 1X2_PARTICIPANT_RESULT (live API shape)", async () => {
    fetchOddsForMatchMock.mockResolvedValue({
      fixture: makeFixture(),
      odds: [makeOdds({ superOddsType: "1X2_PARTICIPANT_RESULT", marketPeriod: null })],
    });
    fetchPolymarketDataMock.mockResolvedValue({
      event: makeEvent(),
      market: makeMarket(),
      book: makeBook(),
      yesTokenId: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
      clobInfo: makeClobInfo(),
      identityValid: true,
      identityFailures: [],
    });

    const provider = await makeProvider();
    const snapshot = await provider.getSnapshot();

    expect(snapshot.equivalence!.checks.rules).toBe(true);
    expect(snapshot.txline.probability).not.toBeNull();
  });

  it("includes marketQuestion in snapshot polymarket data", async () => {
    fetchOddsForMatchMock.mockResolvedValue({
      fixture: makeFixture(),
      odds: [makeOdds()],
    });
    fetchPolymarketDataMock.mockResolvedValue({
      event: makeEvent(),
      market: makeMarket({ question: "Will France win on 2026-07-18?" }),
      book: makeBook(),
      yesTokenId: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
      clobInfo: makeClobInfo(),
      identityValid: true,
      identityFailures: [],
    });

    const provider = await makeProvider();
    const snapshot = await provider.getSnapshot();

    expect(snapshot.polymarket.marketQuestion).toBe("Will France win on 2026-07-18?");
  });

  it("renders individual equivalence checks, not a single passed flag", async () => {
    fetchOddsForMatchMock.mockResolvedValue({
      fixture: makeFixture(),
      odds: [makeOdds({ superOddsType: "over_under" })],
    });
    fetchPolymarketDataMock.mockResolvedValue({
      event: makeEvent(),
      market: makeMarket(),
      book: makeBook(),
      yesTokenId: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
      clobInfo: makeClobInfo(),
      identityValid: true,
      identityFailures: [],
    });

    const provider = await makeProvider();
    const snapshot = await provider.getSnapshot();

    expect(snapshot.equivalence!.passed).toBe(false);
    expect(snapshot.equivalence!.checks.rules).toBe(false);
    expect(snapshot.checks.rules).toBe(false);
    expect(snapshot.checks.teams).toBe(true);
    expect(snapshot.checks.date).toBe(true);
  });

  it("nulls gap when identity check fails (mismatched condition ID)", async () => {
    fetchOddsForMatchMock.mockResolvedValue({
      fixture: makeFixture(),
      odds: [makeOdds()],
    });
    fetchPolymarketDataMock.mockResolvedValue({
      event: makeEvent(),
      market: makeMarket(),
      book: makeBook(),
      yesTokenId: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
      clobInfo: makeClobInfo({ conditionId: "0xdifferent" }),
      identityValid: false,
      identityFailures: ["CLOB fee condition ID does not match market condition ID."],
    });

    const provider = await makeProvider();
    const snapshot = await provider.getSnapshot();

    expect(snapshot.equivalence!.passed).toBe(false);
    expect(snapshot.gap.grossGap).toBeNull();
    expect(snapshot.gap.gapAfterFee).toBeNull();
    expect(snapshot.equivalence!.failures).toContain(
      "CLOB fee condition ID does not match market condition ID.",
    );
    expect(snapshot.alert.active).toBe(false);
  });

  it("nulls gap when book asset_id does not match YES token", async () => {
    fetchOddsForMatchMock.mockResolvedValue({
      fixture: makeFixture(),
      odds: [makeOdds()],
    });
    fetchPolymarketDataMock.mockResolvedValue({
      event: makeEvent(),
      market: makeMarket(),
      book: { ...makeBook(), asset_id: "wrong-token-id" },
      yesTokenId: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
      clobInfo: makeClobInfo(),
      identityValid: false,
      identityFailures: ["CLOB book asset_id does not match the selected YES token."],
    });

    const provider = await makeProvider();
    const snapshot = await provider.getSnapshot();

    expect(snapshot.equivalence!.passed).toBe(false);
    expect(snapshot.gap.grossGap).toBeNull();
    expect(snapshot.equivalence!.failures).toContain(
      "CLOB book asset_id does not match the selected YES token.",
    );
  });

  it("nulls gap when market is not part of the event", async () => {
    fetchOddsForMatchMock.mockResolvedValue({
      fixture: makeFixture(),
      odds: [makeOdds()],
    });
    const otherMarket = makeMarket({ slug: "other-market", conditionId: "0xother" });
    fetchPolymarketDataMock.mockResolvedValue({
      event: makeEvent({ markets: [otherMarket] }),
      market: makeMarket(),
      book: makeBook(),
      yesTokenId: "27017352779469567119021515174282416893555366624071034758236558815968401338728",
      clobInfo: makeClobInfo(),
      identityValid: false,
      identityFailures: ["Polymarket market is not part of the selected event."],
    });

    const provider = await makeProvider();
    const snapshot = await provider.getSnapshot();

    expect(snapshot.equivalence!.passed).toBe(false);
    expect(snapshot.equivalence!.failures).toContain(
      "Polymarket market is not part of the selected event.",
    );
  });
});