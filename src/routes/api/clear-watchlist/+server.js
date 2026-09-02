import { json } from "@sveltejs/kit";
import { userdb } from "$lib/server/userdb";

// Precompiled prepared statements for fast execution and lower CPU and memory overhead
const clearWatchlistStmt = userdb.prepare(`
  UPDATE watchlists SET entries=:entries WHERE name=:name
`);

export async function POST({ request }) {
  const { name } = await request.json();

  const result = clearWatchlistStmt.run({ name, entries: JSON.stringify([]) });

  return json(result);
}