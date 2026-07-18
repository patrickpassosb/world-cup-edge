import { describe, it, expect } from "vitest";
import {
  pctToProbability,
  arraysEqualLength,
  hasDuplicateLabels,
  isRegulationTime1X2,
  findOutcomeProbability,
  validateDistribution,
  selectRegulationTimeRow,
  extractTeams,
  extractFixtureDate,
} from "@/lib/txline/normalize";
import type { Fixture, OddsPayload } from "@/lib/txline/types";

function makeOdds(overrides: Partial<OddsPayload> = {}): OddsPayload {
  return {
    fixtureId: 18241006,
    messageId: "msg-001",
    ts: 1_752_620_400_000,
    bookmaker: "consensus",
    bookmakerId: 1,
    superOddsType: "1X2",
    gameState: "1",
    inRunning: false,
    marketParameters: null,
    marketPeriod: "regulation",
    priceNames: ["part1", "draw", "part2"],
    prices: ["2.10", "3.20", "3.50"],
    pct: ["47.000", "28.000", "25.000"],
    ...overrides,
  };
}

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    fixtureId: 18241006,
    participant1: "England",
    participant2: "Argentina",
    participant1IsHome: true,
    startTime: 1784142000000,
    gameState: 1,
    competition: "World Cup",
    competitionId: 500001,
    ...overrides,
  };
}

