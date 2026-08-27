import { json } from "@sveltejs/kit";
import { appdb } from "$lib/server/appdb";

const getGrowwStockSearchIdSymbolMapStmt = appdb.prepare(`SELECT * FROM groww_stock_id_symbol_map`);
// const getTableMetaStmt = appdb.prepare(`SELECT * FROM table_meta WHERE table_name = :table_name`);

export async function GET() {

    const data = getGrowwStockSearchIdSymbolMapStmt.all();
    // const meta = getTableMetaStmt.get({table_name: 'tradingview_stock_universe'}) ?? null;

    return json(data.flat())

}