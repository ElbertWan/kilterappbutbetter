'use client';

import { useBle } from './ble-provider';
import { Button } from '@/components/ui/button';
import { Bluetooth } from 'lucide-react';
import { useEffect, useState } from 'react';

export function BleConnectButton() {
  const { isConnected, isConnecting, error, connect, disconnect } = useBle();
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && !!(navigator as any).bluetooth);
  }, []);

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {isConnected ? (
        <Button onClick={disconnect} variant="destructive" size="sm" className="gap-2">
          <Bluetooth className="h-4 w-4" />
          Disconnect Board
        </Button>
      ) : (
        <Button onClick={connect} disabled={isConnecting} size="sm" className="gap-2">
          <Bluetooth className="h-4 w-4" />
          {isConnecting ? 'Connecting...' : 'Connect to Board'}
        </Button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
