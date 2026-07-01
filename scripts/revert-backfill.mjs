// One-off cleanup: undoes the earlier `from_snapshot` merge into the live
// `climbs` table. The historical snapshot now lives in its own archive tables
// (scripts/import-archive.mjs), so the live `climbs` table returns to being a
// pure mirror of the Portal API sync.
//
// Usage:
//   node scripts/revert-backfill.mjs

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

const client = new pg.Client({
  connectionString: conn,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
await client.connect();

const hasCol = await client.query(
  "SELECT 1 FROM information_schema.columns WHERE table_name='climbs' AND column_name='from_snapshot'"
);
if (hasCol.rowCount === 0) {
  console.log('No from_snapshot column on climbs; nothing to revert.');
  await client.end();
  process.exit(0);
}

const delStats = await client.query('DELETE FROM climb_stats WHERE from_snapshot');
const delClimbs = await client.query('DELETE FROM climbs WHERE from_snapshot');
await client.query('ALTER TABLE climb_stats DROP COLUMN IF EXISTS from_snapshot');
await client.query('ALTER TABLE climbs DROP COLUMN IF EXISTS from_snapshot');

const n = await client.query('SELECT COUNT(*)::int AS n FROM climbs');
await client.end();
console.log(
  `Removed ${delClimbs.rowCount} climbs, ${delStats.rowCount} stats; dropped from_snapshot column.`
);
console.log(`climbs is now a pure live mirror: ${n.rows[0].n} rows.`);
