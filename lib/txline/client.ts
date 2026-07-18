import { CONFIG } from "@/lib/config";
import type { Fixture, OddsPayload } from "@/lib/txline/types";

function getAuthHeaders(): Record<string, string> {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;
  const network = (process.env.TXLINE_NETWORK ?? "mainnet") as "mainnet" | "devnet";

  if (!jwt || !apiToken) {
    throw new Error(
      "TXLINE_JWT and TXLINE_API_TOKEN must be set in .env.local. Run: npm run txline:activate",
    );
  }

  void network;
  return {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": apiToken,
    "Content-Type": "application/json",
  };
}

function getApiBase(): string {
  const network = (process.env.TXLINE_NETWORK ?? "mainnet") as "mainnet" | "devnet";
  return network === "devnet"
    ? "https://txline-dev.txodds.com/api"
    : "https://txline.txodds.com/api";
}

async function fetchJson<T>(url: string, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = getAuthHeaders();
    const res = await fetch(url, {
      signal: controller.signal,
      headers,
    });
    if (res.status === 401) {
      throw new Error("TxLINE returned 401 Unauthorized. Credentials may be expired or invalid.");
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`TxLINE HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFixtures(): Promise<Fixture[]> {
  const data = await fetchJson<unknown[]>(`${getApiBase()}/fixtures/snapshot`);
  return (Array.isArray(data) ? data : [data]).map(normalizeFixtureFields);
}

function normalizeFixtureFields(raw: unknown): Fixture {
  const r = raw as Record<string, unknown>;
  return {
    fixtureId: Number(r.fixtureId ?? r.FixtureId ?? 0),
    participant1: String(r.participant1 ?? r.Participant1 ?? ""),
    participant2: String(r.participant2 ?? r.Participant2 ?? ""),
    participant1IsHome: Boolean(r.participant1IsHome ?? r.Participant1IsHome ?? false),
    startTime: Number(r.startTime ?? r.StartTime ?? 0),
    gameState: Number(r.gameState ?? r.GameState ?? 0),
    competition: String(r.competition ?? r.Competition ?? ""),
    competitionId: Number(r.competitionId ?? r.CompetitionId ?? 0),
  };
}

export async function fetchFixture(fixtureId: number): Promise<Fixture | null> {
  const fixtures = await fetchFixtures();
  return fixtures.find((f) => f.fixtureId === fixtureId) ?? null;
}

export async function fetchOddsSnapshot(fixtureId: number): Promise<OddsPayload[]> {
  const data = await fetchJson<unknown[]>(`${getApiBase()}/odds/snapshot/${fixtureId}`);
  return (Array.isArray(data) ? data : [data]).map(normalizeOddsFields);
}

function normalizeOddsFields(raw: unknown): OddsPayload {
  const r = raw as Record<string, unknown>;
  return {
    fixtureId: Number(r.fixtureId ?? r.FixtureId ?? 0),
    messageId: String(r.messageId ?? r.MessageId ?? ""),
    ts: Number(r.ts ?? r.Ts ?? 0),
    bookmaker: String(r.bookmaker ?? r.Bookmaker ?? ""),
    bookmakerId: Number(r.bookmakerId ?? r.BookmakerId ?? 0),
    superOddsType: String(r.superOddsType ?? r.SuperOddsType ?? ""),
    gameState: (r.gameState ?? r.GameState ?? null) as string | null,
    inRunning: Boolean(r.inRunning ?? r.InRunning ?? false),
    marketParameters: (r.marketParameters ?? r.MarketParameters ?? null) as string | null,
    marketPeriod: (r.marketPeriod ?? r.MarketPeriod ?? null) as string | null | undefined,
    priceNames: (r.priceNames ?? r.PriceNames ?? []) as string[],
    prices: (r.prices ?? r.Prices ?? []) as string[],
    pct: (r.pct ?? r.Pct ?? []) as string[],
    serviceLevel: typeof (r.serviceLevel ?? r.ServiceLevel) === "number"
      ? Number(r.serviceLevel ?? r.ServiceLevel)
      : undefined,
  };
}

export async function fetchOddsForMatch(
  fixtureId: number = CONFIG.txline.fixtureId,
): Promise<{ fixture: Fixture | null; odds: OddsPayload[] }> {
  const [fixture, odds] = await Promise.all([
    fetchFixture(fixtureId).catch(() => null),
    fetchOddsSnapshot(fixtureId),
  ]);
  return { fixture, odds };
}