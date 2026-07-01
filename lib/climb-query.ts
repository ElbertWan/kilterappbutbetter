import { query } from '@/lib/db';
import { getGradeRange } from '@/lib/grades';
import { boardTypeById, isBoardTypeId } from '@/lib/board-sizes';
import {
  resolveProductLayoutUuid,
  productNameForLayout,
  layoutIdsForProduct,
} from '@/lib/layout-resolve';

// Shared query logic for the two climb catalogs. The live catalog ("Current")
// reads the `climbs` / `climb_stats` tables; the historical catalog ("Archive")
// reads `archive_climbs` / `archive_climb_stats`. Both have identical shapes, so
// the source tables are the only difference.
export interface ClimbSource {
  climbsTable: string;
  statsTable: string;
}

export const LIVE_SOURCE: ClimbSource = {
  climbsTable: 'climbs',
  statsTable: 'climb_stats',
};

export const ARCHIVE_SOURCE: ClimbSource = {
  climbsTable: 'archive_climbs',
  statsTable: 'archive_climb_stats',
};

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

function mapRow(r: ClimbRow) {
  const current =
    r.display_difficulty != null ? Math.round(r.display_difficulty) : undefined;
  const official =
    r.benchmark_difficulty != null ? Math.round(r.benchmark_difficulty) : undefined;
  return {
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
  };
}

export async function fetchClimbList(
  searchParams: URLSearchParams,
  source: ClimbSource
) {
  const { climbsTable, statsTable } = source;

  const productName = searchParams.get('productName') || undefined;
  const minGrade = searchParams.get('minGrade') || undefined;
  const maxGrade = searchParams.get('maxGrade') || undefined;
  const minAscents = searchParams.get('minAscents')
    ? parseInt(searchParams.get('minAscents')!)
    : undefined;
  const verified = searchParams.get('verified') === 'true';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const angle = searchParams.get('angle')
    ? parseInt(searchParams.get('angle')!)
    : undefined;
  const name = searchParams.get('name')?.toLowerCase() || undefined;
  const setter = searchParams.get('setter')?.toLowerCase() || undefined;
  const boardTypeParam = searchParams.get('boardType') || undefined;
  const boardType =
    boardTypeParam && isBoardTypeId(boardTypeParam) ? boardTypeParam : undefined;
  const boardSize = searchParams.get('boardSize') || undefined;
  const page = parseInt(searchParams.get('page') || '0');
  const limit = parseInt(searchParams.get('limit') || '20');

  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  // When an angle is selected we join the stat for THAT angle. Otherwise we
  // represent each climb by its most-ascended angle via a lateral subquery.
  const statJoin =
    angle !== undefined
      ? `JOIN ${statsTable} s ON s.climb_uuid = c.uuid AND s.angle = ${p(angle)}`
      : `JOIN LATERAL (
           SELECT * FROM ${statsTable} s
            WHERE s.climb_uuid = c.uuid
            ORDER BY s.ascensionist_count DESC NULLS LAST
            LIMIT 1
         ) s ON true`;

  const where: string[] = [];

  if (boardType !== undefined) {
    const type = boardTypeById(boardType)!;
    const conds = [`c.layout_id = ${p(type.layoutId)}`];
    const size = boardSize
      ? type.sizes.find((s) => s.label === boardSize)
      : undefined;
    if (size) {
      conds.push(
        `${p(size.edges.left)} <= c.edge_left
         AND ${p(size.edges.right)} >= c.edge_right
         AND ${p(size.edges.bottom)} <= c.edge_bottom
         AND ${p(size.edges.top)} >= c.edge_top`
      );
    }
    where.push(conds.join(' AND '));
  } else if (productName !== undefined) {
    const ids = layoutIdsForProduct(productName);
    if (ids && ids.length) {
      where.push(`c.layout_id = ANY(${p(ids)})`);
    } else {
      where.push('false');
    }
  }

  if (name !== undefined) where.push(`c.name ILIKE ${p('%' + name + '%')}`);
  if (setter !== undefined)
    where.push(`c.setter_username ILIKE ${p('%' + setter + '%')}`);
  if (minAscents !== undefined)
    where.push(`s.ascensionist_count >= ${p(minAscents)}`);
  if (verified) where.push('s.benchmark_difficulty IS NOT NULL');

  const gradeRange = getGradeRange(minGrade, maxGrade);
  if (gradeRange) {
    where.push(
      `ROUND(s.display_difficulty) BETWEEN ${p(gradeRange.min)} AND ${p(gradeRange.max)}`
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const fromSql = `FROM ${climbsTable} c ${statJoin} ${whereSql}`;

  const orderSql =
    sortBy === 'ascents'
      ? 'ORDER BY s.ascensionist_count DESC'
      : sortBy === 'quality'
        ? 'ORDER BY s.quality_average DESC NULLS LAST'
        : sortBy === 'difficulty'
          ? 'ORDER BY s.display_difficulty DESC'
          : 'ORDER BY c.created_at DESC';

  const countRows = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total ${fromSql}`,
    params
  );
  const total = countRows[0]?.total ?? 0;

  const rows = await query<ClimbRow>(
    `SELECT c.uuid, c.layout_id, c.setter_username, c.name, c.description,
            c.edge_left, c.edge_right, c.edge_bottom, c.edge_top, c.frames, c.created_at,
            s.angle AS stat_angle, s.display_difficulty, s.benchmark_difficulty,
            s.ascensionist_count, s.quality_average, s.fa_username, s.fa_at
       ${fromSql}
       ${orderSql}
       LIMIT ${p(limit)} OFFSET ${p(page * limit)}`,
    params
  );

  return {
    climbs: rows.map(mapRow),
    total,
    page,
    limit,
    hasMore: page * limit + limit < total,
  };
}

export async function fetchClimbDetail(uuid: string, source: ClimbSource) {
  const { climbsTable, statsTable } = source;
  const rows = await query<ClimbRow>(
    `SELECT c.uuid, c.layout_id, c.setter_username, c.name, c.description,
            c.edge_left, c.edge_right, c.edge_bottom, c.edge_top, c.frames, c.created_at,
            s.angle AS stat_angle, s.display_difficulty, s.benchmark_difficulty,
            s.ascensionist_count, s.quality_average, s.fa_username, s.fa_at
       FROM ${climbsTable} c
       LEFT JOIN LATERAL (
         SELECT * FROM ${statsTable} s
          WHERE s.climb_uuid = c.uuid
          ORDER BY s.ascensionist_count DESC NULLS LAST
          LIMIT 1
       ) s ON true
      WHERE c.uuid = $1`,
    [uuid]
  );
  const r = rows[0];
  return r ? mapRow(r) : null;
}
