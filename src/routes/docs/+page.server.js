import { appdb } from '$lib/server/appdb';
import { tempdb } from '$lib/server/tempdb';
import zlib from 'node:zlib';
import { getGrowwMfScreenerData } from '$lib/server/functions';

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

	getMutualFundsFromGroww: async () => {
		const growwMfScreenerData = await getGrowwMfScreenerData();
		return growwMfScreenerData;
	}
};
