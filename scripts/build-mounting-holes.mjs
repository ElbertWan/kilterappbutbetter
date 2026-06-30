// Regenerates lib/mounting-holes.json from the bundled Kilter SQLite database.
//
// The board viewer maps a climb's `frames` (a list of `p{placement_id}r{role}`
// pairs) to physical x/y board coordinates. The authoritative mapping is
//   placements.id -> placements.hole_id -> holes.(x, y)
// keyed per product (holes.product_id -> products.name). Placement ids are
// global and unique, and the imported climbs come from this same database, so
// this is the correct coordinate source for every live climb.
//
// Prereq: data/db.sqlite3 exists (run scripts/extract-db.mjs first).
//
// Usage:
//   node scripts/build-mounting-holes.mjs

import Database from 'better-sqlite3';
import fs from 'node:fs';

const sqlitePath = process.argv[2] || 'data/db.sqlite3';
if (!fs.existsSync(sqlitePath)) {
  console.error(`${sqlitePath} not found. Run scripts/extract-db.mjs first.`);
  process.exit(1);
}

const sqlite = new Database(sqlitePath, { readonly: true });

const rows = sqlite
  .prepare(
    `SELECT pr.name AS product, p.id AS placement_id, h.x AS x, h.y AS y
       FROM placements p
       JOIN holes h ON h.id = p.hole_id
       JOIN products pr ON pr.id = h.product_id`
  )
  .all();

const byProduct = {};
for (const { product, placement_id, x, y } of rows) {
  if (!byProduct[product]) byProduct[product] = {};
  byProduct[product][placement_id] = [x, y];
}

const out = {};
for (const [product, holes] of Object.entries(byProduct)) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of Object.values(holes)) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  out[product] = { extent: [minX, maxX, minY, maxY], holes };
  console.log(
    `${product}: ${Object.keys(holes).length} placements, extent [${minX}, ${maxX}, ${minY}, ${maxY}]`
  );
}

fs.writeFileSync('lib/mounting-holes.json', JSON.stringify(out));
sqlite.close();
console.log('Wrote lib/mounting-holes.json');
