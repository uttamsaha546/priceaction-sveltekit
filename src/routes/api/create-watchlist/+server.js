import { json } from "@sveltejs/kit";
import { userdb } from "$lib/server/userdb";

// Precompiled prepared statements for fast execution and lower CPU and memory overhead
const createWatchlistStmt = userdb.prepare(`
  INSERT OR REPLACE INTO watchlists (name) VALUES (:name)
`);

export async function POST({ request }) {
  const { name } = await request.json();

  const result = createWatchlistStmt.run({ name });

  return json(result);
}