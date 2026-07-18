import type { DataProvider } from "@/lib/data/provider";
import { MockDataProvider, type MockScenario } from "@/lib/data/mock-provider";
import { RealDataProvider } from "@/lib/data/real-provider";
import type { Outcome } from "@/lib/types";

export interface CreateProviderArgs {
  fixtureId?: number;
  homeMarketSlug?: string;
  drawMarketSlug?: string;
  awayMarketSlug?: string;
  eventSlug?: string;
  outcome?: Outcome;
  homeTeam?: string;
  awayTeam?: string;
  kickoffISO?: string;
}

const realProviderCache = new Map<string, RealDataProvider>();

function realProviderKey(args: CreateProviderArgs): string {
  return [
    args.fixtureId ?? "default",
    args.homeMarketSlug ?? "default",
    args.drawMarketSlug ?? "default",
    args.awayMarketSlug ?? "default",
    args.eventSlug ?? "default",
    args.outcome ?? "home",
  ].join(":");
}

export function createProvider(args: CreateProviderArgs = {}): DataProvider {
  const source = process.env.DATA_SOURCE;

  if (source === "txline" || source === "real") {
    const key = realProviderKey(args);
    let provider = realProviderCache.get(key);
    if (!provider) {
      provider = new RealDataProvider(
        args.fixtureId,
        args.homeMarketSlug,
        args.outcome,
        args.homeTeam,
        args.awayTeam,
        args.kickoffISO,
        args.drawMarketSlug,
        args.awayMarketSlug,
        args.eventSlug,
      );
      realProviderCache.set(key, provider);
    }
    return provider;
  }

  const scenario = (process.env.MOCK_SCENARIO ?? "live") as MockScenario;
  return new MockDataProvider(scenario, args.outcome);
}

export function clearProviderCache(): void {
  realProviderCache.clear();
}

export { MockDataProvider, RealDataProvider };