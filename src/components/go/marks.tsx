/**
 * B-11 slice 1 (P-86): the marks of the `/go` screens. One meaning each (mockups' NOTES §2); every one
 * is decorative here — the control or line it sits in carries the spoken name.
 */
import Svg, { Path, Rect } from 'react-native-svg';

import { decorative } from '@/components/a11y';

export type MarkName =
  | 'pause'
  | 'wait'
  | 'forward'
  | 'corner'
  | 'repeat'
  | 'routine'
  | 'here'
  | 'more'
  | 'back'
  | 'backStep'
  | 'jump'
  | 'up'
  | 'down'
  | 'add'
  | 'return'
  | 'close'
  | 'undo'
  | 'pencil'
  | 'bin'
  | 'split'
  | 'lines';

const D: Record<Exclude<MarkName, 'pause' | 'here' | 'more' | 'routine' | 'corner'>, string> = {
  wait: 'M6 3h12M6 21h12M7 3v4l5 5-5 5v4M17 3v4l-5 5 5 5v4',
  forward: 'M4 12h15M13 6l6 6-6 6',
  repeat: 'M4 9h13l-3-3M20 15H7l3 3',
  back: 'M20 12H5M11 6l-6 6 6 6',
  backStep: 'M6 5v14M19 5l-9 7 9 7V5z',
  jump: 'M5 4v9h13M13 8l5 5-5 5',
  up: 'M12 20V5M6 11l6-6 6 6',
  down: 'M12 4v15M6 13l6 6 6-6',
  add: 'M12 4v16M4 12h16',
  return: 'M20 5v8H6M10 9l-4 4 4 4',
  close: 'M5 5l14 14M19 5L5 19',
  undo: 'M9 6L4 11l5 5M4 11h10a5 5 0 010 10h-3',
  pencil: 'M4 20l1-5L16 4l4 4L9 19l-5 1zM14 6l4 4',
  bin: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  split: 'M4 5h16M4 12h10M4 19h10',
  lines: 'M4 6h16M4 12h16M4 18h11',
};

export function Mark({ name, size = 24, color }: { name: MarkName; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...decorative}>
      {name === 'pause' ? (
        <>
          <Rect x={6} y={5} width={4} height={14} fill={color} />
          <Rect x={14} y={5} width={4} height={14} fill={color} />
        </>
      ) : name === 'here' ? (
        <Rect x={8} y={3} width={8} height={18} fill={color} />
      ) : name === 'more' ? (
        <>
          <Rect x={3} y={10} width={4} height={4} fill={color} />
          <Rect x={10} y={10} width={4} height={4} fill={color} />
          <Rect x={17} y={10} width={4} height={4} fill={color} />
        </>
      ) : name === 'routine' ? (
        <>
          <Rect x={4} y={4} width={16} height={16} stroke={color} strokeWidth={2} fill="none" />
          <Rect x={8} y={8} width={8} height={2.5} fill={color} />
          <Rect x={8} y={13.5} width={8} height={2.5} fill={color} />
        </>
      ) : name === 'corner' ? (
        <Path d="M21 3v18H3z" fill={color} />
      ) : (
        <Path d={D[name]} stroke={color} strokeWidth={2} fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      )}
    </Svg>
  );
}
