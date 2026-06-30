// The Kilter `frames` column encodes holds as "p{placement_id}r{role_id}" pairs,
// e.g. "p1176r12p1192r15". The numeric placement id keys the physical x/y
// coordinates in lib/mounting-holes.json.
//
// Role IDs are assigned per product (see the `placement_roles` table), but every
// board follows the same start / middle / finish / foot ordering:
//   Original 12-15, JUUL 20-23, Demo 24-27, BKB 28-31, Spire 32-35,
//   Tycho 36-41 (named by colour), Homewall 42-45.
const ROLE_ID_MAP: Record<number, string> = {
  12: 'start', 13: 'middle', 14: 'finish', 15: 'foot', // Kilter Board Original
  20: 'start', 21: 'middle', 22: 'finish', 23: 'foot', // JUUL
  24: 'start', 25: 'middle', 26: 'finish', 27: 'foot', // Demo Board
  28: 'start', 29: 'middle', 30: 'finish', 31: 'foot', // BKB Board
  32: 'start', 33: 'middle', 34: 'finish', 35: 'foot', // Spire
  36: 'middle', 37: 'finish', 38: 'foot', 39: 'start', 40: 'finish', 41: 'middle', // Tycho
  42: 'start', 43: 'middle', 44: 'finish', 45: 'foot', // Kilter Board Homewall
};

const ROLE_TO_ID: Record<string, number> = {
  start: 12,
  middle: 13,
  finish: 14,
  foot: 15,
};

export interface Hold {
  /** mounting_hole_uuid — key into the coordinate lookup */
  position: number;
  role: 'start' | 'middle' | 'finish' | 'foot';
}

export function parseClimbConcat(concat: string | null | undefined): Hold[] {
  if (!concat) return [];

  const holds: Hold[] = [];
  const re = /p(\d+)r(\d+)/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(concat)) !== null) {
    const position = parseInt(match[1], 10);
    const roleId = parseInt(match[2], 10);
    holds.push({
      position,
      role: (ROLE_ID_MAP[roleId] ?? 'middle') as Hold['role'],
    });
  }

  return holds;
}

export function encodeHoldsToConcat(holds: Hold[]): string {
  return holds
    .map((h) => `p${h.position}r${ROLE_TO_ID[h.role] ?? 13}`)
    .join('');
}
