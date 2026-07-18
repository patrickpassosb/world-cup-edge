import { describe, it, expect } from "vitest";
import { checkEquivalence } from "@/lib/contract/equivalence";

const VALID_INPUT = {
  txlineHomeTeam: "England",
  txlineAwayTeam: "France",
  txlineMatchDate: "2026-07-16",
  txlineMarketType: "1X2",
  txlineMarketPeriod: "regulation",
  polymarketHomeTeam: "England",
  polymarketAwayTeam: "France",
  polymarketMatchDate: "2026-07-16",
  polymarketResolutionWording: "England to win in the first 90 minutes plus stoppage time (excludes extra time)",
  polymarketMarketQuestion: "Will England win on 2026-07-16?",
  selectedTokenLabel: "England YES",
  marketActive: true,
  marketClosed: false,
  acceptingOrders: true,
  outcome: "home" as const,
  expectedHomeTeam: "England",
  expectedAwayTeam: "France",
  expectedDate: "2026-07-16",
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
      polymarketAwayTeam: "FRANCE",
    });
    expect(result.checks.teams).toBe(true);
  });

  it("passes when expected teams are Spain and Argentina", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineHomeTeam: "Spain",
      txlineAwayTeam: "Argentina",
      polymarketHomeTeam: "Spain",
      polymarketAwayTeam: "Argentina",
      expectedHomeTeam: "Spain",
      expectedAwayTeam: "Argentina",
      selectedTokenLabel: "Spain YES",
      polymarketResolutionWording: "Spain to win in the first 90 minutes plus stoppage time (excludes extra time)",
    });
    expect(result.checks.teams).toBe(true);
  });
});

describe("checkEquivalence date matching", () => {
  it("passes when dates match across sources", () => {
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

  it("passes when expected date changes and all sources match", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineMatchDate: "2026-07-19",
      polymarketMatchDate: "2026-07-19",
      expectedDate: "2026-07-19",
    });
    expect(result.checks.date).toBe(true);
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
  it("passes for home outcome with home team YES label", () => {
    const result = checkEquivalence(VALID_INPUT);
    expect(result.checks.token).toBe(true);
  });

  it("passes for away outcome with away team YES label", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      outcome: "away" as const,
      selectedTokenLabel: "France YES",
      polymarketResolutionWording: "France to win in the first 90 minutes plus stoppage time (excludes extra time)",
    });
    expect(result.checks.token).toBe(true);
  });

  it("passes for draw outcome with Yes label", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      outcome: "draw" as const,
      selectedTokenLabel: "Yes",
      polymarketResolutionWording: "England vs France to end in a draw in the first 90 minutes plus stoppage time (excludes extra time)",
      polymarketMarketQuestion: "Will England vs France end in a draw on 2026-07-16?",
    });
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

  it("fails when home outcome label does not match expected team", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      selectedTokenLabel: "France YES",
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

  it("passes for Spain vs Argentina with correct outcome", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineHomeTeam: "Spain",
      txlineAwayTeam: "Argentina",
      polymarketHomeTeam: "Spain",
      polymarketAwayTeam: "Argentina",
      txlineMatchDate: "2026-07-19",
      polymarketMatchDate: "2026-07-19",
      expectedHomeTeam: "Spain",
      expectedAwayTeam: "Argentina",
      expectedDate: "2026-07-19",
      selectedTokenLabel: "Spain YES",
      polymarketResolutionWording: "Spain to win in the first 90 minutes plus stoppage time (excludes extra time)",
      polymarketMarketQuestion: "Will Spain win on 2026-07-19?",
    });
    expect(result.passed).toBe(true);
  });

  it("accepts plain Yes label when market question confirms home team (France home)", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineHomeTeam: "France",
      txlineAwayTeam: "England",
      polymarketHomeTeam: "France",
      polymarketAwayTeam: "England",
      expectedHomeTeam: "France",
      expectedAwayTeam: "England",
      selectedTokenLabel: "Yes",
      polymarketResolutionWording: "France to win in the first 90 minutes plus stoppage time (excludes extra time)",
      polymarketMarketQuestion: "Will France win on 2026-07-16?",
    });
    expect(result.checks.token).toBe(true);
  });

  it("rejects plain Yes label when market question names the wrong team", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineHomeTeam: "France",
      txlineAwayTeam: "England",
      polymarketHomeTeam: "France",
      polymarketAwayTeam: "England",
      expectedHomeTeam: "France",
      expectedAwayTeam: "England",
      selectedTokenLabel: "Yes",
      polymarketResolutionWording: "England to win in the first 90 minutes plus stoppage time (excludes extra time)",
      polymarketMarketQuestion: "Will England win on 2026-07-16?",
    });
    expect(result.checks.token).toBe(false);
  });

  it("rejects No label even when market question confirms team", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      selectedTokenLabel: "No",
      polymarketMarketQuestion: "Will England win on 2026-07-16?",
    });
    expect(result.checks.token).toBe(false);
  });

  it("rejects Yes label when market question is null", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      selectedTokenLabel: "Yes",
      polymarketMarketQuestion: null,
    });
    expect(result.checks.token).toBe(false);
  });

  it("accepts accent-stripped team names (Côte d'Ivoire vs Cote d'Ivoire)", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineHomeTeam: "Côte d'Ivoire",
      txlineAwayTeam: "Ghana",
      polymarketHomeTeam: "Cote d'Ivoire",
      polymarketAwayTeam: "Ghana",
      expectedHomeTeam: "Côte d'Ivoire",
      expectedAwayTeam: "Ghana",
      selectedTokenLabel: "Côte d'Ivoire YES",
      polymarketResolutionWording: "Côte d'Ivoire to win in the first 90 minutes plus stoppage time (excludes extra time)",
      polymarketMarketQuestion: "Will Côte d'Ivoire win on 2026-07-16?",
    });
    expect(result.checks.teams).toBe(true);
  });

  it("accepts null txlineMarketPeriod for regulation-time 1X2 (live API shape)", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineMarketType: "1X2_PARTICIPANT_RESULT",
      txlineMarketPeriod: null,
    });
    expect(result.checks.rules).toBe(true);
  });

  it("rejects extra-time market period", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineMarketPeriod: "extra_time",
    });
    expect(result.checks.rules).toBe(false);
  });

  it("rejects first-half market period", () => {
    const result = checkEquivalence({
      ...VALID_INPUT,
      txlineMarketPeriod: "half=1",
    });
    expect(result.checks.rules).toBe(false);
  });
});