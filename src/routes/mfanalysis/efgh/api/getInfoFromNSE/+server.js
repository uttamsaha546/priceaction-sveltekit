import { json } from '@sveltejs/kit';

const hotCache = new Map();
let cachedCookie = '';
let cookieExpiry = 0;

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
        const cookies = response.headers.get('set-cookie');
        
        if (!cookies) throw new Error('NSE failed to issue session tokens');

        // Isolate and extract relevant security tracking parameters
        cachedCookie = cookies
            .split(',')
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
async function fetchWithNseSession(url) {
    if (hotCache.has(url)) {
        return hotCache.get(url);
    }

    const cookie = await getNseCookie();
    const response = await fetch(url, {
        headers: { ...HEADERS, 'Cookie': cookie }
    });

    if (!response.ok) {
        throw new Error(`NSE Server returned HTTP Status ${response.status}`);
    }

    const data = await response.json();
    hotCache.set(url, data);
    return data;
}

export async function GET({ url }) {
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
        return json({ error: 'Missing required query parameter: symbol' }, { status: 400 });
    }

    try {
        // Step A: Fetch base metadata containing active series mappings
        const metaDataUrl = `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getMetaData&symbol=${encodeURIComponent(symbol)}`;
        const metaData = await fetchWithNseSession(metaDataUrl);

        if (!metaData || !metaData.activeSeries || metaData.activeSeries.length === 0) {
            return json({ error: `Symbol context validation failed for: ${symbol}` }, { status: 404 });
        }

        // Step B: Fetch final transactional quotes using configurations retrieved from Step A
        const activeSeries = metaData.activeSeries[0];
        const marketType = metaData.marketType || 'N';
        
        const symbolDataUrl = `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=${marketType}&series=${activeSeries}&symbol=${encodeURIComponent(symbol)}`;
        const symbolData = await fetchWithNseSession(symbolDataUrl);

        return json({
            success: true,
            data: {
                nseData: {
                    ...metaData,
                    ...symbolData
                }
            }
        });

    } catch (error) {
        console.error(`Execution fault for target symbol [${symbol}]:`, error.message);
        return json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}


