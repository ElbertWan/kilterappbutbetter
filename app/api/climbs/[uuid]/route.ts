import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  resolveProductLayoutUuid,
  productNameForLayout,
} from '@/lib/layout-resolve';

interface ClimbRow {
  uuid: string;
  layout_id: number;
  setter_username: string;
  name: string;
  description: string;
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
  frames: string;
  created_at: string | null;
  stat_angle: number | null;
  display_difficulty: number | null;
  benchmark_difficulty: number | null;
  ascensionist_count: number | null;
  quality_average: number | null;
  fa_username: string | null;
  fa_at: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params;
  try {
    // Represent the climb by its most-ascended angle (matches the list's
    // "any angle" behaviour).
    const rows = await query<ClimbRow>(
      `SELECT c.uuid, c.layout_id, c.setter_username, c.name, c.description,
              c.edge_left, c.edge_right, c.edge_bottom, c.edge_top, c.frames, c.created_at,
              s.angle AS stat_angle, s.display_difficulty, s.benchmark_difficulty,
              s.ascensionist_count, s.quality_average, s.fa_username, s.fa_at
         FROM climbs c
         LEFT JOIN LATERAL (
           SELECT * FROM climb_stats s
            WHERE s.climb_uuid = c.uuid
            ORDER BY s.ascensionist_count DESC NULLS LAST
            LIMIT 1
         ) s ON true
        WHERE c.uuid = $1`,
      [uuid]
    );

    const r = rows[0];
    if (!r) {
      return NextResponse.json({ error: 'Climb not found' }, { status: 404 });
    }

    const current =
      r.display_difficulty != null ? Math.round(r.display_difficulty) : undefined;
    const official =
      r.benchmark_difficulty != null
        ? Math.round(r.benchmark_difficulty)
        : undefined;

    return NextResponse.json({
      climb_uuid: r.uuid,
      name: r.name,
      description: r.description,
      username: r.setter_username,
      product_name: productNameForLayout(r.layout_id),
      product_layout_uuid: resolveProductLayoutUuid(r.layout_id, r),
      climb_concat: r.frames,
      edge_left: r.edge_left,
      edge_right: r.edge_right,
      edge_bottom: r.edge_bottom,
      edge_top: r.edge_top,
      angle: r.stat_angle ?? 0,
      created_at: r.created_at,
      is_listed: 1,
      is_draft: 0,
      ascent_count: r.ascensionist_count ?? 0,
      current_difficulty_id: current,
      official_kilter_difficulty: official,
      difficulty_average: r.display_difficulty ?? undefined,
      quality_average: r.quality_average ?? undefined,
      fa_username: r.fa_username ?? undefined,
      fa_at: r.fa_at ?? undefined,
    });
  } catch (error) {
    console.error(`GET /api/climbs/${uuid} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch climb' },
      { status: 500 }
    );
  }
}
