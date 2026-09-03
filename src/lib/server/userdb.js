//Allows parallel reading queries to execute while the set() or cleanup() methods of 
// cache are writing to disk.
// db.exec('PRAGMA journal_mode = WAL;');
//Drastically reduces disk write bottlenecking during high volumes of cache writes.
// db.exec('PRAGMA synchronous = NORMAL');
// Store temporary tables/indices in RAM When SQLite needs to perform complex operations 
// like large ORDER BY clauses, heavy JOINs, or building temporary indices, it creates "temp tables
// db.exec('PRAGMA temp_store = MEMORY');

import { DatabaseSync } from "node:sqlite";

export const userdb = new DatabaseSync('databases/user.db');

userdb.exec(`
    CREATE TABLE IF NOT EXISTS flags (
        symbol TEXT PRIMARY KEY NOT NULL,
        color TEXT
    ) WITHOUT ROWID;
`);

// userdb.exec('DELETE FROM watchlists')
userdb.exec(`
    CREATE TABLE IF NOT EXISTS watchlists (
        name TEXT PRIMARY KEY,
        entries TEXT
    ) WITHOUT ROWID;
`);

userdb.exec(`
    CREATE TABLE IF NOT EXISTS portfolio (
        key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        unit REAL DEFAULT 1,
        unit_date TEXT,
        holding TEXT,
        holding_date TEXT
    ) WITHOUT ROWID;
`);

// userdb.exec('DELETE FROM drawings')
userdb.exec(`
    CREATE TABLE IF NOT EXISTS drawings (
        symbol TEXT PRIMARY KEY,
        drawings TEXT NOT NULL -- JSON serialized string of drawings
    ) WITHOUT ROWID;
`);

const defaultEntries = ['VBL', 'BLUESTARCO'];
const stmt = userdb.prepare(`INSERT OR REPLACE INTO watchlists (name, entries) VALUES (?, ?)`);
stmt.run('Default Watchlist', JSON.stringify(defaultEntries));


const saveDrawingsStmt = userdb.prepare(`INSERT OR REPLACE INTO drawings (symbol, drawings) VALUES (:symbol, :drawings)`);
const getDrawingsStmt = userdb.prepare(`SELECT * FROM drawings WHERE symbol=?`);


// Watchlists
// const addToWatchlistStmt = userdb.prepare(`INSERT OR REPLACE INTO watchlists (name, entries) VALUES(:name, :entries)`);
// const removeFromWatchlistStmt = userdb.prepare(`INSERT OR REPLACE INTO watchlists (name, entries) VALUES(:name, :entries)`);

export const USERDB = {
    Drawings: {
        save(symbol, drawings) {
            // Convert object/array to JSON string for SQLite
            const serializedDrawings = typeof drawings === 'string' ? drawings : JSON.stringify(drawings);
            return saveDrawingsStmt.run({ symbol, drawings: serializedDrawings });
        },
        get(symbol) {
            const row = getDrawingsStmt.get(symbol);
            if (!row) return null;

            // Automatically parse JSON string back into an object/array
            return {
                ...row,
                drawings: typeof row.drawings === 'string' ? JSON.parse(row.drawings) : row.drawings
            };
        }
    },
    // Watchlists: {
    //     addToWatchlist({ watchlist, symbol }) {

    //     },
    //     removeFromWatchlist({ watchlist, symbol }) {

    //     },
    //     getWatchlist({ watchlist }) {

    //     },
    //     getAll() {

    //     }

    // }
}