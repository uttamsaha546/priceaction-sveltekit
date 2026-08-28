import { DatabaseSync } from "node:sqlite";

export const appdb = new DatabaseSync('databases/app.db');

// appdb.exec('DROP TABLE IF EXISTS tradingview_stock_universe')
appdb.exec(`
  CREATE TABLE IF NOT EXISTS tradingview_stock_universe (
    isin TEXT PRIMARY KEY,
    symbol TEXT NOT NULL, 
    name TEXT NOT NULL, 
    marketcap INTEGER, 
    rsi_14M INTEGER, 
    rsi_14W INTEGER, 
    adx_14M INTEGER, 
    adx_14W INTEGER 
  ) WITHOUT ROWID;
`);

appdb.exec(`
  CREATE TABLE IF NOT EXISTS nse_cache (
    url TEXT PRIMARY KEY,
    response BLOB NOT NULL,
    isin TEXT NOT NULL,
    symbol TEXT NOT NULL,
    function_name TEXT
      CHECK (function_name IN ('getMetaData', 'getSymbolData'))
  ) WITHOUT ROWID;
`);

// appdb.exec('DROP TABLE IF EXISTS nse_industry_classification')
appdb.exec(`
  CREATE TABLE IF NOT EXISTS nse_industry_classification (
    symbol TEXT PRIMARY KEY,
    macro TEXT NOT NULL,
    sector TEXT NOT NULL,
    industry TEXT NOT NULL,
    basic_industry TEXT NOT NULL
  ) WITHOUT ROWID;
`);

// appdb.exec('DROP TABLE IF EXISTS groww_stock_id_symbol_map')
appdb.exec(`
  CREATE TABLE IF NOT EXISTS groww_stock_id_symbol_map (
    stock_search_id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL
  ) WITHOUT ROWID;
`);

// appdb.exec('DROP TABLE IF EXISTS table_meta')
appdb.exec(`
  CREATE TABLE IF NOT EXISTS table_meta (
    table_name TEXT PRIMARY KEY,
    updated_at INTEGER NOT NULL
  ) WITHOUT ROWID;
`);

// appdb.exec('DROP VIEW IF EXISTS stock_universe_with_rsi_industry')
appdb.exec(`
  CREATE VIEW IF NOT EXISTS stock_universe_with_rsi_industry AS 
  SELECT * 
  FROM tradingview_stock_universe
  LEFT JOIN nse_industry_classification USING (symbol)
  LEFT JOIN groww_stock_id_symbol_map USING (symbol);
`);


// appdb.exec('DROP TABLE IF EXISTS bhavcopy')
appdb.exec(`
  CREATE TABLE IF NOT EXISTS bhavcopy (
    symbol TEXT,
    date TEXT,
    change REAL,
    PRIMARY KEY (symbol, date)
  ) WITHOUT ROWID;
`);


const insertBhavcopyStmt = appdb.prepare(`
  INSERT OR REPLACE INTO bhavcopy (symbol, date, change)
  VALUES (:symbol, :date, :change);
`);

const getBhavcopyGroupByDateStmt = appdb.prepare(`
  SELECT date, COUNT(symbol) AS count FROM bhavcopy GROUP BY date ORDER BY date DESC;
`);

const deleteBhavcopyStmt = appdb.prepare(`
  DELETE FROM bhavcopy WHERE date=:date;
`);

const getBhavcopyBetweenDatesStmt = appdb.prepare(`
  SELECT * FROM bhavcopy WHERE date BETWEEN :from AND :to;
`);

const getTradingviewStockUniverseStmt = appdb.prepare(`
  SELECT * FROM tradingview_stock_universe;
`);

const getStockUniverseWithRsiIndustryStmt = appdb.prepare(`
  SELECT * FROM stock_universe_with_rsi_industry;
`);

export const APPDB = {
  Bhavcopy: {
    all() {
      const rows = appdb.prepare('SELECT * FROM bhavcopy').all();
      return rows;
    },
    Between({ from, to }) {
      return getBhavcopyBetweenDatesStmt.all({ from, to });
    },
    delete(date) {
      try {
        const result = deleteBhavcopyStmt.run({ date });
        return result.changes > 0;
      } catch (error) {
        return false;
      }
    },
    insertBatch(records) {
      appdb.exec('BEGIN TRANSACTION');

      try {
        for (const row of records) {
          insertBhavcopyStmt.run({
            symbol: row.symbol,
            date: row.date,
            change: row.change
          });
        }
        appdb.exec('COMMIT');
      } catch (error) {
        appdb.exec('ROLLBACK');
        throw error;
      }
    },
    GroupByDate() {
      return getBhavcopyGroupByDateStmt.all();
    }
  },

  TradingViewStockUniverse: {
    getAllSymbol() {
      return getTradingviewStockUniverseStmt.all().map(x => x.symbol);
    }
  },

  StockUniverseWithRsiIndustry: {
    symbolMap() {
      const data = getStockUniverseWithRsiIndustryStmt.all();

      return new Map(data.map(x => [x.symbol, x]))
    }
  }
}