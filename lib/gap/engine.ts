import { CONFIG } from "@/lib/config";
import type { AlertState, GapResult } from "@/lib/types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function computeGrossGap(
  txlineProbability: number | null,
  bestAsk: number | null,
): number | null {
  if (!isFiniteNumber(txlineProbability) || !isFiniteNumber(bestAsk)) {
    return null;
  }
  return txlineProbability - bestAsk;
}

export function computeFeePerShare(
  feeRate: number | null,
  bestAsk: number | null,
): number | null {
  if (!isFiniteNumber(feeRate) || !isFiniteNumber(bestAsk)) {
    return null;
  }
  return feeRate * bestAsk * (1 - bestAsk);
}

export function computeGapAfterFee(
  grossGap: number | null,
  feePerShare: number | null,
): number | null {
  if (!isFiniteNumber(grossGap) || !isFiniteNumber(feePerShare)) {
    return null;
  }
  return grossGap - feePerShare;
}

export interface AlertInput {
  gapAfterFee: number | null;
  txlineFresh: boolean;
  polymarketFresh: boolean;
  sourceSkewMs: number | null;
  maxSourceSkewMs: number;
  marketActive: boolean;
  marketClosed: boolean;
  acceptingOrders: boolean;
  bookEmpty: boolean;
  equivalencePassed: boolean;
  serviceLevel: number;
  fixtureGameState: number | null;
  previousPhase: AlertPhase;
  previousConsecutiveSamples: number;
  messageId: string | null;
  bookHash: string | null;
  lastAlertTime: number | null;
  now: number;
}

export type AlertPhase = "IDLE" | "SAMPLING" | "ALERTING" | "COOLDOWN";

function exceedsThreshold(gapAfterFee: number, threshold: number): boolean {
  return gapAfterFee > threshold;
}

export function evaluateAlert(input: AlertInput): {
  gapResult: Pick<GapResult, "threshold">;
  alert: AlertState;
} {
  const threshold = CONFIG.gap.threshold;
  const now = input.now;

  let suppressedReason: string | null = null;

  if (input.serviceLevel === 1) {
    suppressedReason = "TxLINE service level 1 (60-second delayed). Alerts suppressed.";
  } else if (input.fixtureGameState === 6) {
    suppressedReason = "Fixture is cancelled (GameState 6). Alerts suppressed.";
  } else if (!input.equivalencePassed) {
    suppressedReason = "Contract equivalence checks failed. Alerts suppressed.";
  } else if (!input.txlineFresh) {
    suppressedReason = "TxLINE data is stale. Alerts suppressed.";
  } else if (!input.polymarketFresh) {
    suppressedReason = "Polymarket data is stale. Alerts suppressed.";
  } else if (input.sourceSkewMs !== null && input.sourceSkewMs > input.maxSourceSkewMs) {
    suppressedReason = `Cross-source skew ${input.sourceSkewMs}ms exceeds ${input.maxSourceSkewMs}ms. Alerts suppressed.`;
  } else if (input.marketClosed) {
    suppressedReason = "Polymarket market is closed. Alerts suppressed.";
  } else if (!input.marketActive) {
    suppressedReason = "Polymarket market is not active. Alerts suppressed.";
  } else if (!input.acceptingOrders) {
    suppressedReason = "Polymarket market is not accepting orders. Alerts suppressed.";
  } else if (input.bookEmpty) {
    suppressedReason = "Polymarket book is empty. Alerts suppressed.";
  } else if (input.gapAfterFee === null || !Number.isFinite(input.gapAfterFee)) {
    suppressedReason = "Gap value is missing or invalid. Alerts suppressed.";
  }

  if (suppressedReason !== null) {
    return {
      gapResult: { threshold },
      alert: {
        active: false,
        reason: suppressedReason,
        consecutiveSamples: 0,
        suppressedReason,
        phase: "IDLE",
        lastAlertTime: input.lastAlertTime,
        cooldownRemainingMs: computeCooldownRemaining(input.lastAlertTime, now),
        dedupeKey: buildDedupeKey(input.messageId, input.bookHash),
      },
    };
  }

  const gapQualifies = exceedsThreshold(input.gapAfterFee as number, threshold);
  const dedupeKey = buildDedupeKey(input.messageId, input.bookHash);
  const cooldownRemaining = computeCooldownRemaining(input.lastAlertTime, now);

  let phase: AlertPhase = input.previousPhase;
  let consecutiveSamples = input.previousConsecutiveSamples;
  let active = false;
  let lastAlertTime = input.lastAlertTime;
  let reason = "";

  if (phase === "COOLDOWN") {
    if (cooldownRemaining !== null && cooldownRemaining > 0) {
      phase = "COOLDOWN";
      reason = `In cooldown. ${Math.ceil(cooldownRemaining / 1000)}s remaining.`;
      consecutiveSamples = 0;
    } else {
      phase = "IDLE";
      consecutiveSamples = 0;
    }
  }

  if (phase === "IDLE") {
    if (gapQualifies) {
      phase = "SAMPLING";
      consecutiveSamples = 1;
      reason = `Gap ${formatPp(input.gapAfterFee as number)}pp exceeds threshold ${formatPp(threshold)}pp. Sampling (1/${CONFIG.gap.consecutiveSamples}).`;
    } else {
      phase = "IDLE";
      consecutiveSamples = 0;
      reason = `Gap ${input.gapAfterFee !== null ? formatPp(input.gapAfterFee) : "n/a"}pp does not exceed threshold ${formatPp(threshold)}pp.`;
    }
  } else if (phase === "SAMPLING") {
    if (gapQualifies) {
      consecutiveSamples += 1;
      if (consecutiveSamples >= CONFIG.gap.consecutiveSamples) {
        phase = "ALERTING";
        active = true;
        lastAlertTime = now;
        reason = `Gap ${formatPp(input.gapAfterFee as number)}pp exceeds threshold ${formatPp(threshold)}pp for ${consecutiveSamples} consecutive samples.`;
      } else {
        reason = `Gap ${formatPp(input.gapAfterFee as number)}pp exceeds threshold. Sampling (${consecutiveSamples}/${CONFIG.gap.consecutiveSamples}).`;
      }
    } else {
      phase = "IDLE";
      consecutiveSamples = 0;
      reason = `Gap dropped below threshold. Reset.`;
    }
  }

  if (phase === "ALERTING") {
    phase = "COOLDOWN";
  }

  return {
    gapResult: { threshold },
    alert: {
      active,
      reason,
      consecutiveSamples,
      suppressedReason: null,
      phase,
      lastAlertTime,
      cooldownRemainingMs: cooldownRemaining,
      dedupeKey,
    },
  };
}

function computeCooldownRemaining(
  lastAlertTime: number | null,
  now: number,
): number | null {
  if (lastAlertTime === null) return null;
  const elapsed = now - lastAlertTime;
  const remaining = CONFIG.gap.cooldownMs - elapsed;
  return remaining > 0 ? remaining : 0;
}

export function buildDedupeKey(
  messageId: string | null,
  bookHash: string | null,
): string | null {
  if (messageId === null && bookHash === null) return null;
  return `${messageId ?? "none"}::${bookHash ?? "none"}`;
}

export function isDuplicate(
  currentKey: string | null,
  previousKey: string | null,
): boolean {
  if (currentKey === null || previousKey === null) return false;
  return currentKey === previousKey;
}

function formatPp(value: number): string {
  return (value * 100).toFixed(1);
}