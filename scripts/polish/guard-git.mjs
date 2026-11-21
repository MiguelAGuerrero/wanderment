// PreToolUse hook (Bash): only a verified tree may be pushed, and nothing skips git hooks or
// rewrites history. Exit 2 blocks the command and shows the reason to Claude.
// Escape hatch, only when the owner explicitly asks: prefix the command with
// POLISH_ALLOW_UNVERIFIED_PUSH=1 (it stays visible in the transcript).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const block = (reason) => {
  process.stderr.write(`Blocked by scripts/polish/guard-git.mjs: ${reason}\n`);
  process.exit(2);
};

let input = '';
for await (const chunk of process.stdin) input += chunk;
const raw = JSON.parse(input || '{}').tool_input?.command ?? '';
if (!/\bgit\b/.test(raw)) process.exit(0);

// Look only at real git invocations: drop heredoc bodies and quoted text (commit messages, notes
// that merely mention a flag), then split the command line into its simple commands.
const code = raw
  .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\b/g, '')
  .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '""');
const gitCalls = code
  .split(/&&|\|\||;|\n|\|/)
  .map((part) => part.trim().replace(/^(?:\w+=\S*\s+)+/, ''))
  .filter((part) => /^git\b/.test(part));
const sub = (c) => /^git\s+(?:-C\s+\S+\s+)?(\S+)/.exec(c)?.[1] ?? '';

if (gitCalls.some((c) => ['commit', 'push', 'merge', 'rebase', 'am', 'cherry-pick'].includes(sub(c)) && /\s--no-verify\b/.test(c))) {
  block('--no-verify skips the checks; fix what they report instead.');
}

const pushes = gitCalls.filter((c) => sub(c) === 'push');
if (pushes.length) {
  if (pushes.some((c) => /\s(--force(?:-with-lease)?|-f)\b/.test(c))) block('force-pushing rewrites shared history; ask the owner first.');
  if (/POLISH_ALLOW_UNVERIFIED_PUSH=1\s+git\s/.test(raw)) process.exit(0);
  const sh = (c) => execSync(c, { cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(), encoding: 'utf8' }).trim();
  const root = sh('git rev-parse --show-toplevel');
  if (sh('git status --porcelain')) block('uncommitted changes — commit them, run scripts/polish/verify.sh, then push (or use scripts/polish/land.sh).');
  let stamp = '';
  try {
    // POLISH_STAMP_FILE lets scripts/polish/test-guard.mjs make the result deterministic.
    stamp = readFileSync(process.env.POLISH_STAMP_FILE || `${root}/.polish/verified`, 'utf8').trim();
  } catch {}
  if (stamp !== sh('git rev-parse "HEAD^{tree}"')) {
    block('HEAD is not the tree scripts/polish/verify.sh last passed. Run it (full), then push or use scripts/polish/land.sh.');
  }
}
process.exit(0);
