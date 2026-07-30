import growwSchemes from '$lib/files/groww_schemes.json' with {type: 'json'};
import { db } from '$lib/server/database';
import { fail } from '@sveltejs/kit';
import path from 'node:path';
import fs from 'node:fs';

db.exec(`CREATE TABLE IF NOT EXISTS scheme_universe_mappings (
            scheme_code TEXT PRIMARY KEY,
            investment_universe TEXT NOT NULL
        ) WITHOUT ROWID;
`);


export const load = async () => {
    const savedFunds = db.prepare('SELECT scheme_code, investment_universe FROM scheme_universe_mappings').all();
    const savedMap = new Map(savedFunds.map(f => [f.scheme_code, f.investment_universe]));

    const mergedContent = growwSchemes.content.map(fund => {
        return {
            ...fund,
            investment_universe: savedMap.get(fund.scheme_code) || ''
        };
    });
    return { content: mergedContent };
}

export const actions = {
    updateScheme: async ({ request }) => {
        const data = await request.formData();
        const scheme_code = data.get('scheme_code');
        const investment_universe = data.get('investment_universe');

        if (!scheme_code || !investment_universe) {
            return fail(400, { message: 'Missing required fields' });
        }

        try {
            const insertStmt = db.prepare(`
                INSERT INTO scheme_universe_mappings (scheme_code, investment_universe) 
                VALUES (?, ?)
                ON CONFLICT(scheme_code) DO UPDATE SET investment_universe = excluded.investment_universe
            `);

            insertStmt.run(scheme_code, investment_universe);

            return { success: true };
        } catch (error) {
            console.error('Database Error:', error);
            return fail(500, { message: 'Failed to save scheme data.' });
        }
    },

    syncFromGroww: async () => {
        try {
            const response = await fetch('https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?available_for_investment=true&cat=Equity&doc_type=scheme&index=false&page=1&plan_type=Direct&scheme_type=Growth&size=10&sort_by=3&sub_cat=Sectoral&sub_sub_cat=null&tags=null');

            if (!response.ok) {
                return fail(500, { syncError: 'Failed to fetch data from Groww APIs.' });
            }

            const freshData = await response.json();

            freshData.content.forEach(element => {
                const res = await fetch(`https://groww.in/v1/api/data/mf/web/v6/scheme/search/${element.id}`);
                const data = await res.json();
                const holdings = data.holdings;
            });

            return { syncSuccess: true, freshData };
        } catch (error) {
            console.error('File sync operation failed:', error);
            return fail(500, { syncError: 'Internal server error overwriting data.' });
        }
    },

    GetAllMFsFromGroww: async({fetch})=>{
        try{
            const res = await fetch('https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?available_for_investment=true&cat=Equity&doc_type=scheme&index=false&page=1&plan_type=Direct&scheme_type=Growth&size=10&sort_by=3&sub_cat=Sectoral&sub_sub_cat=null&tags=null');
            const data = await res.json();
            return {success:true, data}
        }
        catch(error){
            return {success:false, error}
        }
        
    }
}