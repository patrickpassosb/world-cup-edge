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
    const provider = createProvider(18257865, "fifwc-eng-arg-2026-07-15-eng");
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

  it("returns a MockDataProvider when called with undefined args and no DATA_SOURCE", () => {
    const provider = createProvider(undefined, undefined);
    expect(provider).toBeInstanceOf(MockDataProvider);
  });
});