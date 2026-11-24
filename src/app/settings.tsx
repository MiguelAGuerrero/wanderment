import { router } from 'expo-router';
import { ComponentRef, ReactNode, RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VERSION_LABEL } from '@/build';
import { exportBackup } from '@/components/exportBackup';
import { moveFocus } from '@/components/FirstRun';
import { ImportPreviewCard } from '@/components/ImportPreview';
import { canCheckForUpdates, checkForUpdates, UpdateCheck } from '@/pwa/serviceWorker';
import { backupsLocation } from '@/storage/nativeBackup';
import { askToKeepData, onPersistenceAnswered, PersistenceStatus, persistenceStatus } from '@/storage/persistent';
import { confirmImport, ImportPreview, previewImport, rebasePreview } from '@/store/importBackup';
import { holdsData, RECONNECTING_NOTICE, useStore } from '@/store/useStore';
import { C, s } from '@/theme';

export default function Settings() {
  const data = useStore((st) => st.data);
  const setHidden = useStore((st) => st.setHidden);
  const showShading = useStore((st) => st.showShading);
  const storage = useStore((st) => st.storage);
  const holding = useStore(holdsData);
  const setShowShading = useStore((st) => st.setShowShading);
  const [message, setMessage] = useState<string>();
  /** The refusal note is about now: once the data is back it's gone (audit F7). */
  const said = message === RECONNECTING_NOTICE && holding ? undefined : message;
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  /** A checked backup waiting for Replace or Cancel; a new one takes its place (`previews` remounts it). */
  const [preview, setPreview] = useState<ImportPreview>();
  const [previews, setPreviews] = useState(0);
  /** Always compared with what's here now. */
  const shown = useMemo(() => preview && rebasePreview(preview, data), [preview, data]);
  const importRef = useRef<ComponentRef<typeof View>>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  /** Native: where the data card starts in the scroll view, and the preview last scrolled to. */
  const dataCardY = useRef(0);
  const scrolledTo = useRef(-1);
  const [kept, setKept] = useState<PersistenceStatus>();
  /** What the last "Ask the browser to keep it" got; separate from import/export messages. */
  const [keepNote, setKeepNote] = useState<string>();
  const refusals = useRef(0);
  const keptRef = useRef<ComponentRef<typeof View>>(null);
  const hidden = Object.values(data.threads).filter((t) => t.hidden);
  /** What the last "Check for updates" found; a new version shows as the update banner. */
  const [update, setUpdate] = useState<UpdateCheck | 'checking'>();

  // What's here changed under an open preview (an Unhide, another tab's changes): its words change,
  // so say so (audit F6).
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
      setKeepNote(
        refusals.current === 1 ? 'The browser didn’t promise this time.' : 'Still no promise from the browser. Exporting a backup keeps your data safe.',
      );
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

  /** The preview is gone: focus goes back where importing started, not to the top of the page (audit F6). */
  const backToImport = () => requestAnimationFrame(() => moveFocus(importRef.current));

  const replace = () => {
    if (!shown) return;
    const result = confirmImport(shown);
    if (result.ok) {
      setPreview(undefined);
      setPasting(false);
      setMessage(`Imported ${result.activities} activities.`);
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
    <SafeAreaView style={s.screen}>
      <Body scrollRef={scrollRef}>
        <View style={styles.header}>
          <Text style={s.h1}>Settings</Text>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ minHeight: 44, justifyContent: 'center' }} accessibilityRole="button">
            <Text style={{ color: C.accent, fontWeight: '600', fontSize: 16 }}>Done</Text>
          </Pressable>
        </View>

        <Text style={s.quietLabel}>Your data · stays on this device</Text>
        <View style={[s.card, { gap: 10 }]} onLayout={(e) => (dataCardY.current = e.nativeEvent.layout.y)}>
          <Text style={s.meta}>
            {Object.keys(data.activities).length} activities · {Object.keys(data.threads).length} wanders
          </Text>
          <Text style={s.meta}>
            {storage.state === 'ready' && storage.kind === 'local'
              ? 'Saved in this browser’s local storage (this browser can’t run the database).'
              : Platform.OS === 'web'
                ? 'Saved in a database in this browser.'
                : 'Saved in a database on this device.'}
            {backupsLocation ? ` Automatic backups: ${backupsLocation}.` : ''}
          </Text>
          <View ref={keptRef} accessibilityLiveRegion="polite" {...(Platform.OS === 'web' ? { tabIndex: -1 } : {})} style={{ gap: 8 }}>
            {kept && keptLine[kept] && <Text style={s.meta}>{keptLine[kept]}</Text>}
            {kept === 'not-granted' && keepNote && <Text style={s.meta}>{keepNote}</Text>}
          </View>
          {kept === 'not-granted' && (
            <Pressable onPress={askToKeep} style={s.chip} accessibilityRole="button">
              <Text style={s.chipText}>Ask the browser to keep it</Text>
            </Pressable>
          )}
          <Pressable onPress={exportData} style={s.chip} accessibilityRole="button">
            <Text style={s.chipText}>Export everything (.json)</Text>
          </Pressable>
          <Pressable ref={importRef} onPress={importData} style={s.chip} accessibilityRole="button">
            <Text style={s.chipText}>Import from a backup</Text>
          </Pressable>
          {pasting && (
            <View style={{ gap: 8 }}>
              <TextInput value={pasted} onChangeText={setPasted} multiline placeholder="Paste backup JSON" style={styles.paste} accessibilityLabel="Backup JSON" />
              <Pressable onPress={() => importJson(pasted)} style={s.primaryBtn} accessibilityRole="button">
                <Text style={s.primaryBtnText}>Import</Text>
              </Pressable>
            </View>
          )}
          {shown && (
            <View
              onLayout={(e) => {
                // Native: bring a new preview into view (it can open below the fold).
                if (Platform.OS === 'web' || scrolledTo.current === previews) return;
                scrolledTo.current = previews;
                scrollRef.current?.scrollTo({ y: Math.max(0, dataCardY.current + e.nativeEvent.layout.y - 12) });
              }}
            >
              <ImportPreviewCard key={previews} plan={shown.plan} onReplace={replace} onCancel={cancel} />
            </View>
          )}
          <Text style={s.meta}>Importing replaces what’s on this device. You’ll see what the backup holds and what would change before anything does.</Text>
          <View accessibilityLiveRegion="polite">{said && <Text style={{ color: C.accentInk }}>{said}</Text>}</View>
        </View>

        <Text style={s.quietLabel}>Feel</Text>
        <View style={[s.card, styles.rowBetween]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, color: C.ink }}>Recency shading</Text>
            <Text style={s.meta}>The fading bar on wanders</Text>
          </View>
          <Switch value={showShading} onValueChange={(on) => void setShowShading(on)} accessibilityLabel="Recency shading" />
        </View>

        {hidden.length > 0 && (
          <>
            <Text style={s.quietLabel}>Hidden wanders</Text>
            <View style={[s.card, { gap: 8 }]}>
              {hidden.map((t) => (
                <View key={t.id} style={styles.rowBetween}>
                  <Text style={{ fontSize: 15, color: C.ink, flex: 1 }}>{t.name}</Text>
                  <Pressable onPress={() => setHidden(t.id, false)} style={s.chip} accessibilityRole="button">
                    <Text style={s.chipText}>Unhide</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}
        <Text style={s.quietLabel}>This app</Text>
        <View style={[s.card, { gap: 10 }]}>
          <Text style={s.meta}>{VERSION_LABEL}</Text>
          {canCheckForUpdates() && (
            <>
              <Pressable onPress={checkUpdates} disabled={update === 'checking'} style={s.chip} accessibilityRole="button">
                <Text style={s.chipText}>Check for updates</Text>
              </Pressable>
              <View accessibilityLiveRegion="polite">{update && updateLine[update] && <Text style={s.meta}>{updateLine[update]}</Text>}</View>
            </>
          )}
        </View>

        <Text style={s.meta}>There are no notifications — nothing to turn off.</Text>
      </Body>
    </SafeAreaView>
  );
}

const CHANGED = 'What’s here just changed — check the comparison again.';

/**
 * Native: Settings scrolls, so the paste box and the import preview are reachable on a small screen
 * (audit F1); a tap on a button while the keyboard is up still presses it. Web: the page scrolls, as before.
 */
function Body({ scrollRef, children }: { scrollRef: RefObject<ComponentRef<typeof ScrollView> | null>; children: ReactNode }) {
  if (Platform.OS === 'web') return <View style={s.content}>{children}</View>;
  return (
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled">
      <View style={s.content}>{children}</View>
    </ScrollView>
  );
}

/** Whether this browser promised to keep the data (web only; nothing when it can't say). */
const keptLine: Record<PersistenceStatus, string | undefined> = {
  granted: 'This browser has promised to keep your data.',
  installed: 'Installed on this device — your data is kept with the app.',
  'not-granted':
    'This browser may clear your data if you don’t visit for a while. Install the app (Share → Add to Home Screen) or export regularly to be safe.',
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  paste: { minHeight: 120, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, fontSize: 13, backgroundColor: C.surface },
});
