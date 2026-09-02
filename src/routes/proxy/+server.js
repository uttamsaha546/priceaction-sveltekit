import { json } from '@sveltejs/kit';
import { cache } from './cache';

/** Read response safely into a cache-safe, JSON-serializable form */
async function readResponse(res) {
    const buffer = await res.arrayBuffer();

    // Convert ArrayBuffer to base64 strings so JSON.stringify doesn't break it
    const bodyAsBase64 = Buffer.from(buffer).toString('base64');

    return {
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        body: bodyAsBase64
    };
}

/** Build response safely (STRIPS dangerous headers) */
function buildResponse(cached) {
    const headers = new Headers();

    for (const [key, value] of Object.entries(cached.headers)) {
        const k = key.toLowerCase();

        // ❌ critical fix: remove decoding-related headers
        if (
            k === 'content-encoding' ||
            k === 'content-length' ||
            k === 'transfer-encoding'
        ) {
            continue;
        }

        headers.set(key, value);
    }

    // Convert base64 string back to a binary Uint8Array for Response stream consumption
    const binaryBody = Buffer.from(cached.body, 'base64');

    return new Response(binaryBody, {
        status: cached.status,
        headers
    });
}

/** Stable cache key */
function makeKey(method, url, payload = {}) {
    return `${method}:${url}:${JSON.stringify(payload)}`;
}

/* -------------------- GET -------------------- */
export async function GET({url, request}) {
    try {
        const targetUrl = url.searchParams.get('url');
        const ttl = url.searchParams.get('ttl');
        const referer = request.headers.get('x-forwarded-referer');
        const userAgent = request.headers.get('user-agent');
        const authorization = request.headers.get('authorization');

        if (!targetUrl) {
            return json({ error: 'Missing url parameter' }, { status: 400 });
        }

        const key = makeKey('GET', targetUrl);

        // Leverage the safe fetch engine to guard against concurrent stampedes
        const cachedResponseData = await cache.fetch(key, async () => {
            const upstream = await fetch(targetUrl, {
                headers: {
                    'User-Agent': userAgent,
                    // If referer exists, it spreads { 'Referer': referer } into the object.
                    ...(referer && { 'Referer': referer }),
                    ...(authorization && { 'Authorization': authorization }),
                }
            });
            // console.log("Called GET (Cache Miss)");

            if (!upstream.ok) {
                // Throwing an error lets the engine know NOT to cache this failure
                throw new Error(JSON.stringify({ status: upstream.status, text: upstream.statusText }));
            }

            return await readResponse(upstream);
        }, ttl? ttl: 3600); // 1-hour expiration time

        return buildResponse(cachedResponseData);
    } catch (err) {
        // Handle upstream non-ok responses thrown inside our fetch closure
        try {
            const upstreamError = JSON.parse(err.message);
            return json({ error: upstreamError.text }, { status: upstreamError.status });
        } catch {
            return json(
                { error: 'Proxy failed: ' + err.message },
                { status: 500 }
            );
        }
    }
}

/* -------------------- POST -------------------- */
export async function POST({ url, request }) {
    try {
        const targetUrl = url.searchParams.get('url');
        const ttl = url.searchParams.get('ttl');

        const body = await request.json();

        if (!targetUrl) {
            return json({ error: 'Missing url' }, { status: 400 });
        }

        const key = makeKey("POST", targetUrl, body);

        // Safely collapse incoming stampedes matching this exact method/payload signature
        const cachedResponseData = await cache.fetch(key, async () => {

            const upstream = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' // Tell them it's JSON
                },
                body: JSON.stringify(body)
            });

            console.log("Called POST (Cache Miss)");

            if (!upstream.ok) {
                throw new Error(JSON.stringify({ status: upstream.status, text: upstream.statusText }));
            }

            return await readResponse(upstream);
        }, ttl? ttl: 3600);

        return buildResponse(cachedResponseData);
    } catch (err) {
        try {
            const upstreamError = JSON.parse(err.message);
            return json({ error: upstreamError.text }, { status: upstreamError.status });
        } catch {
            return json(
                { error: 'Proxy failed: ' + err.message },
                { status: 500 }
            );
        }
    }
}