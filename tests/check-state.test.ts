import { describe, expect, it } from "vitest";
import {
  CHECK_ROW_COLOR,
  CHECK_ROW_MARK,
  type DisplayState,
  checksEvaluated,
  hasAnyTruthyCheck,
  rowState,
  rowStateForSnapshot,
  shouldShowChecks,
} from "@/lib/ui/check-state";
import type { Snapshot } from "@/lib/types";

const EVALUATED_STATES: DisplayState[] = ["live", "no-alert", "alert"];
const UNEVALUATED_STATES: DisplayState[] = ["loading", "stale", "unavailable", "error"];

const ALL_FALSE_CHECKS = {
  teams: false,
  date: false,
  rules: false,
  token: false,
  marketState: false,
  fee: false,
};

const ALL_TRUE_CHECKS = {
  teams: true,
  date: true,
  rules: true,
  token: true,
  marketState: true,
  fee: true,
};

function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    status: "live",
    alertKind: "no-alert",
    match: {
      name: "A vs B",
      date: "2026-07-19",
      kickoffUTC: "2026-07-19T19:00:00.000Z",
      rules: "regulation-time 1X2",
      outcome: "home",
      outcomeLabel: "A",
      homeTeam: "A",
      awayTeam: "B",
    },
    txline: {
      probability: 0.5,
      messageId: "m1",
      timestamp: 0,
      receivedAt: 0,
      fresh: true,
      serviceLevel: 0,
      delayed: false,
    },
    polymarket: {
      bestAsk: 0.5,
      bestBid: 0.5,
      askSize: 0,
      feeRate: 0,
      feeExponent: 0,
      bookSeq: 0,
      timestamp: 0,
      receivedAt: 0,
      fresh: true,
      marketActive: true,
      marketClosed: false,
      acceptingOrders: true,
      bookEmpty: false,
      yesTokenId: "t1",
      marketQuestion: "q",
    },
    gap: { grossGap: 0, feePerShare: 0, gapAfterFee: 0, threshold: 0.05 },
    alert: {
      active: false,
      reason: "",
      consecutiveSamples: 0,
      suppressedReason: null,
      phase: "IDLE",
      lastAlertTime: null,
      cooldownRemainingMs: null,
      dedupeKey: null,
    },
    checks: ALL_TRUE_CHECKS,
    equivalence: { passed: true, checks: { teams: true, date: true, rules: true, token: true, marketState: true }, failures: [] },
    sourceSkewMs: 0,
    receivedAt: 0,
    errorMessage: null,
    ...overrides,
  };
}

