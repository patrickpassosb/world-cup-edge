import { NextResponse } from "next/server";
import { createProvider } from "@/lib/data";
import { MockDataProvider } from "@/lib/data/mock-provider";
import { isReplayMode } from "@/lib/data/replay";
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
  const outcomeRaw = searchParams.get("outcome");
  const homeTeamRaw = searchParams.get("homeTeam");
  const awayTeamRaw = searchParams.get("awayTeam");
  const kickoffRaw = searchParams.get("kickoffUTC");

  const fixtureId = fixtureIdRaw !== null ? Number(fixtureIdRaw) : undefined;
  const marketSlug = marketSlugRaw !== null && marketSlugRaw !== "" ? marketSlugRaw : undefined;
  const outcome = parseOutcome(outcomeRaw);
  const homeTeam = homeTeamRaw !== null && homeTeamRaw !== "" ? homeTeamRaw : undefined;
  const awayTeam = awayTeamRaw !== null && awayTeamRaw !== "" ? awayTeamRaw : undefined;
  const kickoffISO = kickoffRaw !== null && kickoffRaw !== "" ? kickoffRaw : undefined;

  const provider = createProvider({
    fixtureId: Number.isFinite(fixtureId) ? (fixtureId as number) : undefined,
    homeMarketSlug: marketSlug,
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
    const fallback: Snapshot = {
      status: "error",
      alertKind: "no-alert",
      match: {
        name: "England vs Argentina",
        date: "2026-07-15",
        kickoffUTC: "2026-07-15T19:00:00Z",
        rules: "regulation-time 1X2",
        outcome: "home",
        outcomeLabel: "England",
        homeTeam: "England",
        awayTeam: "Argentina",
      },
      txline: {
        probability: null,
        messageId: null,
        timestamp: null,
        receivedAt: null,
        fresh: false,
        serviceLevel: 12,
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
        threshold: 0.05,
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