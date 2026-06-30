'use client';

import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SearchBarProps {
  onSearchChange: (query: string, mode: 'climb' | 'setter') => void;
  onClear: () => void;
}

export function SearchBar({ onSearchChange, onClear }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'climb' | 'setter'>('climb');

  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      onSearchChangeRef.current(query, mode);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, mode]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
        <Input
          type="text"
          placeholder={mode === 'climb' ? 'Search climbs...' : 'Search setters...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-gray-200 bg-white pl-9 text-sm text-gray-900 placeholder:text-gray-300 focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); onClear(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex gap-1">
        {(['climb', 'setter'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === m
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            }`}
          >
            {m === 'climb' ? 'Climb Name' : 'Setter Name'}
          </button>
        ))}
      </div>
    </div>
  );
}
