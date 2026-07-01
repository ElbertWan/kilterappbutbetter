import { NextRequest, NextResponse } from 'next/server';
import { fetchClimbList, LIVE_SOURCE } from '@/lib/climb-query';

// A board climb has a different grade, ascent count and quality at every angle,
// stored as one climb_stats row per (climb, angle). The board database is the
// full library; the old `/climbs/curated` endpoint was only the ~5.5k verified
// subset. "Verified grades only" now maps to that subset (benchmark_difficulty
// IS NOT NULL); with it off we return all listed climbs at the chosen grade.

export async function GET(request: NextRequest) {
  try {
    const result = await fetchClimbList(request.nextUrl.searchParams, LIVE_SOURCE);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/climbs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch climbs' },
      { status: 500 }
    );
  }
}
