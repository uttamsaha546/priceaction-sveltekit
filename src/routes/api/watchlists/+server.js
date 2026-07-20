import { json } from "@sveltejs/kit";
import { db } from "$lib/server/database";

export function GET() {
    // 1. Fetch the raw rows from the database
    db.prepare(`INSERT OR REPLACE INTO watchlists (name, entries) VALUES (?, ?)`).run('Default Watchlist', 'VBL');
    const watchlists = db.prepare(`SELECT * FROM watchlists`).all();
    
    const stockUniverse = db.prepare('SELECT symbol, name, marketcap FROM stock_universe').all();
    const myPortfolio = db.prepare(`SELECT holding FROM portfolio WHERE key='my_holding'`).get();
    
    const symbolMap = new Map(stockUniverse.map(x=>([x.symbol, x])));
    const myPortfolioHoldingMap = new Map(JSON.parse(myPortfolio.holding).map(x=>([x.symbol, x.HoldingAmt])));
    console.log(myPortfolioHoldingMap)

    // // 2. Map through and parse the 'entries' string back into a JS array/object
    const data = watchlists.map(watchlist => ({
        name:watchlist.name,
        entries: watchlist.entries ? watchlist.entries.split(",").map(x=>x.trim()).map(symbol=>{
          if(symbolMap.has(symbol)) return {...symbolMap.get(symbol), value: myPortfolioHoldingMap.has(symbol)? myPortfolioHoldingMap.get(symbol): null};
          return {symbol, name: null, marketcap: null, value: null}
        }
          ) : []
    }));
    // 3. Return the clean, nested JSON structure
    return json({ data });
}