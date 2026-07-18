import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createProvider, clearProviderCache, RealDataProvider, MockDataProvider } from "@/lib/data";

describe("createProvider param routing", () => {
  beforeEach(() => {
    vi.stubEnv("DATA_SOURCE", "real");
    clearProviderCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearProviderCache();
  });

  it("returns a RealDataProvider when DATA_SOURCE=real", () => {
    const provider = createProvider();
    expect(provider).toBeInstanceOf(RealDataProvider);
  });

  it("returns a RealDataProvider when fixtureId and marketSlug are provided", () => {
    const provider = createProvider({
      fixtureId: 18257865,
      homeMarketSlug: "fifwc-fra-eng-2026-07-18-fra",
    });
    expect(provider).toBeInstanceOf(RealDataProvider);
  });

  it("returns a RealDataProvider with outcome param", () => {
    const provider = createProvider({
      fixtureId: 18257865,
      homeMarketSlug: "fifwc-fra-eng-2026-07-18-fra",
      outcome: "away",
      homeTeam: "France",
      awayTeam: "England",
      kickoffISO: "2026-07-18T21:00:00.000Z",
    });
    expect(provider).toBeInstanceOf(RealDataProvider);
  });

  it("returns the same RealDataProvider instance for the same key (state persistence)", () => {
    const a = createProvider({
      fixtureId: 18257865,
      homeMarketSlug: "fifwc-fra-eng-2026-07-18-fra",
    });
    const b = createProvider({
      fixtureId: 18257865,
      homeMarketSlug: "fifwc-fra-eng-2026-07-18-fra",
    });
    expect(a).toBe(b);
  });

  it("returns different instances for different fixture IDs", () => {
    const a = createProvider({ fixtureId: 1, homeMarketSlug: "slug-a" });
    const b = createProvider({ fixtureId: 2, homeMarketSlug: "slug-b" });
    expect(a).not.toBe(b);
  });

  it("returns different instances for different outcomes on the same fixture", () => {
    const a = createProvider({ fixtureId: 1, homeMarketSlug: "slug-a", outcome: "home" });
    const b = createProvider({ fixtureId: 1, homeMarketSlug: "slug-a", outcome: "away" });
    expect(a).not.toBe(b);
  });
});

describe("createProvider backward compat (mock)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a MockDataProvider when DATA_SOURCE is unset", () => {
    const provider = createProvider();
    expect(provider).toBeInstanceOf(MockDataProvider);
  });

  it("returns a MockDataProvider when called with empty args and no DATA_SOURCE", () => {
    const provider = createProvider({});
    expect(provider).toBeInstanceOf(MockDataProvider);
  });

  it("returns a MockDataProvider with outcome param", () => {
    const provider = createProvider({ outcome: "draw" });
    expect(provider).toBeInstanceOf(MockDataProvider);
  });
});