import { XMLParser } from 'fast-xml-parser';

export async function extractNseXbrlData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const xmlText = await response.text();

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            removeNSPrefix: false
        });

        const jsonObj = parser.parse(xmlText);
        // return jsonObj
        const rootKey = Object.keys(jsonObj).find(key => key.includes('xbrl'));
        const xbrlData = jsonObj[rootKey];

        if (!xbrlData) {
            throw new Error("Could not find root XBRL node inside the XML document.");
        }

        // --- Robust Context Map Extraction ---
        const contexts = {};
        // let contextNodes = xbrlData['xbrli:context'] || xbrlData['context'] || [];

        // // Force contextNodes into a standard iterable array if it's parsed as a lone object
        // if (contextNodes && !Array.isArray(contextNodes)) {
        //     contextNodes = [contextNodes];
        // }

        // contextNodes.forEach(ctx => {
        //     const id = ctx['@_id'];
        //     const period = ctx['xbrli:period'] || ctx['period'];

        //     if (id && period) {
        //         // Handle instant periods (Balance Sheet dates) vs duration periods (Income Statements)
        //         const start = period['xbrli:startDate'] || period['startDate'] || null;
        //         const end = period['xbrli:endDate'] || period['endDate'] || period['xbrli:instant'] || period['instant'] || null;

        //         contexts[id] = { start, end };
        //     }
        // });

        // --- Helper Function to reliably extract values ---
        const getXbrlValue = (localTagName) => {
            const dynamicKeys = [
                `in-capmkt:${localTagName}`,
                `in-bse-fin:${localTagName}`,
                `in-gaap:${localTagName}`,
                localTagName
            ];

            for (const key of dynamicKeys) {
                if (xbrlData[key]) {
                    let node = xbrlData[key];

                    // Normalize lone values into arrays to keep output formats consistent
                    if (!Array.isArray(node)) {
                        node = [node];
                    }

                    return node.map(item => {
                        const rawValue = (typeof item === 'object' && item !== null) ? (item['#text'] || '') : item;
                        const contextRef = item['@_contextRef'] || null;
                        // const dateRange = contexts[contextRef] || { start: null, end: null };

                        return {
                            value: Number(rawValue) || rawValue, // Coerce numeric parameters if applicable
                            context: contextRef,
                            // startDate: dateRange.start,
                            // endDate: dateRange.end
                        };
                    });
                }
            }
            return null;
        };

        // --- Extract targets seamlessly mapped to structural dates ---
        const DateOfStartOfReportingPeriod = Object.fromEntries(getXbrlValue('DateOfStartOfReportingPeriod').map(x => ([x.context, x.value])));
        const DateOfEndOfReportingPeriod = Object.fromEntries(getXbrlValue('DateOfEndOfReportingPeriod').map(x => ([x.context, x.value])));

        const revenueData = getXbrlValue('RevenueFromOperations') || getXbrlValue('Income');
        const netProfitData = getXbrlValue('ProfitLossForPeriod') || getXbrlValue('NetProfitLossForThePeriodFromContinuingOperations');
        const basicEpsData = getXbrlValue('BasicEarningsLossPerShareFromContinuingAndDiscontinuedOperations') || getXbrlValue('BasicEarningPerEquityShare');
        const dilutedEpsData = getXbrlValue('DilutedEarningsLossPerShareFromContinuingAndDiscontinuedOperations') || getXbrlValue('DilutedEarningsPerEquityShare');

        const revenue = revenueData.map(x => ({ value: x.value, startDate: DateOfStartOfReportingPeriod[x.context], endDate: DateOfEndOfReportingPeriod[x.context] }));
        const netProfit = netProfitData.map(x => ({ value: x.value, startDate: DateOfStartOfReportingPeriod[x.context], endDate: DateOfEndOfReportingPeriod[x.context] }));
        const basicEps = basicEpsData.map(x => ({ value: x.value, startDate: DateOfStartOfReportingPeriod[x.context], endDate: DateOfEndOfReportingPeriod[x.context] }));
        const dilutedEps = dilutedEpsData.map(x => ({ value: x.value, startDate: DateOfStartOfReportingPeriod[x.context], endDate: DateOfEndOfReportingPeriod[x.context] }));

        return {
            // DateOfStartOfReportingPeriod,
            revenue,
            netProfit,
            basicEps,
            dilutedEps,
            // url: decodeURIComponent(url.split('url=')[1])
        };

    } catch (error) {
        console.error(`Extraction process broken for ${url}:`, error.message);
        return { url, error: error.message }; // Return error cleanly instead of breaking loops
    }
}