/**
 * Builds a first-release (legacy) storage blob, which the app moves into SQLite on first load.
 * Used to seed realistic data without clicking through the UI.
 */
export interface SeedLink {
  from?: string;
  to?: string[];
  text: string;
  daysAgo: number;
}

export function legacyBlob(threadNames: string[], links: SeedLink[], now = Date.now()) {
  const threads: Record<string, unknown> = {};
  for (const name of threadNames) threads[name] = { id: name, name, hidden: false, createdAt: new Date(now - 200 * 864e5).toISOString() };
  const activities: Record<string, unknown> = {};
  links.forEach((l, i) => {
    const at = new Date(now - l.daysAgo * 864e5).toISOString();
    activities[`a${i}`] = { id: `a${i}`, text: l.text, occurredAt: at, createdAt: at, doingId: l.from, toIds: l.to ?? [] };
  });
  return JSON.stringify({ state: { data: { version: 1, threads, activities }, showShading: true }, version: 1 });
}

/** A big, random-but-repeatable world: `n` threads, `m` activities, a few popular targets. */
export function bigBlob(n = 220, m = 4000) {
  const names = Array.from({ length: n }, (_, i) => `thread ${i}`);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const links: SeedLink[] = [];
  for (let i = 0; i < m; i++) {
    const from = names[Math.floor(rnd() * n)];
    const to = names[Math.floor(Math.pow(rnd(), 3) * n)];
    links.push({ from, to: from === to ? [] : [to], text: `step ${i}`, daysAgo: rnd() * 120 });
  }
  return legacyBlob(names, links);
}

export const seedScript = (json: string) => {
  if (!sessionStorage.getItem('seeded')) {
    localStorage.setItem('wanderment', json);
    sessionStorage.setItem('seeded', '1');
  }
};
