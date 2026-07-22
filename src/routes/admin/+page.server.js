import { db } from '$lib/server/database';

const selectTablesStmt = db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'");

export async function load({ params }) {
    const tables = selectTablesStmt.all();

    const tablesWithCounts = tables.map(table => {
        const result = db.prepare(`SELECT COUNT(*) AS count FROM "${table.name}"`).get();

        return {
            name: table.name,
            rowCount: result.count
        };
    });

    return { tables: tablesWithCounts };
}