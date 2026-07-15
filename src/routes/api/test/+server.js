import { json } from "@sveltejs/kit";
import createNseScraper from "./NseScraper";

export async function GET() {

    const nseScraper = createNseScraper();

    const a = await nseScraper.Test();
    return json(a);
}