import { describe, it, expect } from "vitest";
import {
  computeGrossGap,
  computeFeePerShare,
  computeGapAfterFee,
  evaluateAlert,
  buildDedupeKey,
  isDuplicate,
} from "@/lib/gap/engine";
import { transition } from "@/lib/gap/state-machine";
import { CONFIG } from "@/lib/config";

describe("computeGrossGap", () => {
  it("returns the difference between txline probability and best ask", () => {
    expect(computeGrossGap(0.548, 0.506)).toBeCloseTo(0.042, 6);
  });

  it("returns null when txline probability is null", () => {
    expect(computeGrossGap(null, 0.506)).toBeNull();
  });

  it("returns null when best ask is null", () => {
    expect(computeGrossGap(0.548, null)).toBeNull();
  });

  it("returns null when both inputs are null", () => {
    expect(computeGrossGap(null, null)).toBeNull();
  });

  it("returns null when inputs are NaN", () => {
    expect(computeGrossGap(NaN, 0.506)).toBeNull();
    expect(computeGrossGap(0.548, NaN)).toBeNull();
  });

  it("returns negative when txline is below best ask", () => {
    expect(computeGrossGap(0.4, 0.5)).toBeCloseTo(-0.1, 6);
  });
});

describe("computeFeePerShare", () => {
  it("calculates feeRate * bestAsk * (1 - bestAsk)", () => {
    expect(computeFeePerShare(0.05, 0.5)).toBeCloseTo(0.05 * 0.5 * 0.5, 6);
  });

  it("returns zero when best ask is 0", () => {
    expect(computeFeePerShare(0.05, 0)).toBeCloseTo(0, 6);
  });

  it("returns zero when best ask is 1", () => {
    expect(computeFeePerShare(0.05, 1)).toBeCloseTo(0, 6);
  });

  it("returns null when fee rate is null", () => {
    expect(computeFeePerShare(null, 0.5)).toBeNull();
  });

  it("returns null when best ask is null", () => {
    expect(computeFeePerShare(0.05, null)).toBeNull();
  });
});

describe("computeGapAfterFee", () => {
  it("subtracts fee from gross gap", () => {
    expect(computeGapAfterFee(0.05, 0.0125)).toBeCloseTo(0.0375, 6);
  });

  it("returns null when either input is null", () => {
    expect(computeGapAfterFee(null, 0.01)).toBeNull();
    expect(computeGapAfterFee(0.05, null)).toBeNull();
  });
});

describe("evaluateAlert threshold logic", () => {
  const baseInput = {
    txlineFresh: true,
    polymarketFresh: true,
    sourceSkewMs: 1000,
    maxSourceSkewMs: CONFIG.gap.maxSourceSkewMs,
    marketActive: true,
    marketClosed: false,
    acceptingOrders: true,
    bookEmpty: false,
    equivalencePassed: true,
    serviceLevel: 12,
    fixtureGameState: 1,
    previousPhase: "IDLE" as const,
    previousConsecutiveSamples: 0,
    messageId: "msg-1",
    bookHash: "book-1",
    lastAlertTime: null,
    now: 1000000,
  };

  it("does not alert when gap equals threshold (strictly greater)", () => {
    const result = evaluateAlert({
      ...baseInput,
      gapAfterFee: CONFIG.gap.threshold,
    });
    expect(result.alert.active).toBe(false);
  });

  it("does not alert when gap is below threshold", () => {
    const result = evaluateAlert({
      ...baseInput,
      gapAfterFee: CONFIG.gap.threshold - 0.001,
    });
    expect(result.alert.active).toBe(false);
  });

  it("enters sampling when gap exceeds threshold", () => {
    const result = evaluateAlert({
      ...baseInput,
      gapAfterFee: CONFIG.gap.threshold + 0.01,
    });
    expect(result.alert.phase).toBe("SAMPLING");
    expect(result.alert.consecutiveSamples).toBe(1);
    expect(result.alert.active).toBe(false);
  });
});

