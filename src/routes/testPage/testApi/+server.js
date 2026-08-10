import { json } from "@sveltejs/kit";
import { DatabaseSync } from "node:sqlite";
import zlib from "node:zlib";

// Database Initialization
const db = new DatabaseSync("updatable-cache.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS "updatable_cache" (
        key TEXT PRIMARY KEY,
        value BLOB
    ) WITHOUT ROWID;
`);

const setCacheStmt = db.prepare(`INSERT OR REPLACE INTO "updatable_cache" (key, value) VALUES (:key, :value)`);
const getCacheStmt = db.prepare(`SELECT value FROM "updatable_cache" WHERE key = :key`);

/**
 * Handles GET requests to retrieve the fund list.
 * @returns {Promise<Response>} SvelteKit JSON response.
 */
export async function GET() {
    const data = await getFundList("Mid Cap");
    return json(data);
}

/**
 * Fetches the fund list from the cache or falls back to updating it via API.
 * @param {string} sub_category - The sub-category filter (e.g., "Mid Cap").
 * @returns {Promise<any>} The parsed fund list data.
 */
async function getFundList(sub_category) {
    try {
        const url = `https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?available_for_investment=true&cat=Equity&doc_type=scheme&index=false&page=0&plan_type=Direct&scheme_type=Growth&size=200&sort_by=3&sub_cat=${encodeURIComponent(sub_category)}&sub_sub_cat=null&tags=null`;
        
        let data = getCache(url);
        if (!data) {
            data = await updateFundList(sub_category);
        }
        return data;
    } catch (error) {
        console.error("Fund list retrieval failed:", error);
        throw new Error("Failed to get fund list");
    }
}

/**
 * Fetches the latest response (JSON, HTML, or ArrayBuffer) from the external API and caches it.
 * @param {string} sub_category - The sub-category filter (e.g., "Mid Cap").
 * @returns {Promise<any>} The parsed or raw payload.
 */
async function updateFundList(sub_category) {
    const url = `https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?available_for_investment=true&cat=Equity&doc_type=scheme&index=false&page=0&plan_type=Direct&scheme_type=Growth&size=200&sort_by=3&sub_cat=${encodeURIComponent(sub_category)}&sub_sub_cat=null&tags=null`;
    
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch fund list: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get("content-type") || "";
    let payload;

    if (contentType.includes("application/json")) {
        payload = await res.json();
    } else if (contentType.includes("text/")) {
        payload = await res.text();
    } else {
        payload = await res.arrayBuffer(); // Binary streams, files, etc.
    }

    setCache(url, payload);
    return payload;
}

/**
 * Serializes and stores standard JS types, ArrayBuffers, strings, or objects into SQLite.
 * @param {string} key - The cache lookup key (URL).
 * @param {ArrayBuffer | Buffer | string | object} value - The content to cache.
 * @returns {void}
 */
function setCache(key, value) {
    let inputBuffer;

    if (value instanceof ArrayBuffer) {
        inputBuffer = Buffer.from(value);
    } else if (ArrayBuffer.isView(value)) {
        // Covers Uint8Array, Buffer, DataView, etc.
        inputBuffer = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    } else if (typeof value === "string") {
        inputBuffer = Buffer.from(value, "utf-8");
    } else {
        // Serialise JSON objects/arrays
        inputBuffer = Buffer.from(JSON.stringify(value), "utf-8");
    }

    const compressed = zlib.zstdCompressSync(inputBuffer);
    setCacheStmt.run({ key, value: compressed });
}

/**
 * Retrieves and deserializes a cached value.
 * @param {string} key - The cache lookup key (URL).
 * @param {'json' | 'text' | 'buffer'} [type='json'] - The desired output format.
 * @returns {any|null}
 */
function getCache(key, type = "json") {
    /** @type {{ value: Buffer } | undefined} */
    const row = getCacheStmt.get({ key });    
    if (!row) return null;

    const decompressed = zlib.zstdDecompressSync(row.value);

    if (type === "buffer") {
        return decompressed; // Returns Node Buffer (can be converted to ArrayBuffer via decompressed.buffer)
    }

    const text = decompressed.toString("utf-8");

    if (type === "text") {
        return text;
    }

    try {
        return JSON.parse(text);
    } catch {
        // Fallback to text if parsing as JSON fails (e.g., HTML response)
        return text;
    }
}