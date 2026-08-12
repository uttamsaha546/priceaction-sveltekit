import { db } from "./api/saveFundData/+server";
import { getPortfolioStmt } from "./api/db"; 

export async function load({depends}){
    const rows = getPortfolioStmt .all();

    depends('app:portfolio');

    return {
        data: rows.map((row) => ({
            ...row,
            portfolio: JSON.parse(row.portfolio)
        }))
    };
}