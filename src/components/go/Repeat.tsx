/** B-11 slice 1 (P-86): how many times the repeating part runs — "Until I'm done" or a number you set. */
import { StyleSheet, View } from 'react-native';

import { SP } from './tokens';
import { Btn, Seg, T } from './ui';

export function Repeat({ repeat, onChange }: { repeat?: number; onChange: (repeat?: number) => void }) {
  return (
    <View style={styles.box} testID="go-repeat">
      <Seg
        spoken="Repeat"
        value={repeat === undefined ? 'until' : 'number'}
        options={[
          ['until', 'Until I’m done'],
          ['number', 'A number'],
        ]}
        onChange={(v) => onChange(v === 'until' ? undefined : (repeat ?? 3))}
      />
      {repeat !== undefined && (
        <View style={styles.stepper}>
          <Btn label="−" spoken="Fewer times" disabled={repeat <= 1} onPress={() => onChange(repeat - 1)} />
          <T bold size={18} style={styles.count} testID="go-repeat-count">{`${repeat} ${repeat === 1 ? 'time' : 'times'}`}</T>
          <Btn label="+" spoken="More times" onPress={() => onChange(repeat + 1)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: SP.s2 },
  stepper: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.s2 },
  count: { minWidth: 72, textAlign: 'center' },
});
