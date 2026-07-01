import pg from 'pg';
import fs from 'node:fs';
for (const line of fs.readFileSync('.env.local','utf8').split('\n')){
  const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if(m&&process.env[m[1]]===undefined)process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');
}
const conn=process.env.NETLIFY_DB_URL||process.env.NETLIFY_DATABASE_URL||process.env.DATABASE_URL;
const c=new pg.Client({connectionString:conn,ssl:{rejectUnauthorized:false}});
await c.connect();
// from_snapshot rows that DUPLICATE a live row by lower(name)+setter+edges
const dup=await c.query(`
  SELECT COUNT(*)::int n FROM climbs s
  WHERE s.from_snapshot
    AND EXISTS (
      SELECT 1 FROM climbs l
      WHERE l.from_snapshot IS NOT TRUE
        AND lower(btrim(l.name))=lower(btrim(s.name))
        AND l.setter_username=s.setter_username
        AND l.edge_left=s.edge_left AND l.edge_right=s.edge_right
        AND l.edge_bottom=s.edge_bottom AND l.edge_top=s.edge_top
    )`);
const total=await c.query('SELECT COUNT(*)::int n FROM climbs WHERE from_snapshot');
console.log('backfilled (from_snapshot) total:',total.rows[0].n);
console.log('  of which DUPLICATE a live climb (name+setter+edges):',dup.rows[0].n);
console.log('  genuinely absent from live:',total.rows[0].n-dup.rows[0].n);

// top genuinely-absent by ascents
const top=await c.query(`
  SELECT s.name,s.setter_username,s.layout_id, COALESCE(SUM(st.ascensionist_count),0)::int asc
  FROM climbs s
  LEFT JOIN climb_stats st ON st.climb_uuid=s.uuid AND st.from_snapshot
  WHERE s.from_snapshot
    AND NOT EXISTS (
      SELECT 1 FROM climbs l
      WHERE l.from_snapshot IS NOT TRUE
        AND lower(btrim(l.name))=lower(btrim(s.name))
        AND l.setter_username=s.setter_username
        AND l.edge_left=s.edge_left AND l.edge_right=s.edge_right
        AND l.edge_bottom=s.edge_bottom AND l.edge_top=s.edge_top)
  GROUP BY s.uuid,s.name,s.setter_username,s.layout_id
  ORDER BY asc DESC LIMIT 12`);
console.log('\nTop genuinely-absent climbs by ascents:');
for(const r of top.rows) console.log(`  ${String(r.asc).padStart(6)}  L${r.layout_id}  ${r.name} — ${r.setter_username}`);
await c.end();
