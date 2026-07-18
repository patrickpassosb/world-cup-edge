import { CONFIG } from "@/lib/config";
import type { ClobBook, GammaEvent, GammaMarket } from "@/lib/polymarket/types";

const GAMMA_BASE = "https://gamma-api.polymarket.com";
const CLOB_BASE = "https://clob.polymarket.com";

async function fetchJson<T>(url: string, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchEvent(slug: string): Promise<GammaEvent | null> {
  const events = await fetchJson<GammaEvent[]>(
    `${GAMMA_BASE}/events?slug=${encodeURIComponent(slug)}`,
  );
  if (!Array.isArray(events) || events.length === 0) return null;
  return events[0] ?? null;
}

export async function fetchMarket(slug: string): Promise<GammaMarket | null> {
  const markets = await fetchJson<GammaMarket[]>(
    `${GAMMA_BASE}/markets?slug=${encodeURIComponent(slug)}`,
  );
  if (Array.isArray(markets) && markets.length > 0) {
    return markets[0] ?? null;
  }
  const eventSlug = slug.replace(/-eng$|-draw$|-arg$/, "");
  const event = await fetchEvent(eventSlug);
  if (event && event.markets && event.markets.length > 0) {
    const match = event.markets.find((m) => m.slug === slug);
    return match ?? event.markets[0] ?? null;
  }
  return null;
}

export async function fetchBook(tokenId: string): Promise<ClobBook | null> {
  try {
    const book = await fetchJson<ClobBook | { error: string }>(
      `${CLOB_BASE}/book?token_id=${encodeURIComponent(tokenId)}`,
    );
    if ("error" in book && typeof (book as { error?: unknown }).error === "string") {
      return null;
    }
    return book as ClobBook;
  } catch {
    return null;
  }
}

export interface PolymarketFetchResult {
  event: GammaEvent | null;
  market: GammaMarket | null;
  book: ClobBook | null;
  yesTokenId: string | null;
}

export async function fetchPolymarketData(
  eventSlug: string = CONFIG.polymarket.eventSlug,
  marketSlug: string = CONFIG.polymarket.marketSlug,
): Promise<PolymarketFetchResult> {
  const [event, market] = await Promise.all([
    fetchEvent(eventSlug),
    fetchMarket(marketSlug),
  ]);

  let yesTokenId: string | null = null;
  if (market && market.clobTokenIds) {
    try {
      const tokens: string[] = JSON.parse(market.clobTokenIds);
      const labels: string[] = market.outcomes ? JSON.parse(market.outcomes) : [];
      const yesIdx = labels.findIndex(
        (l) => l.toLowerCase() === "yes" || l.toLowerCase().includes("england"),
      );
      if (yesIdx >= 0 && tokens[yesIdx]) {
        yesTokenId = tokens[yesIdx];
      } else if (tokens[0]) {
        yesTokenId = tokens[0];
      }
    } catch {
      yesTokenId = null;
    }
  }

  let book: ClobBook | null = null;
  if (yesTokenId) {
    book = await fetchBook(yesTokenId);
  }

  return { event, market, book, yesTokenId };
}

export async function searchActiveSoccerEvents(
  limit = 100,
): Promise<GammaEvent[]> {
  try {
    const data = await fetchJson<unknown>(
      `${GAMMA_BASE}/events?active=true&closed=false&limit=${limit}`,
    );
    if (!Array.isArray(data)) return [];
    return data as GammaEvent[];
  } catch {
    return [];
  }
}

let cachedEvents: { data: GammaEvent[]; ts: number } | null = null;

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function findPolymarketMatchForTeams(
  home: string,
  away: string,
): Promise<{ eventSlug: string; marketSlug: string } | null> {
  try {
    let events: GammaEvent[];
    if (cachedEvents && Date.now() - cachedEvents.ts <= 60_000) {
      events = cachedEvents.data;
    } else {
      events = await searchActiveSoccerEvents();
      cachedEvents = { data: events, ts: Date.now() };
    }

    const homeNorm = normalizeTeamName(home);
    const awayNorm = normalizeTeamName(away);
    if (!homeNorm || !awayNorm) return null;

    const matchedEvent = events.find((ev) => {
      const titleNorm = normalizeTeamName(ev.title);
      return (
        titleNorm.includes(homeNorm) && titleNorm.includes(awayNorm)
      );
    });
    if (!matchedEvent) return null;

    const markets = Array.isArray(matchedEvent.markets)
      ? matchedEvent.markets
      : [];
    if (markets.length === 0) return null;

    const homeMarket = markets.find((m) => {
      const q = normalizeTeamName(m.question);
      return q.includes(homeNorm);
    });
    const market: GammaMarket | undefined = homeMarket ?? markets[0];
    if (!market) return null;

    return { eventSlug: matchedEvent.slug, marketSlug: market.slug };
  } catch {
    return null;
  }
}