import type { DataProvider } from "@/lib/data/provider";
import { MockDataProvider, type MockScenario } from "@/lib/data/mock-provider";
import { RealDataProvider } from "@/lib/data/real-provider";

export function createProvider(fixtureId?: number, marketSlug?: string): DataProvider {
  const source = process.env.DATA_SOURCE;

  if (source === "txline" || source === "real") {
    return new RealDataProvider(fixtureId, marketSlug);
  }

  const scenario = (process.env.MOCK_SCENARIO ?? "live") as MockScenario;
  return new MockDataProvider(scenario);
}

export { MockDataProvider, RealDataProvider };