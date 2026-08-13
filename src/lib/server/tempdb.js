import { DatabaseSync } from "node:sqlite";

export const tempdb = new DatabaseSync('databases/temp.db');

tempdb.exec(`CREATE TABLE IF NOT EXISTS url_response_cache (
    url TEXT PRIMARY KEY,
    response BLOB NOT NULL,
    response_type TEXT NOT NULL CHECK (response_type IN ('json', 'html')),
    expire_at INTEGER NOT NULL
    ) WITHOUT ROWID`
);