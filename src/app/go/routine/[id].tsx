import { useLocalSearchParams } from 'expo-router';

import { Plan } from '@/components/go/Plan';

/**
 * B-12 (P-90): Plan for a routine with no run (the plain editor's old address). With a run, it is that run's Plan.
 * P-97: `?from=routines` — opened from My routines: its way out goes back there.
 */
export default function GoRoutine() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  return <Plan routineId={String(id)} fromList={from === 'routines'} key={String(id)} />;
}
