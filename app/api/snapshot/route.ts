import { NextResponse } from "next/server";
import { createProvider } from "@/lib/data";
import { MockDataProvider } from "@/lib/data/mock-provider";
import { isReplayMode } from "@/lib/data/replay";
import { CONFIG } from "@/lib/config";
import type { Outcome, Snapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseOutcome(value: string | null): Outcome | undefined {
  if (value === "home" || value === "draw" || value === "away") return value;
  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (isReplayMode(searchParams.get("demo"))) {
    const provider = new MockDataProvider("alert", parseOutcome(searchParams.get("outcome")));
    try {
      const snapshot = await provider.getSnapshot();
      return NextResponse.json(snapshot, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Replay-Mode": "true",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Replay mode failed" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const fixtureIdRaw = searchParams.get("fixtureId");
  const marketSlugRaw = searchParams.get("marketSlug");
  const drawMarketSlugRaw = searchParams.get("drawMarketSlug");
  const awayMarketSlugRaw = searchParams.get("awayMarketSlug");
  const eventSlugRaw = searchParams.get("eventSlug");
  const outcomeRaw = searchParams.get("outcome");
  const homeTeamRaw = searchParams.get("homeTeam");
  const awayTeamRaw = searchParams.get("awayTeam");
  const kickoffRaw = searchParams.get("kickoffUTC");

  const fixtureId = fixtureIdRaw !== null ? Number(fixtureIdRaw) : undefined;
  const marketSlug = marketSlugRaw !== null && marketSlugRaw !== "" ? marketSlugRaw : undefined;
  const drawMarketSlug = drawMarketSlugRaw !== null && drawMarketSlugRaw !== "" ? drawMarketSlugRaw : undefined;
  const awayMarketSlug = awayMarketSlugRaw !== null && awayMarketSlugRaw !== "" ? awayMarketSlugRaw : undefined;
  const eventSlug = eventSlugRaw !== null && eventSlugRaw !== "" ? eventSlugRaw : undefined;
  const outcome = parseOutcome(outcomeRaw);
  const homeTeam = homeTeamRaw !== null && homeTeamRaw !== "" ? homeTeamRaw : undefined;
  const awayTeam = awayTeamRaw !== null && awayTeamRaw !== "" ? awayTeamRaw : undefined;
  const kickoffISO = kickoffRaw !== null && kickoffRaw !== "" ? kickoffRaw : undefined;

  const provider = createProvider({
    fixtureId: Number.isFinite(fixtureId) ? (fixtureId as number) : undefined,
    homeMarketSlug: marketSlug,
    drawMarketSlug,
    awayMarketSlug,
    eventSlug,
    outcome,
    homeTeam,
    awayTeam,
    kickoffISO,
  });

  try {
    const snapshot = await provider.getSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    const home = homeTeam ?? "Unknown";
    const away = awayTeam ?? "Unknown";
    const outcomeLabel = outcome === "draw" ? "Draw" : outcome === "away" ? away : home;
    const kickoff = kickoffISO ?? "";
    const date = kickoff ? kickoff.slice(0, 10) : "";

    const fallback: Snapshot = {
      status: "error",
      alertKind: "no-alert",
      match: {
        name: `${home} vs ${away}`,
        date,
        kickoffUTC: kickoff,
        rules: "regulation-time 1X2",
        outcome: outcome ?? "home",
        outcomeLabel,
        homeTeam: home,
        awayTeam: away,
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
      receivedAt: Date.now(),
      errorMessage: error instanceof Error ? error.message : "Unknown error fetching snapshot.",
    };

    return NextResponse.json(fallback, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }
}