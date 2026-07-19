import { describe, expect, it } from "vitest";
import {
  CHECK_ROW_COLOR,
  CHECK_ROW_MARK,
  type DisplayState,
  checksEvaluated,
  rowState,
} from "@/lib/ui/check-state";

const EVALUATED_STATES: DisplayState[] = ["live", "no-alert", "alert"];
const UNEVALUATED_STATES: DisplayState[] = ["loading", "stale", "unavailable", "error"];

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
