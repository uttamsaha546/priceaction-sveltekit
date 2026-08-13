import { json } from "@sveltejs/kit";
import { appdb } from "$lib/server/appdb";

const getStockUniverseStmt = appdb.prepare(`SELECT * FROM stock_universe`);

export async function GET() {

    const rows = getStockUniverseStmt.all();

    return json({data:rows})
    
}