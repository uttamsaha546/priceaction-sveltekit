import { json } from "@sveltejs/kit";
import { db } from "$lib/utils/database";

db.exec(`
    CREATE TABLE IF NOT EXISTS flags (
    symbol TEXT PRIMARY KEY NOT NULL,
    color TEXT
    ) WITHOUT ROWID;
`)

export function GET() {
    const rows = db.prepare('SELECT * FROM flags').all();
    const data = Object.fromEntries(rows.map(row => [row.symbol, row.color]));
    return json(data);
}

export async function POST({ request }) {
    const incomingData = await request.json();

    const statement = db.prepare('INSERT OR REPLACE INTO flags (symbol, color) VALUES(:symbol, :color)');

    statement.run({ symbol: incomingData.symbol, color: incomingData.color });

    const rows = db.prepare('SELECT * FROM flags').all();
    const data = Object.fromEntries(rows.map(row => [row.symbol, row.color]));
    return json(data);
}