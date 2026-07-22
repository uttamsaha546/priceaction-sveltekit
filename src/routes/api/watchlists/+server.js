import { json } from "@sveltejs/kit";
import { db } from "$lib/server/database";

// Precompiled prepared statements for fast execution and lower CPU and memory overhead
const insertDefaultWatchlistStmt = db.prepare('INSERT OR REPLACE INTO watchlists (name, entries) VALUES (?, ?)');
const selectAllWatchlistsStmt = db.prepare('SELECT * FROM watchlists');
const selectStockUniverseSlimStmt = db.prepare('SELECT symbol, name, marketcap FROM stock_universe');
const selectMyPortfolioHoldingStmt = db.prepare("SELECT holding FROM portfolio WHERE key='my_holding'");

export function GET() {
    // 1. Insert default watchlists if needed
    insertDefaultWatchlistStmt.run('Default Watchlist', 'VBL');

    // 2. Fetch data from DB using precompiled statements
    const watchlists = selectAllWatchlistsStmt.all();    
    const stockUniverse = selectStockUniverseSlimStmt.all();
    const myPortfolio = selectMyPortfolioHoldingStmt.get();
    
    const symbolMap = new Map(stockUniverse.map(x=>([x.symbol, x])));

    let myPortfolioHoldings = [];
    if (myPortfolio && myPortfolio.holding) {
      try {
        myPortfolioHoldings = JSON.parse(myPortfolio.holding);
      } catch (e) {
        console.error('Failed to parse portfolio holding JSON:', e);
      }
    }

    const myPortfolioHoldingMap = new Map(myPortfolioHoldings.map(x=>([x.symbol, x.HoldingAmt])));
    //console.log(myPortfolioHoldingMap)

    // 3. Map through and parse the 'entries' string back into a JS array/object
    const data = watchlists.map(watchlist => ({
        name:watchlist.name,
        entries: watchlist.entries 
        ? watchlist.entries
        .split(",")
        .map(x=>x.trim())
        .map(symbol=>{
          if(symbolMap.has(symbol)) {
            return {
              ...symbolMap.get(symbol), 
              value: myPortfolioHoldingMap.has(symbol)? myPortfolioHoldingMap.get(symbol): null
            };
          }
          return {symbol, name: null, marketcap: null, value: null}
        }) : []
    }));
    
    // 4. Return the clean, nested JSON structure
    return json({ data });
}