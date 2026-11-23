import { ComponentRef, ReactNode, useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { Id } from '@/domain/types';
import { C, s } from '@/theme';

import { Composer } from './Composer';
import { HomeSlot } from './HomeSlot';
import { PullInOffer } from './PullInOffer';
import { Toast } from './Toast';

/**
 * Standard screen: scrolling content, with the log box pinned at the bottom
 * (thumb zone) and the toast floating just above it.
 */
export function Screen({
  children,
  composer = true,
  presetDoingId,
  placeholder,
  footer,
  scrollToTopOn,
  aboveLog,
  slot,
  below,
  bottomHidden,
  edges = ['top'],
}: {
  children: ReactNode;
  composer?: boolean;
  presetDoingId?: Id;
  placeholder?: string;
  /** Replaces the log box (e.g. the attach-mode card on the graph). */
  footer?: ReactNode;
  /** When this changes to a value, the content scrolls back to the top. */
  scrollToTopOn?: string;
  /** Shown right above the log box. */
  aboveLog?: ReactNode;
  /** Home (P-61): the What's next card, with ＋ raising the log field above it (HomeSlot). */
  slot?: boolean;
  /** Under the log box (Home, P-58: the sheet's handle). */
  below?: ReactNode;
  /** The bottom (toast, log box) isn't drawn, only `below` (Home, P-58: under the sheet, which has its own). */
  bottomHidden?: boolean;
  /** Safe-area edges (P-58: Home's sheet sits under the top inset, so its sections take the bottom one). */
  edges?: Edge[];
}) {
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    if (scrollToTopOn) scroller.current?.scrollTo({ y: 0, animated: false });
  }, [scrollToTopOn]);
  return (
    <SafeAreaView style={s.screen} edges={edges}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroller} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {bottomHidden && below}
        {(composer || footer) && !bottomHidden && (
          <View style={styles.bottom}>
            <View style={styles.toastSlot} pointerEvents="box-none">
              <Toast />
            </View>
            {footer ?? (
              <>
                <PullInOffer />
                {aboveLog}
                {slot ? <HomeSlot /> : <Composer presetDoingId={presetDoingId} placeholder={placeholder} />}
              </>
            )}
            {below}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bottom: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, backgroundColor: C.bg },
  toastSlot: { position: 'absolute', left: 0, right: 0, bottom: '100%', height: 72 },
});
