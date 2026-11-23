import Svg, { Circle, Line, Path } from 'react-native-svg';

import { decorative } from '@/components/a11y';
import { C } from '@/theme';

/** P-60: Home's header icons, drawn 24 pt (a text glyph's ink was 12–14 pt); their buttons carry the names. */
export const ICON = 24;

const props = { width: ICON, height: ICON, viewBox: '0 0 24 24', fill: 'none', ...decorative };

/** ⋔ Explore: a branch splitting in two. */
export function ExploreGlyph() {
  return (
    <Svg {...props} testID="icon-explore">
      <Path d="M12 21V12M12 12C12 8.5 7 8 6 3.5M12 12C12 8.5 17 8 18 3.5" stroke={C.body} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={12} r={1.6} fill={C.body} />
    </Svg>
  );
}

/** ⌕ Search: a magnifier. */
export function SearchGlyph() {
  return (
    <Svg {...props} testID="icon-search">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={C.body} strokeWidth={2} />
      <Line x1={15.3} y1={15.3} x2={20.5} y2={20.5} stroke={C.body} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

const TEETH = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);

/** ⚙ Settings: a cog. */
export function SettingsGlyph() {
  return (
    <Svg {...props} testID="icon-settings">
      {TEETH.map((a) => (
        <Line key={a} x1={12 + 6.5 * Math.cos(a)} y1={12 + 6.5 * Math.sin(a)} x2={12 + 10 * Math.cos(a)} y2={12 + 10 * Math.sin(a)} stroke={C.body} strokeWidth={3} strokeLinecap="round" />
      ))}
      <Circle cx={12} cy={12} r={6.5} stroke={C.body} strokeWidth={2} />
      <Circle cx={12} cy={12} r={2.5} stroke={C.body} strokeWidth={2} />
    </Svg>
  );
}

/** ‹ Back to the prompt (Map's header, P-65). */
export function BackGlyph() {
  return (
    <Svg {...props} testID="icon-back">
      <Path d="M15 5l-7 7 7 7" stroke={C.body} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
