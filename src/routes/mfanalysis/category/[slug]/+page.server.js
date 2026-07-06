// src/routes/mfanalysis/category/[slug]/+page.server.js
import growwSchemes from '$lib/files/groww_schemes.json' with { type: 'json' };
import { db } from "$lib/server/database";

export const load = async ({ params }) => {

    const category = params.slug;

    const matchingSchemes = db.prepare('SELECT scheme_code from scheme_universe_mappings WHERE investment_universe=?').all(category);

    const allowedSchemeCodes = new Set(matchingSchemes.map(row => row.scheme_code));

    const filteredFunds = growwSchemes.content.filter(fund => allowedSchemeCodes.has(fund.scheme_code));
    return {
        category,
        funds: filteredFunds
    }
}