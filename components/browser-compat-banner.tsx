'use client';

import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export function BrowserCompatBanner() {
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const isSupported = !!(navigator as any).bluetooth;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isChrome = /Chrome|Chromium|CriOS/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isOpera = /OPR|Opera/.test(navigator.userAgent);

    if (!isSupported) {
      setShow(true);
      setIsIos(ios);
      if (!ios) {
        if (/Firefox/.test(navigator.userAgent)) {
          setMessage('Web Bluetooth is not supported in Firefox. Use Chrome or Edge.');
        } else if (isChrome || isEdge || isOpera) {
          setMessage("Web Bluetooth is not available. Make sure you're on a secure (HTTPS) connection.");
        } else {
          setMessage('Web Bluetooth is not supported in your browser. Use Chrome, Edge, or Opera.');
        }
      }
    }
  }, []);

  if (!show) return null;

  return (
    <div className="flex gap-2.5 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      {isIos ? (
        <p>
          iOS browsers don&apos;t support Web Bluetooth. Open this page in{' '}
          <a
            href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Bluefy
          </a>{' '}
          (free on the App Store) to connect to your board.
        </p>
      ) : (
        <p>{message}</p>
      )}
    </div>
  );
}
