import { db } from './database.ts';

const LIQUIDITY_THRESHOLD = 50_00_000; // ₹50 lakhs

// -----------------------------------------------------------------------------
// Create liquidity table
// -----------------------------------------------------------------------------

db.exec(`
    -- 1. Instantly wipe out all data (triggers the Truncate Optimization)
    DELETE FROM stock_liquidity;

    -- 2. Reset the auto-increment primary key counter back to 0
    -- UPDATE SQLITE_SEQUENCE SET seq = 0 WHERE name = 'stock_liquidity';

    -- 3. Optional: Reclaim unused disk space and shrink the database file
    VACUUM;

    CREATE TABLE IF NOT EXISTS stock_liquidity (
        instrument_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,

        adv20 INTEGER NOT NULL,
        adv60 INTEGER NOT NULL,
        adv120 INTEGER NOT NULL,

        median_value60 INTEGER NOT NULL,
        liquid_days60 INTEGER NOT NULL,

        trade_date TEXT NOT NULL,

        PRIMARY KEY (instrument_id, trade_date)
    ) WITHOUT ROWID;
`);

// -----------------------------------------------------------------------------
// Get all market trading sessions
//
// Every date appearing in stock_prices_daily is considered a market session.
// -----------------------------------------------------------------------------

// const getTradeDatesStmt = db.prepare(`
//     SELECT trade_date
//     FROM stock_prices_daily
//     GROUP BY trade_date
//     ORDER BY trade_date
// `);

// -----------------------------------------------------------------------------
// Calculate liquidity for one market session
//
// Important:
//
// 1. 20 / 60 / 120 = MARKET SESSIONS.
//
// 2. If a stock did not trade on a market session,
//    traded_value is treated as ZERO.
//
// 3. Only instruments that actually appear on the current trade_date
//    are processed. This prevents stocks that stopped trading because of
//    merger/delisting/etc. from generating new liquidity records.
//
// 4. liquid_days60 = number of the last 60 market sessions where
//    traded_value >= ₹50 lakh.
//
// 5. median_value60 includes zero-trading sessions.
// -----------------------------------------------------------------------------

const calculateLiquidityStmt = db.prepare(`
    WITH market_sessions AS (

        --
        -- Get the last 120 MARKET sessions and number them:
         --
         -- session_number = 1  -> current session
         -- session_number = 2  -> previous session
         -- ...
         -- session_number = 120 -> 120th previous session
         --

        SELECT
            trade_date,

            ROW_NUMBER() OVER (
                ORDER BY trade_date DESC
            ) AS session_number

        FROM (
            SELECT
                trade_date

            FROM stock_prices_daily

            WHERE trade_date <= :trade_date

            GROUP BY trade_date

            ORDER BY trade_date DESC

            LIMIT 120
        )
    ),


    -- -------------------------------------------------------------------------
    -- Instruments that are active on the calculation date
    -- -------------------------------------------------------------------------

    active_instruments AS (

        SELECT
            instrument_id,
            symbol

        FROM stock_prices_daily

        WHERE trade_date = :trade_date
    ),


    -- -------------------------------------------------------------------------
    -- Create:
    --
    -- instrument × market session
    --
    -- This is important because a stock may not have traded on every
    -- market session.
    -- -------------------------------------------------------------------------

    instrument_sessions AS (

        SELECT
            a.instrument_id,
            a.symbol,
            m.trade_date,
            m.session_number

        FROM active_instruments a

        CROSS JOIN market_sessions m
    ),


    -- -------------------------------------------------------------------------
    -- Get traded value for every instrument/session.
    --
    -- If there is no stock_prices_daily row for that session:
    --
    --     traded_value = 0
    --
    -- This means a stock that did not trade is treated as illiquid.
    -- -------------------------------------------------------------------------

    daily_values AS (

        SELECT
            i.instrument_id,
            i.symbol,
            i.trade_date,
            i.session_number,

            COALESCE(
                d.traded_value,
                0
            ) AS traded_value

        FROM instrument_sessions i

        LEFT JOIN stock_prices_daily d

            ON d.instrument_id = i.instrument_id
            AND d.trade_date = i.trade_date
    ),


    -- -------------------------------------------------------------------------
    -- ADV calculations
    --
    -- Because session_number is based on MARKET sessions:
    --
    -- session_number <= 20  -> last 20 market sessions
    -- session_number <= 60  -> last 60 market sessions
    -- session_number <= 120 -> last 120 market sessions
    --
    -- Missing stock trades are already zero.
    -- -------------------------------------------------------------------------

    stats AS (

        SELECT
            instrument_id,

            MAX(symbol) AS symbol,


            -- Average traded value over last 20 MARKET sessions

            AVG(
                CASE
                    WHEN session_number <= 20
                    THEN traded_value
                END
            ) AS adv20,


            -- Average traded value over last 60 MARKET sessions

            AVG(
                CASE
                    WHEN session_number <= 60
                    THEN traded_value
                END
            ) AS adv60,


            -- Average traded value over last 120 MARKET sessions

            AVG(traded_value) AS adv120


        FROM daily_values

        GROUP BY instrument_id

        -- We only want a complete 120-session history.

        HAVING COUNT(*) = 120
    ),


    -- -------------------------------------------------------------------------
    -- Last 60 MARKET sessions
    -- -------------------------------------------------------------------------

    values60 AS (

        SELECT
            instrument_id,
            traded_value

        FROM daily_values

        WHERE session_number <= 60
    ),


    -- -------------------------------------------------------------------------
    -- Count liquid days
    --
    -- NO ADV60 CONDITION.
    --
    -- A liquid day is simply:
    --
    --     traded_value >= ₹50 lakh
    --
    -- Non-trading days have traded_value = 0 and therefore don't count.
    -- -------------------------------------------------------------------------

    liquid_days AS (

        SELECT
            instrument_id,

            SUM(
                CASE
                    WHEN traded_value >= :threshold
                    THEN 1
                    ELSE 0
                END
            ) AS liquid_days60

        FROM values60

        GROUP BY instrument_id
    ),


    -- -------------------------------------------------------------------------
    -- Rank the last 60 traded values for median calculation
    --
    -- Zero-trading sessions are included.
    -- -------------------------------------------------------------------------

    median_ranked AS (

        SELECT
            instrument_id,
            traded_value,

            ROW_NUMBER() OVER (
                PARTITION BY instrument_id
                ORDER BY traded_value
            ) AS value_rank,

            COUNT(*) OVER (
                PARTITION BY instrument_id
            ) AS value_count

        FROM values60
    ),


    -- -------------------------------------------------------------------------
    -- Calculate median
    --
    -- For 60 values, this selects:
    --
    --     rank 30
    --     rank 31
    --
    -- and averages them.
    -- -------------------------------------------------------------------------

    medians AS (

        SELECT
            instrument_id,

            AVG(traded_value) AS median_value60

        FROM median_ranked

        WHERE value_rank IN (
            (value_count + 1) / 2,
            (value_count + 2) / 2
        )

        GROUP BY instrument_id
    )


    -- -------------------------------------------------------------------------
    -- Final result
    -- -------------------------------------------------------------------------

    SELECT
        s.instrument_id,
        s.symbol,

        s.adv20,
        s.adv60,
        s.adv120,

        m.median_value60,

        COALESCE(
            l.liquid_days60,
            0
        ) AS liquid_days60

    FROM stats s

    JOIN medians m
        ON m.instrument_id = s.instrument_id

    LEFT JOIN liquid_days l
        ON l.instrument_id = s.instrument_id

    WHERE s.adv120 IS NOT NULL
`);

