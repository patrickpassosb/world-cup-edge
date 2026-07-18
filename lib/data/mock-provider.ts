import { CONFIG, MATCH } from "@/lib/config";
import type { DataProvider } from "@/lib/data/provider";
import { checkEquivalence } from "@/lib/contract/equivalence";
import { computeGapAfterFee, computeGrossGap, computeFeePerShare, evaluateAlert } from "@/lib/gap/engine";
import type { AlertPhase, EquivalenceResult, Outcome, Snapshot, VerificationChecks } from "@/lib/types";

export type MockScenario =
  | "live"
  | "alert"
  | "stale"
  | "unavailable"
  | "error"
  | "loading";

const SAMPLE_NOW = 1752620400000;

const OUTCOME_LABELS: Record<Outcome, string> = {
  home: MATCH.homeTeam,
  draw: "Draw",
  away: MATCH.awayTeam,
};

const OUTCOME_PROBABILITY: Record<Outcome, number> = {
  home: 0.548,
  draw: 0.28,
  away: 0.25,
};

const OUTCOME_BEST_ASK: Record<Outcome, number> = {
  home: 0.506,
  draw: 0.27,
  away: 0.24,
};

const OUTCOME_BEST_BID: Record<Outcome, number> = {
  home: 0.498,
  draw: 0.26,
  away: 0.23,
};

const OUTCOME_TOKEN_ID: Record<Outcome, string> = {
  home: "token-yes-eng-001",
  draw: "token-yes-draw-001",
  away: "token-yes-fra-001",
};

const OUTCOME_MESSAGE_ID: Record<Outcome, string> = {
  home: "msg-001",
  draw: "msg-draw-001",
  away: "msg-away-001",
};

const OUTCOME_LABEL_FOR_TOKEN: Record<Outcome, string> = {
  home: `${MATCH.homeTeam} YES`,
  draw: "Yes",
  away: `${MATCH.awayTeam} YES`,
};

const OUTCOME_RESOLUTION_WORDING: Record<Outcome, string> = {
  home: `${MATCH.homeTeam} to win in the first 90 minutes plus stoppage time (excludes extra time)`,
  draw: `${MATCH.homeTeam} vs ${MATCH.awayTeam} to end in a draw in the first 90 minutes plus stoppage time (excludes extra time)`,
  away: `${MATCH.awayTeam} to win in the first 90 minutes plus stoppage time (excludes extra time)`,
};

function buildEquivalenceInput(outcome: Outcome) {
  return {
    txlineHomeTeam: MATCH.homeTeam,
    txlineAwayTeam: MATCH.awayTeam,
    txlineMatchDate: MATCH.matchDate,
    txlineMarketType: "1X2",
    txlineMarketPeriod: "regulation",
    polymarketHomeTeam: MATCH.homeTeam,
    polymarketAwayTeam: MATCH.awayTeam,
    polymarketMatchDate: MATCH.matchDate,
    polymarketResolutionWording: OUTCOME_RESOLUTION_WORDING[outcome],
    selectedTokenLabel: OUTCOME_LABEL_FOR_TOKEN[outcome],
    marketActive: true,
    marketClosed: false,
    acceptingOrders: true,
    outcome,
    expectedHomeTeam: MATCH.homeTeam,
    expectedAwayTeam: MATCH.awayTeam,
    expectedDate: MATCH.matchDate,
  };
}

function buildVerificationChecks(outcome: Outcome): VerificationChecks {
  const eq = checkEquivalence(buildEquivalenceInput(outcome));
  return {
    teams: eq.checks.teams,
    date: eq.checks.date,
    rules: eq.checks.rules,
    token: eq.checks.token,
    marketState: eq.checks.marketState,
    fee: true,
  };
}

function buildDedupeKey(messageId: string | null, bookHash: string | null): string | null {
  if (messageId === null && bookHash === null) return null;
  return `${messageId ?? "none"}::${bookHash ?? "none"}`;
}

