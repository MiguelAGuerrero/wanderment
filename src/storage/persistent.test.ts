/**
 * Asking the browser to keep the data, against a fake navigator. Each `session()` is a fresh
 * page load (new module, so the once-per-session flag starts clear).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

interface Fake {
  /** What persisted() reports (before any grant), or 'throws'. */
  persisted?: boolean | 'throws';
  /** What persist() does. */
  persist?: 'grant' | 'refuse' | 'reject';
  /** navigator.storage is missing entirely. */
  missing?: boolean;
  standalone?: boolean;
  displayModeStandalone?: boolean;
  userAgent?: string;
}

function fakeNavigator(f: Fake) {
  let granted = f.persisted === true;
  const calls = { persist: 0, persisted: 0 };
  const storage = {
    persisted: async () => {
      calls.persisted++;
      if (f.persisted === 'throws') throw new Error('SecurityError');
      return granted;
    },
    persist: async () => {
      calls.persist++;
      if (f.persist === 'reject') throw new Error('NotAllowedError');
      if (f.persist === 'grant') granted = true;
      return granted;
    },
  };
  vi.stubGlobal('navigator', { userAgent: f.userAgent ?? CHROME, storage: f.missing ? undefined : storage, ...(f.standalone ? { standalone: true } : {}) });
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(display-mode: standalone)' && !!f.displayModeStandalone }));
  return calls;
}

async function session() {
  vi.resetModules();
  return import('./persistent');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('status', () => {
  it('granted when the browser has promised to keep the data', async () => {
    fakeNavigator({ persisted: true });
    expect(await (await session()).persistenceStatus()).toBe('granted');
  });

  it('not granted when the API exists and says no', async () => {
    fakeNavigator({ persisted: false });
    expect(await (await session()).persistenceStatus()).toBe('not-granted');
  });

  it('unknown when persisted() throws', async () => {
    fakeNavigator({ persisted: 'throws' });
    expect(await (await session()).persistenceStatus()).toBe('unknown');
  });

  it('unknown when the API is missing (or there is no navigator at all)', async () => {
    fakeNavigator({ missing: true });
    expect(await (await session()).persistenceStatus()).toBe('unknown');
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('matchMedia', undefined);
    expect(await (await session()).persistenceStatus()).toBe('unknown');
  });

  it('installed when running standalone (display-mode or iOS navigator.standalone), even if not persisted', async () => {
    fakeNavigator({ persisted: false, displayModeStandalone: true });
    expect(await (await session()).persistenceStatus()).toBe('installed');
    fakeNavigator({ persisted: false, standalone: true });
    expect(await (await session()).persistenceStatus()).toBe('installed');
    fakeNavigator({ missing: true, standalone: true });
    expect(await (await session()).persistenceStatus()).toBe('installed');
  });

  it('granted wins over installed', async () => {
    fakeNavigator({ persisted: true, displayModeStandalone: true });
    expect(await (await session()).persistenceStatus()).toBe('granted');
  });
});

describe('the automatic request', () => {
  it('asks once when not yet persisted, and the grant shows', async () => {
    const calls = fakeNavigator({ persisted: false, persist: 'grant' });
    const p = await session();
    await p.requestPersistence();
    expect(calls.persist).toBe(1);
    expect(await p.persistenceStatus()).toBe('granted');
  });

  it('asks at most once per page session, even when called repeatedly or at once', async () => {
    const calls = fakeNavigator({ persisted: false, persist: 'refuse' });
    const p = await session();
    await Promise.all([p.requestPersistence(), p.requestPersistence()]);
    await p.requestPersistence();
    expect(calls.persist).toBe(1);
    // A new page session may ask again.
    await (await session()).requestPersistence();
    expect(calls.persist).toBe(2);
  });

  it('doesn’t ask when already persisted', async () => {
    const calls = fakeNavigator({ persisted: true, persist: 'grant' });
    await (await session()).requestPersistence();
    expect(calls.persist).toBe(0);
  });

  it('swallows a rejection', async () => {
    const calls = fakeNavigator({ persisted: false, persist: 'reject' });
    const p = await session();
    await expect(p.requestPersistence()).resolves.toBeUndefined();
    expect(calls.persist).toBe(1);
    expect(await p.persistenceStatus()).toBe('not-granted');
  });

  it('does nothing when the API is missing or persisted() throws', async () => {
    fakeNavigator({ missing: true });
    await expect((await session()).requestPersistence()).resolves.toBeUndefined();
    const calls = fakeNavigator({ persisted: 'throws', persist: 'grant' });
    await expect((await session()).requestPersistence()).resolves.toBeUndefined();
    expect(calls.persist).toBe(0);
  });

  it('never asks on Firefox, where it may show a prompt', async () => {
    const calls = fakeNavigator({ persisted: false, persist: 'grant', userAgent: FIREFOX });
    await (await session()).requestPersistence();
    expect(calls.persist).toBe(0);
  });
});

describe('the Settings button', () => {
  it('asks every time it’s pressed, also after the automatic request, and reports the result', async () => {
    const calls = fakeNavigator({ persisted: false, persist: 'refuse' });
    const p = await session();
    await p.requestPersistence();
    expect(await p.askToKeepData()).toBe('not-granted');
    expect(await p.askToKeepData()).toBe('not-granted');
    expect(calls.persist).toBe(3);
  });

  it('works on Firefox', async () => {
    const calls = fakeNavigator({ persisted: false, persist: 'grant', userAgent: FIREFOX });
    expect(await (await session()).askToKeepData()).toBe('granted');
    expect(calls.persist).toBe(1);
  });

  it('swallows a rejection, and does nothing without the API', async () => {
    fakeNavigator({ persisted: false, persist: 'reject' });
    expect(await (await session()).askToKeepData()).toBe('not-granted');
    fakeNavigator({ missing: true });
    expect(await (await session()).askToKeepData()).toBe('unknown');
  });
});
