import { json, error as svelteError } from "@sveltejs/kit";

export async function POST() {
	let allContents = [];
	const PAGE_SIZE = 100; // Increased size to reduce total HTTP requests

	try {
		// Fetch initial page
		const initialUrl = `https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?available_for_investment=true&cat=Equity&doc_type=scheme&index=false&page=0&plan_type=Direct&scheme_type=Growth&size=${PAGE_SIZE}&sort_by=3&sub_cat=Sectoral&sub_sub_cat=null&tags=null`;

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
				const url = `https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?available_for_investment=true&cat=Equity&doc_type=scheme&index=false&page=${page}&plan_type=Direct&scheme_type=Growth&size=${PAGE_SIZE}&sort_by=3&sub_cat=Sectoral&sub_sub_cat=null&tags=null`;

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

		return json({ success: true, count: allContents.length, data: allContents });
	} catch (err) {
		console.error("Groww sync error:", err);
		return svelteError(500, "Failed to fetch sectoral scheme data from Groww.");
	}
}