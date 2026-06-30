import boardLayouts from '@/lib/board-layouts.json';

interface Layout {
  productName: string;
  edgeLeft: number;
  edgeRight: number;
  edgeBottom: number;
  edgeTop: number;
}

const LAYOUTS = boardLayouts as Record<string, Layout>;

// `climbs.layout_id` (from the board database) → product name. The product name
// keys both the board image set (board-layouts.json) and the hold-coordinate
// lookup (mounting-holes.json).
const LAYOUT_ID_TO_PRODUCT: Record<number, string> = {
  1: 'Kilter Board Original',
  2: 'JUUL',
  3: 'Demo Board',
  4: 'BKB Board',
  5: 'Spire',
  6: 'Tycho',
  7: 'Tycho',
  8: 'Kilter Board Homewall',
};

// Reverse map for the (rarely used) productName filter parameter.
const PRODUCT_TO_LAYOUT_IDS: Record<string, number[]> = {
  'Kilter Board Original': [1],
  'Kilter Board Homewall': [8],
  JUUL: [2],
  Spire: [5],
  Tycho: [6, 7],
  'Demo Board': [3],
  'BKB Board': [4],
};

export function productNameForLayout(layoutId: number): string | undefined {
  return LAYOUT_ID_TO_PRODUCT[layoutId];
}

export function layoutIdsForProduct(productName: string): number[] | undefined {
  return PRODUCT_TO_LAYOUT_IDS[productName];
}

interface Edges {
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
}

const area = (l: Layout) =>
  (l.edgeRight - l.edgeLeft) * (l.edgeTop - l.edgeBottom);

// Keys are product_size ids (see lib/board-layouts.json). Listed in order of
// preference so climbs render on the board people expect: the canonical full
// board first, then progressively larger fallbacks. Hold coordinates are shared
// across a product's sizes, so a larger board still positions holds correctly.
//   Original: 12x12 w/ kickboard → 12x14 (taller) → 16x12 (wider)
//   Homewall: 10x12 Full Ride (contains every hole) → 8x12 → 10x10 → 7x10
const PREFERRED_LAYOUTS: Record<string, string[]> = {
  'Kilter Board Original': ['10', '7', '28'],
  'Kilter Board Homewall': ['25', '23', '21', '17'],
  JUUL: ['11'],
  Tycho: ['16'],
};

// Pick a renderable product_layout (board image) for a climb. The board DB only
// stores a layout_id, but the viewer needs a concrete product_layout whose image
// and edges match the climb's product.
export function resolveProductLayoutUuid(
  layoutId: number,
  e: Edges
): string | null {
  const product = LAYOUT_ID_TO_PRODUCT[layoutId];
  if (!product) return null;

  const contains = (l: Layout) =>
    l.edgeLeft <= e.edge_left &&
    l.edgeRight >= e.edge_right &&
    l.edgeBottom <= e.edge_bottom &&
    l.edgeTop >= e.edge_top;

  // 1. The canonical display board for this product, if it fits the climb.
  for (const key of PREFERRED_LAYOUTS[product] ?? []) {
    const l = LAYOUTS[key];
    if (l && contains(l)) return key;
  }

  const candidates = Object.entries(LAYOUTS).filter(
    ([, l]) => l.productName === product
  );
  if (candidates.length === 0) return null;

  // 2. Smallest other board of this product that still contains the climb.
  const fits = candidates
    .filter(([, l]) => contains(l))
    .sort((a, b) => area(a[1]) - area(b[1]));
  if (fits.length > 0) return fits[0][0];

  // 3. Largest board of this product, so as many holds as possible render.
  candidates.sort((a, b) => area(b[1]) - area(a[1]));
  return candidates[0][0];
}
