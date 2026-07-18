import { describe, it, expect } from "vitest";
import { evaluateAlert } from "@/lib/gap/engine";
import { CONFIG } from "@/lib/config";
import { mockSnapshots } from "@/lib/data/mock-provider";

const QUALIFYING_GAP = CONFIG.gap.threshold + 0.03;
const NOW = 1752620400000;

const healthyInput = {
  gapAfterFee: QUALIFYING_GAP,
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
  previousPhase: "SAMPLING" as const,
  previousConsecutiveSamples: 1,
  messageId: "msg-safety-1",
  bookHash: "book-safety-1",
  lastAlertTime: null,
  now: NOW,
};

describe("safety: TxLINE stale suppresses alert", () => {
  it("suppresses alert when TxLINE timestamp is 5 minutes old", () => {
    const result = evaluateAlert({
      ...healthyInput,
      txlineFresh: false,
    });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("stale");
  });
});

describe("safety: Polymarket stale suppresses alert", () => {
  it("suppresses alert when Polymarket book timestamp is 5 minutes old", () => {
    const result = evaluateAlert({
      ...healthyInput,
      polymarketFresh: false,
    });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("stale");
  });
});

describe("safety: cross-source skew suppresses alert", () => {
  it("suppresses alert when timestamps are 30 seconds apart", () => {
    const result = evaluateAlert({
      ...healthyInput,
      sourceSkewMs: 30000,
    });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("skew");
  });
});

describe("safety: empty book produces no alert and unavailable status", () => {
  it("suppresses alert when asks/bids are empty", () => {
    const result = evaluateAlert({
      ...healthyInput,
      bookEmpty: true,
    });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("empty");
  });

  it("mock unavailable snapshot has status unavailable and no alert", async () => {
    const snapshot = mockSnapshots.unavailable();
    expect(snapshot.status).toBe("unavailable");
    expect(snapshot.alert.active).toBe(false);
    expect(snapshot.polymarket.bookEmpty).toBe(true);
  });
});

describe("safety: market closed suppresses alert", () => {
  it("suppresses alert when closed=true", () => {
    const result = evaluateAlert({
      ...healthyInput,
      marketClosed: true,
    });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("closed");
  });
});

describe("safety: contract mismatch suppresses alert", () => {
  it("suppresses alert when equivalence fails", () => {
    const result = evaluateAlert({
      ...healthyInput,
      equivalencePassed: false,
    });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("equivalence");
  });
});

describe("safety: level 1 delay suppresses alert", () => {
  it("suppresses alert on service level 1", () => {
    const result = evaluateAlert({
      ...healthyInput,
      serviceLevel: 1,
    });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("level 1");
  });
});

describe("safety: cancelled fixture suppresses alert", () => {
  it("suppresses alert when fixtureGameState is 6 (cancelled)", () => {
    const result = evaluateAlert({
      ...healthyInput,
      fixtureGameState: 6,
    });
    expect(result.alert.active).toBe(false);
    expect(result.alert.suppressedReason).toContain("cancelled");
  });

  it("does not suppress when fixtureGameState is 1 (scheduled)", () => {
    const result = evaluateAlert({
      ...healthyInput,
      fixtureGameState: 1,
    });
    expect(result.alert.active).toBe(true);
  });

  it("does not suppress when fixtureGameState is null (unknown)", () => {
    const result = evaluateAlert({
      ...healthyInput,
      fixtureGameState: null,
    });
    expect(result.alert.active).toBe(true);
  });
});

describe("safety: duplicate message does not re-alert", () => {
  it("does not fire a second alert for the same dedupe key within cooldown", () => {
    const first = evaluateAlert(healthyInput);
    expect(first.alert.active).toBe(true);

    const second = evaluateAlert({
      ...healthyInput,
      previousPhase: "COOLDOWN",
      previousConsecutiveSamples: 0,
      lastAlertTime: NOW,
      now: NOW + 5000,
    });
    expect(second.alert.active).toBe(false);
    expect(second.alert.phase).toBe("COOLDOWN");
  });
});

describe("safety: consecutive samples — first qualifies, second doesn't", () => {
  it("does not alert when first sample qualifies but second does not", () => {
    const first = evaluateAlert({
      ...healthyInput,
      previousPhase: "IDLE",
      previousConsecutiveSamples: 0,
    });
    expect(first.alert.phase).toBe("SAMPLING");
    expect(first.alert.consecutiveSamples).toBe(1);
    expect(first.alert.active).toBe(false);

    const second = evaluateAlert({
      ...healthyInput,
      gapAfterFee: CONFIG.gap.threshold - 0.01,
      previousPhase: "SAMPLING",
      previousConsecutiveSamples: 1,
    });
    expect(second.alert.active).toBe(false);
    expect(second.alert.phase).toBe("IDLE");
    expect(second.alert.consecutiveSamples).toBe(0);
  });
});

describe("safety: cooldown suppresses immediate re-alert", () => {
  it("suppresses alert immediately after one fires", () => {
    const alertTime = NOW;
    const first = evaluateAlert({
      ...healthyInput,
      previousPhase: "SAMPLING",
      previousConsecutiveSamples: 1,
      lastAlertTime: null,
      now: alertTime,
    });
    expect(first.alert.active).toBe(true);

    const second = evaluateAlert({
      ...healthyInput,
      previousPhase: "COOLDOWN",
      previousConsecutiveSamples: 0,
      lastAlertTime: alertTime,
      now: alertTime + 1000,
    });
    expect(second.alert.active).toBe(false);
    expect(second.alert.phase).toBe("COOLDOWN");
    expect(second.alert.cooldownRemainingMs).not.toBeNull();
    expect(second.alert.cooldownRemainingMs! > 0).toBe(true);
  });
});