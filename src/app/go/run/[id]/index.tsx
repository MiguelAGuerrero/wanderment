import { useLocalSearchParams } from 'expo-router';

import { Runner } from '@/components/go/Runner';

/** B-11 slice 1 (P-86): the runner for one run. */
export default function GoRun() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Runner runId={String(id)} key={String(id)} />;
}
