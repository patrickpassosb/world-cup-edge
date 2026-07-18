import { CONFIG } from "@/lib/config";
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
import type { Outcome, Snapshot, VerificationChecks } from "@/lib/types";

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

function deriveOutcomeLabel(outcome: Outcome, homeTeam: string, awayTeam: string): string {
  if (outcome === "home") return homeTeam;
  if (outcome === "away") return awayTeam;
  return "Draw";
}

export class RealDataProvider implements DataProvider {
  private fixtureId: number;
  private eventSlug: string;
  private homeMarketSlug: string;
  private drawMarketSlug: string;
  private awayMarketSlug: string;
  private outcome: Outcome;
  private homeTeam: string;
  private awayTeam: string;
  private kickoffISO: string;
  private previousPhase: AlertPhase = "IDLE";
  private previousConsecutiveSamples = 0;
  private lastAlertTime: number | null = null;
  private lastDedupeKey: string | null = null;

  constructor(
    fixtureId?: number,
    homeMarketSlug?: string,
    outcome?: Outcome,
    homeTeam?: string,
    awayTeam?: string,
    kickoffISO?: string,
    drawMarketSlug?: string,
    awayMarketSlug?: string,
    eventSlug?: string,
  ) {
    this.fixtureId = fixtureId ?? CONFIG.txline.fixtureId;
    this.homeMarketSlug = homeMarketSlug ?? "";
    this.drawMarketSlug = drawMarketSlug ?? "";
    this.awayMarketSlug = awayMarketSlug ?? "";
    this.eventSlug = eventSlug ?? "";
    this.outcome = outcome ?? "home";
    this.homeTeam = homeTeam ?? "";
    this.awayTeam = awayTeam ?? "";
    this.kickoffISO = kickoffISO ?? "";
  }

  private getActiveMarketSlug(): string {
    if (this.outcome === "home") return this.homeMarketSlug;
    if (this.outcome === "draw") return this.drawMarketSlug;
    return this.awayMarketSlug;
  }

  private buildMatchMetadata(fixture: Fixture | null): {
    name: string;
    date: string;
    kickoffUTC: string;
    rules: string;
    outcome: Outcome;
    outcomeLabel: string;
    homeTeam: string;
    awayTeam: string;
  } {
    const home = fixture
      ? fixture.participant1IsHome ? fixture.participant1 : fixture.participant2
      : this.homeTeam;
    const away = fixture
      ? fixture.participant1IsHome ? fixture.participant2 : fixture.participant1
      : this.awayTeam;
    const kickoff: number | string | undefined = fixture?.startTime ?? this.kickoffISO;
    const kickoffUTC = kickoff ? new Date(Number(kickoff) || Date.parse(String(kickoff))).toISOString() : "";
    const date = kickoffUTC ? kickoffUTC.slice(0, 10) : "";
    const outcomeLabel = deriveOutcomeLabel(this.outcome, home, away);
    return {
      name: `${home} vs ${away}`,
      date,
      kickoffUTC,
      rules: "regulation-time 1X2",
      outcome: this.outcome,
      outcomeLabel,
      homeTeam: home,
      awayTeam: away,
    };
  }

