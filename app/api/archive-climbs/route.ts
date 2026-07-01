import { NextRequest, NextResponse } from 'next/server';
import { fetchClimbList, ARCHIVE_SOURCE } from '@/lib/climb-query';

// The historical ("Archive") catalog: listed climbs from the bundled Kilter
// v3.9.18 APK snapshot, with their frozen ascent counts. Same query shape as
// /api/climbs, but reads the archive_climbs / archive_climb_stats tables.

export async function GET(request: NextRequest) {
  try {
    const result = await fetchClimbList(request.nextUrl.searchParams, ARCHIVE_SOURCE);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/archive-climbs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch archive climbs' },
      { status: 500 }
    );
  }
}
