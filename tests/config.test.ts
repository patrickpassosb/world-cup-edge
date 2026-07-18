import { describe, it, expect } from "vitest";
import { CONFIG, MATCH } from "@/lib/config";

describe("CONFIG", () => {
  it("does not contain hardcoded polymarket eventSlug", () => {
    expect((CONFIG.polymarket as Record<string, unknown>).eventSlug).toBeUndefined();
  });
  it("does not contain hardcoded polymarket marketSlug", () => {
    expect((CONFIG.polymarket as Record<string, unknown>).marketSlug).toBeUndefined();
  });
  it("retains txline fixtureId as a numeric default", () => {
    expect(typeof CONFIG.txline.fixtureId).toBe("number");
  });
  it("retains gap threshold and consecutive samples", () => {
    expect(CONFIG.gap.threshold).toBe(0.05);
    expect(CONFIG.gap.consecutiveSamples).toBe(2);
  });
});

describe("MATCH", () => {
  it("identity matches SPEC.md (England vs Argentina, 2026-07-15)", () => {
    expect(MATCH.homeTeam).toBe("England");
    expect(MATCH.awayTeam).toBe("Argentina");
    expect(MATCH.matchDate).toBe("2026-07-15");
  });
});