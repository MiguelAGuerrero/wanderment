/**
 * P-86 part 2: the two pure helpers the screens draw from. Expected values are the design's (B-11
 * §3.1, §9b; the mockups' NOTES §1: the note steps 32 → 26 → 22 → 18, then reads "full").
 */
import { describe, expect, it } from 'vitest';

import { NOTE_SIZES, noteType, tileLine } from './goText';
import { Tile } from './runView';

const NOW = new Date('2026-11-24T12:00:00Z'); // a Tuesday
const tile = (t: Partial<Tile>): Tile => ({ routineId: 'r', name: 'Apply to Acme', state: 'idle', current: false, action: 'start', hue: 0, ...t });

describe('the note: type steps down with length, then the note is full', () => {
  it('a few words fit with air: the largest type', () => {
    expect(noteType('Read the job ad twice', 256)).toEqual({ size: 32, full: false });
    expect(noteType('Stretch', 256)).toEqual({ size: 32, full: false });
  });
  it('nothing typed yet is the largest type too', () => {
    expect(noteType('', 256)).toEqual({ size: 32, full: false });
  });
  it('longer words step the type down, one size at a time, never up', () => {
    let words = 'Read';
    let last = 32;
    const seen = new Set<number>();
    for (let i = 0; i < 80; i++) {
      const { size, full } = noteType(words, 256);
      expect(size).toBeLessThanOrEqual(last);
      expect(NOTE_SIZES).toContain(size);
      if (full) expect(size).toBe(18);
      seen.add(size);
      last = size;
      words += ' and again';
    }
    expect([...seen]).toEqual([32, 26, 22, 18]);
  });
  it('a step that is too long is full, at the smallest type', () => {
    const long = 'Write to the landlord about the boiler, the window latch and the stair light, attach the three photographs from Sunday, and ask for a date in writing '.repeat(3);
    expect(noteType(long, 256)).toEqual({ size: 18, full: true });
  });
  it('a three-line step still fits a full-size note without being full', () => {
    expect(noteType('Open the job ad beside the CV and mark what they ask for in yellow', 256).full).toBe(false);
  });
  it('a smaller note (the keyboard up) never gets larger type', () => {
    const words = 'Tailor the CV to what the ad asks for';
    let last = 32;
    for (const side of [256, 220, 180, 140, 100, 60]) {
      const { size } = noteType(words, side);
      expect(size).toBeLessThanOrEqual(last);
      last = size;
    }
    expect(noteType(words, 60)).toEqual({ size: 18, full: true });
  });
  it('larger text (200 %) steps down sooner', () => {
    const words = 'Read the job ad twice';
    expect(noteType(words, 256, 2).size).toBeLessThan(noteType(words, 256, 1).size);
  });
  it('one long unbroken word is wrapped, not assumed to fit', () => {
    expect(noteType('x'.repeat(400), 256)).toEqual({ size: 18, full: true });
  });
  it('a note with no room at all is full rather than a size that cannot be', () => {
    expect(noteType('Stretch', 0)).toEqual({ size: 18, full: true });
  });
});

describe('a tile: how its run reads (B-11 §9b)', () => {
  it('nothing going: the name only, and Start', () => {
    expect(tileLine(tile({}), NOW)).toEqual({ line: '', button: 'Start', spoken: 'Start Apply to Acme', says: 'Apply to Acme' });
  });
  it('paused: "at <step>" with the pause mark, its reason, and Resume', () => {
    const t = tile({ runId: 'x', state: 'paused', at: 'Tailor the CV', reason: 'need the job ad open', action: 'resume' });
    expect(tileLine(t, NOW)).toEqual({
      mark: 'paused',
      line: 'at Tailor the CV',
      reason: 'need the job ad open',
      button: 'Resume',
      spoken: 'Resume Apply to Acme',
      says: 'Apply to Acme, paused at Tailor the CV, need the job ad open',
    });
  });
  it('running: "at <step>", no pause mark', () => {
    const t = tile({ runId: 'x', state: 'running', at: 'Tailor the CV', action: 'resume', current: true });
    // After the audit (A4): a running tile says so.
    expect(tileLine(t, NOW)).toEqual({ line: 'at Tailor the CV', button: 'Resume', spoken: 'Resume Apply to Acme', says: 'Apply to Acme, running, at Tailor the CV' });
  });
  it('waiting: "waiting for <words> · since <day>" with the wait mark', () => {
    const t = tile({ runId: 'x', state: 'waiting', at: 'a reply from Acme', waitingFor: 'a reply from Acme', since: '2026-11-17T09:00:00Z', action: 'resume' });
    const got = tileLine(t, NOW);
    expect(got.mark).toBe('wait');
    // After the audit (B5): a date beyond the last week.
    expect(got.line).toBe('waiting for a reply from Acme · since 17 November');
    expect(got.says).toBe('Apply to Acme, waiting for a reply from Acme · since 17 November');
  });
  it('waiting since today, and with no date kept', () => {
    expect(tileLine(tile({ state: 'waiting', waitingFor: 'the dough', since: '2026-11-24T08:00:00Z', action: 'resume' }), NOW).line).toBe('waiting for the dough · since today');
    expect(tileLine(tile({ state: 'waiting', waitingFor: 'the dough', action: 'resume' }), NOW).line).toBe('waiting for the dough');
  });
  it('asking for its next small step: no line is invented', () => {
    const t = tile({ runId: 'x', state: 'paused', asking: true, action: 'resume' });
    expect(tileLine(t, NOW)).toEqual({ mark: 'paused', line: '', button: 'Resume', spoken: 'Resume Apply to Acme', says: 'Apply to Acme, paused' });
  });
  it('within the last week it is the day’s name', () => {
    expect(tileLine(tile({ state: 'waiting', waitingFor: 'a reply', since: '2026-11-19T09:00:00Z', action: 'resume' }), NOW).line).toBe('waiting for a reply · since Thursday');
  });
  it('after the audit (B4): a date that is not a date is left out — never "since undefined NaN"', () => {
    const t = tile({ runId: 'x', state: 'waiting', waitingFor: 'a reply', since: 'banana', action: 'resume' });
    expect(tileLine(t, NOW).line).toBe('waiting for a reply');
    expect(tileLine(t, NOW).says).toBe('Apply to Acme, waiting for a reply');
  });
});
