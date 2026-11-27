/**
 * P-109 (B-18 slice 1; owner, 2026-11-27: "Let's build the references"): a routine's **Places** — where its work
 * lives, named by the person — seen in three spots (the names under Plan's heading, one door on the home tile, the
 * list in the runner's pull-up panel; never on the runner's face) and kept in the Places sheet (Plan's routine ···
 * → Places…): rows of name + where; + Add a place (Name, Where, the filled Add); each row's ··· — Change · Move up
 * · Move down · a line · Remove; every change said here with its Undo. From the tile (and the panel) the same list
 * only opens.
 *
 * **Safety.** A place (or a typed address) opens only when `openable` says it is http(s); anything else is shown
 * as words and has no control at all. Opening hands the address to the system and asks nothing back: on the web
 * a new browsing context with `noopener` (`window.open`; never the app's own window — expo-linking's web
 * `openURL` would navigate the installed app away), elsewhere expo-linking. The run stays exactly where it is.
 */
import * as Linking from 'expo-linking';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { decorative } from '@/components/a11y';

import { openable, placesShown, PlaceShown, placeSpoken, placesWritable } from '@/domain/places';
import { useStore } from '@/store/useStore';

import { Mark } from './marks';
import { Notice } from './Notice';
import { G, SP, TARGET } from './tokens';
import { Btn, Field, InputRef, Menu, MenuItem, MenuSep, Sheet, T, ViewRef } from './ui';

const WEB = Platform.OS === 'web';
const RING_IN = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: -4 } as object) : null;
const NO_RING = WEB ? ({ outlineStyle: 'none' } as object) : null;

/**
 * Opens an address — only one `openable` passes (checked again here, whatever the caller did). Web: a new tab or
 * the system's sheet, `noopener` (the other page gets no hold on this one). Returns whether it was handed over.
 */
export function openAddress(address: string): boolean {
  const href = openable(address);
  if (!href) return false;
  if (WEB) {
    if (typeof window === 'undefined' || typeof window.open !== 'function') return false;
    window.open(href, '_blank', 'noopener');
    return true;
  }
  void Linking.openURL(href).catch(() => {});
  return true;
}

/**
 * One place in a list: its name, and under it its host ("notion.so") — or its words, in full. An address is a
 * link ("Open Product design, notion.so"); words are text, and open nothing. `more`: the row's ··· (the sheet).
 */
export function PlaceRow({ place, more, moreRef, first }: { place: PlaceShown; more?: () => void; moreRef?: (el: ViewRef | null) => void; first?: boolean }) {
  // One text, two lines (so it reads, and is matched against its spoken name, as "Design doc notion.so").
  const words = (
    <T style={styles.rowWords}>
      <T bold>{place.name}</T>
      {'\n'}
      <T dim>{place.href ? place.host : place.where}</T>
    </T>
  );
  const mark = first ? { first: 'true' } : {};
  return (
    <View style={styles.row} testID="go-place" {...{ dataSet: { place: place.id, opens: place.href ? 'true' : 'false' } }}>
      {place.href ? (
        <Pressable
          onPress={() => openAddress(place.href!)}
          accessibilityRole="link"
          accessibilityLabel={placeSpoken(place)}
          testID="go-place-open"
          {...{ dataSet: mark }}
          style={(state) => [styles.open, (state as { focused?: boolean }).focused ? RING_IN : NO_RING]}>
          {words}
        </Pressable>
      ) : (
        <View style={[styles.open, NO_RING]} accessible accessibilityLabel={placeSpoken(place)} testID="go-place-words" {...{ dataSet: mark }} {...(WEB && first && ({ tabIndex: -1 } as object))}>
          {words}
        </View>
      )}
      {more && <Btn ref={moreRef} kind="plain" mark="more" spoken={`More for ${place.name}`} onPress={more} style={styles.more} testID="go-place-more" />}
    </View>
  );
}

