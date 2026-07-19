import type { Snapshot } from "@/lib/types";

export type CheckState = "pass" | "fail" | "unknown";

export type DisplayState =
  | "loading"
  | "live"
  | "stale"
  | "no-alert"
  | "alert"
  | "unavailable"
  | "error";

export const CHECK_ROW_MARK: Record<CheckState, string> = {
  pass: "✓",
  fail: "×",
  unknown: "—",
};

export const CHECK_ROW_COLOR: Record<CheckState, string> = {
  pass: "text-success",
  fail: "text-error",
  unknown: "text-on-surface-variant",
};

export function checksEvaluated(displayState: DisplayState): boolean {
  return displayState === "live" || displayState === "no-alert" || displayState === "alert";
}

export function rowState(displayState: DisplayState, passed: boolean | undefined): CheckState {
  if (!checksEvaluated(displayState)) return "unknown";
  return passed ? "pass" : "fail";
}

export function rowStateForSnapshot(
  snapshot: Snapshot | null,
  displayState: DisplayState,
  passed: boolean | undefined,
): CheckState {
  if (shouldShowChecks(snapshot, displayState)) {
    return passed ? "pass" : "fail";
  }
  return "unknown";
}

export function hasAnyTruthyCheck(checks: Snapshot["checks"] | undefined): boolean {
  if (!checks) return false;
  return (
    checks.teams ||
    checks.date ||
    checks.rules ||
    checks.token ||
    checks.marketState ||
    checks.fee
  );
}

export function shouldShowChecks(
  snapshot: Snapshot | null,
  displayState: DisplayState,
): boolean {
  if (checksEvaluated(displayState)) return true;
  if (snapshot?.equivalence !== null && snapshot?.equivalence !== undefined) return true;
  if (hasAnyTruthyCheck(snapshot?.checks)) return true;
  return false;
}
