import { json } from "@sveltejs/kit";
import { saveTradingViewScreenerData } from "$lib/server/functions";

export async function GET() {
    const tradingViewScreenerData = await saveTradingViewScreenerData();

    return json({status:'success'})
}