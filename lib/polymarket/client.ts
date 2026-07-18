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
        (l) => l.toLowerCase() === "yes",
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

const FIFA_TEAM_CODES: Record<string, string> = {
  england: "eng", france: "fra", spain: "esp", argentina: "arg",
  brazil: "bra", germany: "ger", portugal: "por", netherlands: "ned",
  italy: "ita", belgium: "bel", croatia: "cro", morocco: "mar",
  japan: "jpn", "united states": "usa", usa: "usa", mexico: "mex",
  canada: "can", australia: "aus", "south korea": "kor",
  "korea republic": "kor", korea: "kor", switzerland: "sui",
  serbia: "srb", uruguay: "uru", colombia: "col", ecuador: "ecu",
  senegal: "sen", ghana: "gha", cameroon: "cmr", tunisia: "tun",
  "saudi arabia": "ksa", qatar: "qat", iran: "irn", poland: "pol",
  wales: "wal", denmark: "den", norway: "nor", sweden: "swe",
  austria: "aut", "czech republic": "cze", czechia: "cze",
  ukraine: "ukr", russia: "rus", turkey: "tur", greece: "gre",
  scotland: "sco", ireland: "irl", romania: "rou", hungary: "hun",
  slovakia: "svk", slovenia: "svn", albania: "alb", georgia: "geo",
  "ivory coast": "civ", "côte d'ivoire": "civ", "cote d'ivoire": "civ",
  "south africa": "rsa", nigeria: "nga", egypt: "egy", algeria: "alg",
  mali: "mli", chile: "chi", peru: "per", paraguay: "par",
  venezuela: "ven", panama: "pan", "costa rica": "crc",
  jamaica: "jam", honduras: "hon",
};

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function teamToFifaCode(team: string): string {
  const key = normalizeTeamName(team);
  return FIFA_TEAM_CODES[key] ?? key.slice(0, 3);
}

function buildEventSlug(home: string, away: string, kickoffISO: string): string {
  const date = kickoffISO.slice(0, 10);
  const homeCode = teamToFifaCode(home);
  const awayCode = teamToFifaCode(away);
  return `fifwc-${homeCode}-${awayCode}-${date}`;
}

function buildHomeMarketSlug(eventSlug: string, home: string): string {
  const homeCode = teamToFifaCode(home);
  return `${eventSlug}-${homeCode}`;
}

function buildAwayMarketSlug(eventSlug: string, away: string): string {
  const awayCode = teamToFifaCode(away);
  return `${eventSlug}-${awayCode}`;
}

function buildDrawMarketSlug(eventSlug: string): string {
  return `${eventSlug}-draw`;
}

export interface PolymarketMatch {
  eventSlug: string;
  homeMarketSlug: string;
  drawMarketSlug: string;
  awayMarketSlug: string;
}

export async function findPolymarketMatchForTeams(
  home: string,
  away: string,
  kickoffISO: string,
): Promise<PolymarketMatch | null> {
  try {
    if (!home || !away || !kickoffISO) return null;

    const eventSlug = buildEventSlug(home, away, kickoffISO);
    const event = await fetchEvent(eventSlug);
    if (!event) return null;
    if (event.closed) return null;

    const markets = Array.isArray(event.markets) ? event.markets : [];
    if (markets.length === 0) return null;

    const homeSlug = buildHomeMarketSlug(eventSlug, home);
    const drawSlug = buildDrawMarketSlug(eventSlug);
    const awaySlug = buildAwayMarketSlug(eventSlug, away);

    const homeMarket = markets.find((m) => m.slug === homeSlug);
    const drawMarket = markets.find((m) => m.slug === drawSlug);
    const awayMarket = markets.find((m) => m.slug === awaySlug);

    const hasAtLeastOne = homeMarket || drawMarket || awayMarket;
    if (!hasAtLeastOne) return null;

    return {
      eventSlug: event.slug,
      homeMarketSlug: homeMarket?.slug ?? homeSlug,
      drawMarketSlug: drawMarket?.slug ?? drawSlug,
      awayMarketSlug: awayMarket?.slug ?? awaySlug,
    };
  } catch {
    return null;
  }
}