  async getSnapshot(): Promise<Snapshot> {
    const now = Date.now();

    const [txlineResult, polyResult] = await Promise.all([
      fetchOddsForMatch(this.fixtureId).catch((e) => {
        return { error: e instanceof Error ? e.message : String(e) };
      }),
      fetchPolymarketData(this.eventSlug, this.getActiveMarketSlug()).catch((e) => {
        return { error: e instanceof Error ? e.message : String(e) };
      }),
    ]);

    const txlineErrored = "error" in txlineResult;
    const polyErrored = "error" in polyResult;
    const txlineErr = txlineErrored ? (txlineResult as { error: string }).error : null;
    const polyErr = polyErrored ? (polyResult as { error: string }).error : null;

    const txlineData = txlineErrored ? null : (txlineResult as { fixture: Fixture | null; odds: OddsPayload[] });

    if (txlineErrored && polyErrored) {
      return this.buildErrorSnapshot(
        `TxLINE: ${txlineErr}; Polymarket: ${polyErr}`,
        now,
      );
    }

    if (txlineData === null) {
      return this.buildTxlineUnavailableSnapshot(polyErrored ? null : (polyResult as PolymarketFetchResult), txlineErr, now);
    }

    const normalizedTxline = normalizeTxline(
      txlineData.fixture,
      txlineData.odds,
      now,
      this.outcome,
    );

    const polyData = polyErrored ? null : (polyResult as PolymarketFetchResult);
    const poly = polyData ?? { event: null, market: null, book: null, yesTokenId: null };

    const normalizedPoly = normalizePolymarket(
      poly.event,
      poly.market,
      poly.book,
      poly.yesTokenId,
      now,
    );

    const matchMeta = this.buildMatchMetadata(txlineData.fixture);

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
      outcome: this.outcome,
      expectedHomeTeam: matchMeta.homeTeam,
      expectedAwayTeam: matchMeta.awayTeam,
      expectedDate: matchMeta.date || null,
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
      fixtureGameState: txlineData.fixture?.gameState ?? null,
      previousPhase: this.previousPhase,
      previousConsecutiveSamples: this.previousConsecutiveSamples,
      messageId: normalizedTxline.messageId,
      bookHash,
      lastAlertTime: this.lastAlertTime,
      now,
    });

    let alert = alertEval.alert;

    if (alert.active && alert.dedupeKey !== null && alert.dedupeKey === this.lastDedupeKey) {
      alert = {
        ...alert,
        active: false,
        reason: "Duplicate alert suppressed (same messageId + book state).",
        suppressedReason: "Duplicate alert suppressed (same messageId + book state).",
      };
    }

    this.previousPhase = alert.phase;
    this.previousConsecutiveSamples = alert.consecutiveSamples;
    if (alert.active) {
      this.lastAlertTime = now;
      this.lastDedupeKey = alert.dedupeKey;
    }

    const status = this.determineStatus(normalizedTxline.fresh, normalizedPoly.fresh, equivalence.passed, normalizedPoly.marketClosed);

    const checks = buildVerificationChecks(equivalence.passed, normalizedPoly.feeRate);

    return {
      status,
      alertKind: alert.active ? "alert" : "no-alert",
      match: {
        name: matchMeta.name,
        date: matchMeta.date,
        kickoffUTC: matchMeta.kickoffUTC,
        rules: matchMeta.rules,
        outcome: matchMeta.outcome,
        outcomeLabel: matchMeta.outcomeLabel,
        homeTeam: matchMeta.homeTeam,
        awayTeam: matchMeta.awayTeam,
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
      alert: alert,
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

  private buildMatchMetadataForError(): {
    name: string;
    date: string;
    kickoffUTC: string;
    rules: string;
    outcome: Outcome;
    outcomeLabel: string;
    homeTeam: string;
    awayTeam: string;
  } {
    const home = this.homeTeam || "Unknown";
    const away = this.awayTeam || "Unknown";
    const outcomeLabel = deriveOutcomeLabel(this.outcome, home, away);
    return {
      name: `${home} vs ${away}`,
      date: this.kickoffISO ? this.kickoffISO.slice(0, 10) : "",
      kickoffUTC: this.kickoffISO,
      rules: "regulation-time 1X2",
      outcome: this.outcome,
      outcomeLabel,
      homeTeam: home,
      awayTeam: away,
    };
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
    const matchMeta = this.buildMatchMetadataForError();

    return {
      status: "unavailable",
      alertKind: "no-alert",
      match: {
        name: matchMeta.name,
        date: matchMeta.date,
        kickoffUTC: matchMeta.kickoffUTC,
        rules: matchMeta.rules,
        outcome: matchMeta.outcome,
        outcomeLabel: matchMeta.outcomeLabel,
        homeTeam: matchMeta.homeTeam,
        awayTeam: matchMeta.awayTeam,
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
    const matchMeta = this.buildMatchMetadataForError();
    return {
      status: "error",
      alertKind: "no-alert",
      match: {
        name: matchMeta.name,
        date: matchMeta.date,
        kickoffUTC: matchMeta.kickoffUTC,
        rules: matchMeta.rules,
        outcome: matchMeta.outcome,
        outcomeLabel: matchMeta.outcomeLabel,
        homeTeam: matchMeta.homeTeam,
        awayTeam: matchMeta.awayTeam,
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