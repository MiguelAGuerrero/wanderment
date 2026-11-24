import { useLocalSearchParams } from 'expo-router';

import { Editor } from '@/components/go/Editor';

/** B-11 slice 1 (P-86): the plain editor of one routine. */
export default function GoRoutine() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Editor routineId={String(id)} key={String(id)} />;
}
