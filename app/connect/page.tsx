'use client';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useBle } from '@/components/ble-provider';
import { useBoard } from '@/components/board-provider';
import { BOARD_SIZES } from '@/lib/board-sizes';

const BleConnectButtonDynamic = dynamic(
  () => import('@/components/ble-connect-button').then((mod) => ({ default: mod.BleConnectButton })),
  { ssr: false }
);

export default function ConnectPage() {
  const { isConnected } = useBle();
  const { boardSize, setBoardSize } = useBoard();

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-4">
        <Link href="/climbs">
          <button className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </Link>

        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">Connect</h1>

        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-xl border border-gray-100 p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Status</p>
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-gray-300'}`}
              />
              <span className="text-sm text-gray-700">
                {isConnected ? 'Connected to board' : 'Not connected'}
              </span>
            </div>
            <BleConnectButtonDynamic />
          </div>

          {/* Your board */}
          <div className="rounded-xl border border-gray-100 p-5">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">Your board</p>
            <p className="mb-4 text-xs text-gray-400">
              Pick your board size so routes light up the correct holds.
            </p>
            <div className="flex flex-wrap gap-2">
              {BOARD_SIZES.map(({ label }) => (
                <button
                  key={label}
                  onClick={() => setBoardSize(label)}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    boardSize === label
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* How to use */}
          <div className="rounded-xl border border-gray-100 p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">How to use</p>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="shrink-0 text-gray-300">1.</span>
                Click the Connect button above
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 text-gray-300">2.</span>
                Select your Kilter Board from the list
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 text-gray-300">3.</span>
                Visit a climb and tap &ldquo;Light It Up&rdquo;
              </li>
            </ol>
          </div>

          {/* Browser support */}
          <div className="rounded-xl border border-gray-100 p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Supported Browsers</p>
            <ul className="space-y-1.5 text-sm text-gray-600">
              {[
                { label: 'Chrome 56+ (desktop & Android)', ok: true },
                { label: 'Edge 79+', ok: true },
                { label: 'Opera 43+', ok: true },
                { label: 'Safari / iOS', ok: false },
                { label: 'Firefox', ok: false },
              ].map(({ label, ok }) => (
                <li key={label} className={`flex items-center gap-2 ${ok ? '' : 'text-gray-400'}`}>
                  <span className={ok ? 'text-emerald-500' : 'text-gray-300'}>{ok ? '✓' : '✗'}</span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Requirements */}
          <div className="rounded-xl border border-gray-100 p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Requirements</p>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li>Supported browser with Web Bluetooth enabled</li>
              <li>Kilter Board within Bluetooth range (~30 feet)</li>
              <li>Bluetooth enabled on your device</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
