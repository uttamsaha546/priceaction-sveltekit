import { json } from "@sveltejs/kit";

import { USERDB } from '$lib/server/userdb';

export async function GET({ url }) {
    const symbol = url.searchParams.get('symbol');

    const result = USERDB.Drawings.get(symbol);
    console.log(result)

    return json(result);
}