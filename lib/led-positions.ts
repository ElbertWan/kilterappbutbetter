import ledData from './led-positions.json';

// Maps (product_layout_uuid -> mounting_hole_uuid -> LED position) for sending
// over Bluetooth. Sourced from the Kilter `hold_placements` table (PowerSync),
// where each row carries `led_position`. LED positions are layout-specific: the
// same mounting hole has different LED indices on different board sizes, so the
// climb's product_layout_uuid must be used as the key.
const LED = ledData as Record<string, Record<string, number>>;

/**
 * Resolve a hold's LED position for a given board layout.
 * Returns null when the layout or hole is unknown (caller should skip it).
 */
export function resolveLedPosition(
  productLayoutUuid: string | number,
  mountingHoleUuid: string | number
): number | null {
  const layout = LED[String(productLayoutUuid)];
  if (!layout) return null;
  const pos = layout[String(mountingHoleUuid)];
  return pos === undefined ? null : pos;
}

export function hasLayout(productLayoutUuid: string | number): boolean {
  return String(productLayoutUuid) in LED;
}
