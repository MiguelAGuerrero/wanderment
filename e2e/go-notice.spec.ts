/**
 * P-102 (owner, 2026-11-27: "You should not undo a 'Done' … hitting the dismiss button is somehow close enough
 * to hit the undo. Also the button should be an x to dismiss not a return"): every notice has a × at its right
 * edge (spoken "Dismiss", a full target) that puts it away and changes nothing; finishing a run says "Done with
 * <name>" with no Undo at all; where a notice offers Undo it is a labelled text button beside the words, on the
 * left, at least 24 px from the × — never the ↶ glyph alone.
 * Expected values come from the owner's note and the P-102 Done-when.
 */
import { Locator } from '@playwright/test';

import { expect, test } from './fixtures';
import { expectFinal, exported, home, RoutineSpec, runner, saved, startGo } from './goFixture';

const STACK: RoutineSpec = { id: 'stack', name: 'MyStack', steps: [{ routine: 'vibe' }, 'Pick a task', 'Do it'] };
const VIBE: RoutineSpec = { id: 'vibe', name: 'Vibe check', home: false, steps: ['Feel it out', 'Name the energy'] };
const ROUTINES = [STACK, VIBE];
const box = async (l: Locator) => (await l.boundingBox())!;

for (const size of [
  { name: '390×844', width: 390, height: 844 },
  { name: '200 % text (195×422)', width: 195, height: 422 },
]) {
  test.describe(`at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
    });

    test('a notice with Undo (Step out): Undo is a labelled text button beside the words, on the left; × is at the right edge, ≥ 48 px and ≥ 24 px from Undo; × puts the notice away, changes nothing, and the Undo stays in the panel', async ({ page }) => {
      await startGo(page, [{ id: 'r', routine: 'stack', status: 'running', inner: [{ routine: 'vibe', at: 0 }] }], 'runner', ROUTINES);
      const r = runner(page);
      await r.stepOut.click();
      await expect(r.notice).toContainText('Left Vibe check');
      const undo = r.notice.getByTestId('go-notice-undo');
      const x = r.notice.getByRole('button', { name: 'Dismiss', exact: true });
      await expect(undo).toHaveText('Undo');
      await expect(undo).toHaveAccessibleName(/^Undo /);
      // Words, never the glyph alone.
      await expect(undo.locator('svg')).toHaveCount(0);
      const n = await box(r.notice);
      const u = await box(undo);
      const d = await box(x);
      expect(d.width).toBeGreaterThanOrEqual(48);
      expect(d.height).toBeGreaterThanOrEqual(48);
      expect(u.height).toBeGreaterThanOrEqual(48);
      // × at the right edge; Undo on the left half, at least 24 px before ×.
      expect(n.x + n.width - (d.x + d.width)).toBeLessThanOrEqual(8);
      expect(d.x - (u.x + u.width)).toBeGreaterThanOrEqual(24);
      // Undo is right after the words — beside them, or (too narrow) beneath them at the left edge.
      const w = await box(r.notice.getByText('Left Vibe check', { exact: true }));
      const beside = Math.abs(u.y + u.height / 2 - (w.y + w.height / 2)) < 12;
      if (beside) expect(u.x - (w.x + w.width)).toBeLessThanOrEqual(16);
      else expect(u.x - n.x).toBeLessThanOrEqual(24);
      // ×: the notice goes; the run is where Step out put it; the panel still has the Undo.
      await x.click();
      await expect(page.getByTestId('go-notice')).toHaveCount(0);
      await expect(r.words).toHaveText('Pick a task');
      await r.handle.click();
      await expect(r.panel.getByRole('button', { name: /^Undo/ })).toBeVisible();
      await r.panel.getByRole('button', { name: /^Undo/ }).click();
      await expect(r.words).toHaveText('Feel it out');
    });

    test('finishing a run: "Done with <name>" on home with no Undo — × only; × changes nothing; Ctrl/⌘+Z brings nothing back', async ({ page }) => {
      await startGo(page, [{ id: 'r', routine: 'stack', at: 2, status: 'running' }], 'runner', ROUTINES);
      const r = runner(page);
      await expect(r.next).toHaveText('Done');
      await r.next.click();
      await expectFinal(page, 'MyStack');
      await page.keyboard.press('ControlOrMeta+z');
      await expect(home(page).screen).toBeVisible();
      await saved(page);
      expect((await exported(page)).runs.r.endedAt).toBeDefined();
    });
  });
}
