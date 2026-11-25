import { useLocalSearchParams } from 'expo-router';

import { Plan } from '@/components/go/Plan';

/** B-12 (P-90): Plan for a routine with no run (the plain editor's old address). With a run, it is that run's Plan. */
export default function GoRoutine() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Plan routineId={String(id)} key={String(id)} />;
}
