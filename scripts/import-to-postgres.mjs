// Loads the webapp-relevant subset of the bundled Kilter SQLite database into a
// Postgres database (Netlify DB / Neon). One-time / refresh migration.
//
// Prereqs:
//   1. data/db.sqlite3 exists (run scripts/extract-db.mjs first)
//   2. NETLIFY_DATABASE_URL (or DATABASE_URL) is set in .env.local
//
// Usage:
//   node scripts/import-to-postgres.mjs

import Database from 'better-sqlite3';
import pg from 'pg';
import fs from 'node:fs';

// Minimal .env.local loader (no extra dependency).
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
  console.error(
    'Set NETLIFY_DB_URL (or NETLIFY_DATABASE_URL / DATABASE_URL) before running.'
  );
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

console.log('Creating schema …');
await client.query('DROP TABLE IF EXISTS climb_stats');
await client.query('DROP TABLE IF EXISTS climbs');
await client.query(`
  CREATE TABLE climbs (
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
  CREATE TABLE climb_stats (
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
    if (inserted % 20000 < chunk) {
      console.log(`  ${table}: ${inserted}/${rows.length}`);
    }
  }
  console.log(`  ${table}: ${inserted} rows done`);
}

console.log('Reading climbs from SQLite …');
const climbs = sqlite
  .prepare(
    `SELECT uuid, layout_id, setter_username, name, description,
            edge_left, edge_right, edge_bottom, edge_top, angle, frames, created_at
       FROM climbs
      WHERE is_listed = 1 AND is_draft = 0
        AND uuid IN (SELECT DISTINCT climb_uuid FROM climb_stats)`
  )
  .all();
console.log(`  ${climbs.length} climbs`);

console.log('Reading climb_stats from SQLite …');
const stats = sqlite
  .prepare(
    `SELECT climb_uuid, angle, display_difficulty, benchmark_difficulty,
            ascensionist_count, difficulty_average, quality_average, fa_username, fa_at
       FROM climb_stats
      WHERE climb_uuid IN (
            SELECT uuid FROM climbs WHERE is_listed = 1 AND is_draft = 0)`
  )
  .all();
console.log(`  ${stats.length} stats`);

console.log('Inserting climbs …');
await bulkInsert(
  'climbs',
  [
    'uuid',
    'layout_id',
    'setter_username',
    'name',
    'description',
    'edge_left',
    'edge_right',
    'edge_bottom',
    'edge_top',
    'angle',
    'frames',
    'created_at',
  ],
  climbs
);

console.log('Inserting climb_stats …');
await bulkInsert(
  'climb_stats',
  [
    'climb_uuid',
    'angle',
    'display_difficulty',
    'benchmark_difficulty',
    'ascensionist_count',
    'difficulty_average',
    'quality_average',
    'fa_username',
    'fa_at',
  ],
  stats
);

console.log('Creating indexes …');
await client.query(
  'CREATE INDEX idx_stats_angle_diff ON climb_stats (angle, display_difficulty)'
);
await client.query('CREATE INDEX idx_stats_uuid ON climb_stats (climb_uuid)');
await client.query('CREATE INDEX idx_climbs_layout ON climbs (layout_id)');
await client.query('CREATE INDEX idx_climbs_created ON climbs (created_at DESC)');

await client.end();
sqlite.close();
console.log('Done.');
