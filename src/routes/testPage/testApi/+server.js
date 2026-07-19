import { json } from "@sveltejs/kit";
import ScreenerScraper from '$lib/scraper/ScreenerScraper';
import MoneyControlScraper from "$lib/scraper/MoneyControlScraper";

const scraper = new ScreenerScraper();

export async function GET() {
    const a = await scraper.scrape('HDFCBANK');

    // const returnVal = typeof a === 'string' ? a : Array.isArray(a) ? a : { ...a };
    return json(a)
}