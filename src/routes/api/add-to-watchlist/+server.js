import { json } from "@sveltejs/kit";
import { userdb } from "$lib/server/userdb";

// Precompiled prepared statements for fast execution and lower CPU and memory overhead
const getWatchlistStmt = userdb.prepare(`
  SELECT * FROM watchlists WHERE name=:name
`);

const addToWatchlistStmt = userdb.prepare(`
  UPDATE watchlists
	SET entries = :entries
	WHERE name = :name
`);

export async function POST({ request }) {
  const { watchlist, symbol } = await request.json();

  if (!watchlist || !symbol) {
    return json(
      { error: 'Watchlist and symbol are required' },
      { status: 400 }
    );
  }

  const existing = getWatchlistStmt.get({ name: watchlist });

  if (!existing) {
    return json(
      { error: 'Watchlist not found' },
      { status: 404 }
    );
  }

  const entries = JSON.parse(existing.entries || '[]');

  // Already exists
  if (entries.includes(symbol)) {
    return json({
      success: true,
      added: false
    });
  }

  entries.push(symbol);

  const result = addToWatchlistStmt.run({
    name: watchlist,
    entries: JSON.stringify(entries)
  });

  return json(result);
}