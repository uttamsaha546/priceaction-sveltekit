
export const ChartState = (() => {
    let lineData = $state([]); //Array of [timestamp in miliseconds or seconds, value]
    let isMonthly = $state(false);
    let scaleFactor = $state('');
    let activeModal = $state(null);
    let flags = $state(null);
    let currentScrip = $state('');
    let groww = $state(null);
    let isLoading = $state(false);
    let bottomRight = $state(null);
    let EarningsData = $state([]);

    let barData = $derived(fillWhitespaceGaps(LineDataToBarData(lineData, isMonthly ? "M" : "W"), isMonthly ? "M" : "W"));
    let histogramData = $derived(fillWhitespaceGaps(EarningsDataToHistogramData(EarningsData, isMonthly ? "M" : "W"), isMonthly ? "M" : "W"));

    return {
        get lineData() { return lineData; },
        set lineData(val) { lineData = val; },

        get barData() { return barData; },

        get isMonthly() { return isMonthly; },
        set isMonthly(val) { isMonthly = val; },

        get flags() { return flags },
        set flags(val) { flags = val },

        get scaleFactor() { return scaleFactor; },
        set scaleFactor(val) { scaleFactor = val; },

        get activeModal() { return activeModal; },
        set activeModal(val) { activeModal = val; },

        get currentScrip() { return currentScrip },
        set currentScrip(val) { currentScrip = val },

        get groww() { return groww },
        set groww(val) { groww = val },

        get isLoading() { return isLoading },
        set isLoading(val) { isLoading = val },

        get bottomRight() { return bottomRight },
        set bottomRight(val) { bottomRight = val },

        get EarningsData() { return EarningsData },
        set EarningsData(val) { EarningsData = val },

        get histogramData() { return histogramData },
    };
})();


// ----------HELPER FYNCTIONS------------//

/**
 * Convert line data into weekly or monthly OHLC candles.
 *
 * @param {Array<[timestamp:number, value:number]>} lineData
 * @param {"W"|"M"} interval
 * @returns {Array<{time:number, open:number, high:number, low:number, close:number}>}
 */
function LineDataToBarData(lineData, interval) {

    if (interval !== 'W' && interval !== 'M') {
        throw new Error(`Unsupported interval: ${interval}`);
    }

    const intervalStartMap = new Map();

    const sorted = [...lineData].sort((a, b) => a[0] - b[0]);

    for (let [timestamp, value] of sorted) {
        const length = String(timestamp).length;

        if (length === 9 || length === 10) {
            timestamp *= 1000; //convert to miliseconds if in seconds, 9 = 1973 – March 2001, 10 = Current Era (Until Year 2286)
        } else if (length == 12 || length === 13) {
            //keep timestamp as it is in milisecond, 12 = 1973 – March 2001, 10 = Current Era (Until Year 2286)
        }
        else {
            console.warn(`Unexpected timestamp length: ${length}. Timestamp: ${timestamp}`);
            continue;
        }

        if (value == null) continue;

        const date = new Date(timestamp);

        const intervalStartKey =
            interval === 'W'
                ? getWeekStartUTC(timestamp)
                : getMonthStartUTC(timestamp);

        if (!intervalStartMap.has(intervalStartKey)) {
            intervalStartMap.set(intervalStartKey, {
                time: Math.floor(intervalStartKey / 1000),
                open: value,
                high: value,
                low: value,
                close: value
            });
        } else {
            const candle = intervalStartMap.get(intervalStartKey);

            candle.high = Math.max(candle.high, value);
            candle.low = Math.min(candle.low, value);
            candle.close = value;
        }
    }

    return [...intervalStartMap.values()];
}

