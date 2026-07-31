import { json, error as svelteError } from "@sveltejs/kit";
import { db } from "$lib/server/database";

db.exec(`
	CREATE TABLE IF NOT EXISTS groww_mutual_funds (
		scheme_code INT PRIMARY KEY,
		fund_name TEXT NOT NULL,
		search_id TEXT NOT NULL,
		category TEXT,
		sub_category TEXT,
		sub_sub_category TEXT,
		is_index TEXT
	) WITHOUT ROWID;
`);

const insertStmt = db.prepare(`
	INSERT OR REPLACE INTO groww_mutual_funds 
	(scheme_code, fund_name, search_id, category, sub_category, sub_sub_category, is_index)
	VALUES (?,?,?,?,?,?,?);
	`);

export async function POST() {
	let allContents = [];
	const PAGE_SIZE = 100; // Increased size to reduce total HTTP requests

	try {
		// Fetch initial page
		const initialUrl = `https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?available_for_investment=true&doc_type=scheme&index=false&page=0&plan_type=Direct&scheme_type=Growth&size=${PAGE_SIZE}&sort_by=3`;

		const res = await fetch(initialUrl);

		if (!res.ok) {
			throw new Error(`Groww API returned status ${res.status}`);
		}

		const data = await res.json();
		const totalResults = data.total_results ?? 0;
		const initialContent = data.content ?? [];

		allContents = [...initialContent];

		// Calculate total remaining pages needed
		const totalPages = Math.ceil(totalResults / PAGE_SIZE);

		if (totalPages > 1) {
			const promises = [];

			for (let page = 1; page < totalPages; page++) {
				const url = `https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?available_for_investment=true&doc_type=scheme&index=false&page=${page}&plan_type=Direct&scheme_type=Growth&size=${PAGE_SIZE}&sort_by=3`;

				promises.push(
					fetch(url).then(async (r) => {
						if (!r.ok) throw new Error(`Failed on page ${page}`);
						return r.json();
					})
				);
			}

			// 2. Properly await all JSON resolution
			const results = await Promise.all(promises);

			for (const pageData of results) {
				if (pageData?.content) {
					allContents.push(...pageData.content);
				}
			}
		}

		db.exec("BEGIN TRANSACTION;");
		try {
			for (const row of allContents) {
				insertStmt.run(
					row.scheme_code,
					row.fund_name,
					row.search_id,
					row.category ?? null,
					row.sub_category ?? null,
					row.sub_sub_category[0] ?? null,
					row.is_index ?? null
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