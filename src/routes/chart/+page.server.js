import { appdb } from '$lib/server/appdb';
import { userdb } from '$lib/server/userdb';
import YahooFinance from 'yahoo-finance2';
import ScreenerScraper from '$lib/scraper/ScreenerScraper';
import MoneyControlScraper from '$lib/scraper/MoneyControlScraper';

const yahooFinance = new YahooFinance();
const screenerScraper = new ScreenerScraper();
const mcScraper = new MoneyControlScraper();

const createWatchlistStmt = userdb.prepare(
    `INSERT OR REPLACE INTO watchlists (name, entries) VALUES (?, ?)`
);
const getPortfolioHoldingStmt = userdb.prepare(
    `SELECT holding FROM portfolio WHERE key=?`
);
const getStockUniverseStmt = appdb.prepare(
    `SELECT * FROM stock_universe_with_rsi_industry`
);

export const actions = {
    getPortfolioHolding: async ({ request }) => {
        const data = await request.formData();
        const key = data.get('key');

        const dbRow = getPortfolioHoldingStmt.get(key);
        const portfolioHoldings = dbRow?.holding ? JSON.parse(dbRow.holding) : [];

        const rsiTable = getStockUniverseStmt.all();

        const rsiTableMap = new Map(rsiTable.map(x => [x.symbol, x]));

        const mergedHoldings = portfolioHoldings.map(x => ({ ...x, ...(rsiTableMap.get(x.symbol) || {}) }));

        return {
            success: true,
            holding: mergedHoldings
        };
    },

    getEarningsTrend: async ({ request, fetch }) => {
        const formData = await request.formData();
        const symbol = formData.get('symbol');
        const quote = await yahooFinance.quoteSummary(symbol, { modules: ['earningsTrend'] });
        return {
            ...quote
        };
    },

    getFinancialResults: async ({ request }) => {
        const formData = await request.formData();
        const symbol = formData.get('symbol');
        const [past, estimate] = await Promise.all([screenerScraper.scrape(symbol), mcScraper.scrape(symbol)]);
        return { past, estimate }
    },

    createWatchlist: async ({ request }) => {
        const formData = await request.formData();
        const name = formData.get('name');
        const entries = formData.get('entries');
        createWatchlistStmt.run(name, entries);
        return { name, entries }
    }
};