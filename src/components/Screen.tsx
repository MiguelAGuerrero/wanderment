import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Id } from '@/domain/types';
import { C, s } from '@/theme';

import { Composer } from './Composer';
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
}: {
  children: ReactNode;
  composer?: boolean;
  presetDoingId?: Id;
  placeholder?: string;
}) {
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {composer && (
          <View style={styles.bottom}>
            <View style={styles.toastSlot} pointerEvents="box-none">
              <Toast />
            </View>
            <Composer presetDoingId={presetDoingId} placeholder={placeholder} />
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
