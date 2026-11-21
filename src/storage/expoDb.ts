import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { Db } from './db';

/** Opens the app database with expo-sqlite (OPFS-backed on web, a file on iOS/Android). */
export async function openExpoDb(name = 'wanderment.db'): Promise<Db> {
  const db = await SQLite.openDatabaseAsync(name);
  // WAL isn't available with the web build's OPFS storage.
  if (Platform.OS !== 'web') await db.execAsync('PRAGMA journal_mode = WAL');
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      await db.runAsync(sql, params);
    },
    all: (sql, params = []) => db.getAllAsync(sql, params),
    transaction: (task) => db.withTransactionAsync(task),
  };
}
