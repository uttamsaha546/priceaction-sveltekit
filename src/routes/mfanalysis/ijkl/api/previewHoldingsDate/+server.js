import {json} from '@sveltejs/kit';
export async function GET() {

    const res = await fetch('https://groww.in/v1/api/data/mf/web/v6/scheme/search/edelweiss-mid-and-small-cap-fund-direct-growth');
    const data = await res.json();

    const holdings = data?.holdings || [];
    const portfolio_date = holdings.length > 0 ? holdings[0].portfolio_date : null;

    return json({
        success: true,
        portfolio_date: portfolio_date
    });
}