import { Platform } from 'react-native';

import { BUILD_ID } from '@/build';
import { mayUpdateBySelf } from '@/domain/update';
import { releaseData } from '@/storage/persistence';
import { holdsData, useStore } from '@/store/useStore';

/**
 * Registers the Workbox service worker (web production builds only) and looks for a new version
 * when the page loads or comes back. A new version applies by itself only while that's safe
 * (`mayUpdateBySelf`: just loaded or back, nothing typed yet, once per version); otherwise the
 * banner asks, and nothing reloads until "Update now" is tapped (P-30).
 */
const SW_URL = '/wanderment/sw.js';
const SCOPE = '/wanderment/';
/** The build this tab last updated itself away from: the loop guard. */
const UPDATED_FROM_KEY = 'wanderment:updated-from';

type Listener = (waiting: boolean) => void;
const listeners = new Set<Listener>();
let waitingWorker: ServiceWorker | undefined;
let registration: ServiceWorkerRegistration | undefined;
/** When the page loaded or last came back to the foreground; undefined while hidden. */
let since: number | undefined;
/** Typed in the log box or any field since then. */
let typed = false;
/** Reloading into the new version (once). */
let reloading = false;
let listening = false;

const emit = () => listeners.forEach((l) => l(!!waitingWorker));

export function onUpdateReady(listener: Listener): () => void {
  listeners.add(listener);
  listener(!!waitingWorker);
  return () => listeners.delete(listener);
}

/** Web production builds with service workers: Settings offers "Check for updates". */
export const canCheckForUpdates = () =>
  Platform.OS === 'web' && process.env.NODE_ENV === 'production' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

const session = (): Storage | undefined => {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
};

/** This page has the data open (not opening it, waiting for another copy, or reconnecting). */
const inUse = (st: Parameters<typeof holdsData>[0]) => st.storage.state === 'ready' && holdsData(st);

/** A new version is waiting: apply it now if that's safe, else let the banner ask. */
function offer() {
  if (!waitingWorker || reloading) return;
  const store = session();
  let updatedFrom: string | null = null;
  try {
    updatedFrom = store?.getItem(UPDATED_FROM_KEY) ?? null;
  } catch {
    // Unreadable: treated as never updated.
  }
  // Another tab already let it take over: that tab's person chose to; this one asks (no cascade of reloads).
  const ownUpdate = waitingWorker.state === 'installed';
  if (store && ownUpdate && mayUpdateBySelf({ now: Date.now(), since, typed, inUse: inUse(useStore.getState()), build: BUILD_ID, updatedFrom })) {
    try {
      // Without a note of it there's no loop guard, so only then.
      store.setItem(UPDATED_FROM_KEY, BUILD_ID);
      applyUpdate();
      // Still here a while later (it couldn't take over): the banner asks instead.
      setTimeout(emit, 5000);
      return;
    } catch {
      // Fall through to the banner.
    }
  }
  emit();
}

function track(reg: ServiceWorkerRegistration) {
  const setWaiting = (w: ServiceWorker | null | undefined) => {
    // Only an *update* is interesting; the very first install has nothing to replace.
    if (w && navigator.serviceWorker.controller) {
      waitingWorker = w;
      offer();
    }
  };
  setWaiting(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const installing = reg.installing;
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed') setWaiting(installing);
    });
  });
}

/** The page has just loaded or come back: a new version found from now for 10 s may apply by itself. */
function startWindow() {
  since = document.visibilityState === 'visible' ? Date.now() : undefined;
  typed = false;
}

export function registerServiceWorker() {
  if (!canCheckForUpdates()) return;
  startWindow();
  // Any typing (log box or any other field) means the person is busy: from then on the banner asks.
  document.addEventListener('input', () => (typed = true), true);
  // Found while the data was still opening (or coming back): decided once it's open.
  useStore.subscribe((st, prev) => {
    if (inUse(st) && !inUse(prev)) offer();
  });
  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });
      registration = reg;
      track(reg);
      // Offline or between deploys this just fails, quietly.
      reg.update().catch(() => {});
      // An installed app can stay open for days; look for a new version when it comes back.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') {
          since = undefined;
          return;
        }
        startWindow();
        reg.update().catch(() => {});
        offer();
      });
    } catch {
      // No service worker (private mode, unsupported browser): the app still works online.
    }
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export type UpdateCheck = 'ready' | 'up-to-date' | 'failed' | 'unavailable';

/**
 * Settings → "Check for updates". What it finds waits for a tap on the banner (shown again even
 * if it was put off), since the person is in the middle of something.
 */
export async function checkForUpdates(): Promise<UpdateCheck> {
  since = undefined;
  const reg = registration ?? (canCheckForUpdates() ? await navigator.serviceWorker.getRegistration(SCOPE).catch(() => undefined) : undefined);
  // No service worker here (private mode, say): each visit loads the latest anyway.
  if (!reg) return 'unavailable';
  try {
    await reg.update();
  } catch {
    return 'failed';
  }
  const installing = reg.installing;
  if (installing) {
    await new Promise<void>((resolve) => {
      const done = () => {
        if (installing.state === 'installing') return;
        installing.removeEventListener('statechange', done);
        resolve();
      };
      installing.addEventListener('statechange', done);
      done();
    });
  }
  if (!waitingWorker && reg.waiting && navigator.serviceWorker.controller) waitingWorker = reg.waiting;
  emit();
  return waitingWorker ? 'ready' : 'up-to-date';
}

/** Lets go of the data first, so the reloaded page isn't kept out by this one's last moments (P-29). */
function reloadIntoNewVersion() {
  if (reloading) return;
  reloading = true;
  void releaseData().finally(() => window.location.reload());
}

/** Activates the waiting version, then reloads once it has taken over. */
export function applyUpdate() {
  const w = waitingWorker;
  if (!w) return;
  // Another tab already let it take over: just reload into it.
  if (w.state !== 'installed') return reloadIntoNewVersion();
  if (!listening) {
    listening = true;
    navigator.serviceWorker.addEventListener('controllerchange', reloadIntoNewVersion);
  }
  w.postMessage({ type: 'SKIP_WAITING' });
}
