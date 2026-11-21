import { ComponentRef, ReactNode, useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Id } from '@/domain/types';
import { C, s } from '@/theme';

import { Composer } from './Composer';
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
  bridge,
  scrollToTopOn,
}: {
  children: ReactNode;
  composer?: boolean;
  presetDoingId?: Id;
  placeholder?: string;
  /** Replaces the log box (e.g. the attach-mode card on the graph). */
  footer?: ReactNode;
  /** Home only: a log with no thread offers the bridge ("Toward something — or just itself?"). */
  bridge?: boolean;
  /** When this changes to a value, the content scrolls back to the top (Home: the bridge appeared). */
  scrollToTopOn?: string;
}) {
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    if (scrollToTopOn) scroller.current?.scrollTo({ y: 0, animated: false });
  }, [scrollToTopOn]);
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroller} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {(composer || footer) && (
          <View style={styles.bottom}>
            <View style={styles.toastSlot} pointerEvents="box-none">
              <Toast />
            </View>
            {footer ?? (
              <>
                <PullInOffer />
                <Composer presetDoingId={presetDoingId} placeholder={placeholder} bridge={bridge} />
              </>
            )}
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
