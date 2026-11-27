import { useLocalSearchParams } from 'expo-router';

import { Plan } from '@/components/go/Plan';

/**
 * B-12 (P-90): Plan for one run. A view of the data: if the run is running, it goes where the data says.
 * P-101 (ruling 2): `?in=<routine>` — from inside a call, that routine's Plan (while the run is in it).
 */
export default function GoPlan() {
  const { id, in: inner } = useLocalSearchParams<{ id: string; in?: string }>();
  return <Plan runId={String(id)} inSeq={typeof inner === 'string' && inner ? inner : undefined} key={`${String(id)}:${inner ?? ''}`} />;
}
