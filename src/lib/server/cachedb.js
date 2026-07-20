import { DatabaseSync } from 'node:sqlite';

export const cachedb = new DatabaseSync('cache.db');

//Allows parallel reading queries to execute while the set() or cleanup() methods of 
// cache are writing to disk.
// cachedb.exec('PRAGMA journal_mode = WAL;');
//Drastically reduces disk write bottlenecking during high volumes of cache writes.
// cachedb.exec('PRAGMA synchronous = NORMAL');
// Store temporary tables/indices in RAM When SQLite needs to perform complex operations 
// like large ORDER BY clauses, heavy JOINs, or building temporary indices, it creates "temp tables
// cachedb.exec('PRAGMA temp_store = MEMORY');


// To store cache
cachedb.exec(`
        CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL
        ) WITHOUT ROWID;
    `);