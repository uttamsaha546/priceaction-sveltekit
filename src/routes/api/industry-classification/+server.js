import { db } from "$lib/server/database";
import { json } from "@sveltejs/kit";

export async function GET() {

    db.exec(`
        CREATE TABLE IF NOT EXISTS industry_classification (
        symbol TEXT PRIMARY KEY NOT NULL,
        name TEXT,
        isin TEXT,
        series TEXT,
        listingDate TEXT,
        macro TEXT,
        sector TEXT,
        industry TEXT,
        basicIndustry TEXT
        ) WITHOUT ROWID;
    `)

    const missingClassification = db.prepare(`
		SELECT su.symbol
		FROM stock_universe su
		LEFT JOIN industry_classification ic
			ON su.symbol = ic.symbol
		WHERE ic.symbol IS NULL
	`).all();

    for (const row of missingClassification) {
        const symbol = row.symbol;

        try {
            // Get series and marketType required for next fetch
            const res = await fetch(
                `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getMetaData&symbol=${encodeURIComponent(symbol)}`
            );

            if (!res.ok) {
                console.log(`Failed for ${symbol}`);
                continue;
            }

            const data = await res.json();
            const marketType = data.marketType;
            const series = data.activeSeries[0];
            const isin = data.isin;
            const name = data.companyName;

            //Get industry classification
            const p = await fetch(
                `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=${marketType}&series=${series}&symbol=${encodeURIComponent(symbol)}`
            );

            if (!p.ok) {
                console.log(`Failed for ${symbol}`);
                continue;
            }

            const response = await p.json();
            const secInfo = response.equityResponse[0].secInfo;
            const macro = secInfo.macro;
            const sector = secInfo.sector;
            const industry = secInfo.industryInfo;
            const basicIndustry = secInfo.basicIndustry;
            const listingDate = secInfo.listingDate;

            // insert into database
            db.prepare(`
				INSERT INTO industry_classification (symbol, name, isin, series, listingDate, macro, sector, industry, basicIndustry)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).run(symbol, name, isin, series, listingDate, macro, sector, industry, basicIndustry);

        } catch (err) {
            console.error(`Error for ${symbol}:`, err);
        }
    }


    const data = db.prepare('SELECT * FROM industry_classification').all();
    return json({ data })
}