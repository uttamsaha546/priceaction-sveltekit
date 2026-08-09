import { json } from '@sveltejs/kit';
import { DatabaseSync } from 'node:sqlite';
import zlib from 'node:zlib';


/*
|--------------------------------------------------------------------------
| Database
|--------------------------------------------------------------------------
*/

const db = new DatabaseSync('rupeevest-cache.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS rupeevest_cache (
        url TEXT PRIMARY KEY,
        response BLOB NOT NULL
    ) WITHOUT ROWID
`);


const getCacheStmt = db.prepare(
    'SELECT response FROM rupeevest_cache WHERE url = ?'
);

const setCacheStmt = db.prepare(
    'INSERT OR REPLACE INTO rupeevest_cache (url, response) VALUES (?, ?)'
);


/*
|--------------------------------------------------------------------------
| In-memory symbol map
|--------------------------------------------------------------------------
*/

const symbolMap = new Map();


/*
|--------------------------------------------------------------------------
| Rupeevest session
|--------------------------------------------------------------------------
*/

let rupeevestSession = null;
let sessionPromise = null;
let sessionExpiry = 0;


/*
|--------------------------------------------------------------------------
| User agent
|--------------------------------------------------------------------------
*/

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/151.0.0.0 Safari/537.36';


/*
|--------------------------------------------------------------------------
| Common headers
|--------------------------------------------------------------------------
*/

const COMMON_HEADERS = {
    'User-Agent': USER_AGENT,

    'Accept':
        'application/json, text/javascript, */*; q=0.01',

    'Accept-Language':
        'en,bn;q=0.9,en-US;q=0.8,ru;q=0.7,da;q=0.6',

    'Cache-Control':
        'no-cache',

    'Pragma':
        'no-cache',

    'X-Requested-With':
        'XMLHttpRequest'
};


/*
|--------------------------------------------------------------------------
| SQLite cache helpers
|--------------------------------------------------------------------------
*/

function getCache(key) {
    const row = getCacheStmt.get(key);

    if (!row) {
        return null;
    }

    try {
        const decompressed =
            zlib.zstdDecompressSync(row.response);

        return JSON.parse(
            decompressed.toString('utf8')
        );

    } catch (error) {

        console.error(
            `Cache decode failure for ${key}:`,
            error instanceof Error
                ? error.message
                : error
        );

        return null;
    }
}


function setCache(key, value) {
    try {

        const compressed =
            zlib.zstdCompressSync(
                Buffer.from(
                    JSON.stringify(value),
                    'utf8'
                )
            );

        setCacheStmt.run(
            key,
            compressed
        );

    } catch (error) {

        console.error(
            `Cache write failure for ${key}:`,
            error instanceof Error
                ? error.message
                : error
        );
    }
}


/*
|--------------------------------------------------------------------------
| Extract Set-Cookie headers
|--------------------------------------------------------------------------
*/

function extractCookies(response) {

    /*
     * Node's fetch Headers provides getSetCookie()
     * on supported Node versions.
     */

    if (
        typeof response.headers.getSetCookie !== 'function'
    ) {
        throw new Error(
            'Current Node.js runtime does not support response.headers.getSetCookie()'
        );
    }


    const cookies =
        response.headers.getSetCookie();


    return cookies
        .map(cookie =>
            cookie.split(';', 1)[0].trim()
        )
        .filter(Boolean)
        .join('; ');
}


/*
|--------------------------------------------------------------------------
| Extract CSRF token from Rupeevest HTML
|--------------------------------------------------------------------------
*/

function extractCsrfToken(html) {

    /*
     * Expected:
     *
     * <meta name="csrf-token"
     *       content="TOKEN" />
     */

    let match = html.match(
        /<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']\s*\/?>/i
    );


    if (match?.[1]) {
        return match[1].trim();
    }


    /*
     * Also support reversed attributes:
     *
     * <meta content="TOKEN"
     *       name="csrf-token">
     */

    match = html.match(
        /<meta\s+content=["']([^"']+)["']\s+name=["']csrf-token["']\s*\/?>/i
    );


    if (match?.[1]) {
        return match[1].trim();
    }


    /*
     * Fallback: generic meta tag search.
     */

    match = html.match(
        /<meta[^>]*name=["']csrf-token["'][^>]*>/i
    );


    if (match?.[0]) {

        const tag = match[0];

        const content =
            tag.match(
                /content=["']([^"']+)["']/i
            );

        if (content?.[1]) {
            return content[1].trim();
        }
    }


    return '';
}


/*
|--------------------------------------------------------------------------
| Create / refresh Rupeevest session
|--------------------------------------------------------------------------
*/

async function getRupeevestSession(fincode) {
    const now = Date.now();
    /*
     * Reuse valid session.
     */
    // if (
    //     rupeevestSession &&
    //     now < sessionExpiry
    // ) {
    //     return rupeevestSession;
    // }

    /*
     * If another request is already creating
     * a session, wait for that request.
     */

    if (sessionPromise) {
        return sessionPromise;
    }
    sessionPromise = (async () => {
        /*
         * Use the same type of page that the browser
         * request uses.
         */
        const pageUrl = `https://www.rupeevest.com/Mutual-Fund-Holdings/${encodeURIComponent(fincode)}`;
        console.log(`Initializing Rupeevest session for fincode ${fincode}`);
        const response = await fetch(pageUrl, {
            method: 'GET',
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en,bn;q=0.9,en-US;q=0.8,ru;q=0.7,da;q=0.6'
            }
        }
        );
        if (!response.ok) {
            throw new Error(`Rupeevest holdings page returned HTTP ${response.status}`);
        }
        /*
         * Read HTML.
         */
        const html = await response.text();
        /*
         * Extract session cookies.
         */
        const cookie = extractCookies(response);
        if (!cookie) {
            throw new Error('Rupeevest did not return a session cookie');
        }
        /*
         * Extract CSRF token from:         *
         * <meta name="csrf-token" content="...">
         */
        const csrfToken = extractCsrfToken(html);
        if (!csrfToken) {
            throw new Error('Rupeevest CSRF token was not found in HTML');
        }
        /*
         * Store session.
         */
        rupeevestSession = {
            cookie,
            csrfToken,
            pageUrl
        };
        /*
         * Five-minute session lifetime.
         */

        sessionExpiry = Date.now() + 5 * 60 * 1000;
        console.log('Rupeevest session initialized:', {
            cookieNames: cookie.split('; ')
                .map(item => item.split('=')[0]),
            csrfTokenLength: csrfToken.length,
            pageUrl
        }
        );
        return rupeevestSession;
    })();
    try {
        return await sessionPromise;
    } finally {
        sessionPromise = null;
    }
}


