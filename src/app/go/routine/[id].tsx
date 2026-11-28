import { useLocalSearchParams } from 'expo-router';

import { Plan } from '@/components/go/Plan';

/**
 * B-12 (P-90): Plan for a routine with no run (the plain editor's old address). With a run, it is that run's Plan.
 * P-97: `?from=routines` — opened from My routines: its way out goes back there.
 * P-111: `?at=<row>` — a step broken down (or a for each) as a view of its own; `?at=top`, the routine's own steps.
 */
export default function GoRoutine() {
  const { id, from, at } = useLocalSearchParams<{ id: string; from?: string; at?: string }>();
  const where = typeof at === 'string' ? at : undefined;
  return <Plan routineId={String(id)} fromList={from === 'routines'} at={where} key={`${String(id)}:${where ?? ''}`} />;
}
