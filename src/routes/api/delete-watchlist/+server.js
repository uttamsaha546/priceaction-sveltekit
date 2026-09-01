import { json } from "@sveltejs/kit";
import { userdb } from "$lib/server/userdb";

// Precompiled prepared statements for fast execution and lower CPU and memory overhead
const deleteWatchlistStmt = userdb.prepare(`
  DELETE FROM watchlists WHERE name=:name
`);

export async function POST({ request }) {
  const { name } = await request.json();

  const result = deleteWatchlistStmt.run({ name });

  return json(result);
}