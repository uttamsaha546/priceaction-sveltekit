import { json, error as svelteError } from "@sveltejs/kit";
import { db } from "$lib/server/database";

db.exec(`
	CREATE TABLE IF NOT EXISTS groww_stocks (
		isin TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		symbol TEXT,
		search_id TEXT NOT NULL,
		nse_code TEXT,
		bse_code TEXT
	) WITHOUT ROWID;
`);

const insertStmt = db.prepare(`
	INSERT OR REPLACE INTO groww_stocks 
	(isin, name, symbol, search_id, nse_code, bse_code)
	VALUES (?,?,?,?,?,?);
	`);

export async function POST() {
	let allContents = [];
	const PAGE_SIZE = 15; // Increased size to reduce total HTTP requests

	try {
		// Fetch initial page
		const url = `https://groww.in/v1/api/stocks_data/v1/all_stocks`;

		const initialPayload = {
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
					"min": 200000000000,
					"max": 3000000000000000
				}
			},
			"page": "0",
			"size": "15",
			"sortBy": "NA",
			"sortType": "ASC"
		}

		const res = await fetch(url, { method: "POST", body: JSON.stringify(initialPayload), headers: { "content-type": "application/json" } });

		if (!res.ok) {
			throw new Error(`Groww API returned status ${res.status}`);
		}

		const data = await res.json();
		const totalResults = data.totalRecords ?? 0;
		const initialContent = data.records ?? [];

		allContents = [...initialContent];

		// Calculate total remaining pages needed
		const totalPages = Math.ceil(totalResults / PAGE_SIZE);

		if (totalPages > 1) {
			const promises = [];

			for (let page = 1; page < totalPages; page++) {
				const payload = { ...initialPayload, page }

				promises.push(
					fetch(url, { method: "POST", body: JSON.stringify(payload), headers: { "content-type": "application/json" } }).then(async (r) => {
						if (!r.ok) throw new Error(`Failed on page ${page}`);
						return r.json();
					})
				);
			}

			// 2. Properly await all JSON resolution
			const results = await Promise.all(promises);

			for (const pageData of results) {
				if (pageData?.records) {
					allContents.push(...pageData.records);
				}
			}
		}

		db.exec("BEGIN TRANSACTION;");
		try {
			for (const row of allContents) {
				insertStmt.run(
					row.isin,
					row.companyName,
					row.livePriceDto.symbol ?? null,
					row.searchId,
					row.nseScriptCode ?? null,
					row.bseScriptCode ?? null
				);
			}
			db.exec("COMMIT;");
		} catch (dbError) {
			db.exec("ROLLBACK;");
			throw dbError;
		}

		return json({ success: true, count: allContents.length, data: allContents });
	} catch (err) {
		console.error("Groww sync error:", err);
		return svelteError(500, "Failed to fetch sectoral scheme data from Groww.");
	}
}