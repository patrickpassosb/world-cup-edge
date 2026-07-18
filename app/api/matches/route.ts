import { NextResponse } from "next/server";
import { fetchAvailableMatches } from "@/lib/data/matches-provider";

export const dynamic = "force-dynamic";

export async function GET() {
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