// Generates dist/sw.js after `expo export -p web`. See docs/IMPLEMENTATION_PLAN.md, Phase 1.
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{html,js,css,png,ico,json,ttf,woff,woff2,wasm}'],
  // 404.html is a copy of index.html for GitHub Pages deep links; metadata.json is build info.
  globIgnores: ['404.html', 'metadata.json', 'sw.js', 'workbox-*.js'],
  swDest: 'dist/sw.js',
  // Every in-app path (e.g. /wanderment/activities) is served the app shell when offline.
  navigateFallback: '/wanderment/index.html',
  navigateFallbackAllowlist: [/^\/wanderment\//],
  // A new version waits until the page asks it to take over: by itself right after a load or return,
  // else when "Update now" is tapped in the update banner (src/pwa/serviceWorker.ts, P-30).
  skipWaiting: false,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  // The app bundle is a single large JS file.
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  sourcemap: false,
};
