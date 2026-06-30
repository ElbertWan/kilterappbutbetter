'use client';

import { ClimbFilters } from '@/types';
import { V_GRADES } from '@/lib/grades';
import { BOARD_SIZES, BoardSizeLabel } from '@/lib/board-sizes';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

interface ClimbFiltersProps {
  filters: ClimbFilters;
  onFilterChange: (filters: ClimbFilters) => void;
}

export function ClimbFiltersPanel({ filters, onFilterChange }: ClimbFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleGradeChange = (grade: string) => {
    if (filters.minGrade === grade && filters.maxGrade === grade) {
      onFilterChange({ ...filters, minGrade: undefined, maxGrade: undefined });
    } else {
      onFilterChange({ ...filters, minGrade: grade, maxGrade: grade });
    }
  };

  const handleAscentChange = (value: number) => {
    onFilterChange({ ...filters, minAscents: value === 0 ? undefined : value });
  };

  const handleSortChange = (value: ClimbFilters['sortBy']) => {
    onFilterChange({ ...filters, sortBy: value });
  };

  const handleAngleChange = (value: number) => {
    onFilterChange({ ...filters, angle: value === -1 ? undefined : value });
  };

  const handleBoardSizeChange = (value: BoardSizeLabel) => {
    onFilterChange({
      ...filters,
      boardSize: filters.boardSize === value ? undefined : value,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({ sortBy: 'newest', page: 0 });
  };

  const hasActiveFilters =
    filters.minGrade ||
    filters.maxGrade ||
    filters.minAscents ||
    filters.verified ||
    filters.angle !== undefined ||
    filters.boardSize !== undefined ||
    (filters.sortBy && filters.sortBy !== 'newest');

  const ANGLES = [-1, 0, 10, 20, 30, 40, 50, 60, 70];
  const ASCENT_OPTIONS = [
    { label: 'Any', value: 0 },
    { label: '10+', value: 10 },
    { label: '50+', value: 50 },
    { label: '100+', value: 100 },
    { label: '500+', value: 500 },
  ];
  const SORT_OPTIONS: { label: string; value: NonNullable<ClimbFilters['sortBy']> }[] = [
    { label: 'Newest', value: 'newest' },
    { label: 'Most Ascents', value: 'ascents' },
    { label: 'Highest Quality', value: 'quality' },
    { label: 'Hardest First', value: 'difficulty' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
              !
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl border-0 bg-white px-4 pb-8">
        <SheetHeader className="mb-6 pt-2">
          <SheetTitle className="text-left text-base font-semibold text-gray-900">Filters</SheetTitle>
        </SheetHeader>

        <div className="space-y-7">
          {/* Grade */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Grade</p>
            <div className="flex flex-wrap gap-1.5">
              {V_GRADES.map((grade) => (
                <button
                  key={grade}
                  onClick={() => handleGradeChange(grade)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filters.minGrade === grade && filters.maxGrade === grade
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* Minimum Ascents */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Minimum Ascents</p>
            <div className="flex flex-wrap gap-1.5">
              {ASCENT_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleAscentChange(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filters.minAscents === value || (filters.minAscents === undefined && value === 0)
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Verified */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700">Verified grades only</p>
              <p className="text-xs text-gray-400">Climbs with Kilter-verified grades</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!filters.verified}
              aria-label="Verified grades only"
              onClick={() => onFilterChange({ ...filters, verified: !filters.verified })}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                filters.verified ? 'bg-gray-900' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  filters.verified ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Board Size */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Board Size</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onFilterChange({ ...filters, boardSize: undefined })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filters.boardSize === undefined
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                }`}
              >
                Any
              </button>
              {BOARD_SIZES.map(({ label }) => (
                <button
                  key={label}
                  onClick={() => handleBoardSizeChange(label)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filters.boardSize === label
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">Kilter Board Original climbs that fit the selected board</p>
          </div>

          {/* Sort */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Sort By</p>
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleSortChange(value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    (filters.sortBy || 'newest') === value
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Angle */}
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Board Angle</p>
            <div className="flex flex-wrap gap-1.5">
              {ANGLES.map((angle) => (
                <button
                  key={angle}
                  onClick={() => handleAngleChange(angle)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    (angle === -1 && filters.angle === undefined) || filters.angle === angle
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  {angle === -1 ? 'Any' : `${angle}°`}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-3 text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
