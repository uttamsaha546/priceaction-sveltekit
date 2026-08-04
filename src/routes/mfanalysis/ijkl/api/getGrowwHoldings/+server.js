import { json } from '@sveltejs/kit';

const hotCache = new Map();

export async function POST({ request, fetch }) {
    const { categories } = await request.json();

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
        return json({ error: 'Missing required parameter: categories' }, { status: 400 });
    }

    try {
        const schemes = await Promise.all(
            categories.map(async (category) => {
                const url = `https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?available_for_investment=true&cat=Equity&doc_type=scheme&index=false&page=0&plan_type=Direct&scheme_type=Growth&size=200&sort_by=3&sub_cat=${encodeURIComponent(category)}&sub_sub_cat=null&tags=null`;

                // Note: Use SvelteKit's native fetch parameter passed to POST
                const res = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json'
                    }
                });

                if (!res.ok) {
                    throw new Error(`Failed fetching category ${category}: ${res.statusText}`);
                }

                const data = await res.json();
                return data?.content || [];
            })
        );

        const schemesArr = schemes.flat().slice(0,1);

        const holdingsData = await Promise.all(
            schemesArr.map(async (scheme) => {
                const res = await fetch(`https://groww.in/v1/api/data/mf/web/v6/scheme/search/${scheme.search_id}`);
                const schemeInfo = await res.json();
                return schemeInfo?.holdings || [];
            })
        );

        return json({
            success: true,
            data: {
                schemes: schemesArr,
                holdings: holdingsData
            }
        });

    } catch (error) {
        console.error('Groww fetch error:', error);
        return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}