function makeBaseSnapshot(outcome: Outcome = "home"): Snapshot {
  const now = SAMPLE_NOW;
  const equivalence: EquivalenceResult = checkEquivalence(buildEquivalenceInput(outcome));
  const checks = buildVerificationChecks(outcome);
  const outcomeLabel = OUTCOME_LABELS[outcome];

  return {
    status: "live",
    alertKind: "no-alert",
    match: {
      name: MATCH.matchName,
      date: MATCH.matchDate,
      kickoffUTC: MATCH.kickoffUTC,
      rules: MATCH.rules,
      outcome,
      outcomeLabel,
      homeTeam: MATCH.homeTeam,
      awayTeam: MATCH.awayTeam,
    },
    txline: {
      probability: null,
      messageId: null,
      timestamp: null,
      receivedAt: null,
      fresh: false,
      serviceLevel: CONFIG.txline.serviceLevel,
      delayed: false,
    },
    polymarket: {
      bestAsk: null,
      bestBid: null,
      askSize: null,
      feeRate: null,
      bookSeq: null,
      timestamp: null,
      receivedAt: null,
      fresh: false,
      marketActive: true,
      marketClosed: false,
      acceptingOrders: true,
      bookEmpty: false,
      yesTokenId: null,
    },
    gap: {
      grossGap: null,
      feePerShare: null,
      gapAfterFee: null,
      threshold: CONFIG.gap.threshold,
    },
    alert: {
      active: false,
      reason: "",
      consecutiveSamples: 0,
      suppressedReason: null,
      phase: "IDLE" as AlertPhase,
      lastAlertTime: null,
      cooldownRemainingMs: null,
      dedupeKey: null,
    },
    checks,
    equivalence,
    sourceSkewMs: null,
    receivedAt: now,
    errorMessage: null,
  };
}

function buildLiveSnapshot(outcome: Outcome = "home", gapAfterFeeOverride?: number): Snapshot {
  const now = SAMPLE_NOW;
  const snapshot = makeBaseSnapshot(outcome);

  const txlineProbability = OUTCOME_PROBABILITY[outcome];
  const bestAsk = OUTCOME_BEST_ASK[outcome];
  const bestBid = OUTCOME_BEST_BID[outcome];
  const feeRate = 0.05;
  const txlineTimestamp = now - 11_000;
  const polymarketTimestamp = now - 4_000;

  const grossGap = computeGrossGap(txlineProbability, bestAsk);
  const feePerShare = computeFeePerShare(feeRate, bestAsk);
  const gapAfterFee =
    gapAfterFeeOverride !== undefined
      ? gapAfterFeeOverride
      : computeGapAfterFee(grossGap, feePerShare);

  snapshot.txline = {
    probability: txlineProbability,
    messageId: OUTCOME_MESSAGE_ID[outcome],
    timestamp: txlineTimestamp,
    receivedAt: now,
    fresh: now - txlineTimestamp <= CONFIG.txline.maxAgeMs,
    serviceLevel: CONFIG.txline.serviceLevel,
    delayed: false,
  };

  snapshot.polymarket = {
    bestAsk,
    bestBid,
    askSize: 500,
    feeRate,
    bookSeq: 1001,
    timestamp: polymarketTimestamp,
    receivedAt: now,
    fresh: now - polymarketTimestamp <= CONFIG.polymarket.maxAgeMs,
    marketActive: true,
    marketClosed: false,
    acceptingOrders: true,
    bookEmpty: false,
    yesTokenId: OUTCOME_TOKEN_ID[outcome],
  };

  snapshot.gap = {
    grossGap,
    feePerShare,
    gapAfterFee,
    threshold: CONFIG.gap.threshold,
  };

  snapshot.sourceSkewMs = Math.abs(txlineTimestamp - polymarketTimestamp);

  const alertEval = evaluateAlert({
    gapAfterFee,
    txlineFresh: snapshot.txline.fresh,
    polymarketFresh: snapshot.polymarket.fresh,
    sourceSkewMs: snapshot.sourceSkewMs,
    maxSourceSkewMs: CONFIG.gap.maxSourceSkewMs,
    marketActive: snapshot.polymarket.marketActive,
    marketClosed: snapshot.polymarket.marketClosed,
    acceptingOrders: snapshot.polymarket.acceptingOrders,
    bookEmpty: snapshot.polymarket.bookEmpty,
    equivalencePassed: snapshot.equivalence !== null ? snapshot.equivalence.passed : false,
    serviceLevel: snapshot.txline.serviceLevel,
    fixtureGameState: null,
    previousPhase: "IDLE",
    previousConsecutiveSamples: 0,
    messageId: snapshot.txline.messageId,
    bookHash: String(snapshot.polymarket.bookSeq),
    lastAlertTime: null,
    now,
  });

  snapshot.alert = alertEval.alert;
  snapshot.alertKind = alertEval.alert.active ? "alert" : "no-alert";

  return snapshot;
}

