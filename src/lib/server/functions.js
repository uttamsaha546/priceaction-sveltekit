import { appdb } from '$lib/server/appdb';
import { tempdb } from '$lib/server/tempdb';
import zlib from 'node:zlib';

const getUrlResponseCacheStmt = tempdb.prepare(`SELECT * FROM url_response_cache WHERE url=?`);
const setUrlResponseCacheStmt = tempdb.prepare(
	`INSERT OR REPLACE INTO url_response_cache (url, response, response_type, expire_at) VALUES (:url, :response, :response_type, :expire_at)`
);

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

		return includedRows
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
