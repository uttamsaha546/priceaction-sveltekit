import { json } from "@sveltejs/kit";

import { APPDB } from '$lib/server/appdb';

export async function GET() {
    const result = APPDB.Bhavcopy.GroupByDate();

    return json(result.flat())
}