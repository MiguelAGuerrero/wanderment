// Checks docs/ROADMAP.md stays machine-readable, so /polish (and people) can trust it:
// unique P-## ids, each item has a known size, known tags, a status, a "Why", and — for items in
// Now — "Done when"; decisions an item waits on exist; done-log lines for P-items cite evidence and
// the audit tally. Exit 1 with a list of problems.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const path = process.argv[2] ?? fileURLToPath(new URL('../../docs/ROADMAP.md', import.meta.url));
const text = readFileSync(path, 'utf8');
const lines = text.split('\n');
const problems = [];
const TAGS = new Set(['data', 'capture', 'ux', 'a11y', 'perf', 'platform', 'native']);
const STATUSES = new Set(['todo', 'in-progress', 'blocked', 'done']);
const SECTIONS = ['Inbox', 'Now', 'Next', 'Later', 'Decisions needed 🙋', 'Known edge cases (accepted for now)', 'Done log'];

const sectionAt = [];
let section = '';
for (const line of lines) {
  const h2 = /^## (.+)$/.exec(line);
  if (h2) section = h2[1].trim();
  sectionAt.push(section);
}
for (const s of SECTIONS) if (!lines.includes(`## ${s}`)) problems.push(`missing section "## ${s}"`);

const decisions = new Set([...text.matchAll(/^- \*\*(D-\d+)\b/gm)].map((m) => m[1]));
const ids = new Map();

lines.forEach((line, i) => {
  const item = /^### (P-\d{2,}) (.+)$/.exec(line);
  if (!item) return;
  const [, id, rest] = item;
  const where = `${id} (line ${i + 1})`;
  if (ids.has(id)) problems.push(`${where}: duplicate id (also line ${ids.get(id)})`);
  ids.set(id, i + 1);
  if (!/\s(S|M|L)(\s|$)/.test(rest)) problems.push(`${where}: heading needs a size S, M or L`);
  const tags = [...rest.matchAll(/`\[([a-z0-9-]+)\]`/g)].map((m) => m[1]);
  if (!tags.length) problems.push(`${where}: heading needs at least one tag like \`[ux]\``);
  for (const t of tags) if (!TAGS.has(t)) problems.push(`${where}: unknown tag [${t}]`);
  for (const d of rest.matchAll(/\b(D-\d+)\b/g)) if (!decisions.has(d[1])) problems.push(`${where}: waits on ${d[1]}, which isn't under Decisions needed`);

  // The item's body runs to the next heading.
  let end = i + 1;
  while (end < lines.length && !/^#{2,3} /.test(lines[end])) end++;
  const body = lines.slice(i + 1, end).join('\n');
  if (!/\*Why:\*/.test(body)) problems.push(`${where}: missing *Why:*`);
  const status = /\*Status:\*\s*([a-z-]+)/.exec(body)?.[1];
  if (!status) problems.push(`${where}: missing *Status:* (todo, in-progress, blocked, done)`);
  else if (!STATUSES.has(status)) problems.push(`${where}: unknown status "${status}"`);
  else if (status === 'done') problems.push(`${where}: done items move to the Done log`);
  if (sectionAt[i] === 'Now' && !/\*Done when:\*/.test(body)) problems.push(`${where}: items in Now need *Done when:*`);
  if (!['Now', 'Next'].includes(sectionAt[i])) problems.push(`${where}: P-items live under Now or Next (found under "${sectionAt[i]}")`);
});

lines.forEach((line, i) => {
  if (sectionAt[i] !== 'Done log' || !line.startsWith('- ')) return;
  if (!/^- \d{4}-\d{2}-\d{2} · /.test(line)) problems.push(`Done log line ${i + 1}: start with "- YYYY-MM-DD · "`);
  if (/\bP-\d{2,}\b/.test(line)) {
    if (!/evidence:/.test(line)) problems.push(`Done log line ${i + 1}: P-items need "evidence:" (tests/specs/screenshots)`);
    if (!/audit: \d+ reported · \d+ reproduced · \d+ fixed · \d+ deferred/.test(line)) {
      problems.push(`Done log line ${i + 1}: needs "audit: N reported · N reproduced · N fixed · N deferred"`);
    }
    for (const m of line.matchAll(/\b(P-\d{2,})\b/g)) if (ids.has(m[1])) problems.push(`Done log line ${i + 1}: ${m[1]} is done but still listed above`);
  }
});

if (problems.length) {
  console.error(`docs/ROADMAP.md — ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`docs/ROADMAP.md OK — ${ids.size} items`);
