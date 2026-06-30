// User-selectable Kilter Board Original sizes. Each maps to a product_layout
// (and therefore a calibrated image) in lib/board-layouts.json. All Original
// layouts share one mounting-hole coordinate system, so any climb's holds can
// be rendered on any of these sizes.

// `edges` are the physical mounting-hole bounds of each board, taken from the
// matching product_layout in lib/board-layouts.json. A climb (which carries its
// own edge_left/right/bottom/top bounding box) "fits" on a board size when the
// board fully contains the climb. This mirrors the official app's query:
//   edge_left <= ? AND edge_right >= ? AND edge_bottom <= ? AND edge_top >= ?
// (see the `climbs_for_product_fetch_info` query in the Kilter APK).
export const BOARD_SIZES = [
  { label: '7x10', layoutUuid: '14', edges: { left: 28, right: 116, bottom: 36, top: 156 } },
  { label: '8x12', layoutUuid: '8', edges: { left: 24, right: 120, bottom: 0, top: 156 } },
  { label: '12x12', layoutUuid: '10', edges: { left: 0, right: 144, bottom: 0, top: 156 } },
  { label: '16x12', layoutUuid: '28', edges: { left: -24, right: 168, bottom: 0, top: 156 } },
] as const;

export type BoardSizeLabel = (typeof BOARD_SIZES)[number]['label'];

export const DEFAULT_BOARD_SIZE: BoardSizeLabel = '12x12';

export function layoutUuidForSize(size: BoardSizeLabel): string {
  return BOARD_SIZES.find((s) => s.label === size)?.layoutUuid ?? '10';
}

export function isBoardSizeLabel(value: string): value is BoardSizeLabel {
  return BOARD_SIZES.some((s) => s.label === value);
}

interface ClimbEdges {
  edge_left: number;
  edge_right: number;
  edge_bottom: number;
  edge_top: number;
}

// True when the given board size physically contains the climb's holds. Board
// sizes are a property of the Kilter Board Original product, so callers should
// also scope to product_name === 'Kilter Board Original'.
export function climbFitsSize(climb: ClimbEdges, size: BoardSizeLabel): boolean {
  const board = BOARD_SIZES.find((s) => s.label === size);
  if (!board) return true;
  const { left, right, bottom, top } = board.edges;
  return (
    left <= climb.edge_left &&
    right >= climb.edge_right &&
    bottom <= climb.edge_bottom &&
    top >= climb.edge_top
  );
}

// Map a climb's native product_layout_uuid to the closest selectable size,
// so the selector can highlight the climb's own board by default.
const NATIVE_UUID_TO_SIZE: Record<string, BoardSizeLabel> = {
  '7': '12x12',  // 12x14 Super Tall → nearest standard
  '8': '8x12',
  '10': '12x12',
  '14': '7x10',
  '27': '12x12',
  '28': '16x12',
};

export function sizeForLayoutUuid(uuid: string): BoardSizeLabel | null {
  return NATIVE_UUID_TO_SIZE[uuid] ?? null;
}

// ---------------------------------------------------------------------------
// Board types for browsing/filtering.
//
// The catalog holds climbs for several products, but only Kilter Board Original
// and Kilter Board Homewall have meaningful volume. Each type maps to a coarse
// `climbs.layout_id` (see lib/layout-resolve.ts) and exposes selectable sizes.
// A size's `edges` are its physical mounting-hole bounds (from
// lib/board-layouts.json); a climb "fits" a size when the board fully contains
// the climb's bounding box. Homewall sizes use the Full Ride LED layouts.
// ---------------------------------------------------------------------------

export type BoardTypeId = 'Original' | 'Homewall';

interface BoardTypeSize {
  label: string;
  layoutUuid: string;
  edges: { left: number; right: number; bottom: number; top: number };
}

export interface BoardTypeDef {
  id: BoardTypeId;
  productName: string;
  layoutId: number;
  sizes: BoardTypeSize[];
}

export const BOARD_TYPES: BoardTypeDef[] = [
  {
    id: 'Original',
    productName: 'Kilter Board Original',
    layoutId: 1,
    sizes: [
      { label: '7x10', layoutUuid: '14', edges: { left: 28, right: 116, bottom: 36, top: 156 } },
      { label: '8x12', layoutUuid: '8', edges: { left: 24, right: 120, bottom: 0, top: 156 } },
      { label: '12x12', layoutUuid: '10', edges: { left: 0, right: 144, bottom: 0, top: 156 } },
      { label: '16x12', layoutUuid: '28', edges: { left: -24, right: 168, bottom: 0, top: 156 } },
    ],
  },
  {
    id: 'Homewall',
    productName: 'Kilter Board Homewall',
    layoutId: 8,
    sizes: [
      { label: '7x10', layoutUuid: '17', edges: { left: -44, right: 44, bottom: 24, top: 144 } },
      { label: '8x12', layoutUuid: '23', edges: { left: -44, right: 44, bottom: -12, top: 144 } },
      { label: '10x10', layoutUuid: '21', edges: { left: -56, right: 56, bottom: 24, top: 144 } },
      { label: '10x12', layoutUuid: '25', edges: { left: -56, right: 56, bottom: -12, top: 144 } },
    ],
  },
];

export function isBoardTypeId(value: string): value is BoardTypeId {
  return BOARD_TYPES.some((t) => t.id === value);
}

export function boardTypeById(id: string): BoardTypeDef | undefined {
  return BOARD_TYPES.find((t) => t.id === id);
}

export function boardSizeEdges(
  typeId: string,
  sizeLabel: string
): BoardTypeSize['edges'] | undefined {
  return boardTypeById(typeId)?.sizes.find((s) => s.label === sizeLabel)?.edges;
}
