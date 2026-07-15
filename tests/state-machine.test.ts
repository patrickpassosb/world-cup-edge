import { describe, it, expect } from "vitest";
import { transition } from "@/lib/gap/state-machine";
import { CONFIG } from "@/lib/config";

const ABOVE = CONFIG.gap.threshold + 0.02;
const BELOW = CONFIG.gap.threshold - 0.02;

describe("state machine transitions", () => {
  it("IDLE -> SAMPLING when gap exceeds threshold", () => {
    const result = transition({
      phase: "IDLE",
      gapAfterFee: ABOVE,
      consecutiveSamples: 0,
      lastAlertTime: null,
      now: 1000,
    });
    expect(result.phase).toBe("SAMPLING");
    expect(result.consecutiveSamples).toBe(1);
    expect(result.active).toBe(false);
  });

  it("SAMPLING -> ALERTING -> COOLDOWN on second consecutive sample", () => {
    const result = transition({
      phase: "SAMPLING",
      gapAfterFee: ABOVE,
      consecutiveSamples: 1,
      lastAlertTime: null,
      now: 2000,
    });
    expect(result.active).toBe(true);
    expect(result.phase).toBe("COOLDOWN");
    expect(result.lastAlertTime).toBe(2000);
  });

  it("COOLDOWN -> IDLE after cooldown period elapses", () => {
    const alertTime = 10000;
    const afterCooldown = alertTime + CONFIG.gap.cooldownMs + 1000;
    const result = transition({
      phase: "COOLDOWN",
      gapAfterFee: ABOVE,
      consecutiveSamples: 0,
      lastAlertTime: alertTime,
      now: afterCooldown,
    });
    expect(result.phase).toBe("SAMPLING");
    expect(result.consecutiveSamples).toBe(1);
  });

  it("COOLDOWN stays in COOLDOWN within period", () => {
    const alertTime = 10000;
    const result = transition({
      phase: "COOLDOWN",
      gapAfterFee: ABOVE,
      consecutiveSamples: 0,
      lastAlertTime: alertTime,
      now: alertTime + 10000,
    });
    expect(result.phase).toBe("COOLDOWN");
    expect(result.active).toBe(false);
    expect(result.cooldownRemainingMs).not.toBeNull();
    expect(result.cooldownRemainingMs! > 0).toBe(true);
  });
});

describe("state machine reset behavior", () => {
  it("SAMPLING -> IDLE when gap falls below threshold", () => {
    const result = transition({
      phase: "SAMPLING",
      gapAfterFee: BELOW,
      consecutiveSamples: 1,
      lastAlertTime: null,
      now: 2000,
    });
    expect(result.phase).toBe("IDLE");
    expect(result.consecutiveSamples).toBe(0);
    expect(result.active).toBe(false);
  });

  it("IDLE stays IDLE when gap is below threshold", () => {
    const result = transition({
      phase: "IDLE",
      gapAfterFee: BELOW,
      consecutiveSamples: 0,
      lastAlertTime: null,
      now: 1000,
    });
    expect(result.phase).toBe("IDLE");
    expect(result.consecutiveSamples).toBe(0);
  });

  it("IDLE stays IDLE when gap is null", () => {
    const result = transition({
      phase: "IDLE",
      gapAfterFee: null,
      consecutiveSamples: 0,
      lastAlertTime: null,
      now: 1000,
    });
    expect(result.phase).toBe("IDLE");
    expect(result.active).toBe(false);
  });

  it("IDLE stays IDLE when gap is NaN", () => {
    const result = transition({
      phase: "IDLE",
      gapAfterFee: NaN,
      consecutiveSamples: 0,
      lastAlertTime: null,
      now: 1000,
    });
    expect(result.phase).toBe("IDLE");
    expect(result.active).toBe(false);
  });
});

describe("state machine full cycle", () => {
  it("completes IDLE -> SAMPLING -> ALERTING -> COOLDOWN -> IDLE", () => {
    let state = transition({
      phase: "IDLE",
      gapAfterFee: ABOVE,
      consecutiveSamples: 0,
      lastAlertTime: null,
      now: 1000,
    });
    expect(state.phase).toBe("SAMPLING");

    state = transition({
      phase: state.phase,
      gapAfterFee: ABOVE,
      consecutiveSamples: state.consecutiveSamples,
      lastAlertTime: state.lastAlertTime,
      now: 2000,
    });
    expect(state.phase).toBe("COOLDOWN");
    expect(state.active).toBe(true);

    state = transition({
      phase: state.phase,
      gapAfterFee: ABOVE,
      consecutiveSamples: state.consecutiveSamples,
      lastAlertTime: state.lastAlertTime,
      now: 2000 + CONFIG.gap.cooldownMs + 1000,
    });
    expect(state.phase).toBe("SAMPLING");
  });
});