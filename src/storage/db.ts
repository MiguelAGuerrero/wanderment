/**
 * The little slice of SQLite the app needs. expo-sqlite implements it in the app
 * (see expoDb.ts); Node's built-in sqlite implements it in unit tests (see nodeDb.ts).
 * Only async calls: on web, expo-sqlite's async API works without cross-origin isolation,
 * which GitHub Pages can't provide.
 */
export type SqlValue = string | number | null;

export interface Db {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  /** Runs `task` in a transaction. Callers serialise writes, so it needn't be exclusive. */
  transaction(task: () => Promise<void>): Promise<void>;
  /** Closes the connection (so a failed open can be tried again from the start). */
  close?(): Promise<void> | void;
  /**
   * Web, after `close`: lets go of the database files entirely, so another page can open them;
   * opening again later in the same page works. Absent where that isn't possible.
   */
  shutdown?(): Promise<void>;
}
