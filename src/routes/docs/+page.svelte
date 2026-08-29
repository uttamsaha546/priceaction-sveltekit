<script>
	import TradingViewStockUniverse from './components/TradingViewStockUniverse.svelte';
	import GrowwStockIdSymbolMap from './components/GrowwStockIdSymbolMap.svelte';
	import NseIndustryClassification from './components/NseIndustryClassification.svelte';
</script>

<div class="max-w-5xl mx-auto p-6 space-y-10 font-sans text-slate-800">
	<!-- Article 1: TradingView Stock Universe -->
	<article class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
		<header class="border-b border-slate-100 pb-4">
			<h1 class="text-2xl font-bold text-slate-900 tracking-tight">
				STOCK UNIVERSE — Nifty Total Market Index
			</h1>
			<p class="mt-2 text-slate-600 leading-relaxed">
				Get the index constituents from the
				<a
					href="https://in.tradingview.com/screener/DU7IZb5C/"
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
				>
					TradingView Screener
					<svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
						/></svg
					>
				</a>. Update whenever you need to refresh RSI &amp; ADX values (<code
					class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">isin</code
				>,
				<code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono"
					>symbol</code
				>,
				<code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">name</code
				>,
				<code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono"
					>marketcap</code
				>,
				<code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono"
					>rsi_14M</code
				>,
				<code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono"
					>rsi_14W</code
				>,
				<code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono"
					>adx_14M</code
				>,
				<code class="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono"
					>adx_14W</code
				>).
			</p>
		</header>

		<div class="space-y-4">
			<div>
				<h2 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
					Schema: <span class="text-slate-800 font-mono lowercase"
						>appdb.tradingview_stock_universe</span
					>
				</h2>
				<pre
					class="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed"><code
						>CREATE TABLE IF NOT EXISTS tradingview_stock_universe (
    isin TEXT PRIMARY KEY, 
    symbol TEXT NOT NULL,
    name TEXT NOT NULL, 
    marketcap INTEGER, 
    rsi_14M INTEGER, 
    rsi_14W INTEGER, 
    adx_14M INTEGER, 
    adx_14W INTEGER
) WITHOUT ROWID;</code
					></pre>
			</div>

			<div>
				<h2 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
					Operation on Every Update
				</h2>
				<pre
					class="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed"><code
						>BEGIN TRANSACTION; 

DELETE FROM tradingview_stock_universe; 

INSERT OR REPLACE INTO tradingview_stock_universe
(isin, symbol, name, marketcap, rsi_14M, rsi_14W, adx_14M, adx_14W) 
VALUES (:isin, :symbol, :name, :marketcap, :rsi_14M, :rsi_14W, :adx_14M, :adx_14W); 

INSERT OR REPLACE INTO table_meta (table_name, updated_at) 
VALUES ('tradingview_stock_universe', Date.now()); 

COMMIT;</code
					></pre>
			</div>
		</div>

		<div class="pt-4 border-t border-slate-100">
			<TradingViewStockUniverse />
		</div>
	</article>

	<!-- Article 2: NSE Industry Classification -->
	<article class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
		<header class="border-b border-slate-100 pb-4">
			<h1 class="text-2xl font-bold text-slate-900 tracking-tight">
				Pull Data for NSE Industry Classification
			</h1>
			<div class="mt-2 text-slate-600 space-y-2 text-sm leading-relaxed">
				<p>
					For each symbol in <code
						class="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono"
						>tradingview_stock_universe</code
					>, execute the visual flow:
				</p>
				<ol class="list-decimal list-inside space-y-1 text-slate-700 pl-1">
					<li>
						Fetch metadata to receive <code
							class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs"
							>marketType</code
						>
						and
						<code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs"
							>series</code
						>:
						<code class="text-xs font-mono text-slate-600 break-all"
							>https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getMetaData&amp;symbol=VBL</code
						>
					</li>
					<li>
						Fetch sectoral data: <code class="text-xs font-mono text-slate-600 break-all"
							>https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&amp;marketType=N&amp;series=EQ&amp;symbol=VBL</code
						>
					</li>
					<li>
						Permanently cache responses in <code
							class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs"
							>nse_cache</code
						>
						under
						<code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs"
							>app.db</code
						> (zstd compressed).
					</li>
				</ol>
			</div>
		</header>

		<div class="space-y-4">
			<div>
				<h2 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
					Schema: <span class="text-slate-800 font-mono lowercase">appdb.nse_cache</span>
				</h2>
				<pre
					class="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed"><code
						>CREATE TABLE IF NOT EXISTS nse_cache (
    url TEXT PRIMARY KEY, 
    response BLOB NOT NULL, 
    isin TEXT NOT NULL, 
    symbol TEXT NOT NULL, 
    type ENUM('MetaData', 'SymbolData') NOT NULL
) WITHOUT ROWID; -- Compress response in zstd</code
					></pre>
			</div>

			<div>
				<h2 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
					Schema: <span class="text-slate-800 font-mono lowercase"
						>appdb.nse_industry_classification</span
					>
				</h2>
				<pre
					class="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed"><code
						>CREATE TABLE IF NOT EXISTS nse_industry_classification (
    symbol TEXT PRIMARY KEY, 
    macro TEXT NOT NULL, 
    sector TEXT NOT NULL, 
    industry TEXT NOT NULL, 
    basic_industry TEXT NOT NULL
) WITHOUT ROWID;</code
					></pre>
			</div>
		</div>

		<div class="pt-4 border-t border-slate-100">
			<NseIndustryClassification />
		</div>
	</article>

	<!-- Article 3: Groww ID Map -->
	<article class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
		<header class="border-b border-slate-100 pb-4">
			<h1 class="text-2xl font-bold text-slate-900 tracking-tight">
				Groww <code class="font-mono text-blue-600">stock_search_id</code> &harr; Symbol Map
			</h1>
			<p class="mt-2 text-slate-600 leading-relaxed text-sm">
				Groww mutual fund holdings only provide <code
					class="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-xs"
					>stock_search_id</code
				> (missing direct symbol or ISIN mapping).
			</p>
		</header>

		<div
			class="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3 text-sm text-slate-700"
		>
			<h2 class="font-semibold text-slate-900 text-xs uppercase tracking-wider">
				Caching &amp; Retrieval Strategy
			</h2>
			<ul class="space-y-2 list-disc list-inside">
				<li>
					<strong>301 Redirect Check:</strong> Query
					<code class="text-xs bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono"
						>https://groww.in/mutual-funds/groww-nifty-total-market-index-fund-direct-growth</code
					>. If redirected (301), resolve the updated ID location and cache in
					<code class="text-xs bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono"
						>temp.db.url_response_cache</code
					> (1-month TTL).
				</li>
				<li>
					<strong>Holdings Data:</strong> Query scheme API
					<code class="text-xs bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono"
						>https://groww.in/v1/api/data/mf/web/v6/scheme/search/groww-nifty-total-market-index-fund-direct-growth</code
					> and cache responses for 5 minutes.
				</li>
				<li>
					<strong>Stock Detail Resolution:</strong> For each target stock ID, store responses in
					<code class="text-xs bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono"
						>temp.db.url_response_cache</code
					>
					(6-month TTL) and commit permanent mappings into
					<code class="text-xs bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono"
						>appdb.groww_stock_id_symbol_map</code
					>.
				</li>
			</ul>
		</div>

		<div class="pt-4 border-t border-slate-100">
			<GrowwStockIdSymbolMap />
		</div>
	</article>
</div>
