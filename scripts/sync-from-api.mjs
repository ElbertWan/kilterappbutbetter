// Syncs the full Kilter climb catalog from the live Portal API into Postgres
// (Netlify DB / Neon). Replaces the old APK-snapshot import: data is fetched
// fresh from the API, so ascent counts, grades and newly-set climbs stay
// current. Safe to run repeatedly (e.g. from cron) — it upserts and prunes.
//
// The catalog is exposed per board layout at:
//   GET /api/climbs/all/{layoutId}       -> climbs for that product layout
//   GET /api/climb-stat/all/{layoutId}   -> per-angle stats for those climbs
// where {layoutId} is the NUMERIC product-layout id (e.g. 10 = 12x12 Original),
// NOT the product_layout UUID. Each layout's climb set is disjoint.
//
// Prereqs:
//   - KILTER_USERNAME / KILTER_PASSWORD in .env.local
//   - NETLIFY_DB_URL (or NETLIFY_DATABASE_URL / DATABASE_URL) in .env.local
//
// Usage (more heap helps with the ~116MB layout-10 payload):
//   node --max-old-space-size=4096 scripts/sync-from-api.mjs
//   npm run sync

import pg from 'pg';
import fs from 'node:fs';

if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const TOKEN_URL =
  'https://idp.kiltergrips.com/realms/kilter/protocol/openid-connect/token';
const API_BASE = 'https://portal.kiltergrips.com/api';

// Numeric product-layout ids to pull. Covers every layout in board-layouts.json
// (7-29) plus the low ids; empty layouts return [] and are skipped cheaply.
const LAYOUT_IDS = Array.from({ length: 35 }, (_, i) => i + 1);

// API productName -> coarse layout_id used by the webapp (lib/layout-resolve.ts
// LAYOUT_ID_TO_PRODUCT). Storing the coarse id keeps the existing schema and
// query/render logic working unchanged; the board image is still derived from
// the climb's edges by resolveProductLayoutUuid().
const PRODUCT_TO_LAYOUT_ID = {
  'Kilter Board Original': 1,
  JUUL: 2,
  'Demo Board': 3,
  'BKB Board': 4,
  Spire: 5,
  Tycho: 6,
  'Kilter Board Homewall': 8,
};

const conn =
  process.env.NETLIFY_DB_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.DATABASE_URL;
if (!conn) {
  console.error('Set NETLIFY_DB_URL (or NETLIFY_DATABASE_URL / DATABASE_URL).');
  process.exit(1);
}
if (!process.env.KILTER_USERNAME || !process.env.KILTER_PASSWORD) {
  console.error('Set KILTER_USERNAME and KILTER_PASSWORD.');
  process.exit(1);
}
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(conn);

let token = null;
let tokenExpiresAt = 0;
async function getToken(force = false) {
  if (!force && token && Date.now() < tokenExpiresAt) return token;
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'kilter',
    username: process.env.KILTER_USERNAME,
    password: process.env.KILTER_PASSWORD,
    scope: 'openid offline_access',
  });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!r.ok) throw new Error(`Keycloak auth failed: ${r.status}`);
  const data = await r.json();
  token = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return token;
}

async function apiGet(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const t = await getToken(attempt > 0);
    const r = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (r.status === 401) continue;
    if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`);
    return r.json();
  }
  throw new Error(`GET ${path} failed after retries`);
}

const num = (v) => (v == null || v === '' ? null : Number(v));

async function upsert(client, table, columns, conflict, rows, chunk = 1500) {
  const updates = columns
    .filter((c) => !conflict.includes(c))
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ');
  let done = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const values = [];
    const params = [];
    slice.forEach((row, r) => {
      const ph = columns.map((_, c) => `$${r * columns.length + c + 1}`);
      values.push(`(${ph.join(', ')})`);
      columns.forEach((col) => params.push(row[col]));
    });
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.join(', ')}
       ON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${updates}`,
      params
    );
    done += slice.length;
  }
  return done;
}

