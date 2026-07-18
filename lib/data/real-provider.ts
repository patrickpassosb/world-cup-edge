import { CONFIG, MATCH } from "@/lib/config";
import type { DataProvider } from "@/lib/data/provider";
import { checkEquivalence } from "@/lib/contract/equivalence";
import {
  computeFeePerShare,
  computeGapAfterFee,
  computeGrossGap,
  evaluateAlert,
  type AlertPhase,
} from "@/lib/gap/engine";
import { fetchPolymarketData, type PolymarketFetchResult } from "@/lib/polymarket/client";
import { normalizePolymarket } from "@/lib/polymarket/normalize";
import { fetchOddsForMatch } from "@/lib/txline/client";
import { normalizeTxline } from "@/lib/txline/normalize";
import type { Fixture, OddsPayload } from "@/lib/txline/types";
import type { Snapshot, VerificationChecks } from "@/lib/types";

function buildVerificationChecks(
  equivalencePassed: boolean,
  feeRate: number | null,
): VerificationChecks {
  return {
    teams: equivalencePassed,
    date: equivalencePassed,
    rules: equivalencePassed,
    token: equivalencePassed,
    marketState: equivalencePassed,
    fee: feeRate !== null,
  };
}

export class RealDataProvider implements DataProvider {
  private fixtureId: number;
  private marketSlug: string;
  private eventSlug: string;
  private previousPhase: AlertPhase = "IDLE";
  private previousConsecutiveSamples = 0;
  private lastAlertTime: number | null = null;
  private lastDedupeKey: string | null = null;

  constructor(fixtureId?: number, marketSlug?: string) {
    this.fixtureId = fixtureId ?? CONFIG.txline.fixtureId;
    this.marketSlug = marketSlug ?? CONFIG.polymarket.marketSlug;
    this.eventSlug = this.marketSlug.replace(/-(eng|draw|arg)$/, "") || CONFIG.polymarket.eventSlug;
  }

