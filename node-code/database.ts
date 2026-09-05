import { DatabaseSync } from 'node:sqlite';

export const db = new DatabaseSync('db.sqlite');

db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;    

    CREATE TABLE IF NOT EXISTS stock_prices_daily (
        trade_date DATE NOT NULL,
        symbol TEXT NOT NULL,
        open INTEGER NOT NULL,
        high INTEGER NOT NULL,
        low INTEGER NOT NULL,
        close INTEGER NOT NULL,
        volume INTEGER NOT NULL,
        traded_value INTEGER NOT NULL,

        PRIMARY KEY (symbol, trade_date)
    ) WITHOUT ROWID;

    CREATE TABLE IF NOT EXISTS stock_liquidity (
        trade_date DATE NOT NULL,
        symbol TEXT NOT NULL,
        adv20 INTEGER NOT NULL,
        adv60 INTEGER NOT NULL,
        adv120 INTEGER NOT NULL,
        median_value60 INTEGER NOT NULL,
        liquid_days60 INTEGER NOT NULL,

        PRIMARY KEY (symbol, trade_date)
    ) WITHOUT ROWID;

    CREATE TABLE IF NOT EXISTS stock_ma_daily (
        trade_date DATE NOT NULL,
        symbol TEXT NOT NULL,
        ma252 INTEGER
    );

    CREATE TABLE IF NOT EXISTS stock_indicators (
        trade_date DATE NOT NULL,
        symbol TEXT NOT NULL,
        ma252 INTEGER,
        slope40 REAL,
        slope120 REAL,
        acceleration REAL        
    );
`);

const insertBhavcopyRowStmt = db.prepare(`
    INSERT INTO stock_prices_daily (
        trade_date,
        symbol,
        open,
        high,
        low,
        close,
        volume,
        traded_value
    )
    VALUES (
        :trade_date,
        :symbol,
        :open,
        :high,
        :low,
        :close,
        :volume,
        :traded_value
    )
    ON CONFLICT (symbol, trade_date)
    DO UPDATE SET
        open = excluded.open,
        high = excluded.high,
        low = excluded.low,
        close = excluded.close,
        volume = excluded.volume,
        traded_value = excluded.traded_value

    WHERE
        stock_prices_daily.open != excluded.open
        OR stock_prices_daily.high != excluded.high
        OR stock_prices_daily.low != excluded.low
        OR stock_prices_daily.close != excluded.close
        OR stock_prices_daily.volume != excluded.volume
        OR stock_prices_daily.traded_value != excluded.traded_value;
`);

export function insertBhavcopyRows(rows: BhavcopyRow[]) {
    db.exec('BEGIN');

    try {
        for (const row of rows) {
            insertBhavcopyRowStmt.run(row);
        }

        db.exec('COMMIT');
    } catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
}

export function closeDatabase() {
    db.close();
}

export type BhavcopyRow = {
	trade_date: string;
	symbol: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	traded_value: number;
};
