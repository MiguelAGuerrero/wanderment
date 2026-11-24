import { useLocalSearchParams } from 'expo-router';

import { Jump } from '@/components/go/SeeAll';

/** B-11 slice 1 (P-86): Jump to… for one run. */
export default function GoJump() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Jump runId={String(id)} key={String(id)} />;
}
