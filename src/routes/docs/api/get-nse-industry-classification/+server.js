import { json } from "@sveltejs/kit";
import { appdb } from "$lib/server/appdb";

const getNseIndustryClassificationStmt = appdb.prepare(`SELECT * FROM nse_industry_classification`);
// const getTableMetaStmt = appdb.prepare(`SELECT * FROM table_meta WHERE table_name = :table_name`);

export async function GET() {

    const data = getNseIndustryClassificationStmt.all();
    // const meta = getTableMetaStmt.get({table_name: 'tradingview_stock_universe'}) ?? null;

    return json(data.flat())

}