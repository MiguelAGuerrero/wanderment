import { StyleSheet } from 'react-native';

export const C = {
  bg: '#F5F3EE',
  surface: '#FFFFFF',
  ink: '#18181B',
  body: '#3F3D39',
  muted: '#5E5B55',
  faint: '#8A867E',
  line: '#E3DFD6',
  lineSoft: '#EEEAE2',
  dashed: '#C9C3B8',
  accent: '#A8460F',
  accentInk: '#7E340B',
  accentTint: '#F6E6DA',
  crumbBg: '#FBF7F2',
  quietBg: '#EFECE5',
};

/** The trailhead's night (P-65, B-07): sky, hills, lantern; text and lines readable on it. */
export const N = {
  skyTop: '#0B0D1C',
  skyMid: '#1B1933',
  skyLow: '#2B2238',
  bg: '#0E1020',
  hillFar: '#17142A',
  hillNear: '#0D0B17',
  path: '#3A3555',
  line: '#3A3555',
  ink: '#F5F3EE',
  muted: '#B9B6CC',
  faint: '#9C99B3',
  lantern: '#F2B48C',
  lanternCore: '#FFF3E6',
  /** The lantern's glow with shading off: no warmth. */
  silver: '#C9C7D9',
  surface: '#1A1830',
  /** P-66: a trail not walked lately, and the cards under a star. */
  trail: '#6E6890',
  card: 'rgba(30, 26, 46, 0.92)',
  /** P-66: the note's paper tag on a trail. */
  tag: '#F3E9D8',
  tagInk: '#2A2238',
};

export const font = {
  display: 'SpaceGrotesk', // falls back to system if not loaded
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  h1: { fontSize: 28, fontWeight: '600', color: C.ink },
  sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, color: C.accent, marginTop: 4 },
  quietLabel: { fontSize: 13, fontWeight: '500', color: C.muted, marginTop: 4 },
  meta: { fontSize: 13, color: C.muted },
  body: { fontSize: 15, color: C.body, lineHeight: 22 },
  chip: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 22, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  chipText: { fontSize: 14, fontWeight: '500', color: C.ink },
  chipAccent: { borderColor: C.accent, backgroundColor: C.accentTint },
  chipAccentText: { color: C.accentInk },
  chipDashed: { borderStyle: 'dashed', borderColor: C.faint, backgroundColor: 'transparent' },
  primaryBtn: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14 },
});
