import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fromBackup, toBackup } from '@/domain/backup';
import { useStore } from '@/store/useStore';
import { C, s } from '@/theme';

export default function Settings() {
  const data = useStore((st) => st.data);
  const replaceData = useStore((st) => st.replaceData);
  const setHidden = useStore((st) => st.setHidden);
  const showShading = useStore((st) => st.showShading);
  const setShowShading = useStore((st) => st.setShowShading);
  const [message, setMessage] = useState<string>();
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const hidden = Object.values(data.threads).filter((t) => t.hidden);

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
    } else {
      await Share.share({ message: json, title: filename });
    }
    setMessage('Exported.');
  };

  const importJson = (json: string) => {
    try {
      const imported = fromBackup(json);
      replaceData(imported);
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
            {Object.keys(data.activities).length} activities · {Object.keys(data.threads).length} threads
          </Text>
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
            <Text style={s.meta}>The fading bar on threads</Text>
          </View>
          <Switch value={showShading} onValueChange={setShowShading} accessibilityLabel="Recency shading" />
        </View>

        {hidden.length > 0 && (
          <>
            <Text style={s.quietLabel}>Hidden threads</Text>
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
        <Text style={s.meta}>There are no notifications — nothing to turn off.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  paste: { minHeight: 120, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, fontSize: 13, backgroundColor: C.surface },
});