function buildAlertSnapshot(outcome: Outcome = "home"): Snapshot {
  const now = SAMPLE_NOW;
  const snapshot = makeBaseSnapshot(outcome);

  const txlineProbability = OUTCOME_PROBABILITY[outcome] + 0.023;
  const bestAsk = OUTCOME_BEST_ASK[outcome] - 0.007;
  const bestBid = OUTCOME_BEST_BID[outcome] - 0.008;
  const feeRate = 0.05;
  const txlineTimestamp = now - 5_000;
  const polymarketTimestamp = now - 2_000;

  const grossGap = computeGrossGap(txlineProbability, bestAsk);
  const feePerShare = computeFeePerShare(feeRate, bestAsk);
  const gapAfterFee = computeGapAfterFee(grossGap, feePerShare);

  snapshot.txline = {
    probability: txlineProbability,
    messageId: `${OUTCOME_MESSAGE_ID[outcome]}-alert`,
    timestamp: txlineTimestamp,
    receivedAt: now,
    fresh: true,
    serviceLevel: CONFIG.txline.serviceLevel,
    delayed: false,
  };

  snapshot.polymarket = {
    bestAsk,
    bestBid,
    askSize: 300,
    feeRate,
    bookSeq: 2042,
    timestamp: polymarketTimestamp,
    receivedAt: now,
    fresh: true,
    marketActive: true,
    marketClosed: false,
    acceptingOrders: true,
    bookEmpty: false,
    yesTokenId: OUTCOME_TOKEN_ID[outcome],
  };

  snapshot.gap = {
    grossGap,
    feePerShare,
    gapAfterFee,
    threshold: CONFIG.gap.threshold,
  };

  snapshot.sourceSkewMs = Math.abs(txlineTimestamp - polymarketTimestamp);

  const alertEval = evaluateAlert({
    gapAfterFee,
    txlineFresh: true,
    polymarketFresh: true,
    sourceSkewMs: snapshot.sourceSkewMs,
    maxSourceSkewMs: CONFIG.gap.maxSourceSkewMs,
    marketActive: true,
    marketClosed: false,
    acceptingOrders: true,
    bookEmpty: false,
    equivalencePassed: true,
    serviceLevel: CONFIG.txline.serviceLevel,
    fixtureGameState: null,
    previousPhase: "SAMPLING",
    previousConsecutiveSamples: 1,
    messageId: snapshot.txline.messageId,
    bookHash: String(snapshot.polymarket.bookSeq),
    lastAlertTime: null,
    now,
  });

  snapshot.alert = alertEval.alert;
  snapshot.alertKind = alertEval.alert.active ? "alert" : "no-alert";

  return snapshot;
}

function buildStaleSnapshot(outcome: Outcome = "home"): Snapshot {
  const now = SAMPLE_NOW;
  const snapshot = makeBaseSnapshot(outcome);

  const txlineTimestamp = now - 5 * 60 * 1000;
  const polymarketTimestamp = now - 3 * 60 * 1000;

  snapshot.status = "stale";
  snapshot.txline = {
    probability: OUTCOME_PROBABILITY[outcome],
    messageId: `${OUTCOME_MESSAGE_ID[outcome]}-stale`,
    timestamp: txlineTimestamp,
    receivedAt: now,
    fresh: false,
    serviceLevel: CONFIG.txline.serviceLevel,
    delayed: false,
  };

  snapshot.polymarket = {
    bestAsk: OUTCOME_BEST_ASK[outcome],
    bestBid: OUTCOME_BEST_BID[outcome],
    askSize: 500,
    feeRate: 0.05,
    bookSeq: 1001,
    timestamp: polymarketTimestamp,
    receivedAt: now,
    fresh: false,
    marketActive: true,
    marketClosed: false,
    acceptingOrders: true,
    bookEmpty: false,
    yesTokenId: OUTCOME_TOKEN_ID[outcome],
  };

  const grossGap = computeGrossGap(OUTCOME_PROBABILITY[outcome], OUTCOME_BEST_ASK[outcome]);
  const feePerShare = computeFeePerShare(0.05, OUTCOME_BEST_ASK[outcome]);
  const gapAfterFee = computeGapAfterFee(grossGap, feePerShare);

  snapshot.gap = {
    grossGap,
    feePerShare,
    gapAfterFee,
    threshold: CONFIG.gap.threshold,
  };

  snapshot.sourceSkewMs = Math.abs(txlineTimestamp - polymarketTimestamp);
  snapshot.alert = {
    active: false,
    reason: "Sources are stale. Alerts suppressed.",
    consecutiveSamples: 0,
    suppressedReason: "Sources are stale. Alerts suppressed.",
    phase: "IDLE",
    lastAlertTime: null,
    cooldownRemainingMs: null,
    dedupeKey: buildDedupeKey(snapshot.txline.messageId, String(snapshot.polymarket.bookSeq)),
  };
  snapshot.alertKind = "no-alert";

  return snapshot;
}

