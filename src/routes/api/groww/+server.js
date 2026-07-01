import { db } from '$lib/utils/database';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
    return json(db.prepare('SELECT * FROM groww').all());
}