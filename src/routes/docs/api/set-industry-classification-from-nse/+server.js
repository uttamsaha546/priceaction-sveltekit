import { json } from '@sveltejs/kit';
import zlib from 'node:zlib';
import { appdb } from '$lib/server/appdb';

const hotCache = new Map();
let cachedCookie = '';
let cookieExpiry = 0;

const getCacheStmt = appdb.prepare('SELECT response FROM nse_cache WHERE url=?');
const setCacheStmt = appdb.prepare('INSERT OR REPLACE INTO nse_cache (url, response, isin, symbol, function_name) VALUES (:url, :response, :isin, :symbol, :function_name)');

function getCache(url) {
    const cache = hotCache.get(url);
    if (cache !== undefined) return cache;
    const row = getCacheStmt.get(url);
    if (!row) return null;

    const decompressed = zlib.zstdDecompressSync(row.response);
    const value = JSON.parse(decompressed.toString('utf8'));
    hotCache.set(url, value);
    return value;
}

/**
 * 
 * @param {*} url url as key
 * @param {*} response json object response as value. stringyfy json before saving.
 */
function setCache(url, response, functionName) {
    hotCache.set(url, response);
    const compressed = zlib.zstdCompressSync(Buffer.from(JSON.stringify(response), 'utf8'));
    setCacheStmt.run({
        url: url, response: compressed,
        isin: functionName === 'getMetaData' ? response.isin : response.equityResponse[0].metaData.isinCode,
        symbol: functionName === 'getMetaData' ? response.symbol : response.equityResponse[0].metaData.symbol,
        function_name: functionName
    });
}

// Fake standard desktop browser fingerprints to bypass basic firewall rule sets
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nseindia.com/',
    'X-Requested-With': 'XMLHttpRequest'
};

/**
 * Initializes and retrieves valid operational session tokens directly from NSE India
 */
async function getNseCookie() {
    const now = Date.now();
    // Cache cookies for 5 minutes to prevent session inflation
    if (cachedCookie && now < cookieExpiry) {
        return cachedCookie;
    }

    try {
        const response = await fetch('https://www.nseindia.com/', { headers: HEADERS });
        const cookies = response.headers.getSetCookie();

        if (!cookies || cookies.length === 0) throw new Error('NSE failed to issue session tokens');

        // Isolate and extract relevant security tracking parameters
        cachedCookie = cookies
            .map(c => c.split(';')[0].trim())
            .filter(c => c.startsWith('nsit') || c.startsWith('nseappid') || c.startsWith('ak_bmsc') || c.startsWith('bm_sv'))
            .join('; ');

        cookieExpiry = now + 5 * 60 * 1000;
        return cachedCookie;
    } catch (err) {
        console.error('NSE Cookie Initialization Failure:', err.message);
        throw err;
    }
}

/**
 * Generic fetch wrapper injected with appropriate cookies & spoofed user agents
 */
async function fetchWithNseSession(url, functionName) {
    const cached = getCache(url);
    if (cached !== null) {
        return cached;
    }

    const cookie = await getNseCookie();
    const response = await fetch(url, {
        headers: { ...HEADERS, 'Cookie': cookie }
    });

    if (!response.ok) {
        throw new Error(`NSE Server returned HTTP Status ${response.status}`);
    }

    const data = await response.json();
    setCache(url, response, functionName)
    return data;
}

const insertStmt = appdb.prepare(`INSERT OR REPLACE INTO nse_industry_classification 
    (symbol, macro, sector, industry, basic_industry) VALUES 
    (:symbol, :macro, :sector, :industry, :basic_industry)`
);

export async function GET({ url }) {
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
        return json({ error: 'Missing required query parameter: symbol' }, { status: 400 });
    }

    try {
        // Step A: Fetch base metadata containing active series mappings
        const metaDataUrl = `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getMetaData&symbol=${encodeURIComponent(symbol)}`;
        const metaData = await fetchWithNseSession(metaDataUrl, 'getMetaData');

        if (!metaData || !metaData.activeSeries || metaData.activeSeries.length === 0) {
            return json({ error: `Symbol context validation failed for: ${symbol}` }, { status: 404 });
        }

        // Step B: Fetch final transactional quotes using configurations retrieved from Step A
        const activeSeries = metaData.activeSeries[0];
        const marketType = metaData.marketType || 'N';

        const symbolDataUrl = `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=${marketType}&series=${activeSeries}&symbol=${encodeURIComponent(symbol)}`;
        const symbolData = await fetchWithNseSession(symbolDataUrl, 'getSymbolData');

        const secInfo = symbolData.equityResponse[0].secInfo;

        const result = {
            symbol: metaData.symbol,
            macro: secInfo.macro,
            sector: secInfo.sector,
            industry: secInfo.industryInfo,
            basic_industry: secInfo.basicIndustry
        };

        insertStmt.run(result)

        return json(result);

    } catch (error) {
        console.error(`Execution fault for target symbol [${symbol}]:`, error.message);
        return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}