function buildUnavailableSnapshot(outcome: Outcome = "home"): Snapshot {
  const now = SAMPLE_NOW;
  const snapshot = makeBaseSnapshot(outcome);

  snapshot.status = "unavailable";
  snapshot.errorMessage = "Market closed or source disconnected.";
  snapshot.polymarket = {
    bestAsk: null,
    bestBid: null,
    askSize: null,
    feeRate: null,
    bookSeq: null,
    timestamp: null,
    receivedAt: now,
    fresh: false,
    marketActive: false,
    marketClosed: true,
    acceptingOrders: false,
    bookEmpty: true,
    yesTokenId: null,
  };
  snapshot.alert = {
    active: false,
    reason: "Market is closed. Alerts suppressed.",
    consecutiveSamples: 0,
    suppressedReason: "Market is closed. Alerts suppressed.",
    phase: "IDLE",
    lastAlertTime: null,
    cooldownRemainingMs: null,
    dedupeKey: null,
  };
  snapshot.alertKind = "no-alert";

  return snapshot;
}

function buildErrorSnapshot(outcome: Outcome = "home"): Snapshot {
  const snapshot = makeBaseSnapshot(outcome);

  snapshot.status = "error";
  snapshot.errorMessage = "Failed to fetch snapshot from data source.";
  snapshot.alert = {
    active: false,
    reason: "Fetch error. Alerts suppressed.",
    consecutiveSamples: 0,
    suppressedReason: "Fetch error. Alerts suppressed.",
    phase: "IDLE",
    lastAlertTime: null,
    cooldownRemainingMs: null,
    dedupeKey: null,
  };
  snapshot.alertKind = "no-alert";

  return snapshot;
}

function buildLoadingSnapshot(outcome: Outcome = "home"): Snapshot {
  const snapshot = makeBaseSnapshot(outcome);

  snapshot.status = "loading";
  snapshot.alertKind = "no-alert";

  return snapshot;
}

export class MockDataProvider implements DataProvider {
  private scenario: MockScenario;
  private outcome: Outcome;

  constructor(scenario: MockScenario = "live", outcome: Outcome = "home") {
    this.scenario = scenario;
    this.outcome = outcome;
  }

  setScenario(scenario: MockScenario): void {
    this.scenario = scenario;
  }

  setOutcome(outcome: Outcome): void {
    this.outcome = outcome;
  }

  async getSnapshot(): Promise<Snapshot> {
    await simulateLatency();

    switch (this.scenario) {
      case "live":
        return buildLiveSnapshot(this.outcome);
      case "alert":
        return buildAlertSnapshot(this.outcome);
      case "stale":
        return buildStaleSnapshot(this.outcome);
      case "unavailable":
        return buildUnavailableSnapshot(this.outcome);
      case "error":
        return buildErrorSnapshot(this.outcome);
      case "loading":
        return buildLoadingSnapshot(this.outcome);
      default:
        return buildLiveSnapshot(this.outcome);
    }
  }
}

function simulateLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

export const mockSnapshots = {
  live: (outcome: Outcome = "home") => buildLiveSnapshot(outcome),
  alert: (outcome: Outcome = "home") => buildAlertSnapshot(outcome),
  stale: (outcome: Outcome = "home") => buildStaleSnapshot(outcome),
  unavailable: (outcome: Outcome = "home") => buildUnavailableSnapshot(outcome),
  error: (outcome: Outcome = "home") => buildErrorSnapshot(outcome),
  loading: (outcome: Outcome = "home") => buildLoadingSnapshot(outcome),
};