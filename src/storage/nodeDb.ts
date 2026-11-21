// Test-only: implements Db with Node's built-in SQLite so the real SQL runs in Vitest.
import { DatabaseSync } from 'node:sqlite';

import { Db, SqlValue } from './db';

export function nodeDb(path = ':memory:'): Db & { close: () => void } {
  const db = new DatabaseSync(path);
  return {
    exec: async (sql) => void db.exec(sql),
    run: async (sql, params: SqlValue[] = []) => void db.prepare(sql).run(...params),
    all: async <T,>(sql: string, params: SqlValue[] = []) => db.prepare(sql).all(...params) as T[],
    transaction: async (task) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => db.close(),
  };
}
