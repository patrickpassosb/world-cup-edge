import type { DataProvider } from "@/lib/data/provider";
import { MockDataProvider, type MockScenario } from "@/lib/data/mock-provider";
import { TxLineDataProvider } from "@/lib/data/txline-provider";

export function createProvider(): DataProvider {
  const source = process.env.DATA_SOURCE;

  if (source === "txline") {
    return new TxLineDataProvider() as unknown as DataProvider;
  }

  const scenario = (process.env.MOCK_SCENARIO ?? "live") as MockScenario;
  return new MockDataProvider(scenario);
}

export { MockDataProvider, TxLineDataProvider };