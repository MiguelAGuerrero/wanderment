import { router } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VERSION_LABEL } from '@/build';
import { fromBackup, toBackup } from '@/domain/backup';
import { canCheckForUpdates, checkForUpdates, UpdateCheck } from '@/pwa/serviceWorker';
import { backupsLocation, shareBackup } from '@/storage/nativeBackup';
import { askToKeepData, onPersistenceAnswered, PersistenceStatus, persistenceStatus } from '@/storage/persistent';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

export default function Settings() {
  const data = useStore((st) => st.data);
  const replaceData = useStore((st) => st.replaceData);
  const setHidden = useStore((st) => st.setHidden);
  const showShading = useStore((st) => st.showShading);
  const storage = useStore((st) => st.storage);
  const setShowShading = useStore((st) => st.setShowShading);
  const [message, setMessage] = useState<string>();
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const [kept, setKept] = useState<PersistenceStatus>();
  /** What the last "Ask the browser to keep it" got; separate from import/export messages. */
  const [keepNote, setKeepNote] = useState<string>();
  const refusals = useRef(0);
  const keptRef = useRef<ComponentRef<typeof View>>(null);
  const hidden = Object.values(data.threads).filter((t) => t.hidden);
  /** What the last "Check for updates" found; a new version shows as the update banner. */
  const [update, setUpdate] = useState<UpdateCheck | 'checking'>();

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
    const json = toBackup(data);
    const filename = `wanderment-${new Date().toISOString().slice(0, 10)}.json`;
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } else if (!(await shareBackup(data))) {
      await Share.share({ message: json, title: filename });
    }
    setMessage('Exported.');
  };

  const importJson = (json: string) => {
    try {
      const imported = fromBackup(json);
      // Refused while reconnecting (it says so): the pasted text stays, to try again.
      if (!replaceData(imported)) return;
      setMessage(`Imported ${Object.keys(imported.activities).length} activities.`);
      setPasting(false);
    } catch (e) {
      setMessage((e as Error).message);
    }
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
      <View style={s.content}>
        <View style={styles.header}>
          <Text style={s.h1}>Settings</Text>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ minHeight: 44, justifyContent: 'center' }} accessibilityRole="button">
            <Text style={{ color: C.accent, fontWeight: '600', fontSize: 16 }}>Done</Text>
          </Pressable>
        </View>

        <Text style={s.quietLabel}>Your data · stays on this device</Text>
        <View style={[s.card, { gap: 10 }]}>
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
          <Pressable onPress={importData} style={s.chip} accessibilityRole="button">
            <Text style={s.chipText}>Import from a backup</Text>
          </Pressable>
          {pasting && (
            <View style={{ gap: 8 }}>
              <TextInput value={pasted} onChangeText={setPasted} multiline placeholder="Paste backup JSON" style={styles.paste} accessibilityLabel="Backup JSON" />
              <Pressable onPress={() => importJson(pasted)} style={s.primaryBtn}>
                <Text style={s.primaryBtnText}>Import</Text>
              </Pressable>
            </View>
          )}
          <Text style={s.meta}>Importing replaces what’s on this device. Export first if unsure.</Text>
          {message && <Text style={{ color: C.accentInk }}>{message}</Text>}
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
      </View>
    </SafeAreaView>
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
