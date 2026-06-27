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
                if (item.shape === 'flag') {
                    this._drawFlag(ctx, item.color);
                }
                ctx.restore();
            }
        });
    }

    _drawFlag(ctx, color = 'blue') {
        // --- 1. DRAW FLAGPOLE ---
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(-2, -4);  // Top of pole
        ctx.lineTo(-2, 4); // Bottom of pole
        ctx.stroke();
        ctx.closePath();

        // --- 2. DRAW WAVY FLAG SHAPE ---
        ctx.beginPath();
        ctx.moveTo(-2, -5); // Top-left attached to pole

        // Top wavy edge
        ctx.bezierCurveTo(0, -4, 2, -4, 4, -4);
        // Right vertical edge
        ctx.lineTo(4, 0);
        // Bottom wavy edge (mirrors the top wave)
        ctx.bezierCurveTo(2, 0, 0, 0, -2, 0);
        ctx.fill();
        ctx.closePath();
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

        // 1. Calculate 52 week high inline from the current series data bars
        const _52weekHigh = this._calculate52WeekHigh(seriesBars, 'close', ChartState.isMonthly ? 12 : 52);
        // 2. Map the generated indicators directly to coordinates in a single pass
        const mappedData = [];

        for (let i = 1; i < seriesBars.length; i++) {
            const value = _52weekHigh[i];
            if (value === null) continue;

            const bar = seriesBars[i];
            let item = null;

            // Define marker criteria based on your technical rules
            if (_52weekHigh[i] > _52weekHigh[i - 1]) {
                item = {
                    time: bar.time,
                    position: 'aboveBar',
                    color: 'blue',
                    shape: 'flag',
                };
            }

            // Map valid marker definitions to canvas coordinate points
            if (item) {
                const x = timeScale.timeToCoordinate(item.time);
                const targetPrice = item.position === 'aboveBar' ? (bar.high ?? bar.value) * 1.1 : (bar.low ?? bar.value) * 0.9;
                const y = series.priceToCoordinate(targetPrice);

                mappedData.push({ x, y, shape: item.shape, color: item.color });
            }
        }

        this._renderer = new CustomShapeRenderer(mappedData);
    }

    // Helper method to compute the rolling RSI values inside the primitive pipeline
    _calculate52WeekHigh(bars, source = 'high', period = 52) {
        let _52WeekHigh = [];

        for (let i = 0; i < bars.length; i++) {
            if (i < period - 1) {
                _52WeekHigh.push(null)
                continue;
            }

            const windowData = bars.slice(i - period + 1, i + 1);

            const highs = windowData.map(item => item[source]);

            const highestHigh = Math.max(...highs);
            _52WeekHigh.push(highestHigh);
        }
        return _52WeekHigh;
    }

    renderer() { return this._renderer; }
    zOrder() { return 'normal'; }
}

export class _52WeekHighPrimitive {
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
