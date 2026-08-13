import { json } from '@sveltejs/kit';
import zlib from 'node:zlib';
import { tempdb } from '$lib/server/tempdb';

const hotCache = new Map();

const getCacheStmt = tempdb.prepare('SELECT response FROM url_response_cache WHERE url=?');
const setCacheStmt = tempdb.prepare(
	'INSERT OR REPLACE INTO url_response_cache (url, response, response_type, expire_at) VALUES (:url, :response, :response_type, :expire_at)'
);

function getCache(url) {
	const cache = hotCache.get(url);
	if (cache !== undefined) return cache;
	const row = getCacheStmt.get(url);
	if (!row) return null;

	if (row.expire_at <= Date.now()) {
		return null;
	}

	const decompressed = zlib.zstdDecompressSync(row.response);
	const value = JSON.parse(decompressed.toString('utf8'));
	hotCache.set(url, value);
	return value;
}

function setCache(url, response) {
	hotCache.set(url, response);
	const compressed = zlib.zstdCompressSync(Buffer.from(JSON.stringify(response), 'utf8'));
	const expireAt = new Date();

	if (expireAt.getDate() < 15) {
		expireAt.setDate(15);
	} else {
		expireAt.setMonth(expireAt.getMonth() + 1);
		expireAt.setDate(15);
	}

	setCacheStmt.run({
		url: url,
		response: compressed,
		response_type: 'json',
		expire_at: expireAt.getTime()
	});
}

export async function GET({ url, fetch }) {
	const fund_id = url.searchParams.get('fund_id');

	if (!fund_id) {
		return json({ error: 'Missing required query parameter: fund_id' }, { status: 400 });
	}

	const targetUrl = `https://groww.in/v1/api/data/mf/web/v6/scheme/search/${encodeURIComponent(fund_id)}`;
	try {
		const cached = getCache(targetUrl);
		if (cached !== null) {
			return json({
				success: true,
				data: cached
			});
		}
		const response = await fetch(targetUrl);
		if (!response.ok) {
			throw new Error(`Groww Server returned HTTP Status ${response.status}`);
		}
		const data = await response.json();
		setCache(targetUrl, data);

		return json({
			success: true,
			data
		});
	} catch (error) {
		console.error(`Execution fault for target fund_id [${fund_id}]:`, error.message);
		return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
	}
}
