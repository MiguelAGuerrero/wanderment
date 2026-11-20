import { Platform } from 'react-native';

/**
 * Registers the Workbox service worker (web production builds only) and reports when a new
 * version is installed and waiting. Nothing reloads by itself: the person taps "Reload".
 */
const SW_URL = '/wanderment/sw.js';
const SCOPE = '/wanderment/';

type Listener = (waiting: boolean) => void;
const listeners = new Set<Listener>();
let waitingWorker: ServiceWorker | undefined;

const emit = () => listeners.forEach((l) => l(!!waitingWorker));

export function onUpdateReady(listener: Listener): () => void {
  listeners.add(listener);
  listener(!!waitingWorker);
  return () => listeners.delete(listener);
}

function track(reg: ServiceWorkerRegistration) {
  const setWaiting = (w: ServiceWorker | null | undefined) => {
    // Only an *update* is interesting; the very first install has nothing to replace.
    if (w && navigator.serviceWorker.controller) {
      waitingWorker = w;
      emit();
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

export function registerServiceWorker() {
  if (Platform.OS !== 'web' || process.env.NODE_ENV !== 'production') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE });
      track(reg);
      // An installed app can stay open for days; look for a new version when it comes back.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    } catch {
      // No service worker (private mode, unsupported browser): the app still works online.
    }
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Activates the waiting version, then reloads once it has taken over. */
export function applyUpdate() {
  if (!waitingWorker) return;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}
