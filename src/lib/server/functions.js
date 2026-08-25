import { appdb } from '$lib/server/appdb';
import { tempdb } from '$lib/server/tempdb';
import zlib from 'node:zlib';

const getUrlResponseCacheStmt = tempdb.prepare(`SELECT * FROM url_response_cache WHERE url=?`);
const setUrlResponseCacheStmt = tempdb.prepare(
	`INSERT OR REPLACE INTO url_response_cache (url, response, response_type, expire_at) VALUES (:url, :response, :response_type, :expire_at)`
);

const getGrowwMutualFundsHoldingsStmt = appdb.prepare('SELECT * FROM groww_mutual_funds_holdings');

const setTradingViewScreenerRsiStmt = appdb.prepare(
	`INSERT OR REPLACE INTO tradingview_screener_rsi (isin, symbol, rsi_14W, rsi_14M) VALUES (:isin, :symbol, :rsi_14W, :rsi_14M)`
);

const getTradingViewScreenerRsiStmt = appdb.prepare(`SELECT * FROM tradingview_screener_rsi`);

export async function getGrowwMfScreenerData() {
	const url =
		`https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?` +
		`available_for_investment=true` +
		`&cat=Equity,Hybrid` +
		`&doc_type=scheme` +
		`&index=false` +
		`&page=0` +
		`&plan_type=Direct` +
		`&scheme_type=Growth` +
		`&size=5000` +
		`&sort_by=3` +
		`&sub_cat=null,null` +
		`&sub_sub_cat=null,null` +
		`&tags=null,null`;

	const cache = getUrlResponseCacheStmt.get(url);

	const excludeUnwantedRows = (data) => {
		const excludedRows = [];
		const includedRows = [];

		data.content.forEach((row) => {
			if (row.index === true) {
				excludedRows.push(row);
			} else if (
				row.id.includes('etf') ||
				row.id.includes('fof') ||
				row.id.includes('fund-of-funds') ||
				row.id.includes('sbi-magnum-children') ||
				row.id.includes('hdfc-multiple-yield-fund-plan-2005-direct-growth') ||
				row.id.includes('bandhan-asset-allocation-moderate-direct-growth') ||
				row.id.includes('hdfc-non-cyclical-consumer-fund-direct-growth') ||
				row.id.includes('canara-robeco-force-fund-direct-growth') ||
				row.id.includes('bandhan-asset-allocation-conservative-direct-growth')
			) {
				excludedRows.push(row);
			} else if (
				row.sub_category === 'Arbitrage' ||
				row.sub_category === 'International' ||
				row.sub_category === 'Hybrid Long-Short Fund' ||
				!row.sub_category
			) {
				excludedRows.push(row);
			} else {
				includedRows.push(row);
			}
		});

		return includedRows;
	};

	if (cache && cache.expire_at > Date.now()) {
		const decompressed = zlib.zstdDecompressSync(cache.response);
		const data = JSON.parse(decompressed.toString('utf8'));

		const cleanData = excludeUnwantedRows(data);
		return cleanData;
	}

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Groww API request failed: ${response.status}`);
	}

	const data = await response.json();

	const compressed = zlib.zstdCompressSync(Buffer.from(JSON.stringify(data), 'utf8'));

	const expireAt = new Date();
	expireAt.setMonth(expireAt.getMonth() + 1);

	setUrlResponseCacheStmt.run({
		url,
		response: compressed,
		response_type: 'json',
		expire_at: expireAt.getTime()
	});

	const cleanData = excludeUnwantedRows(data);
	return cleanData;
}

export function getFormattedMfHoldings() {
	const formattedMfHoldings = getGrowwMutualFundsHoldingsStmt.all();
	const rsiRows = getTradingViewScreenerRsiStmt.all();
	
	const industryClassificationRows = appdb.prepare('SELECT * FROM nse_industry_classifications').all();
	
	const industryClassificationBySymbol = new Map(industryClassificationRows.map(row=>[row.symbol, row]));

	const rsiBySymbol = new Map(rsiRows.map((row) => [row.symbol, row]));

	return formattedMfHoldings.map((fund) => {
		const holdings = JSON.parse(fund.holdings).map((holding) => ({
			...holding,
			...(rsiBySymbol.get(holding.symbol) ?? {}),
			...(industryClassificationBySymbol.get(holding.symbol) ?? {})
		}));
		
		const sector_weight = {};
		
		holdings.forEach(holding=>{
		  if(!sector_weight[holding.sector]){
		    sector_weight[holding.sector] = 0;
		  }
		  
		  sector_weight[holding.sector] += holding.corpus_per;
		})

		return {
			...fund,
			holdings,
			equity_count: holdings.length,

			equity_pct: parseInt(holdings.reduce((acc, currentValue) => acc + currentValue.corpus_per, 0)),

			top10_weight: parseInt(holdings.map(x=>x.corpus_per).sort((a,b)=>b-a).slice(0,10).reduce((acc,x)=>acc+x, 0)),

			rsi_14M_gt55: parseInt(holdings.reduce(
				(acc, currentValue) => acc + (currentValue.rsi_14M >= 60 ? currentValue.corpus_per : 0),
				0
			)),

			rsi_14M_lt55: parseInt(holdings.reduce(
				(acc, currentValue) => acc + (currentValue.rsi_14M < 55 ? currentValue.corpus_per : 0),
				0
			)),
			rsi_14W_gt55: parseInt(holdings.reduce(
				(acc, currentValue) => acc + (currentValue.rsi_14W >= 60 ? currentValue.corpus_per : 0),
				0
			)),

			rsi_14W_lt55: parseInt(holdings.reduce(
				(acc, currentValue) => acc + (currentValue.rsi_14W < 55 ? currentValue.corpus_per : 0),
				0
			)),
			
			sector_weight
		};
	});
}

export async function getMfHoldingsDataFromGroww(fund_id) {
	if (!fund_id) {
		throw new Error('fund_id required as argument in getMfHoldingsDataFromGroww() function');
	}

	const url = `https://groww.in/v1/api/data/mf/web/v6/scheme/search/${encodeURIComponent(fund_id)}`;

	const cache = getUrlResponseCacheStmt.get(url);
	if (cache && cache.expire_at > Date.now()) {
		const decompressed = zlib.zstdDecompressSync(cache.response);
		const data = JSON.parse(decompressed.toString('utf8'));
		return data;
	}

	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Groww Server returned HTTP Status ${response.status}`);
		}
		const data = await response.json();

		const compressed = zlib.zstdCompressSync(Buffer.from(JSON.stringify(data), 'utf8'));
		const expireAt = new Date();

		if (expireAt.getDate() < 15) {
			expireAt.setDate(15);
		} else {
			expireAt.setMonth(expireAt.getMonth() + 1);
			expireAt.setDate(15);
		}

		setUrlResponseCacheStmt.run({
			url: url,
			response: compressed,
			response_type: 'json',
			expire_at: expireAt.getTime()
		});
	} catch (error) {
		console.error(`Execution fault for target fund_id [${fund_id}]:`, error.message);
		return null;
	}
}

export async function saveTradingViewScreenerData() {
	const url = `https://scanner.tradingview.com/india/scan?label-product=screener-stock`;
	const payload = {
		columns: ['ticker-view', 'isin-displayed', 'RSI|1W', 'RSI|1M'],
		filter: [
			{
				left: 'market_cap_basic',
				operation: 'egreater',
				right: 4000000000
			},
			{
				left: 'is_primary',
				operation: 'equal',
				right: true
			}
		],
		ignore_unknown_fields: false,
		options: {
			lang: 'en'
		},
		range: [0, 3000],
		sort: {
			sortBy: 'market_cap_basic',
			sortOrder: 'desc'
		},
		markets: ['india'],
		filter2: {
			operator: 'and',
			operands: [
				{
					operation: {
						operator: 'or',
						operands: [
							{
								operation: {
									operator: 'and',
									operands: [
										{
											expression: {
												left: 'type',
												operation: 'equal',
												right: 'stock'
											}
										},
										{
											expression: {
												left: 'typespecs',
												operation: 'has',
												right: ['common']
											}
										}
									]
								}
							},
							{
								operation: {
									operator: 'and',
									operands: [
										{
											expression: {
												left: 'type',
												operation: 'equal',
												right: 'stock'
											}
										},
										{
											expression: {
												left: 'typespecs',
												operation: 'has',
												right: ['preferred']
											}
										}
									]
								}
							},
							{
								operation: {
									operator: 'and',
									operands: [
										{
											expression: {
												left: 'type',
												operation: 'equal',
												right: 'dr'
											}
										}
									]
								}
							},
							{
								operation: {
									operator: 'and',
									operands: [
										{
											expression: {
												left: 'type',
												operation: 'equal',
												right: 'fund'
											}
										},
										{
											expression: {
												left: 'typespecs',
												operation: 'has_none_of',
												right: ['etf', 'mutual']
											}
										}
									]
								}
							}
						]
					}
				},
				{
					expression: {
						left: 'typespecs',
						operation: 'has_none_of',
						right: ['pre-ipo']
					}
				}
			]
		}
	};

	const res = await fetch(url, {
		method: 'POST',
		body: JSON.stringify(payload),
		headers: { 'content-type': 'application/json' }
	});

	const data = await res.json();

	// appdb.exec(`DELETE FROM tradingview_screener_rsi`);
	data.data.forEach((x) => {
		const parseRsi = (value) => {
			const parsed = parseInt(value, 10);
			return Number.isNaN(parsed) ? null : parsed;
		};

		const formatSymbol = (symbol) => {
			if (symbol.includes('_')) {
				return symbol.replaceAll('_', '-');
			}
			return symbol;
		};

		setTradingViewScreenerRsiStmt.run({
			symbol: formatSymbol(x.d[0].name),
			isin: x.d[1],
			rsi_14W: parseRsi(x.d[2]),
			rsi_14M: parseRsi(x.d[3])
		});
	});

	return true;
}