/** Name and Where, typed in place (adding, or changing a row); the filled button keeps them. */
function PlaceForm({ name: had = '', where: was = '', keep, onKeep, onCancel }: { name?: string; where?: string; keep: string; onKeep: (name: string, where: string) => boolean; onCancel: () => void }) {
  const [name, setName] = useState(had);
  const [where, setWhere] = useState(was);
  const whereField = useRef<InputRef>(null);
  const ready = !!name.trim() && !!where.trim();
  const submit = () => {
    if (ready) onKeep(name, where);
  };
  return (
    <View style={styles.form} testID="go-place-form">
      <Field value={name} onChangeText={setName} accessibilityLabel="Name" placeholder="Name" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => whereField.current?.focus()} testID="go-place-name" autoFocus {...{ dataSet: { first: 'true' } }} />
      <Field ref={whereField} value={where} onChangeText={setWhere} accessibilityLabel="Where" placeholder="Where" autoCapitalize="none" autoCorrect={false} returnKeyType="done" submitBehavior="submit" onSubmitEditing={submit} testID="go-place-where" />
      <View style={styles.pair}>
        <Btn kind="filled" label={keep} spoken={name.trim() ? `${keep} ${name.trim()}` : keep} disabled={!ready} onPress={submit} style={styles.grow} size={18} testID="go-place-keep" />
        <Btn label="Cancel" onPress={onCancel} style={styles.grow} testID="go-place-cancel" />
      </View>
    </View>
  );
}

/**
 * The Places sheet. `edit`: from Plan — add, change, reorder, remove (each one edit of the routine, said here with
 * its Undo); otherwise (the tile's door) it only opens. `at`: the row to start on (a name tapped under Plan's
 * heading). A routine whose stored places are in a shape this version cannot keep offers no edits.
 */
export function PlacesSheet({ routineId, name, edit, at, onClose, fallback }: { routineId: string; name: string; edit?: boolean; at?: string; onClose: () => void; fallback: { current: unknown } }) {
  const raw = useStore((s) => s.data.routines[routineId]?.places);
  const places = placesShown(raw);
  const editable = !!edit && placesWritable(raw);
  const [form, setForm] = useState<{ add: true } | { change: string } | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [mores] = useState<Record<string, unknown>>(() => ({}));
  const addBtn = useRef<ViewRef>(null);
  const did = (e: Parameters<ReturnType<typeof useStore.getState>['editRoutine']>[1]) => useStore.getState().editRoutine(routineId, e).ok;
  const menuPlace = menuFor ? places.find((p) => p.id === menuFor) : undefined;
  const index = menuPlace ? places.indexOf(menuPlace) : -1;
  const closeMenu = () => setMenuFor(null);
  return (
    <>
      <Sheet title={`Places for ${name}`} onClose={onClose} testID="go-places-sheet" fallback={fallback} inert={!!menuPlace}>
        <Notice />
        {places.length > 0 && (
          <View style={styles.list} role="list" aria-label="Places" testID="go-places-list">
            {places.map((p) =>
              form && 'change' in form && form.change === p.id ? (
                <PlaceForm
                  key={p.id}
                  name={p.name}
                  where={p.where}
                  keep="Keep"
                  onCancel={() => setForm(null)}
                  onKeep={(n, w) => {
                    const ok = did({ kind: 'changePlace', place: p.id, name: n, where: w });
                    if (ok) setForm(null);
                    return ok;
                  }}
                />
              ) : (
                <View key={p.id} role="listitem">
                  <PlaceRow place={p} first={at === p.id && !form} more={editable ? () => setMenuFor(p.id) : undefined} moreRef={(el) => { mores[p.id] = el; }} />
                </View>
              ),
            )}
          </View>
        )}
        {editable &&
          (form && 'add' in form ? (
            <PlaceForm
              keep="Add"
              onCancel={() => setForm(null)}
              onKeep={(n, w) => {
                const ok = did({ kind: 'addPlace', name: n, where: w });
                if (ok) setForm(null);
                return ok;
              }}
            />
          ) : (
            <Btn ref={addBtn} kind="plain" mark="add" label="Add a place" onPress={() => setForm({ add: true })} testID="go-places-add" {...(!at && !places.length && { dataSet: { first: 'true' } })} />
          ))}
        <Btn label="Close" onPress={onClose} testID="go-places-close" />
      </Sheet>
      {menuPlace && (
        <Menu anchor={() => mores[menuPlace.id]} label={menuPlace.name} onClose={closeMenu} testID="go-place-menu" fallback={addBtn}>
          <MenuItem
            label="Change"
            spoken={`Change ${menuPlace.name}`}
            testID="go-place-change"
            onPress={() => {
              closeMenu();
              setForm({ change: menuPlace.id });
            }}
          />
          <MenuItem label="Move up" spoken={`Move ${menuPlace.name} up`} disabled={index <= 0} testID="go-place-up" onPress={() => { did({ kind: 'movePlace', place: menuPlace.id, by: -1 }); closeMenu(); }} />
          <MenuItem label="Move down" spoken={`Move ${menuPlace.name} down`} disabled={index >= places.length - 1} testID="go-place-down" onPress={() => { did({ kind: 'movePlace', place: menuPlace.id, by: 1 }); closeMenu(); }} />
          <MenuSep />
          <MenuItem label="Remove" spoken={`Remove ${menuPlace.name}`} danger testID="go-place-remove" onPress={() => { did({ kind: 'removePlace', place: menuPlace.id }); closeMenu(); }} />
        </Menu>
      )}
    </>
  );
}

