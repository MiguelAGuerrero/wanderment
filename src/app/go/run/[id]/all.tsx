import { useLocalSearchParams } from 'expo-router';

import { SeeAll } from '@/components/go/SeeAll';

/** B-11 slice 1 (P-86): See it all — "This run of <name>". */
export default function GoAll() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SeeAll runId={String(id)} key={String(id)} />;
}
