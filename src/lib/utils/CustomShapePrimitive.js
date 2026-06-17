import { createSeriesMarkers, LineSeries } from "lightweight-charts";
import { ChartState } from "$lib/state/ChartState.svelte";
import { RsiSeriesMarker } from "./RsiSeriesMarker";

class CustomShapeRenderer {
    constructor(data) {
        this._data = data
    }

    draw(taregt) {
        taregt.useMediaCoordinateSpace((scope) => {
            const ctx = scope.context;

            for (const item of this._data) {
                if (item.x === null || item.y === null) return;
                ctx.save();
                ctx.translate(item.x, item.y);
                if (item.shape === 'labelUp') {
                    this._drawLabel(ctx, item.color, item.text, true);
                } else if (item.shape === 'labelDown') {
                    this._drawLabel(ctx, item.color, item.text, false);
                }
                ctx.restore();
            }
        })
    }
    _drawLabel(ctx, color, text, isUp) {
        const paddingX = 8;
        const paddingY = 4;
        ctx.font = '11px sans-serif';
        const textMetrics = ctx.measureText(text || '');
        const textWidth = textMetrics.width;
        const textHeight = 11;

        const rectWidth = textWidth + paddingX * 2;
        const rectHeight = textHeight + paddingY * 2;

        const xOffset = -rectWidth / 2;
        const yOffset = isUp ? -rectHeight - 12 : 12;

        ctx.fillStyle = color || '#9c27b0';
        ctx.beginPath();
        ctx.roundRect(xOffset, yOffset, rectWidth, rectHeight, 4);
        ctx.fill();

        ctx.beginPath();
        if (isUp) {
            ctx.moveTo(-5, -12);
            ctx.lineTo(5, -12);
            ctx.lineTo(0, -6);
        } else {
            ctx.moveTo(-5, 12);
            ctx.lineTo(5, -12);
            ctx.lineTo(0, 6);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text || '', 0, yOffset + rectHeight / 2, 1);
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
        if (!series || !chart || !series.data()) return;
        console.log(series.data())
        const timeScale = chart.timeScale();
        const data = this._primitive.data();

        //Map time/price nodes to x/y canvas coordinates
        const mappedData = data.map(item => {
            console.log(timeScale.timeToIndex(1744588800, true))
            const x = timeScale.timeToCoordinate(item.time);
            const y = series.priceToCoordinate(item.price);

            return { x, y, shape: item.shape, color: item.color, text: item.text };
        });

        this._renderer = new CustomShapeRenderer(mappedData);
    }

    renderer() {
        return this._renderer;
    }
    zOrder() {
        return 'top';
    }
}

export class CustomShapePrimitive {
    constructor(dataPoints) {
        this._dataPoints = dataPoints;
        this._chart = null;
        this._series = null;
        this._paneViews = [new CustomShapePaneView(this)];
    }

    chart() { return this._chart }
    series() { return this._series }
    data() { return this._dataPoints }

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
        this.update()
    }

    //Signals views to transform coordinates when chart moves, updates, or zooms
    update() {
        this._paneViews.forEach(view => view.update());
        if (this._requestUpdate) {
            this._requestUpdate(); // Tells chart engine to repaint the canvas layer
        }
    }

    paneViews() {
        return this._paneViews;
    }
}