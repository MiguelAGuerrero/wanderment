import { useLocalSearchParams } from 'expo-router';

import { Plan } from '@/components/go/Plan';

/** B-12 (P-90): Plan for one run. A view of the data: if the run is not in Plan, it goes where the data says. */
export default function GoPlan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Plan runId={String(id)} key={String(id)} />;
}
