import { useLocalSearchParams } from 'expo-router';

import { Rise } from '@/components/Rise';

/** The rise (P-73): a line just sent up, as a session over the one home. */
export default function Line() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Rise id={id} />;
}