describe("check-state", () => {
  describe("checksEvaluated", () => {
    it.each(EVALUATED_STATES)("returns true for %s", (state) => {
      expect(checksEvaluated(state)).toBe(true);
    });

    it.each(UNEVALUATED_STATES)("returns false for %s", (state) => {
      expect(checksEvaluated(state)).toBe(false);
    });
  });

  describe("rowState", () => {
    it.each(UNEVALUATED_STATES)(
      "returns 'unknown' for %s regardless of passed value",
      (state) => {
        expect(rowState(state, true)).toBe("unknown");
        expect(rowState(state, false)).toBe("unknown");
        expect(rowState(state, undefined)).toBe("unknown");
      },
    );

    it.each(EVALUATED_STATES)("returns 'pass' when %s and passed=true", (state) => {
      expect(rowState(state, true)).toBe("pass");
    });

    it.each(EVALUATED_STATES)("returns 'fail' when %s and passed=false", (state) => {
      expect(rowState(state, false)).toBe("fail");
    });

    it.each(EVALUATED_STATES)("returns 'fail' when %s and passed=undefined", (state) => {
      expect(rowState(state, undefined)).toBe("fail");
    });
  });

  describe("hasAnyTruthyCheck", () => {
    it("returns false for an undefined checks object", () => {
      expect(hasAnyTruthyCheck(undefined)).toBe(false);
    });

    it("returns false when every check is false", () => {
      expect(hasAnyTruthyCheck(ALL_FALSE_CHECKS)).toBe(false);
    });

    it("returns true when at least one check is true", () => {
      expect(hasAnyTruthyCheck({ ...ALL_FALSE_CHECKS, fee: true })).toBe(true);
    });

    it("returns true when all checks are true", () => {
      expect(hasAnyTruthyCheck(ALL_TRUE_CHECKS)).toBe(true);
    });
  });

  describe("shouldShowChecks", () => {
    it.each(EVALUATED_STATES)(
      "returns true for %s even when snapshot is null",
      (state) => {
        expect(shouldShowChecks(null, state)).toBe(true);
      },
    );

    it.each(UNEVALUATED_STATES)(
      "returns false for %s when snapshot is null",
      (state) => {
        expect(shouldShowChecks(null, state)).toBe(false);
      },
    );

    it.each(UNEVALUATED_STATES)(
      "returns true for %s when equivalence is populated (real failure case)",
      (state) => {
        const snap = makeSnapshot({ status: state as Snapshot["status"], equivalence: { passed: false, checks: { teams: true, date: true, rules: false, token: true, marketState: true }, failures: ["rules"] } });
        expect(shouldShowChecks(snap, state)).toBe(true);
      },
    );

    it.each(UNEVALUATED_STATES)(
      "returns true for %s when any check is truthy even with null equivalence (partial-failure case)",
      (state) => {
        const snap = makeSnapshot({ status: state as Snapshot["status"], equivalence: null, checks: { ...ALL_FALSE_CHECKS, marketState: true, fee: true } });
        expect(shouldShowChecks(snap, state)).toBe(true);
      },
    );

    it.each(UNEVALUATED_STATES)(
      "returns false for %s when equivalence is null and all checks are false (genuinely unevaluated)",
      (state) => {
        const snap = makeSnapshot({ status: state as Snapshot["status"], equivalence: null, checks: ALL_FALSE_CHECKS });
        expect(shouldShowChecks(snap, state)).toBe(false);
      },
    );
  });

  describe("rowStateForSnapshot", () => {
    it("returns 'pass' when shouldShowChecks is true and passed=true", () => {
      const snap = makeSnapshot();
      expect(rowStateForSnapshot(snap, "live", true)).toBe("pass");
    });

    it("returns 'fail' when shouldShowChecks is true and passed=false", () => {
      const snap = makeSnapshot();
      expect(rowStateForSnapshot(snap, "live", false)).toBe("fail");
    });

    it("returns 'pass' for unavailable snapshot with populated equivalence and passed=true (the bot's case)", () => {
      const snap = makeSnapshot({
        status: "unavailable",
        equivalence: { passed: false, checks: { teams: true, date: true, rules: false, token: true, marketState: true }, failures: ["rules"] },
        checks: { ...ALL_TRUE_CHECKS, rules: false },
      });
      expect(rowStateForSnapshot(snap, "unavailable", true)).toBe("pass");
    });

    it("returns 'fail' for unavailable snapshot with populated equivalence and passed=false (the bot's case)", () => {
      const snap = makeSnapshot({
        status: "unavailable",
        equivalence: { passed: false, checks: { teams: true, date: true, rules: false, token: true, marketState: true }, failures: ["rules"] },
        checks: { ...ALL_TRUE_CHECKS, rules: false },
      });
      expect(rowStateForSnapshot(snap, "unavailable", false)).toBe("fail");
    });

    it("returns 'unknown' for unavailable snapshot with null equivalence and all false checks (truly unevaluated)", () => {
      const snap = makeSnapshot({ status: "unavailable", equivalence: null, checks: ALL_FALSE_CHECKS });
      expect(rowStateForSnapshot(snap, "unavailable", true)).toBe("unknown");
      expect(rowStateForSnapshot(snap, "unavailable", false)).toBe("unknown");
    });

    it("returns 'pass' for stale snapshot with populated equivalence (data old but contract valid)", () => {
      const snap = makeSnapshot();
      expect(rowStateForSnapshot(snap, "stale", true)).toBe("pass");
    });
  });

  describe("CHECK_ROW_MARK", () => {
    it("uses the expected glyph for each state", () => {
      expect(CHECK_ROW_MARK.pass).toBe("✓");
      expect(CHECK_ROW_MARK.fail).toBe("×");
      expect(CHECK_ROW_MARK.unknown).toBe("—");
    });
  });

  describe("CHECK_ROW_COLOR", () => {
    it("uses a green-tones class for pass", () => {
      expect(CHECK_ROW_COLOR.pass).toBe("text-success");
    });

    it("uses an error class for fail", () => {
      expect(CHECK_ROW_COLOR.fail).toBe("text-error");
    });

    it("uses a muted class for unknown so the dash does not read as failure", () => {
      expect(CHECK_ROW_COLOR.unknown).toBe("text-on-surface-variant");
    });
  });
});
