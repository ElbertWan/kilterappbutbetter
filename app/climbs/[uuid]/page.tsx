'use client';

import { useEffect, useState } from 'react';
import { Climb } from '@/types';
import { BoardViewer } from '@/components/board-viewer';
import { useBle } from '@/components/ble-provider';
import { useBoard } from '@/components/board-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { difficultyIdToVGrade, getGradeColor } from '@/lib/grades';
import { parseClimbConcat } from '@/lib/frames';
import { Share2, ArrowLeft, Star, Zap, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const BleConnectButtonDynamic = dynamic(
  () => import('@/components/ble-connect-button').then((mod) => ({ default: mod.BleConnectButton })),
  { ssr: false }
);

export default function ClimbDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const [climb, setClimb] = useState<Climb | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useBle();
  const { layoutUuid } = useBoard();

  useEffect(() => {
    const loadClimb = async () => {
      const { uuid } = await params;
      try {
        const response = await fetch(`/api/climbs/${uuid}`);
        if (!response.ok) throw new Error('Failed to load climb');
        const data = await response.json() as Climb;
        setClimb(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load climb');
      } finally {
        setIsLoading(false);
      }
    };
    loadClimb();
  }, [params]);

  const handleLightUp = async () => {
    if (!climb || !isConnected) return;
    try {
      const holds = parseClimbConcat(climb.climb_concat);
      const { lightHolds } = await import('@/lib/ble');
      const { resolveLedPosition } = await import('@/lib/led-positions');
      // Resolve each mounting hole to the LED position for the user's selected
      // board (its layout). Holes not present on that board are skipped.
      const ledHolds = holds.flatMap((h) => {
        const position = resolveLedPosition(layoutUuid, h.position);
        return position === null ? [] : [{ position, role: h.role }];
      });
      await lightHolds(ledHolds);
    } catch (err) {
      console.error('Failed to light holds:', err);
    }
  };

  const handleShare = async () => {
    if (!climb) return;
    const url = `${window.location.origin}/climbs/${climb.climb_uuid}`;
    if (navigator.share) {
      navigator.share({
        title: climb.name,
        text: `Check out this ${difficultyIdToVGrade(climb.official_kilter_difficulty || climb.current_difficulty_id)} climb!`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white px-4 py-4 space-y-6">
        <Skeleton className="h-5 w-16" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !climb) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-400">{error || 'Climb not found'}</p>
          <Link href="/climbs">
            <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
              <ArrowLeft className="h-4 w-4" />
              Back to Climbs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const difficulty = climb.official_kilter_difficulty || climb.current_difficulty_id;
  const vGrade = difficultyIdToVGrade(difficulty);
  const gradeColor = getGradeColor(vGrade);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-4">
        <Link href="/climbs">
          <button className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{climb.name}</h1>
            <p className="mt-1 text-sm text-gray-400">by {climb.username}</p>
          </div>
          <span className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold text-white ${gradeColor}`}>
            {vGrade}
          </span>
        </div>

        {climb.description && (
          <p className="mb-6 text-sm text-gray-500 leading-relaxed">{climb.description}</p>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-100 text-center">
          <div className="py-4">
            <p className="text-xl font-semibold text-gray-900">{climb.ascent_count || 0}</p>
            <p className="text-xs text-gray-400">Ascents</p>
          </div>
          <div className="py-4">
            <p className="flex items-center justify-center gap-1 text-xl font-semibold text-gray-900">
              {climb.quality_average ? (
                <>
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {climb.quality_average.toFixed(1)}
                </>
              ) : '—'}
            </p>
            <p className="text-xs text-gray-400">Quality</p>
          </div>
          <div className="py-4">
            <p className="text-xl font-semibold text-gray-900">{climb.angle || 0}°</p>
            <p className="text-xs text-gray-400">Angle</p>
          </div>
        </div>

        {climb.fa_username && (
          <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs">
            <p className="font-medium text-gray-500 uppercase tracking-wider mb-1">First Ascent</p>
            <p className="text-gray-700">
              {climb.fa_username}
              {climb.fa_at && <span className="text-gray-400"> · {new Date(climb.fa_at).toLocaleDateString()}</span>}
            </p>
          </div>
        )}

        {/* Board Visualization */}
        <div className="mb-6">
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Route</p>
          </div>
          <BoardViewer climb={climb} />
        </div>

        {/* Actions */}
        <div className="space-y-2 pb-4">
          {isConnected && (
            <Button
              onClick={handleLightUp}
              className="w-full gap-2 bg-gray-900 text-white hover:bg-gray-700"
            >
              <Zap className="h-4 w-4" />
              Light It Up
            </Button>
          )}
          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full gap-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <BleConnectButtonDynamic />
        </div>
      </div>
    </div>
  );
}
