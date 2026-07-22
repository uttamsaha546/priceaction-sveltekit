import { db } from '$lib/server/database';
import { json } from '@sveltejs/kit';

const selectAllGrowwStmt = db.prepare('SELECT * FROM groww');

export async function GET({ params }) {
    return json(selectAllGrowwStmt.all());
}