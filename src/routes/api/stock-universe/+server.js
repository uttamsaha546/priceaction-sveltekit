import { json } from "@sveltejs/kit";
import { db } from "$lib/utils/database";

export function GET() {
    const data = db.prepare(`SELECT su.*, ic.* FROM stock_universe su JOIN industry_classification ic ON su.symbol=ic.symbol ORDER BY 
    COUNT(ic.sector) OVER (PARTITION BY ic.sector) DESC,
    su.marketcap DESC`).all();
    const meta = JSON.parse(db.prepare("SELECT data FROM meta WHERE tablename = 'stock_universe'").get()?.data || '{}');
    return json({ meta: { ...meta, count: data.length }, data });
}

