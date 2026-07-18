import { describe, it, expect } from "vitest";
import {
  extractYesToken,
  extractBestBid,
  extractBestAsk,
  extractBookTimestamp,
  isBookEmpty,
  extractTeamsFromEvent,
  extractMatchDate,
  extractFeeRate,
} from "@/lib/polymarket/normalize";
import type { ClobBook, ClobMarketInfo, GammaEvent, GammaMarket } from "@/lib/polymarket/types";

function makeMarket(overrides: Partial<GammaMarket> = {}): GammaMarket {
  return {
    id: "1",
    question: "Will England win on 2026-07-15?",
    conditionId: "0xabc",
    slug: "fifwc-eng-arg-2026-07-15-eng",
    description: "England to win in the first 90 minutes plus stoppage time (excludes extra time)",
    outcomes: '["Yes", "No"]',
    outcomePrices: '["0.5", "0.5"]',
    clobTokenIds: '["token-yes-123", "token-no-456"]',
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
    id: "1",
    slug: "fifwc-eng-arg-2026-07-15",
    title: "England vs. Argentina",
    description: "World Cup semi-final",
    active: true,
    closed: false,
    restricted: true,
    negRisk: true,
    negRiskMarketID: "0x123",
    startDate: "2026-07-12T10:00:00Z",
    endDate: "2026-07-15T19:00:00Z",
    markets: [makeMarket()],
    ...overrides,
  };
}

function makeBook(overrides: Partial<ClobBook> = {}): ClobBook {
  return {
    market: "0xmarket",
    asset_id: "token-yes-123",
    bids: [
      { price: "0.38", size: "100" },
      { price: "0.42", size: "200" },
      { price: "0.35", size: "50" },
    ],
    asks: [
      { price: "0.45", size: "150" },
      { price: "0.39", size: "80" },
      { price: "0.50", size: "300" },
    ],
    timestamp: "1700000000000",
    hash: "0xhash",
    ...overrides,
  };
}

describe("extractYesToken", () => {
  it("finds the YES token when Yes is at index 0", () => {
    const result = extractYesToken(makeMarket());
    expect(result.tokenId).toBe("token-yes-123");
    expect(result.label).toBe("Yes");
  });

  it("finds the YES token when Yes is at index 1", () => {
    const result = extractYesToken(
      makeMarket({
        outcomes: '["No", "Yes"]',
        clobTokenIds: '["token-no-456", "token-yes-123"]',
      }),
    );
    expect(result.tokenId).toBe("token-yes-123");
    expect(result.label).toBe("Yes");
  });

  it("returns null for team-name label without Yes/True (team-name matching handled by equivalence)", () => {
    const result = extractYesToken(
      makeMarket({
        outcomes: '["England", "No"]',
        clobTokenIds: '["token-eng-123", "token-no-456"]',
      }),
    );
    expect(result.tokenId).toBeNull();
    expect(result.label).toBeNull();
  });

  it("returns null when outcomes and tokens have mismatched lengths", () => {
    const result = extractYesToken(
      makeMarket({
        outcomes: '["Yes", "No", "Draw"]',
        clobTokenIds: '["token-yes", "token-no"]',
      }),
    );
    expect(result.tokenId).toBeNull();
  });

  it("returns null when market is null", () => {
    const result = extractYesToken(null);
    expect(result.tokenId).toBeNull();
    expect(result.label).toBeNull();
  });

  it("returns null when no Yes or England label found", () => {
    const result = extractYesToken(
      makeMarket({
        outcomes: '["Draw", "No"]',
        clobTokenIds: '["token-draw", "token-no"]',
      }),
    );
    expect(result.tokenId).toBeNull();
  });
});

describe("extractBestBid", () => {
  it("returns the maximum bid price", () => {
    const book = makeBook();
    expect(extractBestBid(book)).toBeCloseTo(0.42);
  });

  it("returns null for empty bids", () => {
    expect(extractBestBid(makeBook({ bids: [] }))).toBeNull();
  });

  it("returns null for null book", () => {
    expect(extractBestBid(null)).toBeNull();
  });
});

describe("extractBestAsk", () => {
  it("returns the minimum ask price and its size", () => {
    const book = makeBook();
    const result = extractBestAsk(book);
    expect(result.price).toBeCloseTo(0.39);
    expect(result.size).toBeCloseTo(80);
  });

  it("returns nulls for empty asks", () => {
    const result = extractBestAsk(makeBook({ asks: [] }));
    expect(result.price).toBeNull();
    expect(result.size).toBeNull();
  });

  it("returns nulls for null book", () => {
    const result = extractBestAsk(null);
    expect(result.price).toBeNull();
    expect(result.size).toBeNull();
  });
});

