import { json } from "@sveltejs/kit";

import { APPDB } from '$lib/server/appdb';

export async function GET({ url }) {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let result = [];
    if (!from && !to) {
        result = APPDB.Bhavcopy.all();
    }


    result = APPDB.Bhavcopy.Between({ from, to });

    return json(result.flat())
}