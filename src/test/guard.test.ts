/**
 * P-89 guards: test support stays out of the app, and the retired app stays gone.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
const files = walk(SRC).map((f) => relative(SRC, f).split('\\').join('/'));
const isTest = (f: string) => f.startsWith('test/') || /\.test\.tsx?$/.test(f) || f === 'storage/nodeDb.ts';
const code = files.filter((f) => /\.tsx?$/.test(f));
const app = code.filter((f) => !isTest(f));

describe('test support (src/test, nodeDb) is never part of the app', () => {
  it('no app file imports it', () => {
    const offenders = app.filter((f) => /from\s+['"](@\/test\/|(\.\.?\/)+(.*\/)?test\/|.*\/nodeDb['"])/.test(readFileSync(join(SRC, f), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the check itself sees imports (it would catch one)', () => {
    expect(/from\s+['"](@\/test\/|(\.\.?\/)+(.*\/)?test\/|.*\/nodeDb['"])/.test("import { person } from '@/test/records';")).toBe(true);
    expect(/from\s+['"](@\/test\/|(\.\.?\/)+(.*\/)?test\/|.*\/nodeDb['"])/.test("import { x } from '../test/records';")).toBe(true);
    expect(app.length).toBeGreaterThan(30);
  });
});

describe('the old app is retired (P-89)', () => {
  // The scout's DELETE list: the old routes, the components and domain modules only they used.
  const GONE = [
    'app/(home)',
    ...['activities', 'wanders', 'search', 'explore', 'map'].map((r) => `app/${r}.tsx`),
    'app/thread',
    'app/activity',
    'app/pull-in',
    ...['Composer', 'FirstRun', 'Home', 'NightSky', 'PullInOffer', 'Rise', 'Screen', 'StarGlyph', 'ThreadCard', 'Toast', 'Trail', 'Trailhead', 'UnderStar', 'icons', 'passage'].map((c) => `components/${c}.tsx`),
    ...['modality', 'palette', 'shown', 'useEscBack'].map((c) => `components/${c}.ts`),
    'components/graph',
    'components/sheet',
    ...['bridge', 'compose', 'emergence', 'feed', 'firstRun', 'focus', 'graph', 'heat', 'home', 'litMap', 'logSuggest', 'overview', 'passage', 'rise', 'search', 'searchSky', 'select', 'selectors', 'sheet', 'sky', 'slot', 'trailhead'].map((d) => `domain/${d}.ts`),
  ];

  it('none of its routes, components or domain modules is left', () => {
    expect(GONE.filter((f) => existsSync(join(SRC, f)))).toEqual([]);
  });

  it('the only routes are the new app’s, and the three that only redirect into it', () => {
    expect(files.filter((f) => f.startsWith('app/')).sort()).toEqual(
      // (P-97: and My routines, /go/routines.)
      ['app/[...rest].tsx', 'app/_layout.tsx', 'app/go/_layout.tsx', 'app/go/index.tsx', 'app/go/routine/[id].tsx', 'app/go/routines.tsx', 'app/go/run/[id]/all.tsx', 'app/go/run/[id]/index.tsx', 'app/go/run/[id]/jump.tsx', 'app/go/run/[id]/paused.tsx', 'app/go/run/[id]/plan.tsx', 'app/go/settings.tsx', 'app/index.tsx', 'app/settings.tsx'].sort(),
    );
    for (const [route, to] of [
      ['app/index.tsx', '/go'],
      ['app/[...rest].tsx', '/go'],
      ['app/settings.tsx', '/go/settings'],
    ]) {
      expect(readFileSync(join(SRC, route), 'utf8'), route).toContain(`<Redirect href="${to}" />`);
    }
    // P-90: See it all is folded into Plan — its old address only redirects to the run's Plan.
    expect(readFileSync(join(SRC, 'app/go/run/[id]/all.tsx'), 'utf8')).toContain('<Redirect href={`/go/run/${String(id)}/plan`} />');
    for (const gone of ['components/go/SeeAll.tsx', 'components/go/Editor.tsx']) expect(existsSync(join(SRC, gone)), gone).toBe(false);
  });

  it('nothing in the app says “Back to Wanderment” or points at the old home', () => {
    const hits = app.filter((f) => /Back to Wanderment|OLD_HOME|['"]\/old['"]/.test(readFileSync(join(SRC, f), 'utf8')));
    expect(hits).toEqual([]);
  });

  it('no sentence a person can be shown calls the app “Wanderment” (the owner has not chosen a name; the manifest keeps its own)', () => {
    // Text between quotes or backticks, or a line of JSX text; comments and console warnings are not shown to anyone.
    const shownText = (source: string) =>
      source
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line) && !/console\.warn/.test(line))
        .filter((line) => /['"`][^'"`]*\bWanderment\b/.test(line) || />[^<]*\bWanderment\b/.test(line) || /^\s*[^/*{}<>()=;]*\bWanderment\b[^{}()=;]*$/.test(line));
    const hits = app.filter((f) => f !== 'storage/nativeBackup.native.ts').flatMap((f) => shownText(readFileSync(join(SRC, f), 'utf8')).map((line) => `${f}: ${line.trim().slice(0, 80)}`));
    expect(hits).toEqual([]);
    const manifest = JSON.parse(readFileSync(join(SRC, '../public/manifest.json'), 'utf8')) as { name: string; description: string };
    // P-103 (owner, 2026-11-27: "A neutral placeholder"): the working name is Routines.
    expect(manifest.name).toBe('Routines');
    expect(manifest.description).not.toMatch(/log|wander|interests/i);
  });

  it('the data layer is untouched: every persisted setting is still read from the store and written', () => {
    const persistence = readFileSync(join(SRC, 'storage/persistence.ts'), 'utf8');
    const store = readFileSync(join(SRC, 'store/useStore.ts'), 'utf8');
    for (const key of ['showShading', 'recentSearches', 'leftAsIs', 'whyOfferOff', 'firstRunDone']) {
      expect(persistence, key).toContain(`s.${key}`);
      expect(store, key).toMatch(new RegExp(`\\n  ${key}: `));
    }
  });
});
