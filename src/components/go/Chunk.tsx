/**
 * P-112 (B-16, "A chunk is chosen while running, not written into the routine"): the runner's See ahead view.
 *
 * Off (the default), the runner is one step, as ever. **See ahead** — one toggle in the bottom bar's top row, at the
 * right of the pull-up handle — turns it on: the steps in view are one condensed sheet in the note's colour, a row per
 * step at 16 px with thin rules between, no big note. A giving step has its field on one line: the label, then the
 * input. A step with insides has Open / Close (P-111's control): open, its smaller steps are laid out under it, indented
 * — an outline, read and passed over, never edited. Under the sheet, the dashed **then: <words>** adds the next step
 * to view (it names where Next will land), and **Fewer** takes the last one off. As rows are added the spacing tightens
 * in steps (≤ 5 rows roomy, 6–9 closer, ≥ 10 closest); text stays 16 px and no target goes under 48 px — the list
 * scrolls with the column instead (the owner: "the list stops tightening and just allow a scroll").
 */
import { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ChunkField, ChunkRow, ChunkView } from '@/domain/chunk';
import { partsText } from '@/domain/runView';

import { InsidesBtn } from './Insides';
import { Mark } from './marks';
import { G, SP, TARGET } from './tokens';
import { Btn, Field, focusSoon, Said, T, ViewRef } from './ui';
import { Parts } from './Values';

const WEB = Platform.OS === 'web';
const RING = WEB ? ({ outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: 3 } as object) : null;
/** An outline's indent, per level: a smaller step's words under its parent's (after its Open / Close); narrower under 340 px. */
const indentFor = (width: number) => (width < 340 ? SP.s3 : TARGET);

/** The toggle: pressed while the view is on. */
export function SeeAhead({ on, onPress }: { on: boolean; onPress: () => void }) {
  return <Btn kind="plain" label="See ahead" pressed={on} onPress={onPress} testID="go-see-ahead" style={styles.toggle} />;
}

/** How close the rows sit: by how many rows are drawn (B-16's designer's ruling). Never under a 48 px target. */
export const tierOf = (rows: number): 'roomy' | 'closer' | 'closest' => (rows <= 5 ? 'roomy' : rows <= 9 ? 'closer' : 'closest');
const PAD = { roomy: SP.s2 + 2, closer: SP.s1 + 2, closest: 0 } as const;

const labelOf = (f: ChunkField) => (f.item !== undefined ? `${f.name} for ${f.item}` : f.gives ? f.name : `asks ${f.name}`);

interface SheetProps {
  view: ChunkView;
  hue: { c: string; d: string };
  sheetRef: React.RefObject<ViewRef | null>;
  onOpen: (key: string) => void;
  onDraft: (key: string, text: string) => void;
  onList: (field: ChunkField) => void;
  onMore: () => void;
  onFewer: () => void;
}

