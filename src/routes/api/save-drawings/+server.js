import { json } from "@sveltejs/kit";

import { USERDB } from '$lib/server/userdb';

export async function POST({ request }) {
    const { symbol, drawings } = await request.json();

    const result = USERDB.Drawings.save(symbol, drawings);
    console.log(result)

    return json({ result });
}