  async getSnapshot(): Promise<Snapshot> {
    const now = Date.now();

    const [txlineResult, polyResult] = await Promise.all([
      fetchOddsForMatch(this.fixtureId).catch((e) => {
        return { error: e instanceof Error ? e.message : String(e) };
      }),
      fetchPolymarketData(this.eventSlug, this.marketSlug).catch((e) => {
        return { error: e instanceof Error ? e.message : String(e) };
      }),
    ]);

    const txlineErrored = "error" in txlineResult;
    const polyErrored = "error" in polyResult;
    const txlineErr = txlineErrored ? (txlineResult as { error: string }).error : null;
    const polyErr = polyErrored ? (polyResult as { error: string }).error : null;

    if (txlineErrored && polyErrored) {
      return this.buildErrorSnapshot(
        `TxLINE: ${txlineErr}; Polymarket: ${polyErr}`,
        now,
      );
    }

    const txlineData = txlineErrored ? null : (txlineResult as { fixture: Fixture | null; odds: OddsPayload[] });
    const polyData = polyErrored ? null : (polyResult as PolymarketFetchResult);

    if (txlineData === null) {
      return this.buildTxlineUnavailableSnapshot(polyData, txlineErr, now);
    }

    const normalizedTxline = normalizeTxline(
      txlineData.fixture,
      txlineData.odds,
      now,
    );

    const poly = polyData ?? { event: null, market: null, book: null, yesTokenId: null };

    const normalizedPoly = normalizePolymarket(
      poly.event,
      poly.market,
      poly.book,
      poly.yesTokenId,
      now,
    );

    const equivalence = checkEquivalence({
      txlineHomeTeam: normalizedTxline.homeTeam,
      txlineAwayTeam: normalizedTxline.awayTeam,
      txlineMatchDate: normalizedTxline.matchDate,
      txlineMarketType: normalizedTxline.marketType,
      txlineMarketPeriod: normalizedTxline.marketPeriod,
      polymarketHomeTeam: normalizedPoly.homeTeam,
      polymarketAwayTeam: normalizedPoly.awayTeam,
      polymarketMatchDate: normalizedPoly.matchDate,
      polymarketResolutionWording: normalizedPoly.resolutionWording,
      selectedTokenLabel: normalizedPoly.yesTokenLabel,
      marketActive: normalizedPoly.marketActive,
      marketClosed: normalizedPoly.marketClosed,
      acceptingOrders: normalizedPoly.acceptingOrders,
    });

    const grossGap = computeGrossGap(normalizedTxline.probability, normalizedPoly.bestAsk);
    const feePerShare = computeFeePerShare(normalizedPoly.feeRate, normalizedPoly.bestAsk);
    const gapAfterFee = computeGapAfterFee(grossGap, feePerShare);

    const sourceSkewMs =
      normalizedTxline.timestamp !== null && normalizedPoly.timestamp !== null
        ? Math.abs(normalizedTxline.timestamp - normalizedPoly.timestamp)
        : null;

    const bookHash = normalizedPoly.bookSeq !== null
      ? String(normalizedPoly.bookSeq)
      : null;

    const alertEval = evaluateAlert({
      gapAfterFee,
      txlineFresh: normalizedTxline.fresh,
      polymarketFresh: normalizedPoly.fresh,
      sourceSkewMs,
      maxSourceSkewMs: CONFIG.gap.maxSourceSkewMs,
      marketActive: normalizedPoly.marketActive,
      marketClosed: normalizedPoly.marketClosed,
      acceptingOrders: normalizedPoly.acceptingOrders,
      bookEmpty: normalizedPoly.bookEmpty,
      equivalencePassed: equivalence.passed,
      serviceLevel: normalizedTxline.serviceLevel,
      previousPhase: this.previousPhase,
      previousConsecutiveSamples: this.previousConsecutiveSamples,
      messageId: normalizedTxline.messageId,
      bookHash,
      lastAlertTime: this.lastAlertTime,
      now,
    });

    this.previousPhase = alertEval.alert.phase;
    this.previousConsecutiveSamples = alertEval.alert.consecutiveSamples;
    if (alertEval.alert.active) {
      this.lastAlertTime = now;
    }

    const status = this.determineStatus(normalizedTxline.fresh, normalizedPoly.fresh, equivalence.passed, normalizedPoly.marketClosed);

    const checks = buildVerificationChecks(equivalence.passed, normalizedPoly.feeRate);

    return {
      status,
      alertKind: alertEval.alert.active ? "alert" : "no-alert",
      match: {
        name: MATCH.matchName,
        date: MATCH.matchDate,
        kickoffUTC: MATCH.kickoffUTC,
        rules: MATCH.rules,
      },
      txline: {
        probability: normalizedTxline.probability,
        messageId: normalizedTxline.messageId,
        timestamp: normalizedTxline.timestamp,
        receivedAt: normalizedTxline.receivedAt,
        fresh: normalizedTxline.fresh,
        serviceLevel: normalizedTxline.serviceLevel,
        delayed: normalizedTxline.delayed,
      },
      polymarket: {
        bestAsk: normalizedPoly.bestAsk,
        bestBid: normalizedPoly.bestBid,
        askSize: normalizedPoly.askSize,
        feeRate: normalizedPoly.feeRate,
        bookSeq: normalizedPoly.bookSeq,
        timestamp: normalizedPoly.timestamp,
        receivedAt: normalizedPoly.receivedAt,
        fresh: normalizedPoly.fresh,
        marketActive: normalizedPoly.marketActive,
        marketClosed: normalizedPoly.marketClosed,
        acceptingOrders: normalizedPoly.acceptingOrders,
        bookEmpty: normalizedPoly.bookEmpty,
        yesTokenId: normalizedPoly.yesTokenId,
      },
      gap: {
        grossGap,
        feePerShare,
        gapAfterFee,
        threshold: CONFIG.gap.threshold,
      },
      alert: alertEval.alert,
      checks,
      equivalence,
      sourceSkewMs,
      receivedAt: now,
      errorMessage: null,
    };
  }

  private determineStatus(
    txlineFresh: boolean,
    polyFresh: boolean,
    equivalencePassed: boolean,
    marketClosed: boolean,
  ): "live" | "stale" | "unavailable" {
    if (marketClosed) return "unavailable";
    if (!equivalencePassed) return "unavailable";
    if (!txlineFresh || !polyFresh) return "stale";
    return "live";
  }