// -----------------------------------------------------------------------------
// Insert / update liquidity
// -----------------------------------------------------------------------------

const insertLiquidityStmt = db.prepare(`
    INSERT INTO stock_liquidity (
        instrument_id,
        symbol,
        adv20,
        adv60,
        adv120,
        median_value60,
        liquid_days60,
        trade_date
    )

    VALUES (
        :instrument_id,
        :symbol,
        :adv20,
        :adv60,
        :adv120,
        :median_value60,
        :liquid_days60,
        :trade_date
    )

    ON CONFLICT (instrument_id, trade_date)

    DO UPDATE SET

        symbol = excluded.symbol,

        adv20 = excluded.adv20,

        adv60 = excluded.adv60,

        adv120 = excluded.adv120,

        median_value60 = excluded.median_value60,

        liquid_days60 = excluded.liquid_days60
`);

// -----------------------------------------------------------------------------
// Process one market session
// -----------------------------------------------------------------------------

function processDate(tradeDate) {
	const rows = calculateLiquidityStmt.all({
		trade_date: tradeDate,
		threshold: LIQUIDITY_THRESHOLD
	});

	if (rows.length === 0) {
		console.log(`⚠️ No liquidity data for ${tradeDate}`);

		return;
	}

	db.exec('BEGIN');

	try {
		for (const row of rows) {
			insertLiquidityStmt.run({
				instrument_id: row.instrument_id,

				symbol: row.symbol,

				adv20: Math.round(row.adv20),

				adv60: Math.round(row.adv60),

				adv120: Math.round(row.adv120),

				median_value60: Math.round(row.median_value60),

				liquid_days60: row.liquid_days60,

				trade_date: tradeDate
			});
		}

		db.exec('COMMIT');

		console.log(`💧 ${tradeDate}: ${rows.length} liquidity records`);
	} catch (error) {
		db.exec('ROLLBACK');

		throw error;
	}
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
import { parseArgs } from 'node:util';
// 1. Get today's date in YYYY-MM-DD format (accounting for local timezone)
const today = new Date().toLocaleDateString('en-CA'); // 'en-CA' outputs exactly YYYY-MM-DD

const config = {
	options: {
		from: { type: 'string', short: 'f' },
		to: { type: 'string', short: 't' }
	},
	allowPositionals: true
};

const { values, positionals } = parseArgs(config);

// 2. Determine 'from' date based on priority: Flag -> Positional -> Fallback (Today)
let fromDate = values.from || positionals[0] || today;

// 3. Determine 'to' date based on priority: Flag -> Fallback (same as fromDate)
let toDate = values.to || fromDate;

console.log('--- Configured Dates ---');
console.log('From Date:', fromDate);
console.log('To Date  :', toDate);

let current = parseLocalDate(fromDate);
const end = parseLocalDate(toDate);

// --- UTILITY FUNCTIONS ---
function parseLocalDate(dateStr) {
	if (typeof dateStr === 'object') {
		return new Date(dateStr);
	}
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(year, month - 1, day);
}

while (current <= end) {
	const dayOfWeek = current.getDay();

	// 1. Skip Weekends
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		current.setDate(current.getDate() + 1);
		continue;
	}

	const tradeDate = current.toLocaleDateString('en-CA');

	processDate(tradeDate);

    current.setDate(current.getDate() + 1);
}

console.log('✅ Liquidity calculation complete');
