import { CONFIG } from "@/lib/config";
import { isRegulationTime1X2 as isRegulationTime1X2Shared } from "@/lib/contract/regulation";
import type { Fixture, NormalizedTxline, OddsPayload } from "@/lib/txline/types";
import type { Outcome } from "@/lib/types";

export function pctToProbability(pct: string): number | null {
  if (!pct || pct === "NA" || pct === "na" || pct === "") return null;
  const n = parseFloat(pct);
  if (Number.isNaN(n)) return null;
  if (n < 0 || n > 100) return null;
  return n / 100;
}

export function arraysEqualLength(
  priceNames: string[],
  prices: string[],
  pct: string[],
): boolean {
  return priceNames.length === prices.length && priceNames.length === pct.length;
}

export function hasDuplicateLabels(priceNames: string[]): boolean {
  const seen = new Set<string>();
  for (const name of priceNames) {
    const lower = name.toLowerCase();
    if (seen.has(lower)) return true;
    seen.add(lower);
  }
  return false;
}

export function isRegulationTime1X2(
  superOddsType: string | null,
  marketPeriod: string | null,
): boolean {
  return isRegulationTime1X2Shared(superOddsType, marketPeriod);
}

export function findOutcomeProbability(
  odds: OddsPayload,
  outcome: Outcome,
): { probability: number; position: number } | null {
  if (!odds.priceNames || !odds.pct) return null;
  if (!arraysEqualLength(odds.priceNames, odds.prices ?? [], odds.pct)) return null;
  if (hasDuplicateLabels(odds.priceNames)) return null;

  const target = outcome === "draw" ? "draw" : "part";
  for (let i = 0; i < odds.priceNames.length; i++) {
    const label = odds.priceNames[i].toLowerCase();
    if (outcome === "draw" && label === "draw") {
      const prob = pctToProbability(odds.pct[i]);
      if (prob === null) return null;
      return { probability: prob, position: i };
    }
    if (outcome === "home" && label === "part1") {
      const prob = pctToProbability(odds.pct[i]);
      if (prob === null) return null;
      return { probability: prob, position: i };
    }
    if (outcome === "away" && label === "part2") {
      const prob = pctToProbability(odds.pct[i]);
      if (prob === null) return null;
      return { probability: prob, position: i };
    }
  }
  void target;
  return null;
}

export function validateDistribution(
  pct: string[],
  tolerance = 0.05,
): boolean {
  if (pct.length !== 3) return false;
  const probs: number[] = [];
  for (const p of pct) {
    const prob = pctToProbability(p);
    if (prob === null) return false;
    probs.push(prob);
  }
  const sum = probs.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) <= tolerance;
}

export function selectRegulationTimeRow(
  odds: OddsPayload[],
): OddsPayload | null {
  for (const row of odds) {
    if (isRegulationTime1X2(row.superOddsType, row.marketPeriod ?? null)) {
      return row;
    }
  }
  return null;
}

export function extractFixtureDate(fixture: Fixture | null): string | null {
  if (!fixture || !fixture.startTime || !Number.isFinite(fixture.startTime)) return null;
  return new Date(fixture.startTime).toISOString().slice(0, 10);
}

export function extractTeams(
  fixture: Fixture | null,
): { home: string | null; away: string | null } {
  if (!fixture) return { home: null, away: null };
  if (fixture.participant1IsHome) {
    return { home: fixture.participant1, away: fixture.participant2 };
  }
  return { home: fixture.participant2, away: fixture.participant1 };
}

export function isDelayed(serviceLevel: number): boolean {
  return serviceLevel === 1;
}

export function normalizeTxline(
  fixture: Fixture | null,
  odds: OddsPayload[],
  receivedAt: number = Date.now(),
  outcome: Outcome = "home",
): NormalizedTxline {
  const regRow = selectRegulationTimeRow(odds);
  const outcomeResult = regRow ? findOutcomeProbability(regRow, outcome) : null;
  const teams = extractTeams(fixture);
  const matchDate = extractFixtureDate(fixture);

  const distributionValid = regRow ? validateDistribution(regRow.pct) : false;
  const probability = distributionValid ? (outcomeResult?.probability ?? null) : null;

  const timestamp = regRow?.ts ?? null;
  const fresh =
    timestamp !== null && receivedAt - timestamp <= CONFIG.txline.maxAgeMs;

  const serviceLevel = regRow?.serviceLevel ?? CONFIG.txline.serviceLevel;

  return {
    probability,
    messageId: regRow?.messageId ?? null,
    timestamp,
    receivedAt,
    fresh,
    serviceLevel,
    delayed: isDelayed(serviceLevel),
    homeTeam: teams.home,
    awayTeam: teams.away,
    matchDate,
    marketType: regRow?.superOddsType ?? null,
    marketPeriod: regRow?.marketPeriod ?? null,
  };
}