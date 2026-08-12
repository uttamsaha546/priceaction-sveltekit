import { DatabaseSync } from "node:sqlite";
export const db = new DatabaseSync('databases/mf-portfolio.db');

db.exec(`CREATE TABLE IF NOT EXISTS mf_portfolio (
        groww_id TEXT PRIMARY KEY,
        month TEXT NOT NULL,
        portfolio TEXT NOT NULL
    ) WITHOUT ROWID`
);

export const upsertStmt = db.prepare(`INSERT OR REPLACE INTO mf_portfolio (groww_id, month, portfolio) VALUES (?,?,?)`);
export const getPortfolioStmt  = db.prepare('SELECT * FROM mf_portfolio');