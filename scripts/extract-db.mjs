// Extracts the bundled SQLite database from a Kilter Board Android package
// (.xapk) into data/db.sqlite3, which the import script then loads into Postgres.
//
// Usage:
//   node scripts/extract-db.mjs "Kilter+Board_3.9.18_APKPure.xapk"
//
// The .xapk is a zip of split APKs; the base APK contains assets/db.sqlite3.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const xapk =
  process.argv[2] ||
  fs.readdirSync('.').find((f) => f.endsWith('.xapk') && /Kilter\+Board_/.test(f));

if (!xapk || !fs.existsSync(xapk)) {
  console.error('Could not find an .xapk. Pass the path as the first argument.');
  process.exit(1);
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'kilter-extract-'));
console.log(`Extracting ${xapk} …`);
execFileSync('unzip', ['-o', xapk, '-d', work], { stdio: 'ignore' });

const baseApk = fs
  .readdirSync(work)
  .find((f) => f.endsWith('.apk') && !f.startsWith('config.'));
if (!baseApk) {
  console.error('No base APK found inside the .xapk.');
  process.exit(1);
}

console.log(`Reading ${baseApk} …`);
execFileSync('unzip', ['-o', path.join(work, baseApk), 'assets/db.sqlite3', '-d', work], {
  stdio: 'ignore',
});

fs.mkdirSync('data', { recursive: true });
fs.copyFileSync(path.join(work, 'assets/db.sqlite3'), 'data/db.sqlite3');
fs.rmSync(work, { recursive: true, force: true });

const mb = (fs.statSync('data/db.sqlite3').size / 1048576).toFixed(1);
console.log(`Wrote data/db.sqlite3 (${mb} MB)`);
