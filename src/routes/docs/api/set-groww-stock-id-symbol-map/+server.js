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
	`INSERT OR REPLACE INTO groww_stock_id_symbol_map (stock_search_id, symbol) VALUES (:stock_search_id, :symbol)`
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
	let stock_search_id = url.searchParams.get('stock_search_id');

	if (!stock_search_id) {
		return json({ error: 'Missing required query parameter: stock_search_id' }, { status: 400 });
	}

	const stockInfo = await getStockInfo(stock_search_id);

	setStockInfoStmt.run(stockInfo);

	return json({
		stock_search_id,
		...stockInfo
	});
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

		const result = {
			symbol: header.nseScriptCode,
			stock_search_id: header.searchId
		};

		return result;
	} catch (error) {
		console.error('Failed to parse JSON:', error.message);
		return null;
	}
}
