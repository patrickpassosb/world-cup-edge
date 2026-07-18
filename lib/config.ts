export const CONFIG = {
  txline: {
    fixtureId: 18257865,
    network: "mainnet" as const,
    serviceLevel: 12,
    maxAgeMs: 30_000,
    delayedMaxAgeMs: 120_000,
  },
  polymarket: {
    maxAgeMs: 10_000,
  },
  gap: {
    thresholdPp: 5,
    threshold: 0.05,
    consecutiveSamples: 2,
    cooldownMs: 60_000,
    maxSourceSkewMs: 15_000,
  },
} as const;

export const MATCH = {
  homeTeam: "England",
  awayTeam: "Argentina",
  matchName: "England vs Argentina",
  matchDate: "2026-07-15",
  kickoffUTC: "2026-07-15T19:00:00Z",
  rules: "regulation-time 1X2",
};

export const DISCLAIMER_LINES = {
  line1: "Read-only monitor. Not a trading bot. Not a settlement oracle. The consensus gap is not arbitrage, guaranteed profit, or verified truth.",
  line2: "TxLINE proof verifies data provenance, not signal correctness.",
} as const;