describe("pctToProbability", () => {
  it("converts '47.000' to 0.47", () => {
    expect(pctToProbability("47.000")).toBeCloseTo(0.47);
  });

  it("converts '100.000' to 1.0", () => {
    expect(pctToProbability("100.000")).toBe(1.0);
  });

  it("converts '0.000' to 0", () => {
    expect(pctToProbability("0.000")).toBe(0);
  });

  it("rejects 'NA'", () => {
    expect(pctToProbability("NA")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(pctToProbability("")).toBeNull();
  });

  it("rejects negative values", () => {
    expect(pctToProbability("-5.000")).toBeNull();
  });

  it("rejects values over 100", () => {
    expect(pctToProbability("105.000")).toBeNull();
  });

  it("rejects NaN strings", () => {
    expect(pctToProbability("abc")).toBeNull();
  });
});

describe("arraysEqualLength", () => {
  it("returns true when all arrays have same length", () => {
    expect(arraysEqualLength(["a", "b", "c"], ["1", "2", "3"], ["x", "y", "z"])).toBe(true);
  });

  it("returns false when lengths differ", () => {
    expect(arraysEqualLength(["a", "b"], ["1", "2", "3"], ["x", "y"])).toBe(false);
  });
});

describe("hasDuplicateLabels", () => {
  it("returns true for duplicate labels", () => {
    expect(hasDuplicateLabels(["part1", "draw", "part1"])).toBe(true);
  });

  it("returns false for unique labels", () => {
    expect(hasDuplicateLabels(["part1", "draw", "part2"])).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(hasDuplicateLabels(["part1", "draw", "Part1"])).toBe(true);
  });
});

describe("isRegulationTime1X2", () => {
  it("returns true for 1X2 + regulation", () => {
    expect(isRegulationTime1X2("1X2", "regulation")).toBe(true);
  });

  it("returns true for 3way + full time", () => {
    expect(isRegulationTime1X2("3way", "full time")).toBe(true);
  });

  it("returns true for match result + 90", () => {
    expect(isRegulationTime1X2("match result", "90")).toBe(true);
  });

  it("returns false for non-1X2 type", () => {
    expect(isRegulationTime1X2("over_under", "regulation")).toBe(false);
  });

  it("returns false for non-regulation period", () => {
    expect(isRegulationTime1X2("1X2", "extra time")).toBe(false);
  });

  it("returns false for null superOddsType", () => {
    expect(isRegulationTime1X2(null, "regulation")).toBe(false);
  });

  it("returns true for 1X2 with null marketPeriod (full match)", () => {
    expect(isRegulationTime1X2("1X2", null)).toBe(true);
  });
});

describe("findOutcomeProbability", () => {
  it("finds home (part1) probability at position 0", () => {
    const result = findOutcomeProbability(makeOdds(), "home");
    expect(result).not.toBeNull();
    expect(result!.probability).toBeCloseTo(0.47);
    expect(result!.position).toBe(0);
  });

  it("finds draw probability at position 1", () => {
    const result = findOutcomeProbability(makeOdds(), "draw");
    expect(result).not.toBeNull();
    expect(result!.probability).toBeCloseTo(0.28);
    expect(result!.position).toBe(1);
  });

  it("finds away (part2) probability at position 2", () => {
    const result = findOutcomeProbability(makeOdds(), "away");
    expect(result).not.toBeNull();
    expect(result!.probability).toBeCloseTo(0.25);
    expect(result!.position).toBe(2);
  });

  it("returns null when home not found in non-generic labels", () => {
    const result = findOutcomeProbability(
      makeOdds({ priceNames: ["Brazil", "Draw", "Germany"] }),
      "home",
    );
    expect(result).toBeNull();
  });

  it("returns null when draw not found", () => {
    const result = findOutcomeProbability(
      makeOdds({ priceNames: ["part1", "nope", "part2"] }),
      "draw",
    );
    expect(result).toBeNull();
  });

  it("returns null when Pct is NA", () => {
    const result = findOutcomeProbability(
      makeOdds({ pct: ["NA", "28.000", "25.000"] }),
      "home",
    );
    expect(result).toBeNull();
  });

  it("returns null when arrays have unequal lengths", () => {
    const result = findOutcomeProbability(
      makeOdds({
        priceNames: ["part1", "draw"],
        prices: ["1", "2", "3"],
        pct: ["47", "28", "25"],
      }),
      "home",
    );
    expect(result).toBeNull();
  });

  it("returns null when duplicate labels exist", () => {
    const result = findOutcomeProbability(
      makeOdds({ priceNames: ["part1", "part1", "part2"] }),
      "home",
    );
    expect(result).toBeNull();
  });
});

describe("validateDistribution", () => {
  it("validates a plausible distribution summing to 1.0", () => {
    expect(validateDistribution(["47.000", "28.000", "25.000"])).toBe(true);
  });

  it("validates within tolerance", () => {
    expect(validateDistribution(["47.000", "28.000", "26.000"])).toBe(true);
  });

  it("rejects implausible distribution", () => {
    expect(validateDistribution(["10.000", "10.000", "10.000"])).toBe(false);
  });

  it("rejects when NA present", () => {
    expect(validateDistribution(["NA", "50.000", "50.000"])).toBe(false);
  });
});

describe("selectRegulationTimeRow", () => {
  it("selects the regulation-time 1X2 row from multiple odds rows", () => {
    const rows = [
      makeOdds({ superOddsType: "over_under", marketPeriod: "regulation" }),
      makeOdds({ superOddsType: "1X2", marketPeriod: "regulation" }),
      makeOdds({ superOddsType: "btts", marketPeriod: "regulation" }),
    ];
    const result = selectRegulationTimeRow(rows);
    expect(result).not.toBeNull();
    expect(result!.superOddsType).toBe("1X2");
  });

  it("returns null when no regulation-time 1X2 row exists", () => {
    const rows = [
      makeOdds({ superOddsType: "over_under", marketPeriod: "regulation" }),
      makeOdds({ superOddsType: "btts", marketPeriod: "regulation" }),
    ];
    expect(selectRegulationTimeRow(rows)).toBeNull();
  });
});

describe("extractTeams", () => {
  it("extracts teams when participant1 is home", () => {
    const result = extractTeams(makeFixture({ participant1IsHome: true }));
    expect(result.home).toBe("England");
    expect(result.away).toBe("Argentina");
  });

  it("swaps teams when participant1 is not home", () => {
    const result = extractTeams(makeFixture({ participant1IsHome: false }));
    expect(result.home).toBe("Argentina");
    expect(result.away).toBe("England");
  });

  it("returns nulls for null fixture", () => {
    const result = extractTeams(null);
    expect(result.home).toBeNull();
    expect(result.away).toBeNull();
  });
});

describe("extractFixtureDate", () => {
  it("extracts date from startTime", () => {
    expect(extractFixtureDate(makeFixture())).toBe("2026-07-15");
  });

  it("returns null for null fixture", () => {
    expect(extractFixtureDate(null)).toBeNull();
  });
});