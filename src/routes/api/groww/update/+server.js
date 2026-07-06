import { json } from "@sveltejs/kit";
import { db } from "$lib/server/database";
// import { GET as fetchMissingIndustryClassification } from "../../industry-classification/+server";
// import { GET as getStockUniverse } from "../+server";

db.exec(`DROP TABLE IF EXISTS groww;`);

db.exec(`
    CREATE TABLE IF NOT EXISTS groww (
        symbol TEXT PRIMARY KEY,
        companyName TEXT,
        searchId TEXT,
        isin TEXT,
        bseScriptCode INTEGER,
        nseScriptCode TEXT
    ) WITHOUT ROWID;
`);

export async function POST() {
    try {
        const response = await fetch('https://groww.in/v1/api/stocks_data/v1/all_stocks', {
            method: "POST",
            body: JSON.stringify(
                {
                    "listFilters": {
                        "INDUSTRY": [],
                        "INDEX": []
                    },
                    "objFilters": {
                        "CLOSE_PRICE": {
                            "max": 500000,
                            "min": 0
                        },
                        "MARKET_CAP": {
                            "min": 1000000000000,
                            "max": 3000000000000000
                        }
                    },
                    "page": "0",
                    "size": "2000",
                    "sortBy": "MARKET_CAP",
                    "sortType": "DESC"
                }
            ),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Groww API responded with status: ${response.status}. Message: ${await response.text()}`);
        }

        const data = await response.json();
        const stocks = data.records;

        const insertstatement = db.prepare(`
            INSERT INTO groww (
                symbol, companyName, searchId, isin, bseScriptCode, nseScriptCode
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const upsertMeta = db.prepare(`
            INSERT INTO meta (tablename, data)
            VALUES (:tablename, :data)
            ON CONFLICT(tablename) DO UPDATE SET
                data = excluded.data
        `);

        // Run batch updates within a single ACID transaction for maximum SQLite speed
        db.exec("BEGIN TRANSACTION;");

        try {
            db.exec('DELETE FROM groww');

            for (const row of stocks) {
                const symbol = row.livePriceDto.symbol;
                const companyName = row.companyName;
                const searchId = row.searchId;
                const isin = row.isin;
                const bseScriptCode = row.bseScriptCode;
                const nseScriptCode = row.nseScriptCode;

                insertstatement.run(symbol, companyName, searchId, isin, bseScriptCode, nseScriptCode);
            }

            upsertMeta.run({
                tablename: "groww",
                data: JSON.stringify({ updatedAt: Date.now() })
            });

            db.exec("COMMIT;");

        } catch (dbError) {
            db.exec("ROLLBACK;");
            throw dbError;
        }

        return json(db.prepare('SELECT * FROM groww').all());
    }
    catch (error) {
        console.error("Pipeline Sync Error:", error);
        return json({ success: false, error: error.message }, { status: 500 });

    }
}

