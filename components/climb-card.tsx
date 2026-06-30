'use client';

import { Climb } from '@/types';
import { difficultyIdToVGrade, getGradeColor } from '@/lib/grades';
import Link from 'next/link';
import { Star } from 'lucide-react';

interface ClimbCardProps {
  climb: Climb;
}

export function ClimbCard({ climb }: ClimbCardProps) {
  const difficulty = climb.official_kilter_difficulty || climb.current_difficulty_id;
  const vGrade = difficultyIdToVGrade(difficulty);
  const gradeColor = getGradeColor(vGrade);

  return (
    <Link href={`/climbs/${climb.climb_uuid}`}>
      <div className="group flex items-center gap-4 border-b border-gray-100 py-4 transition-colors last:border-0 hover:bg-gray-50 px-1 -mx-1 rounded-lg">
        <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-white ${gradeColor}`}>
          {vGrade}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{climb.name}</p>
          <p className="text-xs text-gray-400">by {climb.username}</p>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1 text-xs text-gray-400">
          <span>{climb.ascent_count || 0} ascents</span>
          {climb.quality_average ? (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {climb.quality_average.toFixed(1)}
            </span>
          ) : (
            <span className="text-gray-300">{climb.angle || 0}°</span>
          )}
        </div>
      </div>
    </Link>
  );
}
