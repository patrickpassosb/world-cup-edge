export interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  active: boolean;
  closed: boolean;
  restricted: boolean;
  negRisk: boolean;
  negRiskMarketID: string | null;
  startDate: string;
  endDate: string;
  markets: GammaMarket[];
}

export interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  description: string;
  outcomes: string;
  outcomePrices: string;
  clobTokenIds: string;
  active: boolean;
  closed: boolean;
  acceptingOrders: boolean;
  bestBid: number | null;
  bestAsk: number | null;
  startDate: string;
  endDate: string;
  closedTime: string | null;
}

export interface ClobBookEntry {
  price: string;
  size: string;
}

export interface ClobBook {
  market: string;
  asset_id: string;
  bids: ClobBookEntry[];
  asks: ClobBookEntry[];
  timestamp: string;
  hash: string;
}

export interface NormalizedPolymarket {
  bestAsk: number | null;
  bestBid: number | null;
  askSize: number | null;
  feeRate: number | null;
  feeExponent: number | null;
  bookSeq: number | null;
  timestamp: number | null;
  receivedAt: number;
  fresh: boolean;
  marketActive: boolean;
  marketClosed: boolean;
  acceptingOrders: boolean;
  bookEmpty: boolean;
  yesTokenId: string | null;
  yesTokenLabel: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  matchDate: string | null;
  resolutionWording: string | null;
  marketQuestion: string | null;
}

export interface ClobFeeDetails {
  r: number | null;
  e: number | null;
  to: boolean | null;
}

export interface ClobMarketInfo {
  conditionId: string;
  takerBaseFee: number;
  makerBaseFee: number;
  feesEnabled: boolean | null;
  fd: ClobFeeDetails | null;
}