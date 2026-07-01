import { NextRequest, NextResponse } from 'next/server';
import { fetchClimbDetail, ARCHIVE_SOURCE } from '@/lib/climb-query';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params;
  try {
    const climb = await fetchClimbDetail(uuid, ARCHIVE_SOURCE);
    if (!climb) {
      return NextResponse.json({ error: 'Climb not found' }, { status: 404 });
    }
    return NextResponse.json(climb);
  } catch (error) {
    console.error(`GET /api/archive-climbs/${uuid} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch archive climb' },
      { status: 500 }
    );
  }
}