/** The steps in view, as one sheet, and the dashed row under it. */
export function ChunkSheet({ view, hue, sheetRef, onOpen, onDraft, onList, onMore, onFewer }: SheetProps) {
  const tier = tierOf(view.rows.length);
  const thenRef = useRef<ViewRef>(null);
  const fewerRef = useRef<ViewRef>(null);
  /** The last of the two pressed: when it is gone from the screen, the focus goes to the other (never to nothing). */
  const pressed = useRef<'more' | 'fewer' | null>(null);
  useEffect(() => {
    const was = pressed.current;
    pressed.current = null;
    if (was === 'more' && view.then === undefined) focusSoon(fewerRef);
    if (was === 'fewer' && view.n <= 1) focusSoon(thenRef);
  });
  const said = `${view.n === 1 ? '1 step' : `${view.n} steps`} in view`;
  return (
    <View style={styles.wrap}>
      {/* Said each time the number changes (and when the view is turned on). */}
      <Said key={said} text={said} testID="go-chunk-said" />
      <View
        ref={sheetRef}
        role="group"
        aria-label="Steps in view"
        testID="go-chunk"
        {...(WEB && ({ tabIndex: 0 } as object))}
        {...{ dataSet: { tier, n: String(view.n), return: 'true' } }}
        style={[styles.sheet, { backgroundColor: hue.c, borderColor: hue.d }, WEB && ({ outlineColor: G.focus, outlineOffset: 3 } as object)]}>
        {view.rows.map((r, i) => (
          <Row key={r.key} row={r} first={i === 0} tier={tier} hue={hue.c} onOpen={onOpen} onDraft={onDraft} onList={onList} />
        ))}
      </View>
      <View style={styles.grow}>
        {view.then !== undefined && (
          <Pressable
            ref={thenRef}
            onPress={() => {
              pressed.current = 'more';
              onMore();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add to view, then: ${view.then}`}
            testID="go-chunk-then"
            style={(state) => [styles.then, (state as { focused?: boolean }).focused && RING]}>
            <Mark name="add" color={G.dim} />
            <T style={styles.shrink}>
              <T dim>then: </T>
              {view.then}
            </T>
          </Pressable>
        )}
        {view.n > 1 && (
          <Btn
            ref={fewerRef}
            kind="plain"
            label="Fewer"
            spoken="Fewer steps in view"
            onPress={() => {
              pressed.current = 'fewer';
              onFewer();
            }}
            testID="go-chunk-fewer"
            style={styles.fewer}
          />
        )}
      </View>
    </View>
  );
}

function Row({ row, first, tier, hue, onOpen, onDraft, onList }: { row: ChunkRow; first: boolean; tier: keyof typeof PAD; hue: string; onOpen: (key: string) => void; onDraft: (key: string, text: string) => void; onList: (field: ChunkField) => void }) {
  const words = partsText(row.parts) || row.words;
  const { width } = useWindowDimensions();
  return (
    <View
      style={[styles.row, { paddingVertical: PAD[tier], paddingLeft: SP.s2 + row.depth * indentFor(width) }, !first && styles.rule]}
      testID="go-chunk-row"
      {...{ dataSet: { depth: String(row.depth), inner: row.inner ? 'true' : 'false', kind: row.kind } }}>
      <View style={styles.head}>
        {row.insides && <InsidesBtn ink words={words} open={row.open} onPress={() => onOpen(row.key)} testID="go-chunk-insides" />}
        <Text style={[styles.words, !row.insides && styles.wordsAlone]} testID="go-chunk-words">
          {row.kind === 'wait' ? 'Wait for: ' : ''}
          <Parts parts={row.parts.length ? row.parts : [{ kind: 'text', text: row.words }]} ink={G.ink} on={hue} />
        </Text>
      </View>
      {row.fields.map((f) => (
        <View key={f.key} style={[styles.field, { paddingLeft: row.insides ? TARGET : 0 }]} testID="go-chunk-field" {...{ dataSet: { name: f.name } }}>
          <T ink style={styles.label}>
            {labelOf(f)}
          </T>
          {f.list ? (
            <Btn ink label={f.items?.length ? f.items.join(', ') : 'Add items'} spoken={`${labelOf(f)}: ${f.items?.length ? f.items.join(', ') : 'Add items'}`} onPress={() => onList(f)} testID="go-chunk-list" style={styles.input} />
          ) : (
            <Field ink value={f.text} onChangeText={(t) => onDraft(f.key, t)} accessibilityLabel={labelOf(f)} placeholder="optional" style={[styles.input, styles.box]} testID="go-chunk-input" />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: SP.s3, gap: SP.s2 },
  toggle: { flexShrink: 0, paddingHorizontal: SP.s3 - 4, borderTopWidth: 2, borderTopColor: G.surf2, backgroundColor: G.surf },
  sheet: { borderWidth: 2, ...(WEB && ({ outlineStyle: 'none' } as object)) },
  row: { minHeight: TARGET, justifyContent: 'center', paddingRight: SP.s2, gap: SP.s1 },
  // Thin rules between the rows.
  rule: { borderTopWidth: 1, borderTopColor: 'rgba(17,18,22,0.35)' },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: TARGET },
  words: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 22, fontWeight: '500', color: G.ink, ...(WEB && ({ overflowWrap: 'anywhere' } as object)) },
  wordsAlone: { paddingVertical: SP.s1 },
  field: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SP.s2 },
  label: { fontWeight: '500', flexShrink: 1 },
  input: { flexGrow: 1, flexShrink: 1, flexBasis: 120, minWidth: 0, minHeight: TARGET },
  box: { backgroundColor: 'rgba(255,255,255,0.45)', borderColor: G.ink, paddingVertical: SP.s1 },
  grow: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.s2 },
  then: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minHeight: TARGET, flexDirection: 'row', alignItems: 'center', gap: SP.s2, borderWidth: 2, borderStyle: 'dashed', borderColor: G.line, paddingHorizontal: SP.s2, paddingVertical: SP.s1 },
  shrink: { flexShrink: 1, minWidth: 0 },
  fewer: { flexShrink: 0 },
});
