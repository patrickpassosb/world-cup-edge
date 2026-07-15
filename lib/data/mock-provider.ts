import { CONFIG, MATCH } from "@/lib/config";
import type { DataProvider } from "@/lib/data/provider";
import { checkEquivalence } from "@/lib/contract/equivalence";
import { computeGapAfterFee, computeGrossGap, computeFeePerShare, evaluateAlert } from "@/lib/gap/engine";
import type { AlertPhase, EquivalenceResult, Snapshot, VerificationChecks } from "@/lib/types";

export type MockScenario =
  | "live"
  | "alert"
  | "stale"
  | "unavailable"
  | "error"
  | "loading";

const SAMPLE_NOW = 1752620400000;

const EQUIVALENCE_INPUT = {
  txlineHomeTeam: MATCH.homeTeam,
  txlineAwayTeam: MATCH.awayTeam,
  txlineMatchDate: MATCH.matchDate,
  txlineMarketType: "1X2",
  txlineMarketPeriod: "regulation",
  polymarketHomeTeam: MATCH.homeTeam,
  polymarketAwayTeam: MATCH.awayTeam,
  polymarketMatchDate: MATCH.matchDate,
  polymarketResolutionWording: "England to win in the first 90 minutes plus stoppage time (excludes extra time)",
  selectedTokenLabel: "England YES",
  marketActive: true,
  marketClosed: false,
  acceptingOrders: true,
};

function buildVerificationChecks(): VerificationChecks {
  const eq = checkEquivalence(EQUIVALENCE_INPUT);
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

function makeBaseSnapshot(): Snapshot {
  const now = SAMPLE_NOW;
  const equivalence: EquivalenceResult = checkEquivalence(EQUIVALENCE_INPUT);
  const checks = buildVerificationChecks();

  return {
    status: "live",
    alertKind: "no-alert",
    match: {
      name: MATCH.matchName,
      date: MATCH.matchDate,
      kickoffUTC: MATCH.kickoffUTC,
      rules: MATCH.rules,
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

function buildLiveSnapshot(gapAfterFeeOverride?: number): Snapshot {
  const now = SAMPLE_NOW;
  const snapshot = makeBaseSnapshot();

  const txlineProbability = 0.548;
  const bestAsk = 0.506;
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
    messageId: "msg-001",
    timestamp: txlineTimestamp,
    receivedAt: now,
    fresh: now - txlineTimestamp <= CONFIG.txline.maxAgeMs,
    serviceLevel: CONFIG.txline.serviceLevel,
    delayed: false,
  };

  snapshot.polymarket = {
    bestAsk,
    bestBid: 0.498,
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
    yesTokenId: "token-yes-eng-001",
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

function buildAlertSnapshot(): Snapshot {
  const now = SAMPLE_NOW;
  const txlineProbability = 0.571;
  const bestAsk = 0.499;
  const feeRate = 0.05;
  const txlineTimestamp = now - 5_000;
  const polymarketTimestamp = now - 2_000;

  const grossGap = computeGrossGap(txlineProbability, bestAsk);
  const feePerShare = computeFeePerShare(feeRate, bestAsk);
  const gapAfterFee = computeGapAfterFee(grossGap, feePerShare);

  const snapshot = makeBaseSnapshot();

  snapshot.txline = {
    probability: txlineProbability,
    messageId: "msg-alert-001",
    timestamp: txlineTimestamp,
    receivedAt: now,
    fresh: true,
    serviceLevel: CONFIG.txline.serviceLevel,
    delayed: false,
  };

  snapshot.polymarket = {
    bestAsk,
    bestBid: 0.491,
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
    yesTokenId: "token-yes-eng-001",
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

function buildStaleSnapshot(): Snapshot {
  const now = SAMPLE_NOW;
  const snapshot = makeBaseSnapshot();

  const txlineTimestamp = now - 5 * 60 * 1000;
  const polymarketTimestamp = now - 3 * 60 * 1000;

  snapshot.status = "stale";
  snapshot.txline = {
    probability: 0.548,
    messageId: "msg-stale-001",
    timestamp: txlineTimestamp,
    receivedAt: now,
    fresh: false,
    serviceLevel: CONFIG.txline.serviceLevel,
    delayed: false,
  };

  snapshot.polymarket = {
    bestAsk: 0.506,
    bestBid: 0.498,
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
    yesTokenId: "token-yes-eng-001",
  };

  const grossGap = computeGrossGap(0.548, 0.506);
  const feePerShare = computeFeePerShare(0.05, 0.506);
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

function buildUnavailableSnapshot(): Snapshot {
  const now = SAMPLE_NOW;
  const snapshot = makeBaseSnapshot();

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

function buildErrorSnapshot(): Snapshot {
  const snapshot = makeBaseSnapshot();

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

function buildLoadingSnapshot(): Snapshot {
  const snapshot = makeBaseSnapshot();

  snapshot.status = "loading";
  snapshot.alertKind = "no-alert";

  return snapshot;
}

export class MockDataProvider implements DataProvider {
  private scenario: MockScenario;

  constructor(scenario: MockScenario = "live") {
    this.scenario = scenario;
  }

  setScenario(scenario: MockScenario): void {
    this.scenario = scenario;
  }

  async getSnapshot(): Promise<Snapshot> {
    await simulateLatency();

    switch (this.scenario) {
      case "live":
        return buildLiveSnapshot();
      case "alert":
        return buildAlertSnapshot();
      case "stale":
        return buildStaleSnapshot();
      case "unavailable":
        return buildUnavailableSnapshot();
      case "error":
        return buildErrorSnapshot();
      case "loading":
        return buildLoadingSnapshot();
      default:
        return buildLiveSnapshot();
    }
  }
}

function simulateLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

export const mockSnapshots = {
  live: () => buildLiveSnapshot(),
  alert: () => buildAlertSnapshot(),
  stale: () => buildStaleSnapshot(),
  unavailable: () => buildUnavailableSnapshot(),
  error: () => buildErrorSnapshot(),
  loading: () => buildLoadingSnapshot(),
};