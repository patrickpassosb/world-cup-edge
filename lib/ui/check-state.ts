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
