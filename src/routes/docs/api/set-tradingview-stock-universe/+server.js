//set-tradingview-stock-universe

import { json } from '@sveltejs/kit';
import { appdb } from '$lib/server/appdb';
import {GET as GET_TradingViewStockUniverse} from '../get-tradingview-stock-universe/+server';

const setTradingViewStockUniverseStmt =
	appdb.prepare(`INSERT OR REPLACE INTO tradingview_stock_universe 
    (isin, symbol, name, marketcap, rsi_14M, rsi_14W, adx_14M, adx_14W) VALUES 
    (:isin, :symbol, :name, :marketcap, :rsi_14M, :rsi_14W, :adx_14M, :adx_14W)
`);
const setTableMetaStmt = appdb.prepare(
	`INSERT OR REPLACE INTO table_meta (table_name, updated_at) VALUES (:table_name, :updated_at)`
);
// Helper to safely round numeric indicators without converting null to 0
const safeRound = (val) => 
    typeof val === 'number' && !isNaN(val) ? Math.round(val) : null;

export async function GET() {
	const url = `https://scanner.tradingview.com/india/scan?label-product=screener-stock`;
	const payload = {
		columns: [
			'ticker-view',
			'isin-displayed',
			'market_cap_basic',
			'type',
			'typespecs',
			'fundamental_currency_code',
			'RSI|1M',
			'RSI|1W',
			'ADX|1M',
			'ADX|1W'
		],
		filter: [
			{
				left: 'is_blacklisted',
				operation: 'equal',
				right: false
			}
		],
		ignore_unknown_fields: false,
		options: {
			lang: 'en'
		},
		range: [0, 1000],
		sort: {
			sortBy: 'market_cap_basic',
			sortOrder: 'desc'
		},
		symbols: {
			symbolset: ['SYML:NSE;NIFTY_TOTAL_MKT']
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

	const data = (await res.json()).data;

	appdb.exec('BEGIN TRANSACTION;');

	try {
		appdb.exec('DELETE FROM tradingview_stock_universe');

		for (const row of data) {
			const symbol = row.d[0].name.replace('_', '-'); //Tradingview uses BAJAJ_AUTO while NSE uses BAJAJ-AUTO
			if (symbol.endsWith('.RR')) continue; //skip REITs
			const name = row.d[0].description;
			const isin = row.d[1];
            const marketcap = safeRound(row.d[2]/10000000);			
			const rsi_14M = safeRound(row.d[6]);
			const rsi_14W = safeRound(row.d[7]);
			const adx_14M = safeRound(row.d[8]);
			const adx_14W = safeRound(row.d[9]);

			setTradingViewStockUniverseStmt.run({isin, symbol, name, marketcap, rsi_14M, rsi_14W, adx_14M, adx_14W});
		}

		setTableMetaStmt.run({
			table_name: 'tradingview_stock_universe',
			updated_at: Date.now()
		});

		appdb.exec('COMMIT;');
	} catch (dbError) {
		appdb.exec('ROLLBACK;');
		throw dbError;
	}

	return GET_TradingViewStockUniverse();
}
