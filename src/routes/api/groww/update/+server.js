import { json } from "@sveltejs/kit";
import { db } from "$lib/server/database";

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
                            "min": 500000000000,
                            "max": 3000000000000000
                        }
                    },
                    "page": "0",
                    "size": "3000",
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
            INSERT OR REPLACE INTO groww (
                symbol, companyName, searchId, isin, bseScriptCode, nseScriptCode
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const upsertMeta = db.prepare(`
            INSERT OR REPLACE INTO meta (tablename, data)
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

            insertstatement.run("BSE", "BSE Ltd", "bse-ltd", "INE118H01025", null, "BSE");
            insertstatement.run("AFCOM", "Afcom Holdings", "afcom-holdings-ltd", "INE0OXY01013", "544224", null);
            insertstatement.run("AMIRCHAND", "Amir Chand Jagdish Kumar (Exports) Ltd", "amir-chand-jagdish-kumar-exports-ltd", "INE05TO01019", "544743", "AMIRCHAND");
            insertstatement.run("ANLON", "Anlon Technology Solution Ltd", "anlon-technology-solution-ltd", "INE0LR101013", null, "ANLON");
            insertstatement.run("HEXAGON", "Hexagon Nutrition", "hexagon-nutrition-ltd", "INE0JUI01012", "544785", "HEXAGON");
            insertstatement.run("HORIZON", "Horizon Reclaim (India) Ltd", "horizon-reclaim-india-ltd", "INE1SEO01013", "544794", null);
            insertstatement.run("POWERICA", "Powerica Ltd", "powerica-ltd", "INE921L01032", "544744", "POWERICA");
            insertstatement.run("KISSHT", "OnEMI Technology Solutions Ltd", "onemi-technology-solutions-ltd", "INE12F801023", "544754", "KISSHT");
            insertstatement.run("FINBUD", "Finbud Financial Services Ltd", "finbud-financial-services-ltd", "INE0EDU01014", null, "FINBUD");
            insertstatement.run("GUJENERGY", "Gujarat Energy Ltd", "gujarat-gas-ltd", "INE844O01030", "539336", "GUJENERGY");

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

