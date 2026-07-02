
export const ChartState = (() => {
    let lineData = $state([]); //Array of [timestamp in miliseconds or seconds, value]
    let isMonthly = $state(false);
    let scaleFactor = $state('');
    let activeModal = $state(null);
    let flags = $state(null);
    let currentScrip = $state('');
    let groww = $state(null);
    let isLoading = $state(false);

    let barData = $derived(LineDataToBarData(lineData, isMonthly ? "M" : "W"));

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