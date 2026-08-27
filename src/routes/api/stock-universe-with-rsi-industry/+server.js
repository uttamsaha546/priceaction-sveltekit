import { json } from '@sveltejs/kit';
import { appdb } from '$lib/server/appdb';

const universeStmt = appdb.prepare(`SELECT * FROM stock_universe_with_rsi_industry`);
const metaStmt = appdb.prepare(`SELECT * FROM table_meta WHERE table_name=:table_name`);

export function GET() {
	const data = universeStmt.all();
	const meta = metaStmt.get({ table_name: 'tradingview_stock_universe' });
	return json({ data, meta });
}
