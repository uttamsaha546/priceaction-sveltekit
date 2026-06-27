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
                if (item.shape === 'labelUp') {
                    this._drawLabel(ctx, item.color, item.text, true);
                } else if (item.shape === 'labelDown') {
                    this._drawLabel(ctx, item.color, item.text, false);
                }
                ctx.restore();
            }
        });
    }

    _drawLabel(ctx, color, text, isUp) {
        const paddingX = 2;
        const paddingY = 3;
        ctx.font = '10px sans-serif';
        const textMetrics = ctx.measureText(text || '');
        const textWidth = textMetrics.width;
        const textHeight = 8;

        const rectWidth = textWidth + paddingX * 2;
        const rectHeight = textHeight + paddingY * 2;

        const xOffset = -rectWidth / 2;
        const yOffset = isUp ? -rectHeight - 14 : 14;

        ctx.fillStyle = color || '#9c27b0';
        ctx.beginPath();
        ctx.roundRect(xOffset, yOffset, rectWidth, rectHeight, 4);
        ctx.fill();

        ctx.beginPath();
        if (isUp) {
            ctx.moveTo(-4, -15);
            ctx.lineTo(4, -15);
            ctx.lineTo(0, -10);
        } else {
            ctx.moveTo(-4, 15);
            ctx.lineTo(4, 15);
            ctx.lineTo(0, 10);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text || '', 0, yOffset + rectHeight / 2);
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
        const rsiValues = this._calculateRSI(seriesBars, 'close', 14);

        // 2. Map the generated indicators directly to coordinates in a single pass
        const mappedData = [];

        for (let i = 0; i < seriesBars.length; i++) {
            const rsi = rsiValues[i];
            if (rsi === null) continue;

            const bar = seriesBars[i];
            let item = null;

            // Define marker criteria based on your technical rules
            if (rsi > 70) {
                item = {
                    time: bar.time,
                    position: 'belowBar',
                    color: 'rgb(76, 175, 80)', // green
                    shape: 'labelDown',
                    text: 'C'
                };
            } else if (rsi > 65) {
                item = {
                    time: bar.time,
                    position: 'belowBar',
                    color: 'rgb(76, 175, 80)', // green
                    shape: 'labelDown',
                    text: 'B'
                };
            } else if (rsi > 60) {
                item = {
                    time: bar.time,
                    position: 'belowBar',
                    color: 'rgb(76, 175, 80)', // green
                    shape: 'labelDown',
                    text: 'A'
                };
            } else if (rsi > 55) {
                item = {
                    time: bar.time,
                    position: 'belowBar',
                    color: 'rgba(76, 175, 80, 0.5)', // light green
                    shape: 'labelDown',
                    text: 'A'
                };
            } else if (rsi > 50) {
                item = {
                    time: bar.time,
                    position: 'aboveBar',
                    color: 'rgb(242, 54, 69)', // red
                    shape: 'labelUp',
                    text: 'X'
                };
            } else if (rsi > 45) {
                item = {
                    time: bar.time,
                    position: 'aboveBar',
                    color: 'rgb(242, 54, 69)', // red
                    shape: 'labelUp',
                    text: 'Y'
                };
            } else if (rsi <= 45) {
                item = {
                    time: bar.time,
                    position: 'aboveBar',
                    color: 'rgb(242, 54, 69)', // red
                    shape: 'labelUp',
                    text: 'Z'
                };
            }

            // Map valid marker definitions to canvas coordinate points
            if (item) {
                const x = timeScale.timeToCoordinate(item.time);
                const targetPrice = item.position === 'aboveBar' ? (bar.high ?? bar.value) * 1.01 : (bar.low ?? bar.value) * 0.99;
                const y = series.priceToCoordinate(targetPrice);

                mappedData.push({ x, y, shape: item.shape, color: item.color, text: item.text });
            }
        }

        this._renderer = new CustomShapeRenderer(mappedData);
    }

    // Helper method to compute the rolling RSI values inside the primitive pipeline
    _calculateRSI(bars, source = 'close', period = 14) {
        let rsiValues = new Array(bars.length).fill(null);
        if (bars.length <= period) return rsiValues;

        let gains = 0, losses = 0;

        for (let i = 1; i <= period; i++) {
            let diff = bars[i][source] - bars[i - 1][source];
            if (diff > 0) gains += diff;
            else losses -= diff;
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;
        rsiValues[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

        for (let i = period + 1; i < bars.length; i++) {
            let diff = bars[i][source] - bars[i - 1][source];
            let currentGain = diff > 0 ? diff : 0;
            let currentLoss = diff < 0 ? -diff : 0;

            avgGain = ((avgGain * (period - 1)) + currentGain) / period;
            avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

            rsiValues[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
        }

        return rsiValues;
    }

    renderer() { return this._renderer; }
    zOrder() { return 'normal'; }
}

export class CustomShapePrimitive {
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
