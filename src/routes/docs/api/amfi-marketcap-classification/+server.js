import { json } from '@sveltejs/kit';
import { appdb as db } from '$lib/server/appdb';

const getStmt_AmfiMarketcapClassification = db.prepare(`
    SELECT isin, symbol, name, marketcap, category
    FROM amfi_marketcap_classifications
    ORDER BY marketcap DESC
`);

export function GET() {
    const rows = getStmt_AmfiMarketcapClassification.all();

    return json(rows);
}