/** P-50: focus, scope and attach on Home, each with one job. */
import { beforeEach, describe, expect, it } from 'vitest';

import { FocusMap } from '@/domain/focus';
import { emptyData, Id } from '@/domain/types';

import { useStore } from './useStore';

const st = () => useStore.getState();

beforeEach(() => {
  useStore.setState({
    data: emptyData(),
    undo: undefined,
    toast: undefined,
    selected: undefined,
    focus: undefined,
    scope: [],
    focusMap: undefined,
    homeFace: 'next',
    draft: { text: '', toIds: [] },
  });
});

/** make apparel ← draw ← hands, make apparel ← sew; guitar alone; read was logged toward last. */
function world() {
  const id: Record<string, Id> = {};
  for (const n of ['make apparel', 'draw', 'hands', 'sew', 'guitar', 'read']) id[n] = st().createThread(n);
  st().declareThread(id['make apparel']);
  st().setNext(id.hands, 'sketch a hand');
  st().setDraft({ text: 'a chapter', toIds: [id.read] });
  st().log();
  const map: FocusMap = {
    nodes: [
      { id: id['make apparel'], name: 'make apparel', x: 60, y: 50, why: true },
      { id: id.guitar, name: 'guitar', x: 240, y: 50, why: false },
      { id: id.draw, name: 'draw', x: 34, y: 140, why: false },
      { id: id.sew, name: 'sew', x: 94, y: 140, why: false },
      { id: id.hands, name: 'hands', x: 56, y: 200, why: false },
    ],
    links: [
      { from: id.draw, to: id['make apparel'] },
      { from: id.sew, to: id['make apparel'] },
      { from: id.hands, to: id.draw },
    ],
  };
  st().setFocusMap(map);
  useStore.setState({ focus: undefined, toast: undefined });
  return id;
}

describe('a tap focuses and attaches', () => {
  // P-61 (was: a tap always attached, P-50): with the log field away a tap only focuses; open, it attaches.
  it('focuses the node and says the card’s new name with its path; only with the log field open does it put its “to” chip on the line', () => {
    const id = world();
    const n = st().focusSaid.n;
    st().tapNode(id.hands);
    expect(st().focus).toBe(id.hands);
    expect(st().selected).toBeUndefined();
    expect(st().draft.toIds).toEqual([]);
    expect(st().focusSaid).toEqual({ text: 'What’s next, hands, toward draw, for make apparel: sketch a hand', n: n + 1 });
    expect(st().scope).toEqual([]);
    useStore.setState({ homeFace: 'log' });
    st().tapNode(id.sew);
    expect(st().focus).toBe(id.sew);
    expect(st().selected).toEqual({ id: id.sew, added: true });
    expect(st().draft.toIds).toEqual([id.sew]);
    expect(st().focusSaid).toEqual({ text: 'Attached to sew', n: n + 2 });
  });

  it('a second tap on a focused node with something feeding it narrows to it; focus stays; again does nothing more', () => {
    const id = world();
    st().tapNode(id['make apparel']);
    expect(st().scope).toEqual([]);
    st().tapNode(id['make apparel']);
    expect(st().scope).toEqual([id['make apparel']]);
    expect(st().focus).toBe(id['make apparel']);
    expect(st().focusSaid.text).toBe('Showing make apparel');
    st().tapNode(id['make apparel']);
    expect(st().scope).toEqual([id['make apparel']]);
    // A deeper level.
    st().tapNode(id.draw);
    st().tapNode(id.draw);
    expect(st().scope).toEqual([id['make apparel'], id.draw]);
  });

  it('the default focus (never tapped) narrows on its first tap; a node nothing feeds never narrows', () => {
    const id = world();
    useStore.setState({ focus: undefined });
    st().tapNode(id.sew);
    st().tapNode(id.sew);
    expect(st().scope).toEqual([]);
    expect(st().focus).toBe(id.sew);
  });

  it('a hidden or unknown node does nothing', () => {
    const id = world();
    st().setHidden(id.guitar, true);
    st().tapNode(id.guitar);
    st().tapNode('nope');
    expect(st().focus).toBeUndefined();
    expect(st().selected).toBeUndefined();
  });
});

