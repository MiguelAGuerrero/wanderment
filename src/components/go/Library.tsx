/**
 * P-104 (B-17 journeys 1–3), P-105 (journey 4), P-106 (slice 3): the library's parts on screen.
 *
 * - `LibraryRowView`: a library row — one target: its name, then its one line on what it is for beside its signature
 *   (what it asks and hands back), wrapping whole. Spoken "<name>, <line>, <signature>, in the library" (or "yours");
 *   "Learn ▢" is spoken "Learn blank".
 * - `LibrarySheet`: the preview — a tall sheet over the list (not Plan: no PLAN, no grips, menus or Add row). The steps
 *   as read-only rows; pinned lowest but one the one filled button — **Copy**, **Copy…** (a template: it asks a name
 *   first), **Open yours** (the person has it: nothing is copied) or, from Plan, **Copy and add** — and **Close**
 *   lowest.
 * - `TemplateCopySheet`: Copy… on a template — titled with its name, a Name field started with its stem ("Learn "),
 *   **Copy** filled once a name is typed; a name in use is refused here and nothing is overwritten.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { libraryPreview, LibraryRow, PreviewRow } from '@/domain/library';

import { decorative } from '../a11y';
import { Mark } from './marks';
import { G, SP, TARGET } from './tokens';
import { Btn, Field, Sheet, T, ViewRef } from './ui';
import { Gives } from './Values';

/** A library row's signature: "asks {material} · gives {faults}". */
export function librarySignature(r: Pick<LibraryRow, 'asks' | 'gives'>): string {
  const names = (ns: string[]) => ns.map((n) => `{${n}}`).join(', ');
  return [r.asks.length ? `asks ${names(r.asks)}` : '', r.gives.length ? `gives ${names(r.gives)}` : ''].filter(Boolean).join(' · ');
}

/** What a library row says: its name (a blank spoken "blank"), its line, its signature, and whose it is. */
export function librarySpoken(r: LibraryRow): string {
  return [r.spoken, r.for, librarySignature(r), r.yours ? 'yours' : 'in the library'].filter(Boolean).join(', ');
}

/** A name with its blank drawn ("Learn ▢"); the blank itself is not read (the row's spoken name says "blank"). */
export function LibraryName({ name, size = 18, testID }: { name: string; size?: number; testID?: string }) {
  const parts = name.split('▢');
  return (
    <T bold size={size} testID={testID}>
      {parts.map((p, i) => (
        <Text key={i}>
          {p}
          {i < parts.length - 1 && (
            <Text style={styles.blank} {...decorative}>
              ▢
            </Text>
          )}
        </Text>
      ))}
      {/* (A space after it, so the row's words read apart: its spoken name holds them in order.) */}
      {' '}
    </T>
  );
}

/** One library row: a single target, its name then its line beside its signature. */
export function LibraryRowView({ row, onPress, bodyRef }: { row: LibraryRow; onPress: () => void; bodyRef?: (el: ViewRef | null) => void }) {
  const sig = librarySignature(row);
  return (
    <Pressable
      ref={bodyRef}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={librarySpoken(row)}
      testID="go-lib-row"
      {...{ dataSet: { lib: row.id, yours: row.yours ? 'true' : 'false' } }}
      style={(state) => [styles.row, (state as { focused?: boolean }).focused && styles.ring]}>
      <LibraryName name={row.name} testID="go-lib-name" />
      <View style={styles.line}>
        <T dim testID="go-lib-for">
          {sig ? `${row.for} ` : row.for}
        </T>
        {!!sig && (
          <T dim testID="go-lib-sig">
            {sig}
          </T>
        )}
      </View>
    </Pressable>
  );
}

/** One step of the preview: read-only, its depth by indent. */
function PreviewLine({ r }: { r: PreviewRow }) {
  return (
    <View style={[styles.step, { paddingLeft: r.depth * SP.s3 }]} testID="go-lib-step" {...{ dataSet: { kind: r.kind, depth: String(r.depth) } }}>
      <View style={styles.stepWords}>
        {(r.kind === 'call' || r.kind === 'slot') && <Mark name="routine" size={18} color={G.dim} />}
        <T bold={r.kind === 'part' || r.kind === 'call'} style={styles.flex}>
          {r.words}
        </T>
      </View>
      {r.with?.map((w) => (
        <T key={w} dim testID="go-lib-with">
          {w}
        </T>
      ))}
      {!!r.gives && <Gives names={[r.gives]} testID="go-lib-gives" />}
    </View>
  );
}