async function main() {
  const runId = Date.now();
  const client = new pg.Client({
    connectionString: conn,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  console.log('Ensuring schema …');
  await client.query(`
    CREATE TABLE IF NOT EXISTS climbs (
      uuid TEXT PRIMARY KEY,
      layout_id INT NOT NULL,
      setter_username TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      edge_left INT NOT NULL,
      edge_right INT NOT NULL,
      edge_bottom INT NOT NULL,
      edge_top INT NOT NULL,
      angle INT,
      frames TEXT NOT NULL DEFAULT '',
      created_at TEXT,
      synced_at BIGINT
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS climb_stats (
      climb_uuid TEXT NOT NULL,
      angle INT NOT NULL,
      display_difficulty REAL NOT NULL,
      benchmark_difficulty REAL,
      ascensionist_count INT NOT NULL DEFAULT 0,
      difficulty_average REAL,
      quality_average REAL,
      fa_username TEXT,
      fa_at TEXT,
      synced_at BIGINT,
      PRIMARY KEY (climb_uuid, angle)
    )
  `);
  // Tolerate a pre-existing schema that lacks synced_at.
  await client.query('ALTER TABLE climbs ADD COLUMN IF NOT EXISTS synced_at BIGINT');
  await client.query('ALTER TABLE climb_stats ADD COLUMN IF NOT EXISTS synced_at BIGINT');

  let totalClimbs = 0;
  let totalStats = 0;
  const perProduct = {};

  for (const layoutId of LAYOUT_IDS) {
    let climbs;
    try {
      climbs = await apiGet(`/climbs/all/${layoutId}`);
    } catch (e) {
      console.warn(`  layout ${layoutId}: climbs fetch failed (${e.message})`);
      continue;
    }
    if (!Array.isArray(climbs) || climbs.length === 0) continue;

    const stats = await apiGet(`/climb-stat/all/${layoutId}`);

    const climbRows = [];
    const keep = new Set();
    let skippedProduct = 0;
    for (const c of climbs) {
      if (!c.isListed || c.isDraft || c.isDeleted) continue;
      const coarse = PRODUCT_TO_LAYOUT_ID[c.productName];
      if (coarse === undefined) {
        skippedProduct++;
        continue;
      }
      keep.add(c.climbUuid);
      perProduct[c.productName] = (perProduct[c.productName] || 0) + 1;
      climbRows.push({
        uuid: c.climbUuid,
        layout_id: coarse,
        setter_username: c.username ?? '',
        name: c.name ?? '',
        description: c.description ?? '',
        edge_left: num(c.edgeLeft),
        edge_right: num(c.edgeRight),
        edge_bottom: num(c.edgeBottom),
        edge_top: num(c.edgeTop),
        angle: num(c.angle) ?? 0,
        frames: c.climbConcat ?? '',
        created_at: c.createdAt ?? null,
        synced_at: runId,
      });
    }

    const statRows = [];
    for (const s of Array.isArray(stats) ? stats : []) {
      if (!keep.has(s.climbUuid)) continue;
      const diffAvg = num(s.difficultyAverage);
      statRows.push({
        climb_uuid: s.climbUuid,
        angle: num(s.angle) ?? 0,
        display_difficulty: diffAvg ?? num(s.currentDifficultyId) ?? 0,
        benchmark_difficulty: num(s.officialKilterDifficulty),
        ascensionist_count: num(s.ascentCount) ?? 0,
        difficulty_average: diffAvg,
        quality_average: num(s.qualityAverage),
        fa_username: s.faUsername ?? null,
        fa_at: s.faAt ?? null,
        synced_at: runId,
      });
    }

    await client.query('BEGIN');
    const ci = await upsert(
      client,
      'climbs',
      [
        'uuid', 'layout_id', 'setter_username', 'name', 'description',
        'edge_left', 'edge_right', 'edge_bottom', 'edge_top', 'angle',
        'frames', 'created_at', 'synced_at',
      ],
      ['uuid'],
      climbRows
    );
    const si = await upsert(
      client,
      'climb_stats',
      [
        'climb_uuid', 'angle', 'display_difficulty', 'benchmark_difficulty',
        'ascensionist_count', 'difficulty_average', 'quality_average',
        'fa_username', 'fa_at', 'synced_at',
      ],
      ['climb_uuid', 'angle'],
      statRows
    );
    await client.query('COMMIT');

    totalClimbs += ci;
    totalStats += si;
    console.log(
      `  layout ${String(layoutId).padStart(2)}: ${ci} climbs, ${si} stats` +
        (skippedProduct ? ` (${skippedProduct} skipped: unknown product)` : '')
    );
  }

  console.log('Pruning rows no longer in the catalog …');
  const delStats = await client.query(
    'DELETE FROM climb_stats WHERE synced_at IS DISTINCT FROM $1',
    [runId]
  );
  const delClimbs = await client.query(
    'DELETE FROM climbs WHERE synced_at IS DISTINCT FROM $1',
    [runId]
  );

  console.log('Ensuring indexes …');
  await client.query(
    'CREATE INDEX IF NOT EXISTS idx_stats_angle_diff ON climb_stats (angle, display_difficulty)'
  );
  await client.query('CREATE INDEX IF NOT EXISTS idx_stats_uuid ON climb_stats (climb_uuid)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_climbs_layout ON climbs (layout_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_climbs_created ON climbs (created_at DESC)');

  await client.end();

  console.log('\nDone.');
  console.log(`  climbs upserted: ${totalClimbs}`);
  console.log(`  stats upserted:  ${totalStats}`);
  console.log(`  pruned:          ${delClimbs.rowCount} climbs, ${delStats.rowCount} stats`);
  console.log('  by product:', JSON.stringify(perProduct));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
