import { db } from '$lib/server/database';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
    const { tableName } = params;

    // 1. Fetch the list of valid, non-system tables
    const validTables = db
        .prepare(`SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
        .all()
        .map(t => t.name);

    // 2. Strict Whitelist Check: If the requested table isn't valid, throw a 404
    if (!validTables.includes(tableName)) {
        throw error(404, { message: `Table "${tableName}" not found or access denied.` });
    }

    // 3. Safe to query now that the input is verified against the whitelist
    const tableData = db.prepare(`SELECT * FROM "${tableName}"`).all();

    return {
        tableName,
        tableData
    };
}