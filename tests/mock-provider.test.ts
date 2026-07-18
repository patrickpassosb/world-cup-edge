import { describe, it, expect } from "vitest";
import { MockDataProvider, mockSnapshots } from "@/lib/data/mock-provider";

describe("MockDataProvider live scenario", () => {
  it("returns a snapshot with live status and correct shape", async () => {
    const provider = new MockDataProvider("live");
    const snapshot = await provider.getSnapshot();

    expect(snapshot.status).toBe("live");
    expect(snapshot.match.name).toBe("England vs Argentina");
    expect(snapshot.match.date).toBe("2026-07-15");
    expect(snapshot.match.kickoffUTC).toBe("2026-07-15T19:00:00Z");
    expect(snapshot.match.rules).toBe("regulation-time 1X2");
    expect(snapshot.match.outcome).toBe("home");
    expect(snapshot.match.outcomeLabel).toBe("England");
    expect(snapshot.match.homeTeam).toBe("England");
    expect(snapshot.match.awayTeam).toBe("Argentina");

    expect(snapshot.txline.probability).not.toBeNull();
    expect(typeof snapshot.txline.probability).toBe("number");
    expect(snapshot.txline.fresh).toBe(true);
    expect(snapshot.txline.messageId).not.toBeNull();

    expect(snapshot.polymarket.bestAsk).not.toBeNull();
    expect(typeof snapshot.polymarket.bestAsk).toBe("number");
    expect(snapshot.polymarket.feeRate).not.toBeNull();
    expect(snapshot.polymarket.fresh).toBe(true);
    expect(snapshot.polymarket.marketActive).toBe(true);

    expect(snapshot.gap.grossGap).not.toBeNull();
    expect(snapshot.gap.feePerShare).not.toBeNull();
    expect(snapshot.gap.gapAfterFee).not.toBeNull();
    expect(snapshot.gap.threshold).toBe(0.05);

    expect(snapshot.checks).toBeDefined();
    expect(snapshot.equivalence).not.toBeNull();
    expect(snapshot.checks.teams).toBe(snapshot.equivalence!.checks.teams);
    expect(snapshot.checks.date).toBe(snapshot.equivalence!.checks.date);
    expect(snapshot.checks.rules).toBe(snapshot.equivalence!.checks.rules);
    expect(snapshot.checks.token).toBe(snapshot.equivalence!.checks.token);
    expect(snapshot.checks.marketState).toBe(snapshot.equivalence!.checks.marketState);
    expect(snapshot.checks.fee).toBe(true);
  });

  it("returns no-alert when gap is below threshold", async () => {
    const snapshot = mockSnapshots.live();
    expect(snapshot.alertKind).toBe("no-alert");
    expect(snapshot.alert.active).toBe(false);
  });

  it("supports outcome switching to away", async () => {
    const provider = new MockDataProvider("live", "away");
    const snapshot = await provider.getSnapshot();
    expect(snapshot.match.outcome).toBe("away");
    expect(snapshot.match.outcomeLabel).toBe("Argentina");
  });

  it("supports outcome switching to draw", async () => {
    const provider = new MockDataProvider("live", "draw");
    const snapshot = await provider.getSnapshot();
    expect(snapshot.match.outcome).toBe("draw");
    expect(snapshot.match.outcomeLabel).toBe("Draw");
  });

  it("can switch outcome at runtime", async () => {
    const provider = new MockDataProvider("live", "home");
    let snapshot = await provider.getSnapshot();
    expect(snapshot.match.outcome).toBe("home");

    provider.setOutcome("away");
    snapshot = await provider.getSnapshot();
    expect(snapshot.match.outcome).toBe("away");
    expect(snapshot.match.outcomeLabel).toBe("Argentina");
  });
});

describe("MockDataProvider alert scenario", () => {
  it("returns an alert when gap exceeds threshold", async () => {
    const provider = new MockDataProvider("alert");
    const snapshot = await provider.getSnapshot();

    expect(snapshot.status).toBe("live");
    expect(snapshot.gap.gapAfterFee).not.toBeNull();
    expect(snapshot.gap.gapAfterFee! > snapshot.gap.threshold).toBe(true);
  });
});

describe("MockDataProvider stale scenario", () => {
  it("returns stale status with last good values", async () => {
    const provider = new MockDataProvider("stale");
    const snapshot = await provider.getSnapshot();

    expect(snapshot.status).toBe("stale");
    expect(snapshot.txline.fresh).toBe(false);
    expect(snapshot.polymarket.fresh).toBe(false);
    expect(snapshot.alert.active).toBe(false);
    expect(snapshot.alert.suppressedReason).not.toBeNull();
  });
});

describe("MockDataProvider unavailable scenario", () => {
  it("returns unavailable status with market closed", async () => {
    const provider = new MockDataProvider("unavailable");
    const snapshot = await provider.getSnapshot();

    expect(snapshot.status).toBe("unavailable");
    expect(snapshot.polymarket.marketClosed).toBe(true);
    expect(snapshot.polymarket.bookEmpty).toBe(true);
    expect(snapshot.alert.active).toBe(false);
    expect(snapshot.errorMessage).not.toBeNull();
  });
});

describe("MockDataProvider error scenario", () => {
  it("returns error status with error message", async () => {
    const provider = new MockDataProvider("error");
    const snapshot = await provider.getSnapshot();

    expect(snapshot.status).toBe("error");
    expect(snapshot.errorMessage).not.toBeNull();
    expect(snapshot.alert.active).toBe(false);
  });
});

describe("MockDataProvider loading scenario", () => {
  it("returns loading status", async () => {
    const provider = new MockDataProvider("loading");
    const snapshot = await provider.getSnapshot();

    expect(snapshot.status).toBe("loading");
    expect(snapshot.alertKind).toBe("no-alert");
  });
});

describe("MockDataProvider scenario switching", () => {
  it("can switch scenarios at runtime", async () => {
    const provider = new MockDataProvider("live");
    let snapshot = await provider.getSnapshot();
    expect(snapshot.status).toBe("live");

    provider.setScenario("error");
    snapshot = await provider.getSnapshot();
    expect(snapshot.status).toBe("error");
  });
});

describe("mockSnapshots helper functions", () => {
  it("each helper returns the expected status", () => {
    expect(mockSnapshots.live().status).toBe("live");
    expect(mockSnapshots.alert().status).toBe("live");
    expect(mockSnapshots.stale().status).toBe("stale");
    expect(mockSnapshots.unavailable().status).toBe("unavailable");
    expect(mockSnapshots.error().status).toBe("error");
    expect(mockSnapshots.loading().status).toBe("loading");
  });

  it("alert helper produces a gap exceeding threshold", () => {
    const snapshot = mockSnapshots.alert();
    expect(snapshot.gap.gapAfterFee).not.toBeNull();
    expect(snapshot.gap.gapAfterFee! > snapshot.gap.threshold).toBe(true);
  });
});