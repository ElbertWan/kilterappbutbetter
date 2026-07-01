'use client';

import { ClimbBrowser } from '@/components/climb-browser';

export default function ArchivePage() {
  return (
    <ClimbBrowser
      endpoint="/api/archive-climbs"
      hrefBase="/archive"
      title="Archive"
      storageKey="kilter:archiveFilters"
      banner={
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          Historical catalog from the 2024 Kilter app snapshot. These climbs
          include classics that were dropped from the current app; ascent counts
          are frozen at that time.
        </p>
      }
    />
  );
}
