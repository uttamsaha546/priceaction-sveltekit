import { json } from "@sveltejs/kit";
import { upsertStmt } from "../db";

export async function POST({request}) {
    const {groww_id, month, portfolio} = await request.json();

    upsertStmt.run(groww_id, month, JSON.stringify(portfolio));
	return json({success: true});	
}