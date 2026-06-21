import { createSeriesMarkers, LineSeries } from "lightweight-charts";
import { ChartState } from "$lib/state/ChartState.svelte";

class CustomShapeRenderer {
    constructor(data) {
        this._data = data;
    }

    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const ctx = scope.context;

            for (const item of this._data) {
                if (item.x === null || item.y === null) continue;

                ctx.save();
                ctx.translate(item.x, item.y);
                if (item.shape === 'circle') {
                    this._drawCircle(ctx, item.color);
                }
                ctx.restore();
            }
        });
    }

    _drawCircle(ctx, color) {
        ctx.fillStyle = color || 'orange';
        ctx.beginPath();
        // arc(x, y, radius, startAngle, endAngle)
        ctx.arc(0, 0, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
}

class CustomShapePaneView {
    constructor(primitive) {
        this._primitive = primitive;
        this._renderer = new CustomShapeRenderer([]);
    }

    update() {
        const series = this._primitive.series();
        const chart = this._primitive.chart();
        if (!series || !chart) return;

        const timeScale = chart.timeScale();
        const seriesBars = series.data();

        if (!seriesBars || seriesBars.length === 0) {
            this._renderer = new CustomShapeRenderer([]);
            return;
        }

        // 1. Calculate RSI inline from the current series data bars
        const donchianValues = this._calculateDonchianHigh(seriesBars, 'high', ChartState.isMonthly ? 6 : 20);
        const donchianLows = this._calculateDonchianHigh(seriesBars, 'high', ChartState.isMonthly ? 6 : 20);

        // 2. Map the generated indicators directly to coordinates in a single pass
        const mappedData = [];

        for (let i = 1; i < seriesBars.length; i++) {
            const dc = donchianValues[i];
            if (dc === null) continue;

            const bar = seriesBars[i];
            let item = null;

            // Define marker criteria based on your technical rules
            if (donchianValues[i] > donchianValues[i - 1]) {
                item = {
                    time: bar.time,
                    position: 'aboveBar',
                    color: 'orange', // green
                    shape: 'circle',
                };
            } else if (donchianLows[i] < donchianLows[i - 1]) {
                item = {
                    time: bar.time,
                    position: 'belowBar',
                    color: 'blue', // green
                    shape: 'circle',
                };
            }


            // Map valid marker definitions to canvas coordinate points
            if (item) {
                const x = timeScale.timeToCoordinate(item.time);
                const targetPrice = item.position === 'aboveBar' ? (bar.high ?? bar.value) * 1.05 : (bar.low ?? bar.value) * 0.95;
                const y = series.priceToCoordinate(targetPrice);

                mappedData.push({ x, y, shape: item.shape, color: item.color });
            }
        }

        this._renderer = new CustomShapeRenderer(mappedData);
    }

    // Helper method to compute the rolling RSI values inside the primitive pipeline
    _calculateDonchianHigh(bars, source = 'close', period = 20) {
        let donchianHigh = [];

        for (let i = 0; i < bars.length; i++) {
            if (i < period - 1) {
                donchianHigh.push(null)
                continue;
            }

            const windowData = bars.slice(i - period + 1, i + 1);

            const highs = windowData.map(item => item[source]);

            const highestHigh = Math.max(...highs);
            donchianHigh.push(highestHigh);
        }
        return donchianHigh;
    }

    _getDonchianLows(data, period) {
        const lows = [];

        // Map data to ensure we have an array of numbers, handling both raw arrays and OHLC objects
        const mappedData = data.map(item => typeof item === 'number' ? item : item.low);

        for (let i = 0; i < mappedData.length; i++) {
            // Calculate the start of our lookback window, preventing negative indices
            const start = Math.max(0, i - period + 1);
            const window = mappedData.slice(start, i + 1);

            // Find the minimum value in the current window
            const currentLow = Math.min(...window);
            lows.push(currentLow);
        }

        return lows;
    }

    renderer() { return this._renderer; }
    zOrder() { return 'normal'; }
}

export class DonchianHighPrimitive {
    constructor() {
        this._chart = null;
        this._series = null;
        this._paneView = new CustomShapePaneView(this);
    }

    chart() { return this._chart; }
    series() { return this._series; }

    attached({ chart, series, requestUpdate }) {
        this._chart = chart;
        this._series = series;
        this._requestUpdate = requestUpdate;
        this.update();
    }

    detached() {
        this._chart = null;
        this._series = null;
        this._requestUpdate = null;
    }

    updateAllViews() {
        this.update();
    }

    update() {
        this._paneView.update();
        if (this._requestUpdate) {
            this._requestUpdate();
        }
    }

    paneViews() {
        return [this._paneView];
    }
}
