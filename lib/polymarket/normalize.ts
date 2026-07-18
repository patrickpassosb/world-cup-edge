import { CONFIG } from "@/lib/config";
import type {
  ClobBook,
  GammaEvent,
  GammaMarket,
  NormalizedPolymarket,
} from "@/lib/polymarket/types";

export function extractYesToken(
  market: GammaMarket | null,
): { tokenId: string | null; label: string | null } {
  if (!market || !market.clobTokenIds || !market.outcomes) {
    return { tokenId: null, label: null };
  }
  try {
    const tokens: string[] = JSON.parse(market.clobTokenIds);
    const labels: string[] = JSON.parse(market.outcomes);
    if (tokens.length !== labels.length) {
      return { tokenId: null, label: null };
    }
    const yesIdx = labels.findIndex(
      (l) => l.toLowerCase() === "yes" || l.toLowerCase().includes("england"),
    );
    if (yesIdx >= 0 && tokens[yesIdx]) {
      return { tokenId: tokens[yesIdx], label: labels[yesIdx] };
    }
    return { tokenId: null, label: null };
  } catch {
    return { tokenId: null, label: null };
  }
}

export function extractBestBid(book: ClobBook | null): number | null {
  if (!book || !book.bids || book.bids.length === 0) return null;
  const prices = book.bids.map((b) => parseFloat(b.price));
  if (prices.some((p) => Number.isNaN(p))) return null;
  return Math.max(...prices);
}

export function extractBestAsk(book: ClobBook | null): {
  price: number | null;
  size: number | null;
} {
  if (!book || !book.asks || book.asks.length === 0) return { price: null, size: null };
  let minPrice = Infinity;
  let minEntry = book.asks[0];
  for (const entry of book.asks) {
    const p = parseFloat(entry.price);
    if (Number.isNaN(p)) continue;
    if (p < minPrice) {
      minPrice = p;
      minEntry = entry;
    }
  }
  if (minPrice === Infinity) return { price: null, size: null };
  return { price: minPrice, size: parseFloat(minEntry.size) };
}

export function extractBestBidSize(book: ClobBook | null): number | null {
  if (!book || !book.bids || book.bids.length === 0) return null;
  let maxPrice = -Infinity;
  let maxEntry = book.bids[0];
  for (const entry of book.bids) {
    const p = parseFloat(entry.price);
    if (Number.isNaN(p)) continue;
    if (p > maxPrice) {
      maxPrice = p;
      maxEntry = entry;
    }
  }
  if (maxPrice === -Infinity) return null;
  return parseFloat(maxEntry.size);
}

export function extractBookTimestamp(book: ClobBook | null): number | null {
  if (!book || !book.timestamp) return null;
  const ts = typeof book.timestamp === "string" ? parseInt(book.timestamp, 10) : book.timestamp;
  if (Number.isNaN(ts)) return null;
  return ts;
}

export function isBookEmpty(book: ClobBook | null): boolean {
  if (!book) return true;
  const hasBids = book.bids && book.bids.length > 0;
  const hasAsks = book.asks && book.asks.length > 0;
  return !hasBids && !hasAsks;
}

export function extractFeeRate(market: GammaMarket | null): number | null {
  if (!market) return null;
  const candidates = [
    (market as unknown as { takerFee?: string }).takerFee,
    (market as unknown as { feeRate?: string }).feeRate,
    (market as unknown as { takerFeeBps?: string }).takerFeeBps,
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null) {
      const n = typeof c === "string" ? parseFloat(c) : c;
      if (!Number.isNaN(n) && n >= 0) {
        return n > 1 ? n / 10_000 : n;
      }
    }
  }
  return null;
}

export function extractTeamsFromEvent(
  event: GammaEvent | null,
): { home: string | null; away: string | null } {
  if (!event || !event.title) return { home: null, away: null };
  const parts = event.title.split(/\s+vs\.?\s+/i);
  if (parts.length >= 2) {
    return { home: parts[0].trim(), away: parts[1].trim() };
  }
  return { home: null, away: null };
}

export function extractMatchDate(market: GammaMarket | null): string | null {
  if (!market) return null;
  if (market.endDate) {
    return market.endDate.slice(0, 10);
  }
  if (market.startDate) {
    return market.startDate.slice(0, 10);
  }
  return null;
}

export function extractResolutionWording(market: GammaMarket | null): string | null {
  if (!market) return null;
  if (market.description) return market.description;
  if (market.question) return market.question;
  return null;
}

export function normalizePolymarket(
  event: GammaEvent | null,
  market: GammaMarket | null,
  book: ClobBook | null,
  yesTokenId: string | null,
  receivedAt: number = Date.now(),
): NormalizedPolymarket {
  const { tokenId, label } = extractYesToken(market);
  const effectiveTokenId = yesTokenId ?? tokenId;
  const effectiveLabel = label;

  const bestAsk = extractBestAsk(book);
  const bestBid = extractBestBid(book);
  const bookTimestamp = extractBookTimestamp(book);
  const bookEmpty = isBookEmpty(book);
  const feeRate = extractFeeRate(market);
  const teams = extractTeamsFromEvent(event);
  const matchDate = extractMatchDate(market);
  const resolutionWording = extractResolutionWording(market);

  const fresh =
    bookTimestamp !== null &&
    receivedAt - bookTimestamp <= CONFIG.polymarket.maxAgeMs;

  return {
    bestAsk: bestAsk.price,
    bestBid,
    askSize: bestAsk.size,
    feeRate,
    bookSeq: bookTimestamp,
    timestamp: bookTimestamp,
    receivedAt,
    fresh,
    marketActive: market?.active ?? false,
    marketClosed: market?.closed ?? true,
    acceptingOrders: market?.acceptingOrders ?? false,
    bookEmpty,
    yesTokenId: effectiveTokenId,
    yesTokenLabel: effectiveLabel,
    homeTeam: teams.home,
    awayTeam: teams.away,
    matchDate,
    resolutionWording,
  };
}