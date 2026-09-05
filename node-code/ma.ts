import { parseArgs } from 'node:util';
import { db } from './database.ts';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const PERIOD = 252;
const BATCH_SIZE = 10;

const today = new Date().toLocaleDateString('en-CA');

const config = {
	options: {
		from: { type: 'string', short: 'f' },
		to: { type: 'string', short: 't' }
	},
	allowPositionals: true
} as const;

const { values, positionals } = parseArgs(config);

const fromDate = values.from || positionals[0] || today;
const toDate = values.to || fromDate;

console.log('--- Configured Dates ---');
console.log('From Date:', fromDate);
console.log('To Date  :', toDate);

// -----------------------------------------------------------------------------
// Database setup
// -----------------------------------------------------------------------------

db.exec(`
	CREATE TABLE IF NOT EXISTS ma_daily (
    trade_date DATE NOT NULL,
		symbol TEXT NOT NULL,
		ma_252 INTEGER NOT NULL,

		PRIMARY KEY (symbol, trade_date)
	) WITHOUT ROWID;
`);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Stock = {
	instrument_id: number;
	symbol: string;
};

type PriceRow = {
	trade_date: string;
	close: number | null;
};

type MAInsert = {
	instrument_id: number;
	trade_date: string;
	symbol: string;
	ma_252: number;
};

// -----------------------------------------------------------------------------
// Date utilities
// -----------------------------------------------------------------------------

function parseLocalDate(dateStr: string): Date {
  if(typeof dateStr ==='object'){
    return new Date(dateStr);
  }
	const [year, month, day] = dateStr.split('-').map(Number);

	if (
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day)
	) {
		throw new Error(`Invalid date: ${dateStr}`);
	}

	return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

// -----------------------------------------------------------------------------
// Stocks
// -----------------------------------------------------------------------------

const stocksStmt = db.prepare(`
    SELECT DISTINCT symbol
    FROM stock_prices_daily WHERE trade_date=:trade_date;
`) as Stock[];
// -----------------------------------------------------------------------------
// SQL statements
// -----------------------------------------------------------------------------

/**
 * Get the latest 253 market sessions up to a date.
 *
 * 253 sessions are required for the optimized calculation:
 *
 * Previous MA:
 *   sessions[1 ... 252]
 *
 * New MA:
 *   sessions[0 ... 251]
 *
 * Therefore sessions[252] is the price that leaves the window.
 */
const getMarketSessionsStmt = db.prepare(`
	SELECT DISTINCT trade_date
	FROM stock_prices_daily
	WHERE trade_date <= :trade_date
	ORDER BY trade_date DESC
	LIMIT :limit
`);

const getStockPricesStmt = db.prepare(`
	SELECT
		trade_date,
		close
	FROM stock_prices_daily
	WHERE symbol = :symbol
	  AND trade_date IN (
		SELECT DISTINCT trade_date
		FROM stock_prices_daily
		WHERE trade_date <= :trade_date
		ORDER BY trade_date DESC
		LIMIT :limit
	  )
	ORDER BY trade_date DESC
`);

/**
 * Get an already-calculated MA.
 */
const getPreviousMAStmt = db.prepare(`
	SELECT ma_252
	FROM ma_daily
	WHERE symbol = :symbol
	  AND trade_date = :trade_date
`);

/**
 * Insert/update MA.
 */
const insertMAStmt = db.prepare(`
	INSERT INTO ma_daily (
		trade_date,
		symbol,
		ma_252
	)
	VALUES (
		:trade_date,
		:symbol,
		:ma_252
	)
	ON CONFLICT (symbol, trade_date)
	DO UPDATE SET
		ma_252 = excluded.ma_252
`);

// -----------------------------------------------------------------------------
// Transaction
// -----------------------------------------------------------------------------

const insertBatch = (rows: MAInsert[]) => {
  db.exec('BEGIN');
  try{
	for (const row of rows) {
		insertMAStmt.run(row);
	}
	db.exec('COMMIT');
  }catch(error){
    db.exec('ROLLBACK');
    console.log('DB ERROR', error);
    throw error
  }
};

// -----------------------------------------------------------------------------
// Full MA calculation
// -----------------------------------------------------------------------------

function calculateMA(values: number[], period: number): number | null {
	if (values.length < period) {
		return null;
	}

	let sum = 0;

	for (let i = values.length - period; i < values.length; i++) {
		sum += values[i];
	}

	return sum / period;
}

// -----------------------------------------------------------------------------
// Optimized MA
// -----------------------------------------------------------------------------

