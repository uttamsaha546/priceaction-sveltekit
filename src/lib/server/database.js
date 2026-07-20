import { DatabaseSync } from 'node:sqlite';

export const db = new DatabaseSync('database.db');

//Allows parallel reading queries to execute while the set() or cleanup() methods of 
// cache are writing to disk.
// db.exec('PRAGMA journal_mode = WAL;');
//Drastically reduces disk write bottlenecking during high volumes of cache writes.
// db.exec('PRAGMA synchronous = NORMAL');
// Store temporary tables/indices in RAM When SQLite needs to perform complex operations 
// like large ORDER BY clauses, heavy JOINs, or building temporary indices, it creates "temp tables
// db.exec('PRAGMA temp_store = MEMORY');



// To store tradingview screener data
db.exec(`
    CREATE TABLE IF NOT EXISTS stock_universe (
        symbol		TEXT PRIMARY KEY NOT NULL,
        name	TEXT,
        price_to_earning INTEGER,
        sector TEXT,
        rsi14_monthly INTEGER,
        rsi14_weekly INTEGER,
        adx14_monthly INTEGER,
        adx14_weekly INTEGER,
        turnover_daily INTEGER,
        marketcap INTEGER,
        sma250 INTEGER
    ) WITHOUT ROWID;
`);

// To store tradingview screener last fetched date
db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
        tablename		TEXT PRIMARY KEY NOT NULL,
        data	TEXT
    ) WITHOUT ROWID;
`);


// To store industry classification data from NSE API
db.exec(`
        CREATE TABLE IF NOT EXISTS industry_classification (
        symbol TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        isin TEXT,
        series TEXT,
        listingDate TEXT,
        macro TEXT,
        sector TEXT,
        industry TEXT,
        basicIndustry TEXT
        ) WITHOUT ROWID;
    `);

// To store watchlists
// db.exec('DROP TABLE IF EXISTS watchlists');
db.exec(`
    CREATE TABLE IF NOT EXISTS watchlists (
        name TEXT PRIMARY KEY,
        entries TEXT
        ) WITHOUT ROWID;
    `);

const defaultEntries = 'VBL';

// Note: The exact method name depends on your library (e.g., db.prepare or db.run)
const stmt = db.prepare(`INSERT INTO watchlists (name, entries) VALUES (?, ?)`);
//  stmt.run('Default Watchlist', defaultEntries);