import { json } from "@sveltejs/kit";
import { db } from "$lib/server/database";

export function GET() {
    // 1. Fetch the raw rows from the database
    db.exec(`UPDATE watchlists SET entries='VBL' WHERE name='Default Watchlist'`);
    const rows = db.prepare(`SELECT * FROM watchlists`).all();
    
    const stockUniverse = db.prepare('SELECT symbol, name, marketcap FROM stock_universe').all();
    
    const symbolMap = new Map(stockUniverse.map(x=>([x.symbol, x])));

    // 2. Map through and parse the 'entries' string back into a JS array/object
    const data = rows.map(row => ({
        ...row,
        entries: row.entries ? row.entries.split(",").map(symbol=>{
          if(symbolMap.has(symbol)) return symbolMap.get(symbol);
          return {symbol, name: null, marketcap: null}
        }
          ) : []
    }));
console.log(data)
    // 3. Return the clean, nested JSON structure
    return json({ data });
}