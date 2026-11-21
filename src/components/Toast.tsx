import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '@/store/useStore';
import { C } from '@/theme';

const SHOW_MS = 6000;

/**
 * Confirms what was logged and where. One action (Undo); tapping the body opens details.
 * Stays at least 6 s and pauses while touched, hovered or focused. On iOS/Android it doesn't
 * auto-dismiss under a screen reader; browsers can't tell, so on web it's announced politely
 * and pauses while keyboard focus is inside it.
 */
export function Toast() {
  const toast = useStore((s) => s.toast);
  const undo = useStore((s) => s.undo);
  const dismiss = useStore((s) => s.dismissToast);
  const [held, setHeld] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // react-native-web always reports a screen reader, which would keep every toast up forever.
    if (Platform.OS !== 'web') AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
  }, []);

  useEffect(() => {
    if (toast && Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility?.(toast.message);
  }, [toast]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (toast && !held && !screenReader) timer.current = setTimeout(dismiss, SHOW_MS);
    return () => clearTimeout(timer.current);
  }, [toast, held, screenReader, dismiss]);

  if (!toast) return null;
  const hold = {
    onPressIn: () => setHeld(true),
    onPressOut: () => setHeld(false),
    onHoverIn: () => setHeld(true),
    onHoverOut: () => setHeld(false),
    onFocus: () => setHeld(true),
    onBlur: () => setHeld(false),
  };
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <Pressable
          {...hold}
          onPress={() => {
            if (toast.activityId) router.push(`/activity/${toast.activityId}`);
            dismiss();
          }}
          style={styles.body}
          accessibilityRole={toast.activityId ? 'button' : 'text'}>
          <Text style={styles.msg}>{toast.message}</Text>
          {toast.activityId && <Text style={styles.sub}>Tap for details</Text>}
        </Pressable>
        <Pressable {...hold} onPress={undo} style={styles.undo} accessibilityRole="button" accessibilityLabel="Undo">
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, bottom: 8, alignItems: 'center' },
  toast: { width: '100%', maxWidth: 616, flexDirection: 'row', alignItems: 'center', backgroundColor: C.ink, borderRadius: 14, paddingRight: 6, minHeight: 52 },
  body: { flex: 1, paddingLeft: 16, paddingVertical: 6, minHeight: 52, justifyContent: 'center' },
  msg: { color: '#fff', fontSize: 15 },
  sub: { color: '#CFCBC3', fontSize: 12 },
  undo: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
  undoText: { color: '#F2B48A', fontWeight: '600', fontSize: 15 },
});
