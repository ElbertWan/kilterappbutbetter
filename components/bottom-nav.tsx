'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mountain, Bluetooth, Info, Archive } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <nav className="sticky bottom-0 border-t border-gray-100 bg-white">
      <div className="flex items-center justify-around">
        <Link
          href="/climbs"
          className={`flex flex-1 flex-col items-center gap-1 py-3 px-4 text-xs font-medium transition-colors ${
            isActive('/climbs') ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Mountain className={`h-5 w-5 ${isActive('/climbs') ? 'stroke-[2.5]' : ''}`} />
          <span>Current</span>
        </Link>
        <Link
          href="/archive"
          className={`flex flex-1 flex-col items-center gap-1 py-3 px-4 text-xs font-medium transition-colors ${
            isActive('/archive') ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Archive className={`h-5 w-5 ${isActive('/archive') ? 'stroke-[2.5]' : ''}`} />
          <span>Archive</span>
        </Link>
        <Link
          href="/connect"
          className={`flex flex-1 flex-col items-center gap-1 py-3 px-4 text-xs font-medium transition-colors ${
            isActive('/connect') ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Bluetooth className={`h-5 w-5 ${isActive('/connect') ? 'stroke-[2.5]' : ''}`} />
          <span>Connect</span>
        </Link>
        <Link
          href="/about"
          className={`flex flex-1 flex-col items-center gap-1 py-3 px-4 text-xs font-medium transition-colors ${
            isActive('/about') ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Info className={`h-5 w-5 ${isActive('/about') ? 'stroke-[2.5]' : ''}`} />
          <span>About</span>
        </Link>
      </div>
    </nav>
  );
}
