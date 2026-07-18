export interface OddsPayload {
  fixtureId: number;
  messageId: string;
  ts: number;
  bookmaker: string;
  bookmakerId: number;
  superOddsType: string;
  gameState: string | null;
  inRunning: boolean;
  marketParameters: string | null;
  marketPeriod: string | null | undefined;
  priceNames: string[];
  prices: string[];
  pct: string[];
}

export interface Fixture {
  fixtureId: number;
  participant1: string;
  participant2: string;
  participant1IsHome: boolean;
  startTime: string;
  gameState: number;
  competition: string;
  competitionId: number;
}

export interface NormalizedTxline {
  probability: number | null;
  messageId: string | null;
  timestamp: number | null;
  receivedAt: number;
  fresh: boolean;
  serviceLevel: number;
  delayed: boolean;
  homeTeam: string | null;
  awayTeam: string | null;
  matchDate: string | null;
  marketType: string | null;
  marketPeriod: string | null;
}