function calculateOptimizedMA({
	symbol,
	tradeDate,
	period
}: {
	symbol: string;
	tradeDate: string;
	period: number;
}): number | null {
	/**
	 * We need 253 market sessions:
	 *
	 * sessions[0]   = current trading day
	 * sessions[1]   = previous trading day
	 * sessions[252] = price leaving the window
	 */
	const sessions = getMarketSessionsStmt.all({
		trade_date: tradeDate,
		limit: period + 1
	}) as Array<{ trade_date: string }>;

	if (sessions.length < period + 1) {
		return null;
	}

	const currentSession = sessions[0].trade_date;
	const previousSession = sessions[1].trade_date;
	const exitingSession = sessions[period].trade_date;

	/**
	 * The optimized calculation requires yesterday's MA.
	 */
	const previousMA = getPreviousMAStmt.get({
		symbol,
		trade_date: previousSession
	}) as { ma_252: number } | undefined;

	if (!previousMA) {
		return null;
	}

	/**
	 * Fetch current and exiting prices.
	 */
	const prices = getStockPricesStmt.all({
		symbol,
		trade_date: tradeDate,
		limit: period + 1
	}) as PriceRow[];

	const priceMap = new Map(
		prices.map(row => [row.trade_date, row.close])
	);

	const currentPrice = priceMap.get(currentSession);
	const exitingPrice = priceMap.get(exitingSession);

	/**
	 * Missing prices invalidate the optimized calculation.
	 */
	if (currentPrice == null || exitingPrice == null) {
		return null;
	}

	/**
	 * Rolling SMA:
	 *
	 * newMA =
	 *   oldMA +
	 *   (newPrice - priceLeavingWindow) / period
	 */
	return (
		previousMA.ma_252 +
		(Number(currentPrice) - Number(exitingPrice)) / period
	);
}

// -----------------------------------------------------------------------------
// Full 252-session calculation
// -----------------------------------------------------------------------------

function calculateFullMA({
	symbol,
	tradeDate,
	period
}: {
	symbol: string;
	tradeDate: string;
	period: number;
}): number | null {
	const rows = getStockPricesStmt.all({
		symbol,
		trade_date: tradeDate,
		limit: period
	}) as PriceRow[];

	/**
	 * There aren't enough market sessions.
	 */
	if (rows.length < period) {
		return null;
	}

	/**
	 * A market session exists, but this instrument has no price.
	 */
	if (rows.some(row => row.close == null)) {
		return null;
	}

	/**
	 * Query is DESC, so reverse to chronological order.
	 */
	const closes = rows
		.reverse()
		.map(row => Number(row.close));

	return calculateMA(closes, period);
}

// -----------------------------------------------------------------------------
// Calculate MA for one stock/date
// -----------------------------------------------------------------------------

function calculateStockMA(
	stock: Stock,
	tradeDate: string
): number | null {
	/**
	 * First try the O(1) rolling calculation.
	 */
	const optimizedMA = calculateOptimizedMA({
		symbol: stock.symbol,
		tradeDate,
		period: PERIOD
	});

	if (optimizedMA !== null) {
		return optimizedMA;
	}

	/**
	 * If yesterday's MA isn't available, or a required price is missing,
	 * calculate the MA from the complete 252-session window.
	 */
	return calculateFullMA({
		symbol: stock.symbol,
		tradeDate,
		period: PERIOD
	});
}

// -----------------------------------------------------------------------------
// Process date range
// -----------------------------------------------------------------------------

async function processDateRange(
	startStr: string,
	endStr: string
) {
	let current = parseLocalDate(startStr);
	const end = parseLocalDate(endStr);

	const batch: MAInsert[] = [];

	let processedDates = 0;
	let insertedRows = 0;

	while (current <= end) {
		const tradeDate = formatLocalDate(current);

		/**
		 * We don't need to explicitly query whether this is a trading day.
		 * If there are no market sessions for this date, all calculations
		 * simply return null.
		 *
		 * Weekends are skipped to avoid unnecessary work.
		 */
		const dayOfWeek = current.getDay();

		if (dayOfWeek !== 0 && dayOfWeek !== 6) {
			processedDates++;

    const stocks = stocksStmt.all({trade_date: tradeDate})
    console.log(`Stocks: ${stocks.length}`);
    //console.log(stocks)
      //process.exit(0)
      
			for (const stock of stocks) {

				const ma = calculateStockMA(
					stock,
					tradeDate
				);
console.log('Processing ', stock.symbol, current, ma)
				if (ma === null) {
					continue;
				}

				batch.push({
					symbol: stock.symbol,
					trade_date: tradeDate,
					symbol: stock.symbol,
					ma_252: Math.round(ma)
				});

				if (batch.length >= BATCH_SIZE) {
					insertBatch(batch.splice(0));
					insertedRows += BATCH_SIZE;
				}
			}
		}

		current.setDate(current.getDate() + 1);
	}

	/**
	 * Flush remaining rows.
	 */
	if (batch.length > 0) {
		insertBatch(batch);
		insertedRows += batch.length;
	}

	console.log('--- Processing Complete ---');
	console.log('Trading dates processed:', processedDates);
	console.log('MA rows inserted:', insertedRows);
}

// -----------------------------------------------------------------------------
// Execute
// -----------------------------------------------------------------------------

await processDateRange(fromDate, toDate);