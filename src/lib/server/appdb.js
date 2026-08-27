import { DatabaseSync } from "node:sqlite";

export const appdb = new DatabaseSync('databases/app.db');

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

// appdb.exec('DROP TABLE IF EXISTS nse_industry_classifications')
appdb.exec(`
  CREATE TABLE IF NOT EXISTS nse_industry_classifications (
    symbol TEXT PRIMARY KEY,
    macro TEXT NOT NULL,
    sector TEXT NOT NULL,
    industry TEXT NOT NULL,
    basic_industry TEXT NOT NULL
  ) WITHOUT ROWID;
`);


appdb.exec(`
  CREATE TABLE IF NOT EXISTS groww_stock_id_symbol_map (
    stock_search_id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL
  ) WITHOUT ROWID;
`);

appdb.exec(`
  CREATE TABLE IF NOT EXISTS groww_mutual_funds_holdings (
    search_id TEXT PRIMARY KEY,
    holdings TEXT NOT NULL,
    portfolio_date TEXT NOT NULL
  ) WITHOUT ROWID;
`);


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
  LEFT JOIN nse_industry_classifications USING (symbol)
  LEFT JOIN groww_stock_id_symbol_map USING (symbol);
`);