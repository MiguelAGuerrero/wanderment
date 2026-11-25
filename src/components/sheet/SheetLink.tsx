import { Redirect } from 'expo-router';
import { useLayoutEffect } from 'react';

import { OLD_HOME } from '@/domain/home';
import { SheetSection } from '@/domain/sheet';
import { useStore } from '@/store/useStore';

/**
 * A link to a section of Home's sheet (P-58): /wanders and /activities (the old tab URLs, kept for
 * bookmarks) open the home (P-83: Map is retired) with the sheet out on that section.
 */
export function SheetLink({ section }: { section: SheetSection }) {
  const openSheet = useStore((st) => st.openSheet);
  // Before the redirect: Home comes up with the sheet already out (no slide).
  useLayoutEffect(() => openSheet(section), [openSheet, section]);
  return <Redirect href={OLD_HOME} />;
}
