'use client';

import { useEffect, useState, useCallback } from 'react';
import { Climb, ClimbFilters } from '@/types';
import { ClimbCard } from '@/components/climb-card';
import { ClimbFiltersPanel } from '@/components/climb-filters';
import { SearchBar } from '@/components/search-bar';
import { BrowserCompatBanner } from '@/components/browser-compat-banner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const FILTERS_STORAGE_KEY = 'kilter:climbFilters';

export default function ClimbsPage() {
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<ClimbFilters>({
    sortBy: 'newest',
    limit: 20,
  });
  const [ready, setReady] = useState(false);

  const fetchClimbs = useCallback(
    async (newPage: number = 0) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: newPage.toString(),
          limit: '20',
        });

        if (filters.minGrade) params.append('minGrade', filters.minGrade);
        if (filters.maxGrade) params.append('maxGrade', filters.maxGrade);
        if (filters.minAscents) params.append('minAscents', filters.minAscents.toString());
        if (filters.verified) params.append('verified', 'true');
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.angle !== undefined) params.append('angle', filters.angle.toString());
        if (filters.boardSize) params.append('boardSize', filters.boardSize);
        if (filters.name) params.append('name', filters.name);
        if (filters.setter) params.append('setter', filters.setter);

        const response = await fetch(`/api/climbs?${params.toString()}`);
        const data = await response.json() as {
          climbs: Climb[];
          total: number;
          hasMore: boolean;
        };

        const safeClimbs = data.climbs ?? [];

        if (newPage === 0) {
          setClimbs(safeClimbs);
        } else {
          setClimbs((prev) => [...prev, ...safeClimbs]);
        }
        setTotal(data.total ?? 0);
        setHasMore(data.hasMore ?? false);
        setPage(newPage);
      } catch (error) {
        console.error('Failed to fetch climbs:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  // Restore persisted filter-panel selections once on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ClimbFilters;
        setFilters((prev) => ({ ...prev, ...parsed, page: 0 }));
      }
    } catch {
      // ignore malformed/unavailable storage
    }
    setReady(true);
  }, []);

  // Persist filter-panel selections (search text and pagination are excluded).
  useEffect(() => {
    if (!ready) return;
    try {
      const persisted: ClimbFilters = {
        minGrade: filters.minGrade,
        maxGrade: filters.maxGrade,
        minAscents: filters.minAscents,
        verified: filters.verified,
        sortBy: filters.sortBy,
        angle: filters.angle,
        boardSize: filters.boardSize,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }
  }, [filters, ready]);

  useEffect(() => {
    if (!ready) return;
    fetchClimbs(0);
  }, [filters, fetchClimbs, ready]);

  const handleFilterChange = useCallback((newFilters: ClimbFilters) => {
    setFilters((prev) => {
      const next = { ...prev, ...newFilters };
      const changed = (Object.keys(next) as (keyof ClimbFilters)[]).some(
        (k) => next[k] !== prev[k]
      );
      return changed ? next : prev;
    });
  }, []);

  const handleSearchChange = useCallback(
    (query: string, mode: 'climb' | 'setter') => {
      if (mode === 'climb') {
        handleFilterChange({ name: query || undefined });
      } else {
        handleFilterChange({ setter: query || undefined });
      }
    },
    [handleFilterChange]
  );

  const handleClear = useCallback(() => {
    handleFilterChange({ name: undefined, setter: undefined });
  }, [handleFilterChange]);

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-2xl space-y-3 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight text-gray-900">Kilter Climbs</h1>
            <ClimbFiltersPanel filters={filters} onFilterChange={handleFilterChange} />
          </div>
          <SearchBar onSearchChange={handleSearchChange} onClear={handleClear} />
          <BrowserCompatBanner />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-2">
        {isLoading && page === 0 ? (
          <div className="space-y-1 pt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-100">
                <Skeleton className="h-7 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : climbs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No climbs found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div>
              {climbs.map((climb) => (
                <ClimbCard key={climb.climb_uuid} climb={climb} />
              ))}
            </div>

            {hasMore && (
              <div className="py-6">
                <Button
                  onClick={() => fetchClimbs(page + 1)}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-gray-200 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}

            <p className="py-4 text-center text-xs text-gray-300">
              {climbs.length} of {total} climbs
            </p>
          </>
        )}
      </div>
    </div>
  );
}
