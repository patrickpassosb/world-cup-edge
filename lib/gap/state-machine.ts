import { CONFIG } from "@/lib/config";
import type { AlertPhase } from "@/lib/types";

export interface StateMachineInput {
  phase: AlertPhase;
  gapAfterFee: number | null;
  consecutiveSamples: number;
  lastAlertTime: number | null;
  now: number;
}

export interface StateMachineOutput {
  phase: AlertPhase;
  consecutiveSamples: number;
  lastAlertTime: number | null;
  active: boolean;
  cooldownRemainingMs: number | null;
}

const threshold = CONFIG.gap.threshold;
const requiredSamples = CONFIG.gap.consecutiveSamples;
const cooldownMs = CONFIG.gap.cooldownMs;

function qualifies(gapAfterFee: number | null): boolean {
  if (gapAfterFee === null || !Number.isFinite(gapAfterFee)) return false;
  return gapAfterFee > threshold;
}

export function transition(input: StateMachineInput): StateMachineOutput {
  const { now } = input;
  let { phase, consecutiveSamples, lastAlertTime } = input;
  let active = false;

  const cooldownRemaining = computeCooldownRemaining(lastAlertTime, now);

  if (phase === "COOLDOWN") {
    if (cooldownRemaining !== null && cooldownRemaining > 0) {
      return {
        phase: "COOLDOWN",
        consecutiveSamples: 0,
        lastAlertTime,
        active: false,
        cooldownRemainingMs: cooldownRemaining,
      };
    }
    phase = "IDLE";
    consecutiveSamples = 0;
  }

  const qualified = qualifies(input.gapAfterFee);

  if (phase === "IDLE") {
    if (qualified) {
      phase = "SAMPLING";
      consecutiveSamples = 1;
    } else {
      consecutiveSamples = 0;
    }
  } else if (phase === "SAMPLING") {
    if (qualified) {
      consecutiveSamples += 1;
      if (consecutiveSamples >= requiredSamples) {
        phase = "ALERTING";
        active = true;
        lastAlertTime = now;
      }
    } else {
      phase = "IDLE";
      consecutiveSamples = 0;
    }
  }

  if (phase === "ALERTING") {
    phase = "COOLDOWN";
  }

  return {
    phase,
    consecutiveSamples,
    lastAlertTime,
    active,
    cooldownRemainingMs: computeCooldownRemaining(lastAlertTime, now),
  };
}

function computeCooldownRemaining(
  lastAlertTime: number | null,
  now: number,
): number | null {
  if (lastAlertTime === null) return null;
  const remaining = cooldownMs - (now - lastAlertTime);
  return remaining > 0 ? remaining : 0;
}