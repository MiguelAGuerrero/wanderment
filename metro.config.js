// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite on web loads SQLite as WebAssembly. The app only uses the async API there,
// which (unlike the sync API) works without COOP/COEP headers — GitHub Pages can't send them.
config.resolver.assetExts.push('wasm');

module.exports = config;
