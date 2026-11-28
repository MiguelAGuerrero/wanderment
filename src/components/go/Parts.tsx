/**
 * P-99 (B-16, "With P-99: where every part stands"): the parts of the In any order blocks a run is in — on the runner,
 * the block's row offers them to choose; the pull-up panel and a paused tile's sheet list every level the run is in.
 * One line per part, in the app's existing wordings: "at <step>" (its values in place), "waiting for <words> · since
 * <day>", a part broken down with no place yet its first step, "finished" or "stopped". The part the run is in is
 * marked by the mark and the words "you are here", never by colour alone. A tap on a part not ended takes it up; nothing
 * else is done from here (adding or changing parts is Plan's). No count, no percentage, nothing about what is left.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { decorative } from '@/components/a11y';
import { PartShown, PartsLevel, partsText, sinceWords } from '@/domain/runView';

import { Mark } from './marks';
import { G, SP, TARGET } from './tokens';
import { T } from './ui';

const WEB = typeof document !== 'undefined';

/** What a part's line says, in words (the tree view's second line, and part of its spoken name). '' for none. */
export function partLine(p: PartShown, now = new Date()): string {
  const step = p.step ? partsText(p.step) : '';
  const since = p.since ? ` · since ${sinceWords(p.since, now)}` : '';
  if (p.state === 'finished') return 'finished';
  if (p.state === 'stopped') return 'stopped';
  if (p.state === 'waiting') return `waiting for ${step}${since}`;
  if (p.state === 'new') return step ? `first: ${step}` : '';
  return `at ${step}${p.state === 'here' && since ? since : ''}`;
}


export function PartsList({ groups, onTake, testID = 'go-parts' }: { groups: PartsLevel[]; onTake?: (level: number, part: string) => void; testID?: string }) {
  return (
    <View style={styles.tree} testID={testID}>
      {groups.map((g, k) => (
        <View key={g.level} style={k > 0 && styles.inner}>
          {groups.length > 1 && (
            <T dim bold style={styles.within}>
              {g.within}
            </T>
          )}
          <View role="list" aria-label={`In any order, in ${g.within}`}>
            {g.parts.map((p) => (
              <View key={p.item} role="listitem">
                <PartRow part={p} within={g.within} onTake={onTake && p.state !== 'here' && p.state !== 'finished' && p.state !== 'stopped' ? () => onTake(g.level, p.item) : undefined} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function PartRow({ part: p, within, onTake }: { part: PartShown; within: string; onTake?: () => void }) {
  const line = [partLine(p), p.state === 'here' && 'you are here'].filter(Boolean).join(' · ');
  const ended = p.state === 'finished' || p.state === 'stopped';
  // Its full spoken name — "Study at Close it and write two lines from memory, in Become a better drawer" — holds the
  // words shown, in the order shown (B-16's example has a comma after the part; the name keeps the words as seen).
  const spoken = [[p.words, line].filter(Boolean).join(' '), `in ${within}`].join(', ');
  const body = (
    <>
      <View style={styles.mark} {...decorative}>
        {p.state === 'here' ? <Mark name="here" size={20} color={G.text} /> : p.state === 'waiting' ? <Mark name="wait" size={20} color={G.dim} /> : null}
      </View>
      <T bold={!ended} dim={ended} style={[styles.words, styles.wrap]}>
        {line ? `${p.words}\n` : p.words}
        {!!line && (
          <T dim bold={false}>
            {line}
          </T>
        )}
      </T>
    </>
  );
  if (!onTake)
    return (
      <View style={styles.row} accessible accessibilityLabel={spoken} testID="go-part" {...{ dataSet: { state: p.state } }}>
        {body}
      </View>
    );
  return (
    <Pressable
      onPress={onTake}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      testID="go-part"
      {...{ dataSet: { state: p.state } }}
      style={(s) => [styles.row, styles.target, s.pressed && { opacity: 0.75 }, (s as { focused?: boolean }).focused && WEB ? styles.ring : null]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tree: { gap: SP.s2 },
  inner: { marginLeft: SP.s4 },
  within: { paddingTop: SP.s2 },
  row: { minHeight: TARGET, flexDirection: 'row', alignItems: 'center', gap: SP.s2, paddingVertical: SP.s1 },
  target: { borderWidth: 1, borderColor: G.line, borderRadius: 8, paddingHorizontal: SP.s2 },
  ring: { outlineStyle: 'solid', outlineWidth: 2, outlineColor: G.focus, outlineOffset: 2 } as object,
  mark: { width: 20, alignItems: 'center' },
  words: { flex: 1, minWidth: 0 },
  wrap: { flexShrink: 1, overflowWrap: 'anywhere' } as object,
});
