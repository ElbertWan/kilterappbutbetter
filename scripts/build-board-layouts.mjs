// Regenerates lib/board-layouts.json and public/board-layouts/*.png from the
// bundled Kilter SQLite database + the APK image assets.
//
// A Kilter board image is composited from layers that all share one canvas:
//   product_sizes/{id}.png            -- the board frame / kickboard outline
//   product_sizes_layouts_sets/*.png  -- one hold overlay per hold set
// The product_size row also carries the authoritative edge_* extents, which the
// board viewer uses to map physical hold coordinates onto the image. Only listed
// layouts have rendered images; everything else is intentionally skipped (the
// viewer shows a graceful "no board image" fallback for those products).
//
// Prereqs: data/db.sqlite3 (scripts/extract-db.mjs) and the Kilter+Board_*.xapk.
//
// Usage:
//   node scripts/build-board-layouts.mjs [path/to/Kilter+Board_x.y.z.xapk]

import Database from 'better-sqlite3';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sqlitePath = 'data/db.sqlite3';
if (!fs.existsSync(sqlitePath)) {
  console.error(`${sqlitePath} not found. Run scripts/extract-db.mjs first.`);
  process.exit(1);
}

const xapk =
  process.argv[2] ||
  fs.readdirSync('.').find((f) => f.endsWith('.xapk') && /Kilter\+Board_/.test(f));
if (!xapk || !fs.existsSync(xapk)) {
  console.error('Could not find a Kilter+Board_*.xapk. Pass the path as an argument.');
  process.exit(1);
}

// --- Extract the APK image assets we need ------------------------------------
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'kilter-imgs-'));
console.log(`Extracting ${xapk} …`);
execFileSync('unzip', ['-o', xapk, '-d', work], { stdio: 'ignore' });
const baseApk = fs
  .readdirSync(work)
  .find((f) => f.endsWith('.apk') && !f.startsWith('config.'));
if (!baseApk) {
  console.error('No base APK found inside the .xapk.');
  process.exit(1);
}
const assetsDir = path.join(work, 'assets_out');
execFileSync(
  'unzip',
  [
    '-o',
    path.join(work, baseApk),
    'assets/img/product_sizes/*',
    'assets/img/product_sizes_layouts_sets/*',
    '-d',
    assetsDir,
  ],
  { stdio: 'ignore' }
);
const assetPath = (filename) => path.join(assetsDir, 'assets/img', filename);

// --- Gather the layer recipe per (product_size, listed layout) ---------------
const db = new Database(sqlitePath, { readonly: true });
const rows = db
  .prepare(
    `SELECT pr.name AS product_name,
            ps.id AS size_id, ps.name AS size_name, ps.description AS size_desc,
            ps.edge_left, ps.edge_right, ps.edge_bottom, ps.edge_top,
            ps.image_filename AS frame_image,
            psls.set_id, psls.image_filename AS holds_image
       FROM product_sizes ps
       JOIN products pr ON pr.id = ps.product_id
       JOIN product_sizes_layouts_sets psls ON psls.product_size_id = ps.id
       JOIN layouts l ON l.id = psls.layout_id
      WHERE l.is_listed = 1 AND psls.is_listed = 1 AND ps.is_listed = 1
      ORDER BY ps.id, psls.set_id`
  )
  .all();
db.close();

const groups = new Map();
for (const r of rows) {
  if (!groups.has(r.size_id)) groups.set(r.size_id, { meta: r, layers: [] });
  groups.get(r.size_id).layers.push(r.holds_image);
}

// --- Composite each board image and build the layout manifest ----------------
const outDir = 'public/board-layouts';
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const manifest = {};
for (const [sizeId, { meta, layers }] of groups) {
  const frame = assetPath(meta.frame_image);
  const { width, height } = await sharp(frame).metadata();
  const overlays = layers
    .map((f) => assetPath(f))
    .filter((p) => fs.existsSync(p))
    .map((input) => ({ input }));

  const outFile = `product_size_${sizeId}.png`;
  await sharp(frame)
    .composite(overlays)
    .png()
    .toFile(path.join(outDir, outFile));

  manifest[String(sizeId)] = {
    productName: meta.product_name,
    image: `/board-layouts/${outFile}`,
    edgeLeft: meta.edge_left,
    edgeRight: meta.edge_right,
    edgeBottom: meta.edge_bottom,
    edgeTop: meta.edge_top,
    imageWidth: width,
    imageHeight: height,
    description: `${meta.size_name} · ${meta.size_desc}`,
  };
  console.log(
    `size ${sizeId} ${meta.product_name} ${meta.size_name} (${meta.size_desc}) ` +
      `→ ${outFile} ${width}x${height}, ${overlays.length} hold layers`
  );
}

fs.writeFileSync('lib/board-layouts.json', JSON.stringify(manifest));
fs.rmSync(work, { recursive: true, force: true });
console.log(`\nWrote lib/board-layouts.json (${Object.keys(manifest).length} sizes)`);
