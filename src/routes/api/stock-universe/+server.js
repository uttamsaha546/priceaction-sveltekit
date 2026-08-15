import { json } from "@sveltejs/kit";
import { db } from "$lib/server/database";
import {appdb} from '$lib/server/appdb';

const getStockUniverseWithIndustryStmt = db.prepare(`
	SELECT su.*, ic.* 
	FROM stock_universe su 
	JOIN industry_classification ic ON su.symbol=ic.symbol 
	ORDER BY 
		COUNT(ic.sector) OVER (PARTITION BY ic.sector) DESC,
		su.marketcap DESC
`);


const stockUniverse = appdb.prepare('SELECT s.*, t.rsi_14M AS rsi14_monthly FROM stock_universe s JOIN tradingview_screener_rsi t ON s.symbol=t.symbol');

const getMetaForTableStmt = db.prepare("SELECT data FROM meta WHERE tablename = 'stock_universe'");

export function GET() {
    //const data = getStockUniverseWithIndustryStmt.all();
    const data = stockUniverse.all();
    const metaRow = getMetaForTableStmt.get();
	const meta = JSON.parse(metaRow?.data || '{}');
    
    return json({ meta: { ...meta, count: data.length }, data });
}