describe('a swipe moves focus, never attaches, never re-zooms', () => {
  it('steps through the chains in the picture’s order and stops at the ends', () => {
    const id = world();
    // The default (read) isn't in the picture: next is the first chain.
    expect(st().moveFocus(1)).toBe(true);
    expect(st().focus).toBe(id.hands);
    expect(st().moveFocus(1)).toBe(true);
    expect(st().focus).toBe(id.sew);
    expect(st().focusSaid.text).toBe('What’s next, sew, for make apparel');
    expect(st().moveFocus(1)).toBe(true);
    expect(st().focus).toBe(id.guitar);
    expect(st().moveFocus(1)).toBe(false);
    expect(st().focus).toBe(id.guitar);
    expect(st().selected).toBeUndefined();
    expect(st().draft.toIds).toEqual([]);
    expect(st().scope).toEqual([]);
  });

  it('inside a scope, only its chains', () => {
    const id = world();
    useStore.setState({ scope: [id['make apparel']], focus: id.sew });
    expect(st().moveFocus(1)).toBe(false);
    expect(st().moveFocus(-1)).toBe(true);
    expect(st().focus).toBe(id.hands);
    expect(st().scope).toEqual([id['make apparel']]);
  });

  it('a swipe keeps an attach made by an earlier tap (only the chip removes it)', () => {
    const id = world();
    useStore.setState({ homeFace: 'log' }); // P-61: a tap attaches only with the log field open.
    st().tapNode(id.sew);
    st().moveFocus(-1);
    expect(st().focus).toBe(id.hands);
    expect(st().selected?.id).toBe(id.sew);
  });
});

describe('going up', () => {
  it('drops the last level and says where it is; at All it does nothing', () => {
    const id = world();
    useStore.setState({ scope: [id['make apparel'], id.draw], focus: id.hands });
    st().scopeUp();
    expect(st().scope).toEqual([id['make apparel']]);
    expect(st().focusSaid.text).toBe('Showing make apparel');
    st().scopeUp();
    expect(st().scope).toEqual([]);
    expect(st().focusSaid.text).toBe('Showing all');
    const n = st().focusSaid.n;
    st().scopeUp();
    expect(st().focusSaid.n).toBe(n);
    // Focus never moves with the scope.
    expect(st().focus).toBe(id.hands);
  });

  it('a scope that no longer holds is cut back first', () => {
    const id = world();
    useStore.setState({ scope: [id['make apparel'], id.guitar] });
    st().scopeUp();
    expect(st().scope).toEqual([]);
  });
});

describe('a log keeps focus and uses up the attach', () => {
  it('after a log toward the tapped node, focus (the ring) stays and the chip is gone', () => {
    const id = world();
    useStore.setState({ homeFace: 'log' }); // P-61: a tap attaches only with the log field open.
    st().tapNode(id.sew);
    st().setDraft({ text: 'pinned a hem' });
    const a = st().log()!;
    expect(st().data.activities[a].toIds).toEqual([id.sew]);
    expect(st().focus).toBe(id.sew);
    expect(st().selected).toBeUndefined();
    expect(st().draft.toIds).toEqual([]);
  });

  it('the default focus is kept too: a log toward something else never moves the card', () => {
    const id = world();
    expect(st().focus).toBeUndefined();
    st().setDraft({ text: 'scales', toIds: [id.guitar] });
    st().log();
    // Read was the wander last logged toward before this log.
    expect(st().focus).toBe(id.read);
  });

  it('with no wanders yet there’s nothing to keep', () => {
    useStore.setState({ focusMap: undefined });
    st().setDraft({ text: 'read a novel' });
    st().log();
    expect(st().focus).toBeUndefined();
  });

  it('replacing the data (an import) resets focus and scope', () => {
    const id = world();
    useStore.setState({ scope: [id['make apparel']], focus: id.sew });
    st().replaceData(emptyData());
    expect(st().focus).toBeUndefined();
    expect(st().scope).toEqual([]);
  });
});

describe('the picture’s dashed ＋', () => {
  it('asks the card to open “＋ add one” on What’s next; the card takes the ask', () => {
    const id = world();
    useStore.setState({ homeFace: 'log' });
    st().askAddStep(id.sew);
    expect(st().addStepFor).toBe(id.sew);
    expect(st().homeFace).toBe('next');
    expect(st().focus).toBe(id.sew);
    st().askAddStep(undefined);
    expect(st().addStepFor).toBeUndefined();
    expect(st().focus).toBe(id.sew);
  });
});
