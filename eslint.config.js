// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Other builders' git worktrees (agents' isolated checkouts) aren't this tree's code.
    ignores: ['dist/*', '.claude/worktrees/**', '.polish/**'],
  },
]);
