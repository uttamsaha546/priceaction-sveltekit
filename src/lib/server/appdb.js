import { DatabaseSync } from "node:sqlite";

export const appdb = new DatabaseSync('databases/app.db');

appdb.exec(`
  CREATE TABLE IF NOT EXISTS amfi_marketcap_classifications (
    isin TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    marketcap INTEGER NOT NULL,
    category TEXT NOT NULL
      CHECK (category IN ('Large Cap', 'Mid Cap', 'Small Cap'))
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

appdb.exec(`
  CREATE TABLE IF NOT EXISTS nse_industry_classifications (
    isin TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    macro TEXT NOT NULL,
    sector TEXT NOT NULL,
    industry TEXT NOT NULL,
    basic_industry TEXT NOT NULL,
    primary_index TEXT,
    all_index TEXT
  ) WITHOUT ROWID;
`);

