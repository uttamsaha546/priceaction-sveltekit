import { json, error as svelteError } from "@sveltejs/kit";
import { Readable } from "node:stream";
import { db } from "$lib/server/database";
import csvParser from "csv-parser";

// db.exec('DROP TABLE IF EXISTS nse_industry_classifications')

db.exec(`
    CREATE TABLE IF NOT EXISTS nse_industry_classifications (
        isin TEXT PRIMARY KEY,
        name TEXT,
        symbol TEXT,
        macro TEXT,
        sector TEXT,
        industry TEXT,
        basic_industry TEXT
    ) WITHOUT ROWID;
`);

const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO nse_industry_classifications 
    (isin, name, symbol, macro, sector, industry, basic_industry)
    VALUES (?, ?, ?, ?, ?, ?, ?);
`);

function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

export async function POST() {
    //Securities available for Equity segment in NSE
    try {
        const nseStocksUrl = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
        const response = await fetch(nseStocksUrl);

        if (!response.ok) {
            throw new Error(`NSE Server returned status: ${response.status}`);
        }

        if (!response.body) {
            throw new Error("Response body is empty.");
        }
        // Convert Web ReadableStream to Node.js ReadableStream
        const csvItems = [];
        const nodeStream = Readable.fromWeb(response.body);

        // Wrap streaming in a Promise so SvelteKit awaits completion
        await new Promise((resolve, reject) => {
            nodeStream
                .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }))
                .on("data", (row) => {
                    if (row["SYMBOL"] && row["ISIN NUMBER"]) {
                        csvItems.push({
                            symbol: row["SYMBOL"],
                            series: row["SERIES"] || "EQ",
                            isin: row["ISIN NUMBER"],
                            name: row["NAME OF COMPANY"] || ""
                        });
                    }
                })
                .on("end", resolve)
                .on("error", reject);
        });


        const BATCH_SIZE = 100;
        const chunks = chunkArray(csvItems.slice(0, 1), BATCH_SIZE);
        const results = [];

        for (const chunk of chunks) {
            const batchPromises = chunk.map(async (item) => {
                try {
                    const quoteUrl = `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=N&series=${item.series}&symbol=${encodeURIComponent(item.symbol)}`;
                    const res = await fetch(quoteUrl);

                    if (!res.ok) return null;
                    const data = await res.json();
                    return data;

                    // Extracts industry classification object structure from NSE Quote API
                    const { metaData, secInfo } = data?.equityResponse || {};

                    return {
                        isin: metaData.isinCode,
                        name: metaData.companyName,
                        symbol: metaData.symbol,
                        macro: secInfo.macro || null,
                        sector: secInfo.sector || null,
                        industry: secInfo.industry || null,
                        basic_industry: secInfo.basicIndustry || null
                    };
                } catch {
                    return null; // Gracefully handle individual failures
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter(Boolean));

            // Short delay between batches to avoid IP blocks
            await new Promise((res) => setTimeout(res, 0));
        }

        db.exec("BEGIN TRANSACTION;");
        try {
            for (const row of results) {
                if (!row) continue;
                insertStmt.run(
                    row.isin,
                    row.name,
                    row.symbol,
                    row.macro,
                    row.sector,
                    row.industry,
                    row.basic_industry
                );
            }
            db.exec("COMMIT;");
        } catch (dbErr) {
            db.exec("ROLLBACK;");
            throw dbErr;
        }

        return json({ success: true, count: results.length, results });

    } catch (error) {
        console.error("Fetch operation failed:", error.message);
        return svelteError(500, error.message || "Failed to process industry classifications.");
    }
}