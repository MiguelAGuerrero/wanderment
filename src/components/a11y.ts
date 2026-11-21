/**
 * Spread onto purely decorative elements (glyphs like ↳ › ✎) so no screen reader reads them:
 * aria-hidden for web, the other two for iOS and Android.
 */
export const decorative = {
  'aria-hidden': true,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;
