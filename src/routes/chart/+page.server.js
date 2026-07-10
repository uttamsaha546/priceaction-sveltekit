import { db } from '$lib/server/database';

export const actions = {
    getPortfolioHolding: async ({ request }) => {
        const data = await request.formData();
        const key = data.get('key');

       const dbRow = db.prepare(`SELECT holding FROM portfolio WHERE key=?`).get(key);
       const portfolioHoldings = dbRow?.holding ? JSON.parse(dbRow.holding) : [];

       const rsiTable = db.prepare(`SELECT * FROM stock_universe`).all();

       const rsiTableMap = new Map(rsiTable.map(x => [x.symbol, x]));

       const mergedHoldings = portfolioHoldings.map(x => ({...x, ...(rsiTableMap.get(x.symbol) || {})}));

        return {
            success: true,
            holding: mergedHoldings
        };
    }
};