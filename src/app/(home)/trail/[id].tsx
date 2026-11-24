import { useLocalSearchParams } from 'expo-router';

import { Trail } from '@/components/Trail';

/** On the trail (P-66): a wander's next step, Did it, and its footprints. `star` is the why it was opened from. */
export default function TrailScreen() {
  const { id, star } = useLocalSearchParams<{ id: string; star?: string }>();
  return <Trail id={id} starId={star} />;
}
