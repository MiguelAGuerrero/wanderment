/**
 * Settings (B-11 §5; P-89): where the data lives, Export, Import (checked, previewed, replace only)
 * and the version. In the new look, at `/go/settings`. It also says — only to someone who has any —
 * that what they kept in the app before this design is still here and in every export.
 */
import { router, useIsFocused } from 'expo-router';
import { ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { VERSION_LABEL } from '@/build';
import { moveFocus } from '@/components/a11y';
import { exportBackup } from '@/components/exportBackup';
import { ImportPreviewCard } from '@/components/ImportPreview';
import { canCheckForUpdates, checkForUpdates, UpdateCheck } from '@/pwa/serviceWorker';
import { backupsLocation } from '@/storage/nativeBackup';
import { askToKeepData, onPersistenceAnswered, PersistenceStatus, persistenceStatus } from '@/storage/persistent';
import { confirmImport, ImportPreview, previewImport, rebasePreview } from '@/store/importBackup';
import { holdsData, RECONNECTING_NOTICE, useStore } from '@/store/useStore';

import { G, SP } from './tokens';
import { Bar, Btn, Field, focusSoon, GoScreen, H1, T, TextRef, ViewRef } from './ui';

/** Said to someone whose data holds wanders or lines from before this design (no counts: B-11 §6). */
export const EARLIER_KEPT = 'Your earlier wanders and lines are kept, and are in every export.';

export function Settings() {
  const data = useStore((st) => st.data);
  const storage = useStore((st) => st.storage);
  const holding = useStore(holdsData);
  const focused = useIsFocused();
  const [message, setMessage] = useState<string>();
  /** The refusal note is about now: once the data is back it's gone. */
  const said = message === RECONNECTING_NOTICE && holding ? undefined : message;
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  /** A checked backup waiting for Replace or Cancel; a new one takes its place (`previews` remounts it). */
  const [preview, setPreview] = useState<ImportPreview>();
  const [previews, setPreviews] = useState(0);
  /** Always compared with what's here now. */
  const shown = useMemo(() => preview && rebasePreview(preview, data), [preview, data]);
  const title = useRef<TextRef>(null);
  const importRef = useRef<ViewRef>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  /** Native: where the data section starts in the scroll view, and the preview last scrolled to. */
  const dataY = useRef(0);
  const scrolledTo = useRef(-1);
  const [kept, setKept] = useState<PersistenceStatus>();
  /** What the last "Ask the browser to keep it" got; separate from import/export messages. */
  const [keepNote, setKeepNote] = useState<string>();
  const refusals = useRef(0);
  const keptRef = useRef<ViewRef>(null);
  /** What the last "Check for updates" found; a new version shows as the update banner. */
  const [update, setUpdate] = useState<UpdateCheck | 'checking'>();
  /** Wanders or lines kept from before this design. */
  const earlier = Object.keys(data.threads).length > 0 || Object.keys(data.activities).length > 0;

  useEffect(() => {
    if (focused) focusSoon(title);
  }, [focused]);

  // What's here changed under an open preview (another tab's changes): its words change, so say so.
  const lastShown = useRef(shown);
  useEffect(() => {
    const was = lastShown.current;
    lastShown.current = shown;
    if (was && shown && was.incoming === shown.incoming && JSON.stringify(was.plan) !== JSON.stringify(shown.plan)) setMessage(CHANGED);
  }, [shown]);

  // iOS has no live regions: say it out loud. (Android's live region and the web's aria-live already do.)
  useEffect(() => {
    if (Platform.OS === 'ios' && said) AccessibilityInfo.announceForAccessibility(said);
  }, [said]);

  const checkUpdates = async () => {
    setUpdate('checking');
    setUpdate(await checkForUpdates());
  };

  useEffect(() => {
    let live = true;
    const read = () => void persistenceStatus().then((status) => live && setKept(status));
    read();
    // The automatic request may be answered while Settings is open.
    const off = onPersistenceAnswered(read);
    return () => {
      live = false;
      off();
    };
  }, []);

  const askToKeep = async () => {
    const status = await askToKeepData();
    setKept(status);
    if (status === 'not-granted') {
      refusals.current++;
      setKeepNote(refusals.current === 1 ? 'The browser didn’t promise this time.' : 'Still no promise from the browser. Exporting a backup keeps your data safe.');
    } else {
      setKeepNote(undefined);
      // The button is gone: keep focus on the line that now says what happened.
      if (Platform.OS === 'web') requestAnimationFrame(() => (keptRef.current as unknown as HTMLElement | null)?.focus?.());
    }
  };

  const exportData = async () => {
    await exportBackup(data);
    setMessage('Exported.');
  };

  /** Checks the file and shows what it would do; nothing changes until Replace. */
  const importJson = (json: string) => {
    // Native: the paste box's keyboard would cover the preview.
    Keyboard.dismiss();
    try {
      setPreview(previewImport(json));
      setPreviews((n) => n + 1);
      setMessage(undefined);
    } catch (e) {
      setPreview(undefined);
      setMessage((e as Error).message);
    }
  };

  /** The preview is gone: focus goes back where importing started, not to the top of the page. */
  const backToImport = () => requestAnimationFrame(() => moveFocus(importRef.current));

  const replace = () => {
    if (!shown) return;
    const result = confirmImport(shown);
    if (result.ok) {
      setPreview(undefined);
      setPasting(false);
      // What it held was counted in the preview; a backup may hold no activities at all (routines and runs).
      setMessage(IMPORTED);
      backToImport();
    } else if (result.reason === 'changed') {
      setPreview(result.preview);
      setMessage(CHANGED);
    } else if (result.reason === 'reconnecting') {
      // Refused: the preview and the pasted text stay, to try again.
      setMessage(RECONNECTING_NOTICE);
    }
  };

  const cancel = () => {
    setPreview(undefined);
    setMessage(undefined);
    backToImport();
  };

  const importData = () => {
    if (Platform.OS !== 'web') return setPasting(true);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) importJson(await file.text());
    };
    input.click();
  };

  return (
    <GoScreen testID="go-settings">
      <Bar onBack={() => (router.canGoBack() ? router.back() : router.replace('/go'))}>
        <H1 ref={title}>Settings</H1>
      </Bar>
      <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.section} onLayout={(e) => (dataY.current = e.nativeEvent.layout.y)}>
          <H2>Your data</H2>
          <T testID="go-settings-where">
            {storage.state === 'ready' && storage.kind === 'local'
              ? 'Saved in this browser’s local storage (this browser can’t run the database).'
              : Platform.OS === 'web'
                ? 'Saved in a database in this browser.'
                : 'Saved in a database on this device.'}
            {backupsLocation ? ` Automatic backups: ${backupsLocation}.` : ''}
          </T>
          {earlier && <T testID="go-settings-earlier">{EARLIER_KEPT}</T>}
          <View ref={keptRef} accessibilityLiveRegion="polite" {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})} style={styles.lines}>
            {kept && keptLine[kept] && <T dim>{keptLine[kept]}</T>}
            {kept === 'not-granted' && keepNote && <T dim>{keepNote}</T>}
          </View>
          {kept === 'not-granted' && <Btn label="Ask the browser to keep it" onPress={askToKeep} style={styles.start} />}
          <Btn label="Export everything (.json)" onPress={exportData} style={styles.start} testID="go-settings-export" />
          <Btn ref={importRef} label="Import from a backup" onPress={importData} style={styles.start} testID="go-settings-import" />
          {pasting && (
            <View style={styles.lines}>
              <Field value={pasted} onChangeText={setPasted} multiline placeholder="Paste backup JSON" style={styles.paste} accessibilityLabel="Backup JSON" />
              <Btn label="Import" onPress={() => importJson(pasted)} style={styles.start} />
            </View>
          )}
          {shown && (
            <View
              onLayout={(e) => {
                // Native: bring a new preview into view (it can open below the fold).
                if (Platform.OS === 'web' || scrolledTo.current === previews) return;
                scrolledTo.current = previews;
                scrollRef.current?.scrollTo({ y: Math.max(0, dataY.current + e.nativeEvent.layout.y - 12) });
              }}>
              <ImportPreviewCard key={previews} plan={shown.plan} onReplace={replace} onCancel={cancel} />
            </View>
          )}
          <T dim>Importing replaces what’s on this device. You’ll see what the backup holds and what would change before anything does.</T>
          <View accessibilityLiveRegion="polite">{said && <T testID="go-settings-said">{said}</T>}</View>
        </View>

        <View style={styles.section}>
          <H2>This app</H2>
          <T dim testID="go-settings-version">
            {VERSION_LABEL}
          </T>
          {canCheckForUpdates() && (
            <>
              <Btn label="Check for updates" disabled={update === 'checking'} onPress={checkUpdates} style={styles.start} />
              <View accessibilityLiveRegion="polite">{update && updateLine[update] && <T dim>{updateLine[update]}</T>}</View>
            </>
          )}
        </View>
      </ScrollView>
    </GoScreen>
  );
}

