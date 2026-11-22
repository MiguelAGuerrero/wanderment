import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { Db } from './db';

/**
 * Web: expo-sqlite's worker keeps the database files (OPFS access handles) open until it gets
 * its `shutdown` message — closing the database isn't enough — and there's no public way to send
 * it. So the worker is recognised as it's set up — its script is expo-sqlite's worker bundle and
 * the first message to it is `configure` — and kept here. If that ever stops working (an Expo
 * upgrade), pages simply don't hand the data over, and e2e/handoff.spec.ts's canary fails.
 */
let sqliteWorker: Worker | undefined;

/** expo-sqlite's worker script: `…/worker-<hash>.js` in a build, `…/worker.bundle?…` from Metro. */
export function isSqliteWorkerUrl(url: unknown): boolean {
  try {
    const href = url instanceof URL ? url.href : String(url);
    return /\/worker[^/]*$/.test(new URL(href, globalThis.location?.href).pathname);
  } catch {
    return false;
  }
}

function watchForSqliteWorker() {
  const Original = Platform.OS === 'web' && typeof globalThis.Worker === 'function' ? globalThis.Worker : undefined;
  if (!Original) return;
  try {
    globalThis.Worker = new Proxy(Original, {
      construct(target, args, newTarget) {
        const worker = Reflect.construct(target, args, newTarget) as Worker;
        // Other workers are left exactly as they are.
        if (!isSqliteWorkerUrl(args[0])) return worker;
        const post = worker.postMessage;
        worker.postMessage = ((message: unknown, options?: StructuredSerializeOptions) => {
          // Only the first message tells: then the worker goes back to its own postMessage.
          delete (worker as { postMessage?: unknown }).postMessage;
          if ((message as { type?: unknown } | null)?.type === 'configure') sqliteWorker = worker;
          post.call(worker, message, options as never);
        }) as Worker['postMessage'];
        return worker;
      },
    });
  } catch {
    // Worker can't be wrapped here: no hand-off (openExpoDb says so once).
  }
}
// Before expo-sqlite starts its worker (it waits a turn after loading).
watchForSqliteWorker();

const SHUTDOWN_TIMEOUT_MS = 5000;

/** Asks the worker to close its file handles, and waits until it says it has. */
function shutdownWorker(worker: Worker): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      if (error) reject(error);
      else resolve();
    };
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: unknown } | null)?.type === 'workerShutdown') finish();
    };
    const timer = setTimeout(() => finish(new Error('The database worker didn’t let go of its files in time')), SHUTDOWN_TIMEOUT_MS);
    worker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'shutdown' });
  });
}

let warned = false;

/** Opens the app database with expo-sqlite (OPFS-backed on web, a file on iOS/Android). */
export async function openExpoDb(name = 'wanderment.db'): Promise<Db> {
  const db = await SQLite.openDatabaseAsync(name);
  // WAL isn't available with the web build's OPFS storage.
  if (Platform.OS !== 'web') await db.execAsync('PRAGMA journal_mode = WAL');
  const worker = Platform.OS === 'web' ? sqliteWorker : undefined;
  if (Platform.OS === 'web' && !worker && !warned) {
    warned = true;
    console.warn('Wanderment: the database worker wasn’t found, so this page keeps the data while hidden (no hand-off to other tabs).');
  }
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      await db.runAsync(sql, params);
    },
    all: (sql, params = []) => db.getAllAsync(sql, params),
    transaction: (task) => db.withTransactionAsync(task),
    close: () => db.closeAsync(),
    // The same worker opens the files again on the next openExpoDb().
    ...(worker && { shutdown: () => shutdownWorker(worker) }),
  };
}
