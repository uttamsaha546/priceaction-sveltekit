import { json } from "@sveltejs/kit";
import { userdb } from "$lib/server/userdb";

const selectAllFlagsStmt = userdb.prepare('SELECT * FROM flags');
const upsertFlagStmt = userdb.prepare('INSERT OR REPLACE INTO flags (symbol, color) VALUES (:symbol, :color)');

export function GET() {
    const rows = selectAllFlagsStmt.all();
    const data = Object.fromEntries(rows.map(row => [row.symbol, row.color]));
    return json(data);
}

export async function POST({ request }) {
    const incomingData = await request.json();
    upsertFlagStmt.run({ symbol: incomingData.symbol, color: incomingData.color });

    const rows = selectAllFlagsStmt.all();
    const data = Object.fromEntries(rows.map(row => [row.symbol, row.color]));
    return json(data);
}