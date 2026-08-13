<script>
	import AmfiStockClassification from './components/AmfiStockClassification.svelte';
	import GrowwMutualFund from './components/GrowwMutualFund.svelte';
	import NseIndustryClassification from './components/NseIndustryClassification.svelte';
	import HowToDefineStockUniverse from './HowToDefineStockUniverse.svelte';
</script>

<div class="prose max-w-5xl mx-auto p-4">
	<article>
		<h1>
			Step 1: Pull Data from <a
				href="https://www.amfiindia.com/otherdata/categorisation-of-stocks"
				target="_blank">AMFI Marketcap classification</a
			>
		</h1>
		<p>
			Save name, isin, symbol (nse||bse), marketcap, category in a database table
			amfi_marketcap_classifications under app.db. Take upto 400Cr Marketcap.
		</p>
		<h4>amfi_marketcap_classifications Schema</h4>
		CREATE TABLE IF NOT EXISTS amfi_marketcap_classifications ( isin TEXT PRIMARY KEY, symbol TEXT NOT
		NULL, name TEXT NOT NULL, marketcap INTEGER NOT NULL, category ENUM('Large Cap', 'Mid Cap', 'Small
		Cap') NOT NULL ) WITHOUT ROWID;

		<AmfiStockClassification />
	</article>
	<article>
		<h1>Step 2: Pull Data for NSE Industry classification</h1>
		<p>
			For each symbols in amfi_marketcap_classifications, fetch
			https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=N&series=EQ&symbol=VBL
			to pull sectoral info. Fetch
			https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getMetaData&symbol=VBL
			to get the marketType and series required in the previous url. Permanently cache these urls in
			nse_cache table under app.db. Save sectoral info into nse_industry_classifications table under
			app.db
		</p>
		<h4>nse_cache Schema</h4>
		<p>
			CREATE TABLE IF NOT EXISTS nse_cache ( url TEXT PRIMARY KEY , response BLOB NOT NULL, isin
			TEXT NOT NULL, symbol TEXT NOT NULL, type ENUM('MetaData', 'SymbolData') NOT NULL ) WITHOUT
			ROWID; Compress response in zstd
		</p>
		<h4>nse_industry_classifications Schema</h4>
		<p>
			CREATE TABLE IF NOT EXISTS nse_industry_classifications ( isin TEXT PRIMARY KEY, symbol TEXT
			NOT NULL, name TEXT NOT NULL, macro TEXT NOT NULL, sector TEXT NOT NULL, industry TEXT NOT
			NULL, basic_industry TEXT NOT NULL, primary_index TEXT DEFAULT NULL, all_index TEXT DEFAULT
			NULL ) WITHOUT ROWID; Compress response in zstd
		</p>

		<NseIndustryClassification />
	</article>
	<article>
		<h1>Step 3: Pull all Mutual funds holdings except debt from Groww</h1>
		<p>
			Get all Equity & Hybrid mutual funds from <a
				href="https://groww.in/mutual-funds/filter"
				target="_blank">groww mutual fund screener</a
			>. Cache the response in url_response_cache table under temp.db, expiry 1month. This will give
			mutual fund id. Fetch each mutual fund id (except index, etf, hybrid long short, arbitrage) to
			get mf holdings, cache the response in url_response_cache in temp.db, expiry next month 15th
			day, api
			https://groww.in/v1/api/data/mf/web/v6/scheme/search/bandhan-small-cap-fund-direct-growth . MF
			holdings will provide stock id, weight. Fetch each stock id to get symbol, store it
			permanently in groww_stock_id_symbol_map table under app.db.
		</p>

		<GrowwMutualFund />
	</article>
	<HowToDefineStockUniverse />
</div>

<article class="prose max-w-5xl mx-auto p-4">
	<h1>Caching on Server Side</h1>
	<p>
		To prevent multiple api call to external server for same resources (api calls to Groww, Dhan,
		etc), caching on server is needed. Caching with Javascript Map works but it only exixts in
		memory, so it disappears when Node.js or Termux restarts. To preserve it, you need to
		periodically save it to persistent storage (like JSON file/SQLite db/Redis) and reload it on
		startup.
	</p>
	<h4>For a Termux-hosted Node.js server</h4>

	<div aria-label="JSON file" class="py-1">
		<!-- The details tag handles all open/close state natively -->
		<details class="group border border-gray-200 rounded-lg bg-white overflow-hidden">
			<!-- The summary tag acts as the clickable header -->
			<summary
				class="list-none p-1 font-semibold flex justify-between items-center cursor-pointer bg-gray-50 hover:bg-gray-100 select-none [&::-webkit-details-marker]:hidden"
			>
				Small cache (&lt 10 MB): JSON file is easiest
				<!-- Icon Wrapper -->
				<span class="text-xl font-medium leading-none select-none">
					<!-- Plus shown by default, hidden when open -->
					<span class="block group-open:hidden">+</span>
					<!-- Minus hidden by default, shown when open -->
					<span class="hidden group-open:block">−</span>
				</span>
			</summary>

			<!-- Content revealed only when open -->
			<div class="p-1 text-gray-600 border-t border-gray-100 animate-fadeIn">
				<pre><code class="language-javascript">
                    import fs from 'fs';
                    
                    const cache = new Map();

                    //Load cache on startup
                    <!-- function loadCache(){
                        if (fs.existsSync('cache.json')){
                            const data = JSON.parse(fs.readFileSync('cache.json', 'utf8'));
                            return new Map(data);
                        }
                        return new Map();
                    } -->
                </code></pre>
			</div>
		</details>
	</div>

	<div aria-label="SQLite" class="py-1">
		<details class="group border border-gray-200 rounded-lg bg-white overflow-hidden">
			<summary
				class="list-none p-1 font-semibold flex justify-between items-center cursor-pointer bg-gray-50 hover:bg-gray-100 select-none [&::-webkit-details-marker]:hidden"
			>
				Medium cache (10 MB-1 GB): SQLite is usually the best choice

				<span class="text-xl font-medium leading-none select-none">
					<span class="block group-open:hidden">+</span>
					<span class="hidden group-open:block">−</span>
				</span>
			</summary>
			<div class="p-1 text-gray-600 border-t border-gray-100 animate-fadeIn">
				This content expands instantly without any JavaScript!
			</div>
		</details>
	</div>

	<div aria-label="Redis" class="py-1">
		<details class="group border border-gray-200 rounded-lg bg-white overflow-hidden">
			<summary
				class="list-none p-1 font-semibold flex justify-between items-center cursor-pointer bg-gray-50 hover:bg-gray-100 select-none [&::-webkit-details-marker]:hidden"
			>
				High update rate or multiple processes: Redis

				<span class="text-xl font-medium leading-none select-none">
					<span class="block group-open:hidden">+</span>
					<span class="hidden group-open:block">−</span>
				</span>
			</summary>
			<div class="p-1 text-gray-600 border-t border-gray-100 animate-fadeIn">
				This content expands instantly without any JavaScript!
			</div>
		</details>
	</div>
</article>
