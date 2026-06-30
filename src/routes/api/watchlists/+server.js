import { json } from "@sveltejs/kit";
import { db } from "$lib/utils/database";

export function GET() {
    // 1. Fetch the raw rows from the database
    const rows = db.prepare(`SELECT * FROM watchlists`).all();

    // 2. Map through and parse the 'entries' string back into a JS array/object
    const data = rows.map(row => ({
        ...row,
        entries: row.entries ? JSON.parse(row.entries) : []
    }));

    // 3. Return the clean, nested JSON structure
    return json({ data });
}