/*
|--------------------------------------------------------------------------
| Load Rupeevest stock search data
|--------------------------------------------------------------------------
*/

async function loadSymbolMap() {
    /*
     * Already loaded in this server process.
     */
    if (symbolMap.size > 0) {
        return;
    }
    const searchDataStockUrl = 'https://www.rupeevest.com/mf_stock_portfolio/get_search_data_stock';
    /*
     * Try persistent cache.
     */
    const cached =
        getCache(searchDataStockUrl);
    let data;
    if (cached !== null) {
        data = cached;
        console.log('Rupeevest stock search loaded from cache');

    } else {
        console.log('Fetching Rupeevest stock search data');
        const response = await fetch(searchDataStockUrl, {
            method: 'GET',
            headers: {
                ...COMMON_HEADERS,
                'Referer':
                    'https://www.rupeevest.com/Mutual-Fund-Holdings'
            }
        }
        );
        if (!response.ok) {
            throw new Error(
                `Rupeevest search API returned HTTP ${response.status}`
            );
        }
        const responseData = await response.json();
        data = responseData.stock_data_search || [];
        if (!Array.isArray(data)) {
            throw new Error('Invalid stock_data_search response from Rupeevest');
        }
        /*
         * Save complete search response.
         */
        setCache(
            searchDataStockUrl,
            data
        );
    }
    /*
     * Build:
     * symbol -> Rupeevest stock row
     */
    for (const row of data) {
        const parts = String(row.stock_search || '').split('|');
        if (parts.length < 3) { continue; }
        const key = parts[2].trim();
        if (!key) { continue; }
        symbolMap.set(key, row);
    }
    console.log(`Rupeevest symbol map loaded: ${symbolMap.size} symbols`);
}

/*
|--------------------------------------------------------------------------
| Fetch stock detail using browser-equivalent request
|--------------------------------------------------------------------------
*/

