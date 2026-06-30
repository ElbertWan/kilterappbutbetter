import { Pool } from 'pg';

// Netlify Database (managed Neon Postgres) injects NETLIFY_DB_URL across builds,
// functions and edge functions once a database is provisioned. For local `next
// dev`, mirror the same value into .env.local. The pool is created lazily so the
// build never needs the variable to be present.
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'NETLIFY_DB_URL is not set. Provision a Netlify DB (netlify db init / deploy) ' +
          'and add the connection string to .env.local for local development.'
      );
    }
    // The local Netlify dev DB (PGlite) runs on localhost without TLS; managed
    // Neon requires it.
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}
