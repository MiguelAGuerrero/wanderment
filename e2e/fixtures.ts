import { expect, test as base } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/** Every test fails if the page throws an uncaught error. */
export const test = base.extend<{ errors: Error[]; swScope: string; cpu: void }>({
  // A test's simulated deploys (`request.post('/__e2e/bump-sw')`, e2e/serve.mjs) reach only its own
  // pages: its context and its `request` share one cookie.
  swScope: [
    async ({ context }, use) => {
      const scope = randomUUID();
      await context.addCookies([{ name: 'e2e-scope', value: scope, domain: 'localhost', path: '/' }]);
      await use(scope);
    },
    { auto: true },
  ],
  request: [
    async ({ context }, use) => {
      await use(context.request);
    },
    { scope: 'test' },
  ],
  // E2E_SLOW=<rate> slows the page's CPU (Chrome DevTools throttling) to CI-runner speed or worse, so
  // timing races that pass on a fast machine show up before a push (scripts/polish/verify.sh's
  // "e2e-ci-like" step). Off by default.
  cpu: [
    async ({ page }, use) => {
      const rate = Number(process.env.E2E_SLOW || 0);
      if (rate > 1) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      }
      await use();
    },
    { auto: true },
  ],
  errors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on('pageerror', (e) => errors.push(e));
      await use(errors);
      expect(errors, errors.map((e) => e.stack ?? e.message).join('\n\n')).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
