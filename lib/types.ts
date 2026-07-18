export type StatusKind = "loading" | "live" | "stale" | "unavailable" | "error";

export type AlertKind = "no-alert" | "alert";

export type AlertPhase = "IDLE" | "SAMPLING" | "ALERTING" | "COOLDOWN";

export interface MatchInfo {
  name: string;
  date: string;
  kickoffUTC: string;
  rules: string;
}

export interface TxlineData {
  probability: number | null;
  messageId: string | null;
  timestamp: number | null;
  receivedAt: number | null;
  fresh: boolean;
  serviceLevel: number;
  delayed: boolean;
}

export interface PolymarketData {
  bestAsk: number | null;
  bestBid: number | null;
  askSize: number | null;
  feeRate: number | null;
  bookSeq: number | null;
  timestamp: number | null;
  receivedAt: number | null;
  fresh: boolean;
  marketActive: boolean;
  marketClosed: boolean;
  acceptingOrders: boolean;
  bookEmpty: boolean;
  yesTokenId: string | null;
}

export interface GapResult {
  grossGap: number | null;
  feePerShare: number | null;
  gapAfterFee: number | null;
  threshold: number;
}

export interface AlertState {
  active: boolean;
  reason: string;
  consecutiveSamples: number;
  suppressedReason: string | null;
  phase: AlertPhase;
  lastAlertTime: number | null;
  cooldownRemainingMs: number | null;
  dedupeKey: string | null;
}

export interface EquivalenceResult {
  passed: boolean;
  checks: {
    teams: boolean;
    date: boolean;
    rules: boolean;
    token: boolean;
    marketState: boolean;
  };
  failures: string[];
}

export interface VerificationChecks {
  teams: boolean;
  date: boolean;
  rules: boolean;
  token: boolean;
  marketState: boolean;
  fee: boolean;
}

export interface SessionAlert {
  id: string;
  timestamp: number;
  match: string;
  gapValue: number;
  explanation: string;
  dedupeKey: string | null;
}

export interface Snapshot {
  status: StatusKind;
  alertKind: AlertKind;
  match: MatchInfo;
  txline: TxlineData;
  polymarket: PolymarketData;
  gap: GapResult;
  alert: AlertState;
  checks: VerificationChecks;
  equivalence: EquivalenceResult | null;
  sourceSkewMs: number | null;
  receivedAt: number;
  errorMessage: string | null;
}

export interface MatchEntry {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  kickoffUTC: string;
  competition: string;
  gameState: number;
  polymarketEventSlug: string | null;
  polymarketMarketSlug: string | null;
  hasPolymarketMarket: boolean;
}