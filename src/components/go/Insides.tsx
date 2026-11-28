/**
 * P-111: a step that has insides (a step broken down, a for each, a routine used as a step) — its disclosure control and
 * its words, in one place, so Plan and the runner (P-112: "they're expandable … an outline view") say it the same way.
 *
 * The control is the chevron: › shut, ⌄ open in place (`open` given: it says Open / Close and is expanded or not); with
 * no `open` it goes into them (Plan's own view of a step broken down or a for each) and says "Open <words>". Its name
 * holds the words the row shows. A full target.
 */
import { TARGET } from './tokens';
import { Btn } from './ui';

/** The words for going into a step's insides, or opening / closing them in place. */
export const insidesSpoken = (words: string, open?: boolean): string => `${open ? 'Close' : 'Open'} ${words}`;

export function InsidesBtn({ words, open, onPress, testID, dataSet }: { words: string; open?: boolean; onPress: () => void; testID?: string; dataSet?: Record<string, string> }) {
  return (
    <Btn
      kind="plain"
      // P-103 (10): the disclosure chevron — › shut (or: goes in), ⌄ open.
      mark={open ? 'chevronDown' : 'chevron'}
      spoken={insidesSpoken(words, open)}
      {...(open !== undefined && { expanded: open })}
      onPress={onPress}
      style={{ width: TARGET, minHeight: TARGET, paddingHorizontal: 0, justifyContent: 'center' }}
      testID={testID}
      dataSet={dataSet}
    />
  );
}
