import { NextResponse } from "next/server";
import { createProvider } from "@/lib/data";
import type { Snapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = createProvider();

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