describe("evaluateAlert fail-closed", () => {
  const baseInput = {
    gapAfterFee: 0.1,
    txlineFresh: true,
    polymarketFresh: true,
    sourceSkewMs: 1000,
    maxSourceSkewMs: CONFIG.gap.maxSourceSkewMs,
    marketActive: true,
    marketClosed: false,
    acceptingOrders: true,
    bookEmpty: false,
    equivalencePassed: true,
    serviceLevel: 12,
    fixtureGameState: 1,
    previousPhase: "IDLE" as const,
    previousConsecutiveSamples: 0,
    messageId: "msg-1",
    bookHash: "book-1",
    lastAlertTime: null,
    now: 1000000,
  };

  it("suppresses alert when gap is null", () => {
    const result = evaluateAlert({ ...baseInput, gapAfterFee: null });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).not.toBeNull();
  });

  it("suppresses alert when gap is NaN", () => {
    const result = evaluateAlert({ ...baseInput, gapAfterFee: NaN });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).not.toBeNull();
  });

  it("suppresses alert when txline is stale", () => {
    const result = evaluateAlert({ ...baseInput, txlineFresh: false });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("stale");
  });

  it("suppresses alert when polymarket is stale", () => {
    const result = evaluateAlert({ ...baseInput, polymarketFresh: false });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("stale");
  });

  it("suppresses alert when source skew exceeds max", () => {
    const result = evaluateAlert({
      ...baseInput,
      sourceSkewMs: CONFIG.gap.maxSourceSkewMs + 1000,
    });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("skew");
  });

  it("suppresses alert when market is closed", () => {
    const result = evaluateAlert({ ...baseInput, marketClosed: true });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("closed");
  });

  it("suppresses alert when market is not active", () => {
    const result = evaluateAlert({ ...baseInput, marketActive: false });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("active");
  });

  it("suppresses alert when not accepting orders", () => {
    const result = evaluateAlert({ ...baseInput, acceptingOrders: false });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("orders");
  });

  it("suppresses alert when book is empty", () => {
    const result = evaluateAlert({ ...baseInput, bookEmpty: true });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("empty");
  });

  it("suppresses alert when equivalence fails", () => {
    const result = evaluateAlert({ ...baseInput, equivalencePassed: false });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("equivalence");
  });

  it("suppresses alert on service level 1", () => {
    const result = evaluateAlert({ ...baseInput, serviceLevel: 1 });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("level 1");
  });
});

describe("consecutive samples and cooldown via state machine", () => {
  it("requires 2 consecutive samples to fire alert", () => {
    let result = transition({
      phase: "IDLE",
      gapAfterFee: 0.1,
      consecutiveSamples: 0,
      lastAlertTime: null,
      now: 1000,
    });
    expect(result.phase).toBe("SAMPLING");
    expect(result.consecutiveSamples).toBe(1);
    expect(result.active).toBe(false);

    result = transition({
      phase: result.phase,
      gapAfterFee: 0.1,
      consecutiveSamples: result.consecutiveSamples,
      lastAlertTime: result.lastAlertTime,
      now: 2000,
    });
    expect(result.active).toBe(true);
    expect(result.phase).toBe("COOLDOWN");
  });

  it("resets to IDLE when gap falls below threshold", () => {
    let result = transition({
      phase: "IDLE",
      gapAfterFee: 0.1,
      consecutiveSamples: 0,
      lastAlertTime: null,
      now: 1000,
    });
    expect(result.phase).toBe("SAMPLING");

    result = transition({
      phase: result.phase,
      gapAfterFee: 0.01,
      consecutiveSamples: result.consecutiveSamples,
      lastAlertTime: result.lastAlertTime,
      now: 2000,
    });
    expect(result.phase).toBe("IDLE");
    expect(result.consecutiveSamples).toBe(0);
    expect(result.active).toBe(false);
  });

  it("enforces cooldown period", () => {
    const alertTime = 10000;
    let result = transition({
      phase: "SAMPLING",
      gapAfterFee: 0.1,
      consecutiveSamples: 1,
      lastAlertTime: null,
      now: alertTime,
    });
    expect(result.active).toBe(true);
    expect(result.lastAlertTime).toBe(alertTime);

    const duringCooldown = alertTime + 10000;
    result = transition({
      phase: "COOLDOWN",
      gapAfterFee: 0.1,
      consecutiveSamples: 0,
      lastAlertTime: alertTime,
      now: duringCooldown,
    });
    expect(result.phase).toBe("COOLDOWN");
    expect(result.active).toBe(false);
    expect(result.cooldownRemainingMs).not.toBeNull();
    expect(result.cooldownRemainingMs! > 0).toBe(true);
  });

  it("exits cooldown after period elapses", () => {
    const alertTime = 10000;
    const afterCooldown = alertTime + CONFIG.gap.cooldownMs + 1000;

    const result = transition({
      phase: "COOLDOWN",
      gapAfterFee: 0.1,
      consecutiveSamples: 0,
      lastAlertTime: alertTime,
      now: afterCooldown,
    });
    expect(result.phase).not.toBe("COOLDOWN");
  });
});

describe("deduplication", () => {
  it("builds a dedupe key from messageId and bookHash", () => {
    expect(buildDedupeKey("msg-1", "book-1")).toBe("msg-1::book-1");
  });

  it("returns null when both are null", () => {
    expect(buildDedupeKey(null, null)).toBeNull();
  });

  it("detects duplicate keys", () => {
    expect(isDuplicate("msg-1::book-1", "msg-1::book-1")).toBe(true);
    expect(isDuplicate("msg-1::book-1", "msg-2::book-1")).toBe(false);
    expect(isDuplicate(null, "msg-1::book-1")).toBe(false);
  });
});