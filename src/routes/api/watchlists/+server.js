import { json } from "@sveltejs/kit";
import { userdb } from "$lib/server/userdb";
import { appdb } from "$lib/server/appdb";

// Precompiled prepared statements for fast execution and lower CPU and memory overhead
const insertDefaultWatchlistStmt = userdb.prepare('INSERT OR REPLACE INTO watchlists (name, entries) VALUES (:name, :entries)');
const selectAllWatchlistsStmt = userdb.prepare('SELECT * FROM watchlists');
const selectStockUniverseSlimStmt = appdb.prepare('SELECT * FROM stock_universe_with_rsi_industry');

export function GET() {

  // 2. Fetch data from DB using precompiled statements
  let watchlists = selectAllWatchlistsStmt.all();
  if (watchlists.length === 0) {
    insertDefaultWatchlistStmt.run({ name: 'Default Watchlist', entries: JSON.stringify(['VBL', 'BLUESTARCO', 'WABAG', 'JASH']) });
    watchlists = selectAllWatchlistsStmt.all();
  }
  const stockUniverse = selectStockUniverseSlimStmt.all();

  const symbolMap = new Map(stockUniverse.map(x => ([x.symbol, x])));

  // 3. Map through and parse the 'entries' string back into a JS array/object
  const data = watchlists.map(watchlist => ({
    name: watchlist.name,
    entries: watchlist.entries
      ? JSON.parse(watchlist.entries)
        .map(symbol => {
          if (symbolMap.has(symbol)) {
            return symbolMap.get(symbol)
          }
          return { symbol, name: null, marketcap: null, }
        }) : []
  }));

  // 4. Return the clean, nested JSON structure
  return json({ data });
}