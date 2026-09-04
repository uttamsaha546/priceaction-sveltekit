import { DatabaseSync } from 'node:sqlite';

export const db = new DatabaseSync('db.sqlite');

db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;    

    CREATE TABLE IF NOT EXISTS stock_prices_daily (
        instrument_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume INTEGER NOT NULL,
        traded_value REAL NOT NULL,
        trade_date DATE NOT NULL,

        PRIMARY KEY (instrument_id, trade_date)
    ) WITHOUT ROWID;

    CREATE TABLE IF NOT EXISTS stock_liquidity (
        instrument_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        adv20 REAL NOT NULL,
        adv60 REAL NOT NULL,
        adv120 REAL NOT NULL,
        median_value60 REAL NOT NULL,
        liquid_days60 INTEGER NOT NULL,
        trade_date DATE NOT NULL,

        PRIMARY KEY (instrument_id, trade_date)
    ) WITHOUT ROWID;

    CREATE TABLE IF NOT EXISTS stock_ma_daily (
        instrument_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        ma252 REAL,
        trade_date DATE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_indicators (
        instrument_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        trade_date DATE NOT NULL,
        ma252 REAL,
        slope40 REAL,
        slope120 REAL,
        acceleration REAL        
    );
`);

const insertBhavcopyRowStmt = db.prepare(`
    INSERT INTO stock_prices_daily (
        instrument_id,
        symbol,
        open,
        high,
        low,
        close,
        volume,
        traded_value,
        trade_date
    )
    VALUES (
        :instrument_id,
        :symbol,
        :open,
        :high,
        :low,
        :close,
        :volume,
        :traded_value,
        :trade_date
    )
    ON CONFLICT (instrument_id, trade_date)
    DO UPDATE SET
        symbol = excluded.symbol,
        open = excluded.open,
        high = excluded.high,
        low = excluded.low,
        close = excluded.close,
        volume = excluded.volume,
        traded_value = excluded.traded_value

    WHERE
        stock_prices_daily.symbol != excluded.symbol
        OR stock_prices_daily.open != excluded.open
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
	instrument_id: number;
	symbol: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	traded_value: number;
	trade_date: string;
};
