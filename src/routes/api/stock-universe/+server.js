import { json } from "@sveltejs/kit";
import { db } from "$lib/server/database";

const getStockUniverseWithIndustryStmt = db.prepare(`
	SELECT su.*, ic.* 
	FROM stock_universe su 
	JOIN industry_classification ic ON su.symbol=ic.symbol 
	ORDER BY 
		COUNT(ic.sector) OVER (PARTITION BY ic.sector) DESC,
		su.marketcap DESC
`);

const getMetaForTableStmt = db.prepare("SELECT data FROM meta WHERE tablename = 'stock_universe'");

export function GET() {
    const data = getStockUniverseWithIndustryStmt.all();
    const metaRow = getMetaForTableStmt.get();
	const meta = JSON.parse(metaRow?.data || '{}');
    
    return json({ meta: { ...meta, count: data.length }, data });
}

