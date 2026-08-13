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

appdb.exec(`
  CREATE TABLE IF NOT EXISTS groww_stock_id_symbol_map (
    stock_search_id TEXT PRIMARY KEY,
    isin TEXT NOT NULL,
    symbol TEXT NOT NULL
  ) WITHOUT ROWID;
`);


appdb.exec(`
  DROP VIEW IF EXISTS stock_universe;

	CREATE VIEW IF NOT EXISTS stock_universe AS

	SELECT DISTINCT a.symbol
	FROM amfi_marketcap_classifications a
	INNER JOIN nse_industry_classifications n
		ON n.symbol = a.symbol
	WHERE COALESCE(TRIM(n.primary_index), '') <> '-'

	UNION

	SELECT DISTINCT a.symbol
	FROM amfi_marketcap_classifications a
	INNER JOIN groww_stock_id_symbol_map g
		ON g.symbol = a.symbol;
`);

// DROP VIEW IF EXISTS stock_universe;

// CREATE VIEW stock_universe AS
// SELECT
//     a.*,
//     n.*,
//     g.*
// FROM amfi_marketcap_classifications a
// LEFT JOIN nse_industry_classifications n
//     ON n.symbol = a.symbol
// LEFT JOIN groww_stock_id_symbol_map g
//     ON g.symbol = a.symbol
// WHERE
//     (
//         n.symbol IS NOT NULL
//         AND COALESCE(TRIM(n.primary_index), '') <> '-'
//     )
//     OR g.symbol IS NOT NULL;

// DROP VIEW IF EXISTS stock_universe;

// CREATE VIEW stock_universe AS
// SELECT
//     a.*,
//     n.*,
//     g.*
// FROM amfi_marketcap_classifications a
// LEFT JOIN nse_industry_classifications n
//     ON n.symbol = a.symbol
// LEFT JOIN groww_stock_id_symbol_map g
//     ON g.symbol = a.symbol
// WHERE
//     (
//         n.symbol IS NOT NULL
//         AND COALESCE(TRIM(n.primary_index), '') <> '-'
//     )
//     OR g.symbol IS NOT NULL;