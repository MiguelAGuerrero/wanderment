import { useLocalSearchParams } from 'expo-router';

import { UnderStar } from '@/components/UnderStar';

/** Under a star (P-66): a why's wanders as landmarks and trails. */
export default function Star() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <UnderStar id={id} />;
}