describe("extractBookTimestamp", () => {
  it("parses string timestamp", () => {
    expect(extractBookTimestamp(makeBook())).toBe(1_700_000_000_000);
  });

  it("returns null for null book", () => {
    expect(extractBookTimestamp(null)).toBeNull();
  });
});

describe("isBookEmpty", () => {
  it("returns false when book has bids and asks", () => {
    expect(isBookEmpty(makeBook())).toBe(false);
  });

  it("returns true when bids and asks are both empty", () => {
    expect(isBookEmpty(makeBook({ bids: [], asks: [] }))).toBe(true);
  });

  it("returns true when only asks are empty (half-empty)", () => {
    const book = makeBook({
      bids: [{ price: "0.40", size: "100" }],
      asks: [],
    });
    expect(isBookEmpty(book)).toBe(true);
  });

  it("returns true when only bids are empty (half-empty)", () => {
    const book = makeBook({
      bids: [],
      asks: [{ price: "0.50", size: "100" }],
    });
    expect(isBookEmpty(book)).toBe(true);
  });

  it("returns true for null book", () => {
    expect(isBookEmpty(null)).toBe(true);
  });
});

describe("extractTeamsFromEvent", () => {
  it("extracts teams from 'England vs. Argentina'", () => {
    const result = extractTeamsFromEvent(makeEvent());
    expect(result.home).toBe("England");
    expect(result.away).toBe("Argentina");
  });

  it("handles 'vs' without dot", () => {
    const result = extractTeamsFromEvent(
      makeEvent({ title: "England vs Argentina" }),
    );
    expect(result.home).toBe("England");
    expect(result.away).toBe("Argentina");
  });

  it("returns nulls for null event", () => {
    const result = extractTeamsFromEvent(null);
    expect(result.home).toBeNull();
    expect(result.away).toBeNull();
  });
});

describe("extractMatchDate", () => {
  it("extracts date from endDate", () => {
    expect(extractMatchDate(makeMarket())).toBe("2026-07-15");
  });

  it("extracts date from startDate if no endDate", () => {
    const m = makeMarket({ endDate: "", startDate: "2026-07-14T10:00:00Z" });
    expect(extractMatchDate(m)).toBe("2026-07-14");
  });

  it("returns null for null market", () => {
    expect(extractMatchDate(null)).toBeNull();
  });
});

describe("extractFeeRate (CLOB market info)", () => {
  function makeClobInfo(overrides: Partial<ClobMarketInfo> = {}): ClobMarketInfo {
    return {
      conditionId: "0xabc",
      takerBaseFee: 1000,
      makerBaseFee: 1000,
      feesEnabled: null,
      fd: { r: 0.05, e: 1, to: true },
      ...overrides,
    };
  }

  it("extracts fee rate from CLOB fd.r when fd.e=1 and fd.to=true", () => {
    expect(extractFeeRate(makeMarket(), makeClobInfo())).toBeCloseTo(0.05);
  });

  it("returns null when clobInfo is null", () => {
    expect(extractFeeRate(makeMarket(), null)).toBeNull();
  });

  it("returns null when fd is null", () => {
    expect(extractFeeRate(makeMarket(), makeClobInfo({ fd: null }))).toBeNull();
  });

  it("returns null when fd.r is null", () => {
    expect(extractFeeRate(makeMarket(), makeClobInfo({ fd: { r: null, e: 1, to: true } }))).toBeNull();
  });

  it("returns null when fd.r is negative", () => {
    expect(extractFeeRate(makeMarket(), makeClobInfo({ fd: { r: -0.05, e: 1, to: true } }))).toBeNull();
  });

  it("returns null when fd.r is not finite", () => {
    expect(extractFeeRate(makeMarket(), makeClobInfo({ fd: { r: Number.NaN, e: 1, to: true } }))).toBeNull();
  });

  it("returns null when fd.e is not 1 (unsupported exponent)", () => {
    expect(extractFeeRate(makeMarket(), makeClobInfo({ fd: { r: 0.05, e: 2, to: true } }))).toBeNull();
  });

  it("returns null when fd.to is false (not taker-only)", () => {
    expect(extractFeeRate(makeMarket(), makeClobInfo({ fd: { r: 0.05, e: 1, to: false } }))).toBeNull();
  });

  it("accepts fd.to=null (unspecified taker-only is allowed)", () => {
    expect(extractFeeRate(makeMarket(), makeClobInfo({ fd: { r: 0.05, e: 1, to: null } }))).toBeCloseTo(0.05);
  });

  it("accepts fd.e=null (unspecified exponent is allowed)", () => {
    expect(extractFeeRate(makeMarket(), makeClobInfo({ fd: { r: 0.05, e: null, to: true } }))).toBeCloseTo(0.05);
  });

  it("accepts fee-free markets (r=0)", () => {
    expect(extractFeeRate(makeMarket(), makeClobInfo({ fd: { r: 0, e: 1, to: true } }))).toBe(0);
  });
});