import { useLocalSearchParams } from 'expo-router';

import { Plan } from '@/components/go/Plan';

/**
 * B-12 (P-90): Plan for one run. A view of the data: if the run is running, it goes where the data says.
 * P-101 (ruling 2): `?in=<routine>` — from inside a call, that routine's Plan (while the run is in it).
 * P-103 (3): `?from=run` — opened from the runner, over it: its way out goes back there.
 * P-97: `?from=routines` — opened from My routines: its way out goes back there.
 */
export default function GoPlan() {
  const { id, in: inner, from } = useLocalSearchParams<{ id: string; in?: string; from?: string }>();
  return <Plan runId={String(id)} inSeq={typeof inner === 'string' && inner ? inner : undefined} fromRun={from === 'run'} fromList={from === 'routines'} key={`${String(id)}:${inner ?? ''}`} />;
}
