import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createProvider, RealDataProvider, MockDataProvider } from "@/lib/data";

describe("createProvider param routing", () => {
  beforeEach(() => {
    vi.stubEnv("DATA_SOURCE", "real");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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