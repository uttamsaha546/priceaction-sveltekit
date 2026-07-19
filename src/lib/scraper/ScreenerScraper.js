import * as cheerio from "cheerio";

export default class ScreenerScraper {

    constructor() {
        this.host = 'https://www.screener.in';
        this.symbol_urlMap = new Map();
    }

    async scrape(symbol) {
        const url = await this.getUrl(symbol);
        const $ = await cheerio.fromURL(url);

        const $quarterly = $('section#quarters table');
        const $yearly = $('section#profit-loss table');

        let quarterlyData = this.parseTable($, $quarterly);
        const yearlyData = this.parseTable($, $yearly);

        quarterlyData = this.convertToTtm(quarterlyData);

        const merged = this.merge(quarterlyData, yearlyData);

        return merged;
    }

    // Both inputs: { time: [], revenue: [], netProfit: [] }
    //return {revenue: [[date, value],...], netProfit: [[date, value, ...]]}
    merge(quarterlyData, yearlyData) {
        // Optimize dictionary builds: O(N) time using single-pass loops instead of object spreading
        const qRev = new Map();
        const qProf = new Map();

        quarterlyData.time.forEach((t, i) => {
            qRev.set(t, quarterlyData.revenue[i]);
            qProf.set(t, quarterlyData.netProfit[i]);
        });

        const yRev = new Map();
        const yProf = new Map();

        yearlyData.time.forEach((t, i) => {
            yRev.set(t, yearlyData.revenue[i]);
            yProf.set(t, yearlyData.netProfit[i]);
        });

        // Combine unique dates using a Set and sort chronologically
        const allUniqueDates = Array.from(new Set([
            ...quarterlyData.time,
            ...yearlyData.time
        ])).sort((a, b) => new Date(a) - new Date(b));

        const time = [];
        const revenue = [];
        const netProfit = [];

        // Single-pass mapping through the sorted dates
        for (let i = 0; i < allUniqueDates.length; i++) {
            const date = allUniqueDates[i];

            // Prioritize quarterly data if present, fall back to yearly
            revenue.push(qRev.has(date) ? [date, qRev.get(date)] : [date, (yRev.get(date) ?? null)]);
            netProfit.push(qProf.has(date) ? [date, qProf.get(date)] : [date, (yProf.get(date) ?? null)]);
        }

        return { revenue, netProfit };
    }

    // quarteryData = {time: [], revenue: [], netProfit: []}
    convertToTtm(quarteryData) {
        const { time, revenue, netProfit } = quarteryData;
        if (time.length < 4) return { time: [], revenue: [], netProfit: [] };

        const data = { time: time.slice(3), revenue: [], netProfit: [] };

        for (let i = 3; i < time.length; i++) {
            const ttmRevenue = revenue[i] + revenue[i - 1] + revenue[i - 2] + revenue[i - 3];
            const ttmNetProfit = netProfit[i] + netProfit[i - 1] + netProfit[i - 2] + netProfit[i - 3];

            data.revenue.push(ttmRevenue);
            data.netProfit.push(ttmNetProfit);
        }
        return data;
    }

    async getUrl(symbol) {
        if (this.symbol_urlMap.has(symbol)) return this.symbol_urlMap.get(symbol);

        const res = await fetch(`https://www.screener.in/api/company/search/?q=${encodeURIComponent(symbol)}`);
        const suggestions = await res.json();

        let index = -1;
        for (let i = 0; i < suggestions.length; i++) {
            const array = suggestions[i].url.split('/'); // [ '', 'company', 'VBL', 'consolidated', '' ]
            if (array[2] === symbol) {
                index = i;
                break;
            }
        }

        // Fallback safety if the specific symbol variant isn't found exactly in array[2]
        if (index === -1 && suggestions.length > 0) index = 0;
        if (index === -1) throw new Error(`Symbol ${symbol} not found on Screener.`);

        const url = this.host + suggestions[index].url;
        this.symbol_urlMap.set(symbol, url);
        return url;
    }

    parseTable($, $table) {
        const metricNameMap = { 'Sales': 'revenue', 'Revenue': 'revenue', 'Net Profit': 'netProfit' };
        const data = { revenue: [], netProfit: [] };

        // 1. Extract the headers (Quarters)
        // Track the column indices that match real dates (skipping empty corner and TTM)
        const validColumnIndices = [];
        const quarters = [];

        $table.find('thead tr th').each((i, el) => {
            const text = $(el).attr('data-date-key');
            const headerString = $(el).text().trim();
            // Skip the first empty corner header cell if it exists
            // Explicitly filter columns out if they are a placeholder or contain "TTM" text
            if (text && i > 0 && headerString !== 'TTM' && text !== 'TTM') {
                quarters.push(text);
                validColumnIndices.push(i);
            }
        });

        // 2. Extract each metric row
        $table.find('tbody tr').each((i, rowEl) => {
            const $row = $(rowEl);

            // The row name (e.g., "Sales", "Expenses") is usually in the first button/text cell
            let metricName = $row.find('td').first().text().trim();
            // Clean up any nested button icons/expand labels if present
            metricName = metricName.replace(/\s+/g, ' ');
            // Remove the "+" sign and trim any remaining spaces ("Sales +" -> "Sales")
            metricName = metricName.replace(/\+$/, '').trim();

            const targetKey = metricNameMap[metricName];
            if (!targetKey) return; // Skip rows we aren't tracking

            const rowCells = $row.find('td');
            const metricData = [];

            // Match values purely based on structural validation of the header track
            for (let k = 0; k < validColumnIndices.length; k++) {
                const targetIdx = validColumnIndices[k];
                const cellEl = rowCells.get(targetIdx);

                if (!cellEl) {
                    metricData.push(null);
                    continue;
                }

                const valText = $(cellEl).text().trim().replace(/,/g, '');
                const numVal = Number(valText);

                metricData.push(isNaN(numVal) || valText === '' ? null : numVal);
            }

            data[targetKey] = metricData;
        });


        return { time: quarters, ...data };
    }

}