/** P-73 (B-08 slice 1): the rise — lit and settled lines, Done it, ↳ First step, Toward…, and a lit star's glow. */
import { describe, expect, it } from 'vitest';

import { applyUndo, undoEntry } from './diff';
import { restSky } from './home';
import { logActivity } from './model';
import { firstStep, LIT_FLOOR, litGlow, looksLit, riseSaid, settle, toward, undoFirstStep } from './rise';
import { Data, emptyData, Thread } from './types';

const DAY = 864e5;
const NOW = new Date('2026-11-24T12:00:00Z');
const ago = (d: number) => new Date(NOW.getTime() - d * DAY);

function thread(data: Data, name: string, extra: Partial<Thread> = {}): Data {
  const t: Thread = { id: name, name, hidden: false, createdAt: ago(30).toISOString(), ...extra };
  return { ...data, threads: { ...data.threads, [name]: t } };
}

/** draw (no step), cook (staged "make soup"), secret (hidden). */
function world() {
  let d = emptyData();
  d = thread(d, 'draw');
  d = thread(d, 'cook', { next: 'make soup' });
  d = thread(d, 'secret', { hidden: true });
  return d;
}

/** A line sent up from the trailhead (lit), `daysAgo`. */
function lit(text: string, data = world(), daysAgo = 0) {
  const res = logActivity(data, { text, lit: true, occurredAt: ago(daysAgo) }, ago(daysAgo));
  return { data: res.data, id: res.activity.id };
}

describe('logActivity: lit only when asked (the trailhead’s Return); settled at once with the done chip', () => {
  it('a plain log (Map’s ＋, a trail’s Did it, the thread page) is never lit and has no settledAt', () => {
    const { activity } = logActivity(world(), { text: 'went for a run', doingId: 'draw' }, NOW);
    expect(activity.lit).toBeUndefined();
    expect(activity.settledAt).toBeUndefined();
    expect('lit' in activity).toBe(false);
  });

  it('lit: true marks it lit; settled stamps settledAt now (and never lit)', () => {
    expect(logActivity(world(), { text: 'a', lit: true }, NOW).activity).toMatchObject({ lit: true });
    const done = logActivity(world(), { text: 'b', settled: true }, NOW).activity;
    expect(done.settledAt).toBe(NOW.toISOString());
    expect(done.lit).toBeUndefined();
  });
});

describe('settle (Done it)', () => {
  it('drops lit and stamps settledAt; everything else is unchanged', () => {
    const k = lit('sketch hands');
    const out = settle(k.data, k.id, NOW);
    const a = out.activities[k.id];
    expect(a.lit).toBeUndefined();
    expect(a.settledAt).toBe(NOW.toISOString());
    expect({ ...a, settledAt: undefined }).toEqual({ ...k.data.activities[k.id], lit: undefined });
  });

  it('Undo (field by field) puts lit back and takes settledAt away', () => {
    const k = lit('sketch hands');
    const out = settle(k.data, k.id, NOW);
    const back = applyUndo(out, undoEntry(k.data, out)).activities[k.id];
    expect(back.lit).toBe(true);
    expect(back.settledAt).toBeUndefined();
  });

  it('a line that isn’t lit, or isn’t there, is left as it is', () => {
    const plain = logActivity(world(), { text: 'x' }, NOW);
    expect(settle(plain.data, plain.activity.id, NOW)).toBe(plain.data);
    expect(settle(plain.data, 'gone', NOW)).toBe(plain.data);
  });
});

