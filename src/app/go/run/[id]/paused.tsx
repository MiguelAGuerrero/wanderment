import { useLocalSearchParams } from 'expo-router';

import { Paused } from '@/components/go/Paused';

/** B-11 slice 1 (P-86): the paused (or waiting) screen for one run. */
export default function GoPaused() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Paused runId={String(id)} key={String(id)} />;
}
