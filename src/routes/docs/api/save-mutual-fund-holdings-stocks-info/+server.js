import { json } from '@sveltejs/kit';
import zlib from 'node:zlib';
import { tempdb } from '$lib/server/tempdb';
import { appdb } from '$lib/server/appdb';

import * as cheerio from 'cheerio';

const hotCache = new Map();

const getCacheStmt = tempdb.prepare(`
	SELECT response, response_type, expire_at
	FROM url_response_cache
	WHERE url = ?
`);

const setCacheStmt = tempdb.prepare(`
	INSERT OR REPLACE INTO url_response_cache
	(url, response, response_type, expire_at)
	VALUES (:url, :response, :response_type, :expire_at)
`);

const getStockInfoStmt = appdb.prepare(
	`SELECT * FROM groww_stock_id_symbol_map WHERE stock_search_id=?`
);
const setStockInfoStmt = appdb.prepare(
	`INSERT OR REPLACE INTO groww_stock_id_symbol_map (stock_search_id, isin, symbol) VALUES (:stock_search_id, :isin, :symbol)`
);

function getCache(url) {
	const cache = hotCache.get(url);

	if (cache !== undefined) {
		return cache;
	}

	const row = getCacheStmt.get(url);

	if (!row) {
		return null;
	}

	if (row.expire_at <= Date.now()) {
		return null;
	}

	const decompressed = zlib.zstdDecompressSync(row.response);

	let value;

	if (row.response_type === 'json') {
		value = JSON.parse(decompressed.toString('utf8'));
	} else if (row.response_type === 'html') {
		value = decompressed.toString('utf8');
	} else {
		throw new Error(`Unknown response type: ${row.response_type}`);
	}

	hotCache.set(url, value);

	return value;
}

function setCache(url, response, response_type = 'json') {
	hotCache.set(url, response);

	let compressed;

	if (response_type === 'json') {
		compressed = zlib.zstdCompressSync(Buffer.from(JSON.stringify(response), 'utf8'));
	} else if (response_type === 'html') {
		compressed = zlib.zstdCompressSync(Buffer.from(response, 'utf8'));
	} else {
		throw new Error(`Unknown response type: ${response_type}`);
	}

	const expireAt = new Date();

	if (expireAt.getDate() < 15) {
		expireAt.setDate(15);
	} else {
		expireAt.setMonth(expireAt.getMonth() + 1);
		expireAt.setDate(15);
	}

	setCacheStmt.run({
		url,
		response: compressed,
		response_type,
		expire_at: expireAt.getTime()
	});
}

export async function GET({ url }) {
	let fund_id = url.searchParams.get('fund_id');

	if (!fund_id) {
		return json({ error: 'Missing required query parameter: fund_id' }, { status: 400 });
	}

	//Check if id returned 301
	const res = await fetch(`https://groww.in/mutual-funds/${encodeURIComponent(fund_id)}`, { redirect: 'manual' });
	if (res.status === 301) {
		const movedTo = res.headers.get('location');
		fund_id = movedTo.split('/')[2];
		// return json({
		// 	status: '301',
		// 	data: [],
		// 	movedTo: movedTo,
		// 	new_fund_id: fund_id
		// });
	}

	const holdingsUrl = `https://groww.in/v1/api/data/mf/web/v6/scheme/search/${encodeURIComponent(fund_id)}`;

	const holdings = await getHoldings(holdingsUrl);

	if (!holdings) {
		return json({ error: 'Unable to retrieve fund holdings' }, { status: 502 });
	}

	const equityHoldings = holdings.filter((x) => x.nature_name === 'EQUITY');

	const CONCURRENCY_LIMIT = 10;
	const infos = new Array(equityHoldings.length);

	for (let i = 0; i < equityHoldings.length; i += CONCURRENCY_LIMIT) {
		const batch = equityHoldings.slice(i, i + CONCURRENCY_LIMIT);

		const batchInfos = await Promise.allSettled(
			batch.map(async (item) => {
				return await getStockInfo(item.stock_search_id);
			})
		);

		batchInfos.forEach((info, index) => {
			infos[i + index] = info.value;
		});
	}

	const formattedHoldings = equityHoldings.map((item, index) => {
		return {
			...infos[index],
			corpus_per: item.corpus_per
		};
	});

	const stmt = appdb.prepare(`INSERT OR REPLACE INTO groww_mutual_funds_holdings (search_id, holdings, portfolio_date) VALUES (:search_id, :holdings, :portfolio_date)`);
	stmt.run({ search_id: fund_id, holdings: JSON.stringify(formattedHoldings), portfolio_date: new Date(equityHoldings[0]?.portfolio_date ?? '').toLocaleDateString('en-CA') });

	return json({
		status: 'OK',
		data: formattedHoldings
	});
}

async function getHoldings(url) {
	try {
		const cached = getCache(url);

		if (cached !== null) {
			return cached.holdings;
		}

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Groww Server returned HTTP Status ${response.status}`);
		}

		const data = await response.json();

		setCache(url, data);

		return data.holdings;
	} catch (error) {
		console.error(`Execution fault for target URL [${url}]:`, error.message);

		return null;
	}
}

/**
 * @param {string} stock_search_id
 * @returns {{ isin: string, symbol: string, stock_search_id: string }}
 */
async function getStockInfo(stock_search_id) {
	//IF Exists in database, return the record.
	let stockInfo = getStockInfoStmt.get(stock_search_id);
	if (stockInfo !== undefined) {
		return stockInfo;
	}

	//Else collect from cached html or fresh html
	const url = `https://groww.in/stocks/${stock_search_id}`;

	let htmlContent = getCache(url);

	if (htmlContent === null) {
		const res = await fetch(url);

		if (!res.ok) {
			throw new Error(`Groww Server returned HTTP Status ${res.status}`);
		}

		htmlContent = await res.text();

		setCache(url, htmlContent, 'html');
	}

	// Load the HTML
	const $ = cheerio.load(htmlContent);

	// Target the script tag by ID and grab its internal text
	const jsonString = $('#__NEXT_DATA__').text().trim();

	try {
		// Parse the raw text string into a usable JavaScript object
		const nextData = JSON.parse(jsonString);
		const header = nextData.props.pageProps.stockData.header;

		const data = {
			isin: header.isin,
			symbol: header.nseScriptCode || header.bseTradingSymbol || null,
			stock_search_id: header.searchId
		};

		setStockInfoStmt.run({ ...data });

		return data;
	} catch (error) {
		console.error('Failed to parse JSON:', error.message);
		return null;
	}
}
