import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/database';
import dayjs from 'dayjs';

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
    ('direct', 'Direct Stocks');
    `)


export const load = async () => {
    try {
        const dbRows = db.prepare('SELECT * FROM portfolio').all();

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

        return {
            nps: rowMap['nps'],
            midcap: rowMap['midcap'],
            smallcap: rowMap['smallcap'],
            direct: rowMap['direct'],
            my_holding: {}
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
            
            db.prepare(`UPDATE portfolio SET unit=? WHERE key=?`).run(unit, key);
            
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
            
            db.prepare(`UPDATE portfolio SET holding=?, holding_date=? WHERE key=?`).run(holding, holding_date, key);
            
            return { success: true };
        } catch (error) {
            console.error('Database save failed:', error);
            return fail(500, { message: 'Failed to write to database storage.' });
        }
    }
};