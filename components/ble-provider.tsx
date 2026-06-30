'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BleContextType {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const BleContext = createContext<BleContextType | undefined>(undefined);

export function BleProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { connectToBoard } = await import('@/lib/ble');
      await connectToBoard();
      setIsConnected(true);
    } catch (err) {
      // User dismissed the device picker — not an error worth surfacing
      const isCancelled =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.message.toLowerCase().includes('cancel'));
      if (!isCancelled) {
        const message = err instanceof Error ? err.message : 'Connection failed';
        setError(message);
      }
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const { disconnect: bleDisconnect } = await import('@/lib/ble');
      await bleDisconnect();
    } catch (e) {
      console.error('Disconnect error:', e);
    }
    setIsConnected(false);
  }, []);

  return (
    <BleContext.Provider value={{ isConnected, isConnecting, error, connect, disconnect }}>
      {children}
    </BleContext.Provider>
  );
}

export function useBle(): BleContextType {
  const context = useContext(BleContext);
  if (!context) {
    throw new Error('useBle must be used within BleProvider');
  }
  return context;
}
