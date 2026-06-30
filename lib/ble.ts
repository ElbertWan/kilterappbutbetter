'use client';

import { AuroraBoard } from '@hangtime/grip-connect';
import type { Hold } from './frames';

// Kilter placement-role -> LED color, from the board's placement_types.led_color
// (start=green, middle/hand=cyan, finish=magenta, foot=orange).
const ROLE_COLORS: Record<Hold['role'], string> = {
  start: '#00FF00',
  middle: '#00FFFF',
  finish: '#FF00FF',
  foot: '#FFA500',
};

export interface LedHold {
  /**
   * LED position index on the board — NOT the mounting-hole / placement id.
   * Callers must resolve placement id -> LED position via board data before
   * passing it here (see lightHolds note).
   */
  position: number;
  role: Hold['role'];
}

let board: AuroraBoard | null = null;

function getBoard(): AuroraBoard {
  if (!board) {
    board = new AuroraBoard();
  }
  return board;
}

export async function connectToBoard(): Promise<void> {
  if (typeof navigator === 'undefined' || !(navigator as unknown as { bluetooth?: unknown }).bluetooth) {
    throw new Error('Web Bluetooth is not supported in this browser');
  }

  const b = getBoard();

  // grip-connect drives the connection via success/error callbacks and also
  // returns a promise. Bridge both into one awaitable, first signal wins.
  let settled = false;
  await new Promise<void>((resolve, reject) => {
    const done = (err?: Error) => {
      if (settled) return;
      settled = true;
      err ? reject(err) : resolve();
    };
    b.connect(
      () => done(),
      (err) => done(err instanceof Error ? err : new Error(String(err)))
    ).catch((err) => done(err instanceof Error ? err : new Error(String(err))));
  });
}

export async function lightHolds(holds: LedHold[]): Promise<void> {
  const b = getBoard();
  if (!b.isConnected()) return;

  const config = holds.map((h) => ({
    position: h.position,
    color: ROLE_COLORS[h.role] ?? ROLE_COLORS.middle,
  }));

  await b.led(config);
}

export function isConnected(): boolean {
  return board?.isConnected() ?? false;
}

export function disconnect(): void {
  board?.disconnect();
}