async function getStockDetail(fincode) {
    const symbolDataUrl = 'https://www.rupeevest.com/mf_stock_portfolio/get_stock_detail_new';
    /*
     * Cache by fincode.
     */
    const cacheKey = `${symbolDataUrl}?fincode=${encodeURIComponent(fincode)}`;
    /*
     * Persistent cache lookup.
     */
    const cached = getCache(cacheKey);
    if (cached !== null) {
        console.log(`Stock detail cache hit: ${fincode}`);
        return cached;
    }
    /*
     * Create/reuse matching session.
     */
    const session = await getRupeevestSession(fincode);
    /*
     * IMPORTANT:     *
     * Browser sends:     *
     * Content-Type:
     * application/x-www-form-urlencoded     *
     * Body:     *
     * fincode=100002
     */

    const body =
        new URLSearchParams({
            fincode: String(fincode)
        });


    console.log(
        'Rupeevest detail request:',
        {
            fincode,
            body: body.toString(),
            referer: session.pageUrl,
            csrfTokenLength:
                session.csrfToken.length
        }
    );


    const response = await fetch(symbolDataUrl, {
        method: 'POST',
        headers: {
            ...COMMON_HEADERS,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Referer': session.pageUrl,
            'Origin': 'https://www.rupeevest.com',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': session.cookie,
            'X-CSRF-Token': session.csrfToken
        },
        body
    }
    );
    console.log(`Rupeevest detail response: HTTP ${response.status}`);
    /*
     * 204 means no response body.
     */

    if (response.status === 204) {

        console.warn(
            `Rupeevest returned 204 for fincode ${fincode}`
        );


        /*
         * Do NOT cache a 204 permanently.
         *
         * The server may be rejecting the request
         * because the session/token has expired or
         * otherwise differs from the browser session.
         */

        return {
            stock_data: []
        };
    }


    /*
     * Authentication / CSRF failure.
     *
     * Destroy current session so next request
     * gets a fresh one.
     */

    if (
        response.status === 401 ||
        response.status === 403
    ) {

        rupeevestSession = null;
        sessionExpiry = 0;


        throw new Error(
            `Rupeevest authentication/CSRF failure: HTTP ${response.status}`
        );
    }


    if (!response.ok) {

        throw new Error(
            `Rupeevest stock detail API returned HTTP ${response.status}`
        );
    }


    /*
     * Make sure we actually received JSON.
     */

    const contentType =
        response.headers.get(
            'content-type'
        ) || '';


    if (!contentType.includes('json')) {

        const text =
            await response.text();


        throw new Error(
            `Rupeevest returned non-JSON response: ${text.slice(0, 500)}`
        );
    }


    /*
     * Parse JSON.
     */

    const responseData =
        await response.json();


    /*
     * Cache complete response.
     */

    setCache(
        cacheKey,
        responseData
    );


    return responseData;
}


/*
|--------------------------------------------------------------------------
| GET endpoint
|--------------------------------------------------------------------------
*/

export async function GET({ url }) {
    const symbol = url.searchParams.get('symbol');
    /*
     * Validate symbol.
     */
    if (!symbol) {
        return json({ error: 'Missing required query parameter: symbol' }, { status: 400 });
    }
    const normalizedSymbol = symbol.trim();
    if (!normalizedSymbol) {
        return json({ error: 'Symbol cannot be empty' }, { status: 400 });
    }
    try {
        /*
         * ---------------------------------------------------
         * Step A
         * Load symbol -> stock mapping.
         * ---------------------------------------------------
         */
        await loadSymbolMap();
        const stock = symbolMap.get(normalizedSymbol);
        /*
         * Symbol doesn't exist in Rupeevest.
         */
        if (!stock) {
            return json({
                success: true,
                symbol: normalizedSymbol,
                heldByMF: false,
                reason: 'Symbol not found'
            });
        }
        /*
         * ---------------------------------------------------
         * Step B
         * Validate fincode.
         * ---------------------------------------------------
         */
        if (!stock.fincode) {
            return json({
                success: true,
                symbol: normalizedSymbol,
                heldByMF: false,
                reason: 'Fincode not available'
            });
        }
        const fincode = String(stock.fincode).trim();
        /*
         * ---------------------------------------------------
         * Step C
         * Fetch MF holdings.
         * ---------------------------------------------------
         */
        const responseData = await getStockDetail(fincode);
        /*
         * ---------------------------------------------------
         * Step D
         * Determine whether stock_data contains
         * any MF holdings.
         * --------------------------------------------------
         */
        const stockData = responseData?.stock_data;
        let heldByMF = false;
        if (Array.isArray(stockData)) {
            heldByMF = stockData.length > 0;
        } else if (
            stockData &&
            typeof stockData === 'object'
        ) {

            heldByMF =
                Object.keys(
                    stockData
                ).length > 0;
        }


        /*
         * ---------------------------------------------------
         * Step E
         *
         * Return result.
         * ---------------------------------------------------
         */

        return json({
            success: true,
            symbol: normalizedSymbol,
            fincode,
            heldByMF
        });


    } catch (error) {

        const message =
            error instanceof Error
                ? error.message
                : String(error);


        console.error(
            `Execution fault for symbol [${normalizedSymbol}]:`,
            message
        );


        return json(
            {
                success: false,
                symbol: normalizedSymbol,
                error: message
            },
            {
                status: 500
            }
        );
    }
}