describe('the glow: a lit line fades like warmth (14-day half-life); below LIT_FLOOR it draws as settled', () => {
  it('today it glows fully; two weeks on, half', () => {
    const k = lit('a');
    expect(litGlow(k.data.activities[k.id], NOW, true)).toBeCloseTo(1);
    const old = lit('b', world(), 14);
    expect(litGlow(old.data.activities[old.id], NOW, true)).toBeCloseTo(0.5);
  });

  it('about a month on (warmth < 0.25) it looks settled: no glow, not drawn lit', () => {
    const old = lit('c', world(), 30);
    const a = old.data.activities[old.id];
    expect(a.lit).toBe(true);
    expect(looksLit(a, NOW)).toBe(false);
    expect(litGlow(a, NOW, true)).toBe(0);
    expect(LIT_FLOOR).toBe(0.25);
    const recent = lit('d', world(), 27);
    expect(looksLit(recent.data.activities[recent.id], NOW)).toBe(true);
  });

  it('shading off: no glow at all, though it still draws lit (its shape and its name differ)', () => {
    const k = lit('a');
    expect(litGlow(k.data.activities[k.id], NOW, false)).toBe(0);
    expect(looksLit(k.data.activities[k.id], NOW)).toBe(true);
  });

  it('a settled line never glows', () => {
    const k = lit('a');
    const a = settle(k.data, k.id, NOW).activities[k.id];
    expect(looksLit(a, NOW)).toBe(false);
    expect(litGlow(a, NOW, true)).toBe(0);
  });

  it('the sky at rest marks lit lines with their glow, settled ones as before (nothing moves)', () => {
    const k = lit('sketch hands');
    const old = lit('old pursuit', k.data, 40);
    const plain = logActivity(old.data, { text: 'ran' }, NOW);
    const sky = restSky(plain.data, NOW);
    const by = (id: string) => sky.lines.find((l) => l.id === id)!;
    expect(by(k.id).lit?.glow).toBeCloseTo(1);
    expect(by(old.id).lit).toBeUndefined();
    expect(by(plain.activity.id).lit).toBeUndefined();
    expect(restSky(plain.data, NOW, { shading: false }).lines.find((l) => l.id === k.id)!.lit).toEqual({ glow: 0 });
    const settled = restSky(settle(plain.data, k.id, NOW), NOW);
    const s = settled.lines.find((l) => l.id === k.id)!;
    expect(s.lit).toBeUndefined();
    expect([s.x, s.y]).toEqual([by(k.id).x, by(k.id).y]);
  });
});

