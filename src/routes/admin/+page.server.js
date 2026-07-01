import { db } from '$lib/utils/database';

export async function load({ params }) {
    const tables = db.prepare(`SELECT name FROM sqlite_schema WHERE type = 'table'`).all();

    const tablesWithCounts = tables.map(table => {
        const result = db.prepare(`SELECT COUNT(*) AS count FROM "${table.name}"`).get();

        return {
            name: table.name,
            rowCount: result.count
        };
    });

    return { tables: tablesWithCounts };
}