'use client';

import { use } from 'react';
import { ClimbDetail } from '@/components/climb-detail';

export default function ClimbDetailPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  return <ClimbDetail endpoint="/api/climbs" backHref="/climbs" uuid={uuid} />;
}
