import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/database';
import dayjs from 'dayjs';
import { cache } from '../proxy/cache';

db.exec(`CREATE TABLE IF NOT EXISTS portfolio (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit REAL DEFAULT 1,
    unit_date TEXT,
    holding TEXT,
    holding_date TEXT
    ) WITHOUT ROWID;
`)

db.exec(`
    INSERT OR IGNORE INTO portfolio (key, name) VALUES
    ('nps', 'ICICI Scheme-E'),
    ('midcap', 'Edelweiss Mid Cap'),
    ('smallcap', 'Bandhan Small Cap'),
    ('direct', 'Direct Stocks'),
    ('amfi', 'Marketcap Map'),
    ('my_holding', 'My Holding');
    `)

// Pre-compile SQL statements once at the module level for blazing-fast DB queries
const getPortfolioStmt = db.prepare('SELECT * FROM portfolio');
const updateUnitStmt = db.prepare('UPDATE portfolio SET unit=? WHERE key=?');
const updateHoldingStmt = db.prepare('UPDATE portfolio SET holding=?, holding_date=? WHERE key=?');    

export const load = async ({ fetch }) => {
    try {
        const dbRows = getPortfolioStmt.all();

        // Convert the flat array into a key-value object map: { nps: {...}, midcap: {...} } and parse holding
        const rowMap = dbRows.reduce((acc, row) => {
            let parsedHolding = [];

            if (row.holding) {
                try {
                    parsedHolding = JSON.parse(row.holding);
                } catch (e) {
                    console.error(`Failed to parse holding JSON string for key: ${row.key}`, e);
                    parsedHolding = [];
                }
            }

            acc[row.key] = {
                ...row,
                holding: parsedHolding
            };

            return acc;
        }, {});

        // Optimize external API requests by caching them inside our pre-compiled SQLite-backed cache
		// and using promise collapsing to prevent API rate limits / socket exhaustion under concurrent loads.
        const requests = rowMap['direct'].holding.map(x => {
            const cacheKey = `groww:stock_price:${x.symbol}`;
            return cache.fetch(cacheKey, async ()=>{
                const res = await fetch(`https://groww.in/v1/api/charting_service/v2/chart/delayed/exchange/NSE/segment/CASH/${x.symbol}/daily?intervalInMinutes=1&minimal=true`);
                if (!res.ok) {
					throw new Error(`Upstream returned ${res.status} for ${x.symbol}`);
				}
                const data = await res.json();
                    if (data && data.candles && data.candles.length > 0) {
                        return data.candles.at(-1)[1];
                    }
                    return null;
                }, 300) // Cache stock price for 5 minutes (300 seconds)
                .then((nav)=>({symbol: x.symbol, nav}))
                .catch(() => ({ symbol: x.symbol, nav: null }));
        });

        const dynamicPrices = await Promise.all(requests);

        // console.log(dynamicPrices)

        const priceMap = Object.fromEntries(dynamicPrices.map(p => [p.symbol, p.nav]));

        rowMap['direct'].holding = rowMap['direct'].holding.map(item => ({
            ...item,
            nav: priceMap[item.symbol] ?? null,
            marketValue: priceMap[item.symbol] ? (priceMap[item.symbol] * (item.unit || 0)) : null
        }));


        return {
            nps: rowMap['nps'],
            midcap: rowMap['midcap'],
            smallcap: rowMap['smallcap'],
            direct: rowMap['direct'],
            amfi: rowMap['amfi'],
            my_holding: rowMap['my_holding']
        };

    } catch (err) {
        console.error('Failed to load portfolio data:', err);
        throw error(502, 'Bad Gateway: DB query processing failed');
    }
};


export const actions = {
    saveUnit: async ({ request }) => {
        const data = await request.formData();
        const key = data.get('key');
        const unit = parseFloat(data.get('unit'));

        if (!key) {
            return fail(400, { message: 'Missing target row key' });
        }

        try {
            updateUnitStmt.run(unit, key);
            return { success: true };
        } catch (error) {
            console.error('Database save failed:', error);
            return fail(500, { message: 'Failed to write to database storage.' });
        }
    },

    saveHolding: async ({ request }) => {
        const data = await request.formData();
        const key = data.get('key');
        const holding = (data.get('holding'));
        const holding_date = (data.get('holding_date'));

        if (!key) {
            return fail(400, { message: 'Missing target row key' });
        }

        try {

            updateHoldingStmt.run(holding, holding_date, key);

            return { success: true };
        } catch (error) {
            console.error('Database save failed:', error);
            return fail(500, { message: 'Failed to write to database storage.' });
        }
    }
};