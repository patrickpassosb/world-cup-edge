import type { DataProvider } from "@/lib/data/provider";
import { MockDataProvider, type MockScenario } from "@/lib/data/mock-provider";
import { RealDataProvider } from "@/lib/data/real-provider";
import type { Outcome } from "@/lib/types";

export interface CreateProviderArgs {
  fixtureId?: number;
  homeMarketSlug?: string;
  outcome?: Outcome;
  homeTeam?: string;
  awayTeam?: string;
  kickoffISO?: string;
}

export function createProvider(args: CreateProviderArgs = {}): DataProvider {
  const source = process.env.DATA_SOURCE;

  if (source === "txline" || source === "real") {
    return new RealDataProvider(
      args.fixtureId,
      args.homeMarketSlug,
      args.outcome,
      args.homeTeam,
      args.awayTeam,
      args.kickoffISO,
    );
  }

  const scenario = (process.env.MOCK_SCENARIO ?? "live") as MockScenario;
  return new MockDataProvider(scenario, args.outcome);
}

export { MockDataProvider, RealDataProvider };