describe('firstStep (↳ First step + Return)', () => {
  it('makes a wander named with the line, stages the step, attaches the line as doing and settles it', () => {
    const k = lit('  learn   watercolour ');
    const res = firstStep(k.data, k.id, ' buy a brush ', NOW)!;
    const t = res.data.threads[res.threadId];
    expect(t).toMatchObject({ name: 'learn watercolour', next: 'buy a brush', hidden: false });
    expect(res.created).toBe(true);
    const a = res.data.activities[k.id];
    expect(a.doingId).toBe(res.threadId);
    expect(a.lit).toBeUndefined();
    expect(a.settledAt).toBe(NOW.toISOString());
  });

  it('uses a visible wander with the same normalized name instead of making another', () => {
    const k = lit('Draw');
    const res = firstStep(k.data, k.id, 'gesture study', NOW)!;
    expect(res.threadId).toBe('draw');
    expect(res.created).toBe(false);
    expect(Object.keys(res.data.threads)).toHaveLength(3);
    expect(res.data.threads.draw.next).toBe('gesture study');
  });

  it('never overwrites a staged step: it only attaches (and the typed step is ignored, even blank)', () => {
    const k = lit('cook');
    const res = firstStep(k.data, k.id, 'chop onions', NOW)!;
    expect(res.threadId).toBe('cook');
    expect(res.data.threads.cook.next).toBe('make soup');
    expect(res.stepSet).toBe(false);
    expect(res.data.activities[k.id].doingId).toBe('cook');
    expect(firstStep(k.data, k.id, '   ', NOW)?.threadId).toBe('cook');
  });

  it('a blank step with nothing staged creates nothing', () => {
    const k = lit('learn watercolour');
    expect(firstStep(k.data, k.id, '   ', NOW)).toBeUndefined();
  });

  it('a hidden wander of that name comes back (as logging to it would), and gets the step', () => {
    const k = lit('secret');
    const res = firstStep(k.data, k.id, 'tell no one', NOW)!;
    expect(res.threadId).toBe('secret');
    expect(res.data.threads.secret).toMatchObject({ hidden: false, next: 'tell no one' });
  });

  it('refuses a line that isn’t there', () => {
    expect(firstStep(world(), 'gone', 'x', NOW)).toBeUndefined();
  });

  it('Undo removes exactly what it created: the new wander, the step, the attach; the line is lit again', () => {
    const k = lit('learn watercolour');
    const res = firstStep(k.data, k.id, 'buy a brush', NOW)!;
    const back = undoFirstStep(res.data, undoEntry(k.data, res.data), res.threadId);
    expect(back).toEqual({ ...k.data, activities: { [k.id]: { ...k.data.activities[k.id], settledAt: undefined } } });
    expect(back.activities[k.id].lit).toBe(true);
  });

  it('Undo on an existing wander only clears the step it set and detaches the line', () => {
    const k = lit('draw');
    const res = firstStep(k.data, k.id, 'gesture study', NOW)!;
    const back = undoFirstStep(res.data, undoEntry(k.data, res.data), res.threadId);
    expect(back.threads.draw).toEqual(k.data.threads.draw);
    expect(back.activities[k.id].doingId).toBeUndefined();
    expect(back.activities[k.id].lit).toBe(true);
  });

  it('Undo after something else was attached to the new wander keeps the wander (no dangling link), detaching the line and clearing its step', () => {
    const k = lit('learn watercolour');
    const res = firstStep(k.data, k.id, 'buy a brush', NOW)!;
    const entry = undoEntry(k.data, res.data);
    const more = logActivity(res.data, { text: 'mixed greys', doingId: res.threadId }, NOW);
    const back = undoFirstStep(more.data, entry, res.threadId);
    expect(back.threads[res.threadId]).toMatchObject({ name: 'learn watercolour', next: undefined });
    expect(back.activities[more.activity.id].doingId).toBe(res.threadId);
    expect(back.activities[k.id].doingId).toBeUndefined();
    expect(back.activities[k.id].lit).toBe(true);
  });
});

describe('toward (Toward…)', () => {
  it('attaches the line to a visible wander as doing; it stays lit', () => {
    const k = lit('sketch hands');
    const out = toward(k.data, k.id, 'draw')!;
    expect(out.activities[k.id]).toMatchObject({ doingId: 'draw', lit: true });
    expect(applyUndo(out, undoEntry(k.data, out)).activities[k.id].doingId).toBeUndefined();
  });

  it('refuses a hidden wander, a missing one, or a missing line', () => {
    const k = lit('sketch hands');
    expect(toward(k.data, k.id, 'secret')).toBeUndefined();
    expect(toward(k.data, k.id, 'nope')).toBeUndefined();
    expect(toward(k.data, 'gone', 'draw')).toBeUndefined();
  });
});

describe('riseSaid: what the rise (and, once it has ended, the toast) says about a choice', () => {
  it('Settled, Toward X, First step on X (Toward X when its step was kept), Logged → X for a line attached at capture, nothing while lit', () => {
    const k = lit('sketch hands');
    expect(riseSaid(k.data, k.id)).toBe('');
    expect(riseSaid(k.data, k.id, { kind: 'settled' })).toBe('Settled');
    expect(riseSaid(k.data, k.id, { kind: 'done' })).toBe('Settled');
    expect(riseSaid(k.data, k.id, { kind: 'toward', threadId: 'draw' })).toBe('Toward draw');
    expect(riseSaid(k.data, k.id, { kind: 'step', threadId: 'cook' })).toBe('First step on cook');
    expect(riseSaid(k.data, k.id, { kind: 'step', threadId: 'draw' })).toBe('Toward draw');
    const attached = logActivity(world(), { text: 'x', doingId: 'cook', lit: true }, NOW);
    expect(riseSaid(attached.data, attached.activity.id)).toBe('Logged → cook');
  });
});