/** A section's name: a level-2 heading, in the app's own (dim) voice. */
function H2({ children }: { children: string }) {
  return (
    <T bold dim role="heading" aria-level={2} accessibilityRole="header">
      {children}
    </T>
  );
}

export const IMPORTED = 'Imported.';
const CHANGED = 'What’s here just changed — check the comparison again.';

/** Whether this browser promised to keep the data (web only; nothing when it can't say). */
const keptLine: Record<PersistenceStatus, string | undefined> = {
  granted: 'This browser has promised to keep your data.',
  installed: 'Installed on this device — your data is kept with the app.',
  'not-granted': 'This browser may clear your data if you don’t visit for a while. Install the app (Share → Add to Home Screen) or export regularly to be safe.',
  unknown: undefined,
};

const updateLine: Record<UpdateCheck | 'checking', string | undefined> = {
  checking: 'Checking…',
  'up-to-date': 'You’re up to date.',
  // The update banner says it, with "Update now".
  ready: undefined,
  failed: 'Couldn’t check right now. Try again when you’re online.',
  unavailable: 'This browser can’t check for updates here; reloading the page gets the latest version.',
};

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  body: { paddingHorizontal: SP.s3, paddingTop: SP.s2, paddingBottom: SP.s5, gap: SP.s5, maxWidth: 640, width: '100%', alignSelf: 'center' },
  section: { gap: SP.s3 },
  lines: { gap: SP.s2 },
  start: { alignSelf: 'flex-start', maxWidth: '100%' },
  paste: { minHeight: 120, borderColor: G.line, textAlignVertical: 'top' },
});
