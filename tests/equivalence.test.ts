import { describe, it, expect } from "vitest";
import { checkEquivalence } from "@/lib/contract/equivalence";

const VALID_INPUT = {
  txlineHomeTeam: "England",
  txlineAwayTeam: "Argentina",
  txlineMatchDate: "2026-07-15",
  txlineMarketType: "1X2",
  txlineMarketPeriod: "regulation",
  polymarketHomeTeam: "England",
  polymarketAwayTeam: "Argentina",
  polymarketMatchDate: "2026-07-15",
  polymarketResolutionWording: "England to win in the first 90 minutes plus stoppage time (excludes extra time)",
  selectedTokenLabel: "England YES",
  marketActive: true,
  marketClosed: false,
  acceptingOrders: true,
};

describe("checkEquivalence team matching", () => {
  it("passes when teams match on both sides", () => {
    const result = checkEquivalence(VALID_INPUT);
    expect(result.checks.teams).toBe(true);
  });

  it("fails when txline home team differs", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineHomeTeam: "France",
    });
    expect(result.checks.teams).toBe(false);
    expect(result.failures.some((f) => f.includes("Teams"))).toBe(true);
  });

  it("fails when polymarket away team differs", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      polymarketAwayTeam: "Brazil",
    });
    expect(result.checks.teams).toBe(false);
  });

  it("is case-insensitive for team names", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineHomeTeam: "england",
      polymarketAwayTeam: "ARGENTINA",
    });
    expect(result.checks.teams).toBe(true);
  });
});

describe("checkEquivalence date matching", () => {
  it("passes when dates match July 15 2026", () => {
    const result = checkEquivalence(VALID_INPUT);
    expect(result.checks.date).toBe(true);
  });

  it("fails when txline date is different", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineMatchDate: "2026-07-14",
    });
    expect(result.checks.date).toBe(false);
  });

  it("fails when polymarket date is null", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      polymarketMatchDate: null,
    });
    expect(result.checks.date).toBe(false);
  });
});

describe("checkEquivalence market type matching", () => {
  it("passes for regulation-time 1X2", () => {
    const result = checkEquivalence(VALID_INPUT);
    expect(result.checks.rules).toBe(true);
  });

  it("fails when txline market type is not 1X2", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineMarketType: "over_under",
    });
    expect(result.checks.rules).toBe(false);
  });

  it("fails when txline market period is not regulation", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineMarketPeriod: "extra_time",
    });
    expect(result.checks.rules).toBe(false);
  });

  it("fails when polymarket resolution does not confirm regulation time", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      polymarketResolutionWording: "England to win the match (includes extra time)",
    });
    expect(result.checks.rules).toBe(false);
  });
});

describe("checkEquivalence token matching", () => {
  it("passes for England YES label", () => {
    const result = checkEquivalence(VALID_INPUT);
    expect(result.checks.token).toBe(true);
  });

  it("fails for NO label", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      selectedTokenLabel: "England NO",
    });
    expect(result.checks.token).toBe(false);
  });

  it("fails for null label", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      selectedTokenLabel: null,
    });
    expect(result.checks.token).toBe(false);
  });
});

describe("checkEquivalence market state", () => {
  it("passes when market is active, not closed, accepting orders", () => {
    const result = checkEquivalence(VALID_INPUT);
    expect(result.checks.marketState).toBe(true);
  });

  it("fails when market is closed", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      marketClosed: true,
    });
    expect(result.checks.marketState).toBe(false);
  });

  it("fails when not accepting orders", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      acceptingOrders: false,
    });
    expect(result.checks.marketState).toBe(false);
  });
});

describe("checkEquivalence overall", () => {
  it("passes when all checks pass", () => {
    const result = checkEquivalence(VALID_INPUT);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("fails when any check fails", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineHomeTeam: "France",
    });
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });
});