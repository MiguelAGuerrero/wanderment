import { spawnSync } from 'node:child_process';

// Cases for the git guard hook; run by scripts/polish/verify.sh.
const repo = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const cases = [
  ['ls -la', 0],
  ['git status', 0],
  ['git push origin main', 2],
  ['cd x && git push', 2],
  ['git push --force origin main', 2],
  ['git push -f', 2],
  ['git commit --no-verify -m x', 2],
  ['POLISH_ALLOW_UNVERIFIED_PUSH=1 git push origin main', 0],
  ['git log --oneline -3', 0],
  ["cat > msg.txt <<'EOF'\n- no force-push, no --no-verify\ngit push origin main\nEOF\nscripts/polish/land.sh msg.txt", 0],
  ['git commit -m "hooks: block --no-verify"', 0],
  ['git add -A && git commit --no-verify -m x', 2],
  ['echo ok; git push --force-with-lease', 2],
  ["python3 - <<'EOF'\nprint('--no-verify')\nEOF", 0],
];
let bad = 0;
for (const [command, expected] of cases) {
  const r = spawnSync('node', [`${repo}/scripts/polish/guard-git.mjs`], {
    input: JSON.stringify({ tool_input: { command } }),
    // No stamp, so every push is "unverified" whatever the repo's state.
    env: { ...process.env, CLAUDE_PROJECT_DIR: repo, POLISH_STAMP_FILE: '/nonexistent/polish-stamp' },
    encoding: 'utf8',
  });
  const ok = r.status === expected;
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '✗'} exit ${r.status} (want ${expected})  ${command}${r.stderr ? `  — ${r.stderr.trim().slice(0, 90)}` : ''}`);
}
process.exit(bad ? 1 : 0);
