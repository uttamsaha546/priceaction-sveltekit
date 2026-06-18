
export const ChartState = (() => {
    let lineData = $state([]);
    let isMonthly = $state(false);
    let scaleFactor = $state(1);
    let activeModal = $state(null);

    let barData = $derived(LineDataToBarData(lineData, isMonthly ? "M" : "W"));

    return {
        get lineData() { return lineData; },
        set lineData(val) { lineData = val; },

        get barData() { return barData; }, // Read-only derived data
        get rsiMarkers() { return rsiMarkers; },

        get isMonthly() { return isMonthly; },
        set isMonthly(val) { isMonthly = val; },

        get scaleFactor() { return scaleFactor; },
        set scaleFactor(val) { scaleFactor = val; },

        get activeModal() { return activeModal; },
        set activeModal(val) { activeModal = val; }
    };
})();


// ----------HELPER FYNCTIONS------------//

function calculateRsiSeriesMarker(barData, source='close', period=14){

  if (barData.length <= period) {
    return []; // Not enough data points
  }

  let rsiValues = new Array(barData.length).fill(null);
  let gains = 0;
  let losses = 0;

  // Step 1: Calculate initial averages for the first 'period'
  for (let i = 1; i <= period; i++) {
    let difference = barData[i][source] - barData[i - 1][source];
    if (difference > 0) {
      gains += difference;
    } else {
      losses -= difference; // Keep losses as a positive number
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // First RSI value available is at the end of the initial period
  rsiValues[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  // Step 2: Use Wilder's smoothing technique for the remaining data points
  for (let i = period + 1; i < barData.length; i++) {
    let difference = barData[i][source] - barData[i - 1][source];
    let currentGain = difference > 0 ? difference : 0;
    let currentLoss = difference < 0 ? -difference : 0;

    // Smoothed averages formula
    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

    if (avgLoss === 0) {
      rsiValues[i] = 100;
    } else {
      let rs = avgGain / avgLoss;
      rsiValues[i] = 100 - (100 / (1 + rs));
    }
  }

  const markers = barData.map((row,index)=>{
    const time = row.time,
    rsi = rsiValues[index];
    if(!rsi) return({time})
    const position = rsi>55 ? 'belowBar':'aboveBar';
    const color = rsi>60? '#50C878' : rsi>55? 'rgba(80, 200, 120, 0.5)' : '#EE4B2B';
    const shape = position==='belowBar'? "labelUp":'labelDown';
    const text = rsi>70?'C':rsi>65?'B':rsi>60?'A':rsi>55?'A-':rsi>50?'X':rsi>45?'Y':'Z';

    return ({time, position, color, shape, text, size:0.5})
  })

  console.log(markers)
  return markers;
}

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

        if (length === 10) {
            timestamp *= 1000; //convert to miliseconds if in seconds
        } else if (length !== 13) {
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