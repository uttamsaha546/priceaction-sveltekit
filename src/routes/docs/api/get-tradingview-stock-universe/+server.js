import { json } from "@sveltejs/kit";
import { appdb } from "$lib/server/appdb";

const getTradingViewStockUniverseStmt = appdb.prepare(`SELECT * FROM tradingview_stock_universe`);
const getTableMetaStmt = appdb.prepare(`SELECT * FROM table_meta WHERE table_name = :table_name`);

export async function GET() {

    const data = getTradingViewStockUniverseStmt.all();
    const meta = getTableMetaStmt.get({table_name: 'tradingview_stock_universe'}) ?? null;

    return json({data, meta})
    
}