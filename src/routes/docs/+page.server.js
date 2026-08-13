import { appdb } from '$lib/server/appdb';
import { tempdb } from '$lib/server/tempdb';
import zlib from 'node:zlib';

const insertStmt_AmfiMarketcapClassification = appdb.prepare(`
    INSERT INTO amfi_marketcap_classifications (
        isin,
        symbol,
        name,
        marketcap,
        category
    ) VALUES (
        :isin,
        :symbol,
        :name,
        :marketcap,
        :category
    );
`);

const insertStmt_NseIndustryClassification = appdb.prepare(`
    INSERT OR REPLACE INTO nse_industry_classifications (
        isin,
        symbol,
        name,
        macro,
        sector,
        industry,
        basic_industry,
        primary_index,
        all_index
    ) VALUES (
        :isin,
        :symbol,
        :name,
        :macro,
        :sector,
        :industry,
        :basic_industry,
        :primary_index,
        :all_index
    );
`);

export const actions = {
	saveAmfiMarketcapClassification: async ({ request }) => {
		const formData = await request.formData();
		const rawData = formData.get('data');

		if (typeof rawData !== 'string') {
			return {
				success: false,
				error: 'No data received.'
			};
		}

		let data;

		try {
			data = JSON.parse(rawData);
		} catch (error) {
			return {
				success: false,
				error: 'Invalid JSON data.'
			};
		}

		if (!Array.isArray(data)) {
			return {
				success: false,
				error: 'Invalid data format.'
			};
		}

		appdb.exec('BEGIN TRANSACTION;');

		try {
			appdb.exec('DELETE FROM amfi_marketcap_classifications');

			for (const row of data) {
				insertStmt_AmfiMarketcapClassification.run({
					isin: row.isin,
					symbol: row.symbol,
					name: row.name,
					marketcap: row.marketcap,
					category: row.category
				});
			}

			appdb.exec('COMMIT;');

			return {
				success: true,
				count: data.length
			};
		} catch (error) {
			appdb.exec('ROLLBACK;');

			console.error('amfi_marketcap_classifications insertion error', error);

			return {
				success: false,
				error: 'Failed to save classifications.'
			};
		}
	},

	saveNseIndustryClassification: async ({ request }) => {
		const formData = await request.formData();
		const rawData = formData.get('data');

		if (typeof rawData !== 'string') {
			return {
				success: false,
				error: 'No data received.'
			};
		}

		let data;

		try {
			data = JSON.parse(rawData).filter((x) => x.macro !== undefined);
		} catch (error) {
			return {
				success: false,
				error: 'Invalid JSON data.'
			};
		}

		if (!Array.isArray(data)) {
			return {
				success: false,
				error: 'Invalid data format.'
			};
		}

		appdb.exec('BEGIN TRANSACTION;');

		try {
			for (const row of data) {
				insertStmt_NseIndustryClassification.run({
					isin: row.isin,
					symbol: row.symbol,
					name: row.name,
					macro: row.macro,
					sector: row.sector,
					industry: row.industry,
					basic_industry: row.basic_industry,
					primary_index: row.primary_index,
					all_index: row.all_index
				});
			}

			appdb.exec('COMMIT;');

			return {
				success: true,
				count: data.length
			};
		} catch (error) {
			appdb.exec('ROLLBACK;');

			console.error('nse_industry_classifications insertion error', error);

			return {
				success: false,
				error: 'Failed to save classifications.'
			};
		}
	},

	getMutualFundsFromGroww: async ({ fetch }) => {
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

		const getStmt = tempdb.prepare(`SELECT * FROM url_response_cache WHERE url=?`);
		const cache = getStmt.get(url);

		if (cache && cache.expire_at > Date.now()) {
			const decompressed = zlib.zstdDecompressSync(cache.response);
			const data = JSON.parse(decompressed.toString('utf8'));
			return {
				success: true,
				data
			};
		}

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Groww API request failed: ${response.status}`);
		}

		const data = await response.json();

		const compressed = zlib.zstdCompressSync(Buffer.from(JSON.stringify(data), 'utf8'));

		const setStmt = tempdb.prepare(
			`INSERT OR REPLACE INTO url_response_cache (url, response, response_type, expire_at) VALUES (:url, :response, :response_type, :expire_at)`
		);

		const expireAt = new Date();
		expireAt.setMonth(expireAt.getMonth() + 1);

		setStmt.run({
			url,
			response: compressed,
			response_type: 'json',
			expire_at: expireAt.getTime()
		});

		return {
			success: true,
			data
		};
	}
};
