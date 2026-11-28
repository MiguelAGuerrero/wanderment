import { useLocalSearchParams } from 'expo-router';

import { Composer } from '@/components/go/Composer';

/**
 * P-114 (B-19 slice 1): the composer for a routine just made from a start on New's sheet. Not remembered: opened any
 * other way (a reload, a link) it is the routine's Plan. `?from=routines`: opened from My routines (its way out goes back there).
 */
export default function GoCompose() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Composer routineId={String(id)} key={String(id)} />;
}
