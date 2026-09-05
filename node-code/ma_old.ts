import { parseArgs } from 'node:util';
import { db } from './database.ts';

// 1. Get today's date in YYYY-MM-DD format.
const today = new Date().toLocaleDateString('en-CA');

const config = {
	options: {
		from: { type: 'string', short: 'f' },
		to: { type: 'string', short: 't' }
	},
	allowPositionals: true
} as const;

const { values, positionals } = parseArgs(config);

// 2. Determine date range:
// Flag -> positional -> today
const fromDate = values.from || positionals[0] || today;
const toDate = values.to || fromDate;

console.log('--- Configured Dates ---');
console.log('From Date:', fromDate);
console.log('To Date  :', toDate);

db.exec(`
	CREATE TABLE IF NOT EXISTS ma_daily (
		instrument_id INTEGER NOT NULL, 
		symbol TEXT NOT NULL, 
		trade_date DATE NOT NULL, 
		ma_252 INTEGER NOT NULL,

		PRIMARY KEY (instrument_id, trade_date)
	) WITHOUT ROWID;
`);

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

function parseLocalDate(dateStr: string): Date {
  if(typeof dateStr ==='object') {return new Date(dateStr)}
  
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

// -----------------------------------------------------------------------------
// Database setup
// -----------------------------------------------------------------------------

const stocks = db
	.prepare(
		`
		SELECT DISTINCT instrument_id, symbol
		FROM stock_prices_daily
	`
	)
	.all() as Array<{ instrument_id: number, symbol: string }>;

/**
 * Get the previous 252 market sessions up to and including tradeDate.
 *
 * Important:
 * We first select the 252 sessions globally, then LEFT JOIN the stock's
 * prices. This allows us to detect a missing close for a market session.
 */
const getClosesStmt = db.prepare(`
	WITH previous_sessions AS (
		SELECT trade_date
		FROM (
			SELECT DISTINCT trade_date
			FROM stock_prices_daily
			WHERE trade_date <= :trade_date
			ORDER BY trade_date DESC
			LIMIT 252
		)
	)
	SELECT
		ps.trade_date,
		sp.close
	FROM previous_sessions ps
	LEFT JOIN stock_prices_daily sp
		ON sp.trade_date = ps.trade_date
		AND sp.instrument_id = :instrument_id
	ORDER BY ps.trade_date ASC
`);

// -----------------------------------------------------------------------------
// Calculate MA
// -----------------------------------------------------------------------------

function calculateMA({ values, period }: { values: number[]; period: number }): number | null {
	if (values.length < period) {
		return null;
	}

	const window = values.slice(-period);

	return window.reduce((sum, value) => sum + value, 0) / period;
}

const previousMarketSessionStmt = db.prepare(`SELECT DISTINCT trade_date FROM stock_prices_daily WHERE trade_date <=:trade_date ORDER BY trade_date DESC LIMIT 253`);

const previousDayMAStmt = db.prepare(`SELECT ma_252 FROM ma_daily WHERE instrument_id=:instrument_id AND trade_date=:trade_date`);

const priceStmt = db.prepare(`SELECT close FROM stock_prices_daily WHERE trade_date=:trade_date AND instrument_id=:instrument_id`);

function calculateOptimizedMA({ instrument_id, trade_date, period }: { instrument_id: number; trade_date: string; period: number }): number | null {
  
  // Get previous_sessions
  const sessions = previousMarketSessionStmt.all({trade_date}) as Array<{ trade_date: string }>;
  // Need:
	//   current session
	//   previous session
	//   session whose price leaves the 252-day window
	if (sessions.length < period + 1) {
		return null;
	}
	const currentSession = sessions[0].trade_date;
	const previousSession = sessions[1].trade_date;
	const exitingSession = sessions[period].trade_date;
	
	// We can only optimize if yesterday's MA already exists.
  const previousDayMA = previousDayMAStmt.get({instrument_id, trade_date: previousSession}) as { ma_252: number } | undefined;
  
  if(!previousDayMA) return null;
  
  const currentPrice = priceStmt.get({
		instrument_id,
		trade_date: currentSession
	}) as { close: number } | undefined;

	const exitingPrice = priceStmt.get({
		instrument_id,
		trade_date: exitingSession
	}) as { close: number } | undefined;

	// Missing price means we cannot safely calculate the optimized MA.
	if (!currentPrice || !exitingPrice) {
		return null;
	}
  
  return (
		previousDayMA.ma_252 +
		(Number(currentPrice.close) - Number(exitingPrice.close)) / period
	);
}

// -----------------------------------------------------------------------------
// Get closes for a stock/date
// -----------------------------------------------------------------------------

function get252Closes(instrumentId: number, tradeDate: string): number[] {
	const rows = getClosesStmt.all({
		instrument_id: instrumentId,
		trade_date: tradeDate
	}) as Array<{
		trade_date: string;
		close: number | null;
	}>;

	// There aren't enough market sessions yet.
	if (rows.length < 252) {
		return [];
	}

	// A market session exists, but this instrument has no close.
	if (rows.some((row) => row.close == null)) {
		return [];
	}

	return rows.map((row) => Number(row.close));
}

// -----------------------------------------------------------------------------
// MA insert
// -----------------------------------------------------------------------------

/*
 * Adjust this SQL to match your actual MA table/schema.
 *
 * Example expected table:
 *
 * CREATE TABLE stock_moving_averages (
 *   instrument_id TEXT NOT NULL,
 *   trade_date TEXT NOT NULL,
 *   period INTEGER NOT NULL,
 *   moving_average REAL NOT NULL,
 *   PRIMARY KEY (instrument_id, trade_date, period)
 * );
 */

const insertMAStmt = db.prepare(`
	INSERT INTO ma_daily (
		instrument_id,
		trade_date,
		symbol,
		ma_252
	)
	VALUES (
		:instrument_id,
		:trade_date,
		:symbol,
		:ma_252
	)
	ON CONFLICT (instrument_id, trade_date)
	DO UPDATE SET
		ma_252 = excluded.ma_252
`);

// -----------------------------------------------------------------------------
// Processing
// -----------------------------------------------------------------------------

const insertBatch = (
	rows: Array<{
		instrument_id: number;
		trade_date: string;
		symbol: string;
		ma_252: number;
	}>
) => {
	db.exec('BEGIN');
	try {
		for (const row of rows) {
			insertMAStmt.run(row);
		}
		db.exec('COMMIT');
	} catch (error) {
		db.exec('ROLLBACK');
		throw error;
	}
};



async function processDateRange(startStr: string, endStr: string) {
	let current = parseLocalDate(startStr);
	const end = parseLocalDate(endStr);

	const batch: Array<{
		instrument_id: number;
		trade_date: string;
		symbol: string;
		ma_252: number;
	}> = [];

	while (current <= end) {
		const dayOfWeek = current.getDay();

		// Skip weekends.
		if (dayOfWeek === 0 || dayOfWeek === 6) {
			current.setDate(current.getDate() + 1);
			continue;
		}

		const tradeDate = formatLocalDate(current);

		for (const stock of stocks) {
		  let optimizdMA = calculateOptimizedMA({instrument_id:stock.instrument_id, trade_date:tradeDate, period:252});
		  
		  if(optimizdMA!==null){
        batch.push({
				instrument_id: stock.instrument_id,
				trade_date: tradeDate,
				symbol: stock.symbol,
				ma_252: Math.round(optimizdMA)
			});
		    continue;
		  }
		  
			const closes = get252Closes(stock.instrument_id, tradeDate);

			// Not enough sessions, or at least one missing close.
			if (closes.length !== 252) {
				continue;
			}

			const ma = calculateMA({
				values: closes,
				period: 252
			});

			if (ma == null) {
				continue;
			}

			batch.push({
				instrument_id: stock.instrument_id,
				trade_date: tradeDate,
				symbol: stock.symbol,
				ma_252: Math.round(ma)
			});
		}

		// Flush periodically rather than keeping the entire range in memory.
		if (batch.length >= 1000) {
			insertBatch(batch.splice(0));
		}

		current.setDate(current.getDate() + 1);
	}

	if (batch.length > 0) {
		insertBatch(batch);
	}
}

// -----------------------------------------------------------------------------
// Execute pipeline
// -----------------------------------------------------------------------------

await processDateRange(fromDate, toDate);
