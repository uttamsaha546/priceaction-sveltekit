<script>
	import TradingViewStockUniverse from './components/TradingViewStockUniverse.svelte';
	import GrowwStockIdSymbolMap from './components/GrowwStockIdSymbolMap.svelte';
	import NseIndustryClassification from './components/NseIndustryClassification.svelte';
</script>

<div class="prose max-w-5xl mx-auto p-4">
	<article>
		<h1>STOCK UNIVERSE - Nifty Total Market Index</h1>
		<p>
			Get the index constituents from <a
				href="https://in.tradingview.com/screener/DU7IZb5C/"
				target="_blank">Tradingview Screener</a
			>. Update whenever you need to update RSI & ADX. You will get name, symbol, isin, marketcap,
			rsi_14M, rsi_14W, adx_14M, adx_14W.
		</p>
		<h4>appdb.tradingview_stock_universe Schema</h4>
		CREATE TABLE IF NOT EXISTS tradingview_stock_universe ( isin TEXT PRIMARY KEY, symbol TEXT NOT NULL,
		name TEXT NOT NULL, marketcap INTEGER, rsi_14M INTEGER, rsi_14W INTEGER, adx_14M INTEGER, adx_14W
		INTEGER) WITHOUT ROWID;

		<h4>operation on every update</h4>
		BEGIN TRANSACTION; DELETE FROM tradingview_stock_universe; INSERT OR REPLACE INTO tradingview_stock_universe
		(isin, symbol, name, marketcap, rsi_14M, rsi_14W, adx_14M, adx_14W) VALUES (:isin, :symbol, :name,
		:marketcap, :rsi_14M, :rsi_14W, :adx_14M, :adx_14W); INSERT OR REPLACE INTO table_meta (table_name,
		updated_at) VALUES (tradingview_stock_universe, Date.now()); COMMIT;

		<TradingViewStockUniverse />
	</article>

	<article>
		<h1>Pull Data for NSE Industry classification</h1>
		<p>
			For each symbols in tradingview_stock_universe, fetch
			https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=N&series=EQ&symbol=VBL
			to pull sectoral info. Fetch
			https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getMetaData&symbol=VBL
			to get the marketType and series required in the previous url. Permanently cache these urls in
			nse_cache table under app.db. Save sectoral info into nse_industry_classification table under
			app.db
		</p>
		<h4>appdb.nse_cache Schema</h4>
		CREATE TABLE IF NOT EXISTS nse_cache ( url TEXT PRIMARY KEY , response BLOB NOT NULL, isin TEXT NOT
		NULL, symbol TEXT NOT NULL, type ENUM('MetaData', 'SymbolData') NOT NULL ) WITHOUT ROWID; Compress
		response in zstd

		<h4>appdb.nse_industry_classification Schema</h4>
		CREATE TABLE IF NOT EXISTS nse_industry_classification (symbol TEXT PRIMARY KEY, macro TEXT NOT NULL,
		sector TEXT NOT NULL, industry TEXT NOT NULL, basic_industry TEXT NOT NULL) WITHOUT ROWID; Compress
		response in zstd

		<NseIndustryClassification />
	</article>
	<article>
		<h1>Groww stock_search_id &harr; symbol map</h1>
		<p>
			Groww mutual fund holdings provide stock_search_id (no symbol/isin). Fetch Groww Nifty Total
			Market Index mutual fund holdings, cache the response in url_response_cache in temp.db for 5
			minutes, api
			https://groww.in/v1/api/data/mf/web/v6/scheme/search/groww-nifty-total-market-index-fund-direct-growth
			. First check if mutual fund id has been renamed by calling
			https://groww.in/mutual-funds/groww-nifty-total-market-index-fund-direct-growth. If status
			code is 301, get the new id from response location, cache the response in url_response_cache
			in temp.db, expiry 1 month. MF holdings will provide stock id. Fetch each stock id (store the
			response in tempdb.url_response_cache for 6 month) to get symbol, store it permanently in
			groww_stock_id_symbol_map table under app.db.
		</p>

		<GrowwStockIdSymbolMap />
	</article>
</div>
