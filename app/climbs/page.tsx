'use client';

import { ClimbBrowser } from '@/components/climb-browser';

export default function ClimbsPage() {
  return (
    <ClimbBrowser
      endpoint="/api/climbs"
      hrefBase="/climbs"
      title="Kilter Climbs"
      storageKey="kilter:climbFilters"
    />
  );
}
