import { CONFIG, MATCH } from "@/lib/config";
import type { EquivalenceResult } from "@/lib/types";

export interface EquivalenceInput {
  txlineHomeTeam: string | null;
  txlineAwayTeam: string | null;
  txlineMatchDate: string | null;
  txlineMarketType: string | null;
  txlineMarketPeriod: string | null;
  polymarketHomeTeam: string | null;
  polymarketAwayTeam: string | null;
  polymarketMatchDate: string | null;
  polymarketResolutionWording: string | null;
  selectedTokenLabel: string | null;
  marketActive: boolean;
  marketClosed: boolean;
  acceptingOrders: boolean;
}

function normalizeTeam(name: string | null): string {
  if (name === null) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function teamsMatch(a: string | null, b: string | null): boolean {
  const na = normalizeTeam(a);
  const nb = normalizeTeam(b);
  if (na === "" || nb === "") return false;
  return na === nb;
}

function datesMatch(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return false;
  const da = a.slice(0, 10);
  const db = b.slice(0, 10);
  if (!da || !db) return false;
  return da === db;
}

function isRegulationTime1X2(marketType: string | null, marketPeriod: string | null): boolean {
  if (marketType === null || marketPeriod === null) return false;
  const mt = marketType.toLowerCase();
  const mp = marketPeriod.toLowerCase();
  const is1x2 = mt.includes("1x2") || mt.includes("3way") || mt.includes("match result");
  const isRegulation = mp.includes("regulation") || mp.includes("full time") || mp.includes("90");
  return is1x2 && isRegulation;
}

function resolutionConfirmsRegulation(wording: string | null): boolean {
  if (wording === null) return false;
  const w = wording.toLowerCase();
  const hasRegulation =
    w.includes("regulation") ||
    w.includes("90 minutes") ||
    w.includes("first 90") ||
    w.includes("stoppage");
  const excludesExtraTime = !w.includes("extra time") || w.includes("excludes extra time");
  return hasRegulation && excludesExtraTime;
}

function tokenIsEnglandYes(label: string | null): boolean {
  if (label === null) return false;
  const l = label.toLowerCase();
  return (l.includes("england") || l.includes("yes")) && !l.includes("no");
}

export function checkEquivalence(input: EquivalenceInput): EquivalenceResult {
  const checks = {
    teams: false,
    date: false,
    rules: false,
    token: false,
    marketState: false,
  };
  const failures: string[] = [];

  const homeMatch = teamsMatch(input.txlineHomeTeam, input.polymarketHomeTeam) &&
    teamsMatch(input.txlineHomeTeam, MATCH.homeTeam);
  const awayMatch = teamsMatch(input.txlineAwayTeam, input.polymarketAwayTeam) &&
    teamsMatch(input.txlineAwayTeam, MATCH.awayTeam);
  checks.teams = homeMatch && awayMatch;
  if (!checks.teams) {
    failures.push("Teams do not match across sources.");
  }

  const txlineDateOk = datesMatch(input.txlineMatchDate, MATCH.matchDate);
  const polyDateOk = datesMatch(input.polymarketMatchDate, MATCH.matchDate);
  checks.date = txlineDateOk && polyDateOk;
  if (!checks.date) {
    failures.push("Match date does not match July 15, 2026.");
  }

  const txlineRulesOk = isRegulationTime1X2(input.txlineMarketType, input.txlineMarketPeriod);
  const polyRulesOk = resolutionConfirmsRegulation(input.polymarketResolutionWording);
  checks.rules = txlineRulesOk && polyRulesOk;
  if (!checks.rules) {
    failures.push("Market rules do not confirm regulation-time 1X2.");
  }

  checks.token = tokenIsEnglandYes(input.selectedTokenLabel);
  if (!checks.token) {
    failures.push("Selected token does not correspond to England YES outcome.");
  }

  checks.marketState =
    input.marketActive && !input.marketClosed && input.acceptingOrders;
  if (!checks.marketState) {
    failures.push("Polymarket market is not open and accepting orders.");
  }

  return {
    passed: checks.teams && checks.date && checks.rules && checks.token && checks.marketState,
    checks,
    failures,
  };
}

export { CONFIG };