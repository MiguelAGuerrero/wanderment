/**
 * B-11 slice 1 (P-86): the look of the `/go` screens, in one place. Its own tokens (not the night
 * palette, which B-11 §7 retires later). Bright text = the person's words; dim = the app's. Colour is
 * identity (a routine's own, for good); the one filled, paper button is the action.
 */
import { Platform } from 'react-native';

export const G = {
  bg: '#0F1014',
  surf: '#1A1C23',
  surf2: '#262933',
  line: '#7A8098',
  text: '#F4F1E8',
  dim: '#B4B8C5',
  ink: '#111216',
  paper: '#F4F1E8',
  err: '#FF8A7A',
  focus: '#B9A7FF',
  shadow: '#000000',
} as const;

/** A routine's colour and its dark twin (the hard shadow only). Index = `Tile.hue`. */
export const HUES = [
  { c: '#F2C94C', d: '#8A6D12' },
  { c: '#63D2F0', d: '#1F6F86' },
  { c: '#F59AC1', d: '#8E3F63' },
  { c: '#86DE8A', d: '#2F7A33' },
] as const;
export const hueOf = (n: number) => HUES[((n % HUES.length) + HUES.length) % HUES.length];

/** The family names, here and nowhere else (the owner may overrule the faces, B-11 §10). */
export const FAMILY = { words: 'IBM Plex Sans', title: 'Pixelify Sans' } as const;

/**
 * Web: the loaded face, then the system's (so a face that failed to load changes nothing but the
 * letterforms). Native: the system face in this slice (the files shipped are woff2, web only).
 */
export const face = {
  words: Platform.select({ web: `"${FAMILY.words}", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, default: undefined }),
  title: Platform.select({ web: `"${FAMILY.title}", "${FAMILY.words}", system-ui, sans-serif`, default: undefined }),
} as const;

export const SP = { s1: 4, s2: 8, s3: 16, s4: 24, s5: 32, s6: 48 } as const;
/** The smallest target (B-11 §6). */
export const TARGET = 48;
/** The smallest text (B-11 §6). */
export const BODY = 16;