  private buildTxlineUnavailableSnapshot(
    polyData: PolymarketFetchResult | null,
    txlineErr: string | null,
    now: number,
  ): Snapshot {
    const poly = polyData ?? { event: null, market: null, book: null, yesTokenId: null };
    const normalizedPoly = normalizePolymarket(
      poly.event,
      poly.market,
      poly.book,
      poly.yesTokenId,
      now,
    );

    return {
      status: "unavailable",
      alertKind: "no-alert",
      match: {
        name: MATCH.matchName,
        date: MATCH.matchDate,
        kickoffUTC: MATCH.kickoffUTC,
        rules: MATCH.rules,
      },
      txline: {
        probability: null,
        messageId: null,
        timestamp: null,
        receivedAt: null,
        fresh: false,
        serviceLevel: CONFIG.txline.serviceLevel,
        delayed: false,
      },
      polymarket: {
        bestAsk: normalizedPoly.bestAsk,
        bestBid: normalizedPoly.bestBid,
        askSize: normalizedPoly.askSize,
        feeRate: normalizedPoly.feeRate,
        bookSeq: normalizedPoly.bookSeq,
        timestamp: normalizedPoly.timestamp,
        receivedAt: normalizedPoly.receivedAt,
        fresh: normalizedPoly.fresh,
        marketActive: normalizedPoly.marketActive,
        marketClosed: normalizedPoly.marketClosed,
        acceptingOrders: normalizedPoly.acceptingOrders,
        bookEmpty: normalizedPoly.bookEmpty,
        yesTokenId: normalizedPoly.yesTokenId,
      },
      gap: {
        grossGap: null,
        feePerShare: null,
        gapAfterFee: null,
        threshold: CONFIG.gap.threshold,
      },
      alert: {
        active: false,
        reason: txlineErr ?? "TxLINE data unavailable. Alerts suppressed.",
        consecutiveSamples: 0,
        suppressedReason: txlineErr ?? "TxLINE data unavailable. Alerts suppressed.",
        phase: "IDLE",
        lastAlertTime: null,
        cooldownRemainingMs: null,
        dedupeKey: null,
      },
      checks: {
        teams: false,
        date: false,
        rules: false,
        token: false,
        marketState: false,
        fee: normalizedPoly.feeRate !== null,
      },
      equivalence: null,
      sourceSkewMs: null,
      receivedAt: now,
      errorMessage: txlineErr,
    };
  }

  private buildErrorSnapshot(message: string, now: number): Snapshot {
    return {
      status: "error",
      alertKind: "no-alert",
      match: {
        name: MATCH.matchName,
        date: MATCH.matchDate,
        kickoffUTC: MATCH.kickoffUTC,
        rules: MATCH.rules,
      },
      txline: {
        probability: null,
        messageId: null,
        timestamp: null,
        receivedAt: null,
        fresh: false,
        serviceLevel: CONFIG.txline.serviceLevel,
        delayed: false,
      },
      polymarket: {
        bestAsk: null,
        bestBid: null,
        askSize: null,
        feeRate: null,
        bookSeq: null,
        timestamp: null,
        receivedAt: null,
        fresh: false,
        marketActive: false,
        marketClosed: false,
        acceptingOrders: false,
        bookEmpty: true,
        yesTokenId: null,
      },
      gap: {
        grossGap: null,
        feePerShare: null,
        gapAfterFee: null,
        threshold: CONFIG.gap.threshold,
      },
      alert: {
        active: false,
        reason: "Fetch error. Alerts suppressed.",
        consecutiveSamples: 0,
        suppressedReason: "Fetch error. Alerts suppressed.",
        phase: "IDLE",
        lastAlertTime: null,
        cooldownRemainingMs: null,
        dedupeKey: null,
      },
      checks: {
        teams: false,
        date: false,
        rules: false,
        token: false,
        marketState: false,
        fee: false,
      },
      equivalence: null,
      sourceSkewMs: null,
      receivedAt: now,
      errorMessage: message,
    };
  }
}