/**
 * Under Plan's heading: the names in a line ("Product design · Reference photos · Sketchbook"), wrapping, never
 * cut. Each is a target: an address opens; words open the Places sheet at that row.
 */
export function PlacesLine({ places, onWords }: { places: PlaceShown[]; onWords: (id: string) => void }) {
  return (
    <View style={styles.line} testID="go-plan-places" role="list" aria-label="Places">
      <View style={styles.lineMark}>
        <Mark name="places" size={20} color={G.dim} />
      </View>
      {places.map((p, i) => (
        <View key={p.id} style={styles.lineItem} role="listitem">
          <Btn kind="plain" label={p.name} spoken={placeSpoken(p)} onPress={() => (p.href ? openAddress(p.href) : onWords(p.id))} style={styles.lineBtn} testID="go-plan-place" dataSet={{ place: p.id, opens: p.href ? 'true' : 'false' }} />
          {i < places.length - 1 && (
            <T dim {...decorative}>
              ·
            </T>
          )}
        </View>
      ))}
    </View>
  );
}

/** "Open <host>" — an address typed in a step, a value or the pause note (the panel, the value sheet). */
export function OpenRows({ addresses }: { addresses: readonly { href: string; host: string }[] }) {
  return (
    <>
      {addresses.map((a) => (
        <Btn key={a.href} kind="plain" mark="places" label={`Open ${a.host}`} onPress={() => openAddress(a.href)} testID="go-open-address" dataSet={{ href: a.href }} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: SP.s1 },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: SP.s1, borderBottomWidth: 1, borderBottomColor: G.line },
  rowWords: { flexShrink: 1, minWidth: 0, ...(WEB && ({ overflowWrap: 'anywhere' } as object)) },
  open: { flex: 1, minWidth: 0, minHeight: TARGET, justifyContent: 'center', alignItems: 'flex-start', paddingVertical: SP.s1, paddingHorizontal: SP.s1 },
  more: { width: TARGET, paddingHorizontal: 0, justifyContent: 'center', alignSelf: 'center' },
  form: { gap: SP.s2, paddingVertical: SP.s1 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2 },
  grow: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: SP.s1 },
  lineMark: { minHeight: TARGET, justifyContent: 'center' },
  lineItem: { flexDirection: 'row', alignItems: 'center', columnGap: SP.s1, maxWidth: '100%' },
  lineBtn: { minHeight: TARGET, paddingHorizontal: SP.s1, flexShrink: 1, maxWidth: '100%' },
});
