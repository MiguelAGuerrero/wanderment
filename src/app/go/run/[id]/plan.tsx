import { useLocalSearchParams } from 'expo-router';

import { Plan } from '@/components/go/Plan';

/**
 * B-12 (P-90): Plan for one run. A view of the data: if the run is running, it goes where the data says.
 * P-101 (ruling 2): `?in=<routine>` — from inside a call, that routine's Plan (while the run is in it).
 * P-103 (3): `?from=run` — opened from the runner, over it: its way out goes back there.
 * P-97: `?from=routines` — opened from My routines: its way out goes back there.
 * P-111: `?at=<row>` — a step broken down (or a for each) as a view of its own; `?at=top`, the routine's own steps;
 * none, where the run is (the innermost one it is in).
 */
export default function GoPlan() {
  const { id, in: inner, from, at } = useLocalSearchParams<{ id: string; in?: string; from?: string; at?: string }>();
  const where = typeof at === 'string' ? at : undefined;
  return <Plan runId={String(id)} inSeq={typeof inner === 'string' && inner ? inner : undefined} fromRun={from === 'run'} fromList={from === 'routines'} at={where} key={`${String(id)}:${inner ?? ''}:${where ?? ''}`} />;
}