/**
 * The preview sheet. `mode` 'copy' (My routines): Copy, Copy… or Open yours; 'add' (Plan's "@" and Add's "a routine"):
 * Copy and add. Nothing here is a button but the two at the foot.
 */
export function LibrarySheet({ row, mode, onCopy, onOpenYours, onClose, fallback }: { row: LibraryRow; mode: 'copy' | 'add'; onCopy: () => void; onOpenYours?: () => void; onClose: () => void; fallback: { current: unknown } }) {
  const steps = libraryPreview(row.id);
  const sig = librarySignature(row);
  const yours = mode === 'copy' && !!row.yours;
  const label = mode === 'add' ? 'Copy and add' : yours ? 'Open yours' : row.template ? 'Copy…' : 'Copy';
  const spoken = mode === 'add' ? `Copy and add ${row.spoken}` : yours ? `Open yours: ${row.spoken}` : `${row.template ? 'Copy…' : 'Copy'} ${row.spoken}`;
  return (
    <Sheet
      title={row.name}
      spoken={row.spoken}
      bodyLabel="Steps"
      onClose={onClose}
      testID="go-lib-sheet"
      fallback={fallback}
      foot={
        <>
          <Btn kind="filled" label={label} spoken={spoken} onPress={yours ? onOpenYours : onCopy} size={18} testID="go-lib-copy" />
          <Btn label="Close" onPress={onClose} testID="go-lib-close" />
        </>
      }>
      <T dim testID="go-lib-sheet-for">
        {row.for}
      </T>
      {!!sig && (
        <T dim testID="go-lib-sheet-sig">
          {sig}
        </T>
      )}
      <View style={styles.steps} testID="go-lib-steps">
        {steps.map((r, i) => (
          <PreviewLine key={i} r={r} />
        ))}
      </View>
    </Sheet>
  );
}

/** Copy… on a template: its name, started with the stem; Copy once a name is typed; a name in use refused, in words. */
export function TemplateCopySheet({ row, onCopy, onClose, fallback }: { row: LibraryRow; onCopy: (words: string) => { ok: boolean; reason?: string }; onClose: () => void; fallback: { current: unknown } }) {
  const [words, setWords] = useState(row.stem);
  const [taken, setTaken] = useState(false);
  const typed = words.trim().replace(/\s+/g, ' ');
  const ready = !!typed && (!row.stem.trim() || typed !== row.stem.trim());
  const copy = () => {
    if (!ready) return;
    const did = onCopy(typed);
    setTaken(!did.ok && did.reason === 'same-name');
  };
  return (
    <Sheet
      title={row.name}
      spoken={row.spoken}
      bodyLabel="Your copy"
      onClose={onClose}
      testID="go-lib-name-sheet"
      fallback={fallback}
      foot={
        <>
          <Btn kind="filled" label="Copy" spoken={ready ? `Copy as ${typed}` : 'Copy'} disabled={!ready} onPress={copy} size={18} testID="go-lib-name-copy" />
          <Btn label="Close" onPress={onClose} testID="go-lib-name-close" />
        </>
      }>
      <Field
        value={words}
        onChangeText={(t) => {
          setWords(t);
          setTaken(false);
        }}
        accessibilityLabel="Name"
        placeholder="A name for your copy"
        maxLength={200}
        submitBehavior="submit"
        returnKeyType="done"
        onSubmitEditing={copy}
        testID="go-lib-name-field"
        {...{ dataSet: { first: 'true' } }}
      />
      {taken && (
        <T color={G.err} accessibilityRole="alert" testID="go-lib-name-error">
          ! A routine already uses that name
        </T>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flexShrink: 1 },
  row: { minHeight: TARGET, paddingHorizontal: SP.s3, paddingVertical: SP.s2, gap: SP.s1, borderWidth: 2, borderColor: G.line, backgroundColor: G.surf },
  line: { flexDirection: 'row', flexWrap: 'wrap', columnGap: SP.s2 },
  ring: { outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.text, outlineOffset: -4 } as object,
  blank: { color: G.dim },
  steps: { gap: SP.s2 },
  step: { gap: 0 },
  stepWords: { flexDirection: 'row', alignItems: 'center', gap: SP.s1 },
});
