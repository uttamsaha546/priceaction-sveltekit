import { error } from '@sveltejs/kit';

export const load = async ({ fetch }) => {
    try {
        // Fire all three API requests in parallel
        const [npsResponse, midcapResponse, smallcapResponse] = await Promise.all([
            fetch('https://api.icicipension.in/latestnav', {
                headers: { 'Authorization': 'Bearer e07nxj3145bapcxg' }
            }),
            fetch('https://www.amfiindia.com/api/latest-nav?type=&mfid=47&category=Equity%20Scheme%20-%20Mid%20Cap%20Fund&search=growth'),
            fetch('https://www.amfiindia.com/api/latest-nav?type=&mfid=48&category=Equity%20Scheme%20-%20Small%20Cap%20Fund&search=growth')
        ]);

        // Check all responses and build an accurate error message
        const failures = [];
        if (!npsResponse.ok) failures.push(`NPS (${npsResponse.status})`);
        if (!midcapResponse.ok) failures.push(`Midcap (${midcapResponse.status})`);
        if (!smallcapResponse.ok) failures.push(`Smallcap (${smallcapResponse.status})`);

        if (failures.length > 0) {
            throw new Error(`API fetch failed for: ${failures.join(', ')}`);
        }

        // Parse all JSON arrays safely
        const [npsData, midcapRaw, smallcapRaw] = await Promise.all([
            npsResponse.json().catch(() => ({})), // returns {} on JSON failure
            midcapResponse.json().catch(() => ({})),
            smallcapResponse.json().catch(() => ({}))
        ]);

        // Safely dig through AMFI's deeply nested response trees
        const midcapData = midcapRaw?.data?.[0]?.categories?.[0]?.groups?.[0]?.schemes?.find(x => x.schemeId === '140228');
        const smallcapData = smallcapRaw?.data?.[0]?.categories?.[0]?.groups?.[0]?.schemes?.find(x => x.schemeId === '147946');

        return {
            nps: {
                scrip: 'nps',
                date: npsData?.government?.date ?? 'N/A',
                nav: npsData?.government?.tier1_e_gov ?? 0
            },
            midcap: {
                scrip: 'midcap',
                date: midcapData?.date ?? 'N/A',
                nav: midcapData?.netAssetValue ?? 0
            },
            smallcap: {
                scrip: 'smallcap',
                date: smallcapData?.date ?? 'N/A',
                nav: smallcapData?.netAssetValue ?? 0
            }
        };

    } catch (err) {
        console.error('NAV Fetch failed:', err);
        throw error(502, 'Failed to fetch the latest NAV data.');
    }
};