function EarningsDataToHistogramData(EarningsData, interval) {
    // console.log(EarningsData)
    if (!EarningsData || !EarningsData.past || !EarningsData.past.revenue) {
        return [];
    }

    const { past, estimate } = EarningsData;

    if (interval !== 'W' && interval !== 'M') {
        throw new Error(`Unsupported interval: ${interval}`);
    }

    const intervalStartMap = new Map();

    for (let [date, value] of past.revenue) {

        if (!value) continue;

        let timestamp = new Date(date).valueOf();

        if (isNaN(timestamp)) {
            console.warn(`Invalid date format provided: ${dateStr}`);
            continue;
        }

        const length = String(timestamp).length;

        if (length === 9 || length === 10) {
            timestamp *= 1000; //convert to miliseconds if in seconds, 9 = 1973 – March 2001, 10 = Current Era (Until Year 2286)
        } else if (length == 12 || length === 13) {
            //keep timestamp as it is in milisecond, 12 = 1973 – March 2001, 10 = Current Era (Until Year 2286)
        }
        else {
            console.warn(`Unexpected timestamp length: ${length}. Timestamp: ${timestamp}`);
            continue;
        }

        const intervalStartKey =
            interval === 'W'
                ? getWeekStartUTC(timestamp)
                : getMonthStartUTC(timestamp);

        if (!intervalStartMap.has(intervalStartKey)) {
            intervalStartMap.set(intervalStartKey, {
                time: Math.floor(intervalStartKey / 1000),
                value: value
            });
        } else {
            const candle = intervalStartMap.get(intervalStartKey);

            candle.value = value;
        }
    }

    for (let [date, value] of estimate.revenue) {

        if (!value) continue;

        let timestamp = new Date(date).valueOf();

        if (isNaN(timestamp)) {
            console.warn(`Invalid date format provided: ${dateStr}`);
            continue;
        }

        const length = String(timestamp).length;

        if (length === 9 || length === 10) {
            timestamp *= 1000; //convert to miliseconds if in seconds, 9 = 1973 – March 2001, 10 = Current Era (Until Year 2286)
        } else if (length == 12 || length === 13) {
            //keep timestamp as it is in milisecond, 12 = 1973 – March 2001, 10 = Current Era (Until Year 2286)
        }
        else {
            console.warn(`Unexpected timestamp length: ${length}. Timestamp: ${timestamp}`);
            continue;
        }

        const intervalStartKey =
            interval === 'W'
                ? getWeekStartUTC(timestamp)
                : getMonthStartUTC(timestamp);

        if (!intervalStartMap.has(intervalStartKey)) {
            intervalStartMap.set(intervalStartKey, {
                time: Math.floor(intervalStartKey / 1000),
                value: value,
                color: 'purple',
            });
        } else {
            const candle = intervalStartMap.get(intervalStartKey);

            candle.value = value;
        }
    }

    return [...intervalStartMap.values()];
}

function getWeekStartUTC(timestamp) {
    const d = new Date(timestamp);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;

    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);

    return d.getTime();
}

function getMonthStartUTC(timestamp) {
    const d = new Date(timestamp);

    return Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        1
    );
}

function getFortnightStartUTC(timestamp) {
    const d = new Date(timestamp);

    // Determine if the date falls in the first half (1-15) or second half (16+)
    const dayOfMonth = d.getUTCDate();
    const boundaryDay = dayOfMonth < 16 ? 1 : 16;

    return Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        boundaryDay,
        0, 0, 0, 0 // Reset time parameters to pure midnight
    );
}


/**
 * Fills in the missing intervals between sparse data points with whitespace objects
 * so Lightweight Charts preserves real calendar spacing.
 * 
 * @param {Array<{time: number, value: number}>} data - Your sorted histogram data
 * @param {"W"|"M"} interval - 'W' for weekly data, 'M' for monthly data
 */
function fillWhitespaceGaps(data, interval) {
    if (!data || data.length < 2) return data;

    // Ensure the incoming data is strictly sorted by time
    const sortedData = [...data].sort((a, b) => a.time - b.time);
    const result = [];

    for (let i = 0; i < sortedData.length; i++) {
        const current = sortedData[i];
        result.push(current);

        // If this is the last item, we're done generating gaps
        if (i === sortedData.length - 1) break;

        const next = sortedData[i + 1];

        // Convert timestamps back to milliseconds to calculate intervals safely
        let currentMs = current.time * 1000;
        const nextMs = next.time * 1000;

        // Step through time forward based on the selected interval configuration
        while (true) {
            let nextDate = new Date(currentMs);

            if (interval === 'M') {
                // Advance exactly 1 month
                nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
                // Ensure it snaps correctly back to the 1st day of the month
                currentMs = Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), 1);
            } else {
                // Advance exactly 1 week (7 days)
                nextDate.setUTCDate(nextDate.getUTCDate() + 7);
                currentMs = nextDate.getTime();
            }

            // Stop generating gaps once we reach the next true historical data point
            if (currentMs >= nextMs) {
                break;
            }

            // Push a clean Lightweight Charts whitespace object (just time, no value property)
            result.push({
                time: Math.floor(currentMs / 1000)
            });
        }
    }

    return result;
}