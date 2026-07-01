// Imports the historical climb catalog from the bundled Kilter v3.9.18 APK
// snapshot into dedicated archive tables (archive_climbs / archive_climb_stats)
// in Postgres (Netlify DB / Neon). This is a SEPARATE catalog from the live
// `climbs` table: it preserves listed climbs with their frozen, historical
// ascent counts so the popular old problems that were dropped by the live API
// stay browsable in the app's "Archive" tab.
//
// Frames are translated from the legacy placement-id encoding to the live
// hole-id encoding so the board viewer renders them (see lib/frames.ts):
//   legacy snapshot:  p{placement_id}r{role_id}
//   live / archive:   h{hole_id}p{role_id}
// The placement -> hole map comes from the SQLite `placements` table.
//
// Scope: is_listed = 1 AND is_draft = 0 (the public catalog, ~251,895 climbs).
//
// Prereqs:
//   - data/db.sqlite3 exists (scripts/extract-db.mjs)
//   - NETLIFY_DB_URL (or NETLIFY_DATABASE_URL / DATABASE_URL) in .env.local
//
// Usage:
//   node --max-old-space-size=4096 scripts/import-archive.mjs
//   npm run import-archive

import Database from 'better-sqlite3';
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

const conn =
  process.env.NETLIFY_DB_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.DATABASE_URL;
if (!conn) {
  console.error('Set NETLIFY_DB_URL (or NETLIFY_DATABASE_URL / DATABASE_URL).');
  process.exit(1);
}
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(conn);

const sqlitePath = process.argv[2] || 'data/db.sqlite3';
if (!fs.existsSync(sqlitePath)) {
  console.error(`${sqlitePath} not found. Run scripts/extract-db.mjs first.`);
  process.exit(1);
}

const sqlite = new Database(sqlitePath, { readonly: true });
const client = new pg.Client({
  connectionString: conn,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
await client.connect();

// Translate legacy "p{placement}r{role}" -> live "h{hole}p{role}".
function translateFrames(concat, placeToHole) {
  if (!concat) return '';
  if (/h\d+p\d+/.test(concat) && !/p\d+r\d+/.test(concat)) return concat;
  let out = '';
  const re = /p(\d+)r(\d+)/g;
  let m;
  while ((m = re.exec(concat)) !== null) {
    const hole = placeToHole.get(Number(m[1]));
    if (hole === undefined) continue;
    out += `h${hole}p${m[2]}`;
  }
  return out;
}

async function bulkInsert(table, columns, rows, chunk = 1000) {
  const colList = columns.join(', ');
  let inserted = 0;
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
      `INSERT INTO ${table} (${colList}) VALUES ${values.join(', ')}`,
      params
    );
    inserted += slice.length;
    if (inserted % 40000 < chunk) console.log(`  ${table}: ${inserted}/${rows.length}`);
  }
  console.log(`  ${table}: ${inserted} rows done`);
}

console.log('Creating archive schema …');
await client.query('DROP TABLE IF EXISTS archive_climb_stats');
await client.query('DROP TABLE IF EXISTS archive_climbs');
await client.query(`
  CREATE TABLE archive_climbs (
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
    created_at TEXT
  )
`);
await client.query(`
  CREATE TABLE archive_climb_stats (
    climb_uuid TEXT NOT NULL,
    angle INT NOT NULL,
    display_difficulty REAL NOT NULL,
    benchmark_difficulty REAL,
    ascensionist_count INT NOT NULL DEFAULT 0,
    difficulty_average REAL,
    quality_average REAL,
    fa_username TEXT,
    fa_at TEXT,
    PRIMARY KEY (climb_uuid, angle)
  )
`);

console.log('Building placement -> hole map …');
const placeToHole = new Map(
  sqlite.prepare('SELECT id, hole_id FROM placements').all().map((r) => [r.id, r.hole_id])
);
console.log(`  ${placeToHole.size} placements`);

console.log('Reading listed, non-draft climbs from snapshot …');
const climbs = sqlite
  .prepare(
    `SELECT uuid, layout_id, setter_username, name, description,
            edge_left, edge_right, edge_bottom, edge_top, angle, frames, created_at
       FROM climbs
      WHERE is_listed = 1 AND is_draft = 0`
  )
  .all()
  .map((c) => ({
    uuid: c.uuid,
    layout_id: c.layout_id,
    setter_username: c.setter_username ?? '',
    name: c.name ?? '',
    description: c.description ?? '',
    edge_left: c.edge_left,
    edge_right: c.edge_right,
    edge_bottom: c.edge_bottom,
    edge_top: c.edge_top,
    angle: c.angle ?? null,
    frames: translateFrames(c.frames, placeToHole),
    created_at: c.created_at ?? null,
  }));
console.log(`  ${climbs.length} climbs`);
const keep = new Set(climbs.map((c) => c.uuid));

console.log('Reading their stats from snapshot …');
const stats = sqlite
  .prepare(
    `SELECT climb_uuid, angle, display_difficulty, benchmark_difficulty,
            ascensionist_count, difficulty_average, quality_average, fa_username, fa_at
       FROM climb_stats`
  )
  .all()
  .filter((s) => keep.has(s.climb_uuid))
  .map((s) => ({
    climb_uuid: s.climb_uuid,
    angle: s.angle,
    display_difficulty: s.display_difficulty,
    benchmark_difficulty: s.benchmark_difficulty ?? null,
    ascensionist_count: s.ascensionist_count ?? 0,
    difficulty_average: s.difficulty_average ?? null,
    quality_average: s.quality_average ?? null,
    fa_username: s.fa_username ?? null,
    fa_at: s.fa_at ?? null,
  }));
console.log(`  ${stats.length} stat rows`);

console.log('Inserting archive_climbs …');
await bulkInsert(
  'archive_climbs',
  [
    'uuid', 'layout_id', 'setter_username', 'name', 'description',
    'edge_left', 'edge_right', 'edge_bottom', 'edge_top', 'angle',
    'frames', 'created_at',
  ],
  climbs
);

console.log('Inserting archive_climb_stats …');
await bulkInsert(
  'archive_climb_stats',
  [
    'climb_uuid', 'angle', 'display_difficulty', 'benchmark_difficulty',
    'ascensionist_count', 'difficulty_average', 'quality_average', 'fa_username', 'fa_at',
  ],
  stats
);

console.log('Creating indexes …');
await client.query(
  'CREATE INDEX idx_archive_stats_angle_diff ON archive_climb_stats (angle, display_difficulty)'
);
await client.query('CREATE INDEX idx_archive_stats_uuid ON archive_climb_stats (climb_uuid)');
await client.query('CREATE INDEX idx_archive_climbs_layout ON archive_climbs (layout_id)');
await client.query('CREATE INDEX idx_archive_climbs_created ON archive_climbs (created_at DESC)');

const n = await client.query('SELECT COUNT(*)::int AS n FROM archive_climbs');
await client.end();
sqlite.close();
console.log(`\nDone. archive_climbs = ${n.rows[0].n}`);
