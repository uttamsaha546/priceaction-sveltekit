import { db } from "./database";

// Initialize Schema
db.exec(`
        CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER NOT NULL
        ) WITHOUT ROWID;
`)

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cache_expiry ON cache(expires_at);    
`)

/** Artitechture
Request -> Map -> SQLite -> External API

If 50 requests hit your server at the exact same millisecond, here is what happens:
Request 1 misses Map and SQLite. It initiates an asynchronous HTTP fetch to the External API.
Because the External API takes, say, 200ms to respond, Requests 2 through 50 hit the cache before Request 1 finishes saving the new data.
All 50 requests bypass the cache layers entirely and bombard your External API simultaneously.
This can result in API rate-limiting, socket exhaustion, or cascading downtime on your upstream service.
The Fix: Promise Collapsing (In-Flight Request Tracking)
If a request is already fetching that specific key from the external API, subsequent incoming requests should just wait for that exact same promise to resolve instead of triggering their own network calls.
*/

class Cache {
    constructor(db) {
        this.db = db;
        this.memory = new Map();
        // Track active promises fetching from external APIs
        this.inFlightRequests = new Map();

        // Pre-compile statements once for blazing-fast execution
        this.statements = {
            get: this.db.prepare('SELECT value, expires_at FROM cache WHERE key = ?'),
            set: this.db.prepare('INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)'),
            delete: this.db.prepare('DELETE FROM cache WHERE key = ?'),
            cleanup: this.db.prepare('DELETE FROM cache WHERE expires_at < ?')
        };

        // Start background cleanup interval (bound to 'this')
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
        // Unref allows the Node process to exit even if the interval is running
        if (this.cleanupInterval.unref) this.cleanupInterval.unref();
    }

    /**
     *  Get cache from memory | db and automatically remove expired entries
     * @param {string} key
     * @returns {any} 
     */
    get(key) {
        // 1. Check Memory Cache
        if (this.memory.has(key)) {
            const entry = this.memory.get(key);
            if (entry.expires_at < Date.now()) {
                this.memory.delete(key);

                // OPTIMIZATION: Since memory and DB are set together, 
                // if it expired in memory, it's expired in the DB too.
                // We can lazily let the background cleanup handle SQLite later 
                // to avoid blocking this read request with a slow disk delete.
                return null;
            } else {
                return entry.value;
            }
        }
        // 2. Check SQLite Cache
        const row = this.statements.get.get(key);
        if (!row) return null;

        if (row.expires_at < Date.now()) {
            this.statements.delete.run(key);
            return null;
        }

        const value = JSON.parse(row.value);

        this.memory.set(key, { value, expires_at: row.expires_at });

        return value;
    }

    /**
     * Set cache to db with expiry
     * @param {string} key - key to be used
     * @param {any} value - value to be cached
     * @param {number} ttlSeconds - Time to live in seconds. Default 1 hr
     */
    set(key, value, ttlSeconds = 3600) {
        const expires_at = Date.now() + ttlSeconds * 1000;

        this.memory.set(key, { value, expires_at });

        try {
            const serialized = JSON.stringify(value);
            this.statements.set.run(key, serialized, expires_at);
        } catch (err) {
            console.error(`Cache serialization failed for key "${key}":`, err);
        }
    }

    /**
     * Delete all expired entries from DB and Memory
     */
    cleanup() {
        // Cleanup SQLite
        this.statements.cleanup.run(Date.now());

        // Cleanup Memory Map to avoid memory leaks
        for (const [key, entry] of this.memory.entries()) {
            if (entry.expires_at < Date.now()) {
                this.memory.delete(key);
            }
        }
    }

    /**
     * Fetch data safely, protecting your external API from cache stampedes
     * @param {string} key 
     * @param {Function} fetchFn - Async function that calls the External API
     * @param {number} ttlSeconds 
     */
    async fetch(key, fetchFn, ttlSeconds = 3600) {
        // 1. Try to get from fast local caches (Memory or SQLite)
        const cachedValue = this.get(key);
        if (cachedValue !== null) return cachedValue;

        // 2. Check if another request is already fetching this exact key
        if (this.inFlightRequests.has(key)) {
            // Collapse the request: return the existing promise
            return this.inFlightRequests.get(key);
        }

        // 3. Cache Miss + No In-Flight Request: Create the fetch promise
        const fetchPromise = (async () => {
            try {
                // Execute the external API call passed by the user
                const freshData = await fetchFn();

                // Save to both SQLite and Memory layers
                this.set(key, freshData, ttlSeconds);

                return freshData;
            } finally {
                // ALWAYS clean up the in-flight map when done (success or failure)
                this.inFlightRequests.delete(key);
            }
        })();

        // Register the active promise so concurrent requests can piggyback on it
        this.inFlightRequests.set(key, fetchPromise);

        return fetchPromise;
    }
}

export const cache = new Cache(db);

// How to Use
// Even if this endpoint is flooded with 1,000 concurrent requests,
// the API will only be hit exactly ONCE.
// app.get("/user/:id", async (req, res) => {
//     const cacheKey = `user:${req.params.id}`;

//     try {
//         const userData = await cache.fetch(cacheKey, async () => {
//             // This code only runs on a true multi-layer cache miss
//             const response = await fetch(`https://api.external.com/users/${req.params.id}`);
//             return response.json();
//         }, 600); // 10 minute cache

//         res.json(userData);
//     } catch (error) {
//         res.status(500).json({ error: "Failed to fetch user data" });
//     }
// });