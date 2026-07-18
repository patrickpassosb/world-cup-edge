import { NextResponse } from "next/server";
import { fetchAvailableMatches } from "@/lib/data/matches-provider";
import { REPLAY_MATCH, isReplayMode } from "@/lib/data/replay";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (isReplayMode(searchParams.get("demo"))) {
    return NextResponse.json([REPLAY_MATCH], {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  try {
    const matches = await fetchAvailableMatches();
    return NextResponse.json(matches, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}