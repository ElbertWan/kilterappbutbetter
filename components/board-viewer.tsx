'use client';

import { Climb } from '@/types';
import { parseClimbConcat } from '@/lib/frames';
import mountingHoles from '@/lib/mounting-holes.json';
import boardLayouts from '@/lib/board-layouts.json';

type BoardData = {
  extent: [number, number, number, number];
  holes: Record<string, [number, number]>;
};

type Layout = {
  productName: string;
  image: string;
  edgeLeft: number;
  edgeRight: number;
  edgeBottom: number;
  edgeTop: number;
  imageWidth: number;
  imageHeight: number;
  description: string | null;
};

const HOLES = mountingHoles as unknown as Record<string, BoardData>;
const LAYOUTS = boardLayouts as Record<string, Layout>;

// Requested colour convention.
const ROLE_COLORS: Record<string, string> = {
  start: '#22c55e',  // green  — starting holds
  middle: '#3b82f6', // blue   — hand / "both" holds
  finish: '#a855f7', // purple — finish holds
  foot: '#eab308',   // yellow — foot holds
};

interface BoardViewerProps {
  climb: Climb;
}

export function BoardViewer({ climb }: BoardViewerProps) {
  const holds = parseClimbConcat(climb.climb_concat);

  // Always render the climb on its own native board layout.
  const layout = LAYOUTS[String(climb.product_layout_uuid)] as Layout | undefined;
  const board = layout ? (HOLES[layout.productName] as BoardData | undefined) : undefined;

  if (!layout || !board) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-xs text-gray-400">
        No board image for this layout
      </div>
    );
  }

  const { imageWidth: W, imageHeight: H, edgeLeft, edgeRight, edgeBottom, edgeTop } = layout;

  const toPx = (x: number, y: number): [number, number] => [
    ((x - edgeLeft) / (edgeRight - edgeLeft)) * W,
    ((edgeTop - y) / (edgeTop - edgeBottom)) * H, // board y is bottom-up; image y is top-down
  ];

  // Hole spacing is ~8 coordinate units; size rings to roughly fill a hole.
  const pxPerUnit = W / (edgeRight - edgeLeft);
  const radius = pxPerUnit * 3.6;
  const strokeWidth = radius * 0.34;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-xl border border-gray-100 bg-white"
        role="img"
        aria-label={`Board route for ${climb.name}`}
      >
        <image href={layout.image} x={0} y={0} width={W} height={H} />

        {holds.map((hold, idx) => {
          const coord = board.holes[String(hold.position)];
          if (!coord) return null;
          const [cx, cy] = toPx(coord[0], coord[1]);
          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={ROLE_COLORS[hold.role] ?? '#9ca3af'}
              strokeWidth={strokeWidth}
            />
          );
        })}
      </svg>
    </div>
  );
}
