import { describe, it, expect } from "vitest";
import { REPLAY_MATCH, isReplayMode } from "@/lib/data/replay";
import { MockDataProvider } from "@/lib/data/mock-provider";

describe("replay mode detection", () => {
  it("returns true for demo=replay", () => {
    expect(isReplayMode("replay")).toBe(true);
  });

  it("returns false for other values", () => {
    expect(isReplayMode("live")).toBe(false);
    expect(isReplayMode("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isReplayMode(null)).toBe(false);
  });
});

describe("REPLAY_MATCH", () => {
  it("has England vs Argentina fixture data", () => {
    expect(REPLAY_MATCH.homeTeam).toBe("England");
    expect(REPLAY_MATCH.awayTeam).toBe("Argentina");
    expect(REPLAY_MATCH.fixtureId).toBe(18241006);
    expect(REPLAY_MATCH.kickoffUTC).toBe("2026-07-15T19:00:00Z");
  });

  it("has Polymarket market slugs", () => {
    expect(REPLAY_MATCH.hasPolymarketMarket).toBe(true);
    expect(REPLAY_MATCH.polymarketHomeMarketSlug).toContain("eng");
  });

  it("is a valid MatchEntry shape", () => {
    expect(REPLAY_MATCH).toHaveProperty("fixtureId");
    expect(REPLAY_MATCH).toHaveProperty("homeTeam");
    expect(REPLAY_MATCH).toHaveProperty("awayTeam");
    expect(REPLAY_MATCH).toHaveProperty("kickoffUTC");
    expect(REPLAY_MATCH).toHaveProperty("competition");
    expect(REPLAY_MATCH).toHaveProperty("gameState");
    expect(REPLAY_MATCH).toHaveProperty("hasPolymarketMarket");
  });
});

describe("replay alert scenario", () => {
  it("produces an alert snapshot in replay mode", async () => {
    const provider = new MockDataProvider("alert", "home");
    const snapshot = await provider.getSnapshot();
    expect(snapshot.alert.active).toBe(true);
    expect(snapshot.gap.gapAfterFee).not.toBeNull();
    expect(snapshot.gap.gapAfterFee!).toBeGreaterThan(snapshot.gap.threshold);
  });

  it("produces live status in alert scenario", async () => {
    const provider = new MockDataProvider("alert", "home");
    const snapshot = await provider.getSnapshot();
    expect(snapshot.status).toBe("live");
  });
});