import { json } from "@sveltejs/kit";
import { userdb } from "$lib/server/userdb";

// Precompiled prepared statements for fast execution and lower CPU and memory overhead
const renameWatchlistStmt = userdb.prepare(`
  UPDATE watchlists
	SET name = :newName
	WHERE name = :oldName
`);

export async function POST({ request }) {
  const { newName, oldName } = await request.json();

  const result = renameWatchlistStmt.run({ newName: newName.trim(), oldName: oldName.trim() });

  return json(result);
}