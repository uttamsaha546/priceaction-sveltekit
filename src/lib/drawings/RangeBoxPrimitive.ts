import type { IPrimitivePaneView, IPrimitivePaneRenderer, Time, PrimitiveHoveredItem } from "lightweight-charts";
import { type BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D } from 'fancy-canvas';
import { BaseDrawingPrimitive } from './BaseDrawingPrimitive';
import { timeToUnixTimestamp } from "./utils";

export interface Point {
    time: Time;
    price: number;
}

export interface SerializedRangeBox {
    id: string;
    type: 'range-box';
    points: Point[];
    options: {
        isLogScale: boolean;
        boxColor: string;
        lineColor: string;
    };
}

class RangeBoxPaneRenderer implements IPrimitivePaneRenderer {
    constructor(
        private _data: {
            p1: Point; p2: Point; isLogScale?: boolean; boxColor?: string; lineColor?: string; hoverBoxColor?: string;
            hoverLineColor?: string;
            isHovered?: boolean;
            isSelected?: boolean;
        } | null,
        private _positions: { x1: number; y1: number; x2: number; y2: number; yMid: number } | null
    ) {
    }

    draw(target: CanvasRenderingTarget2D) {
        if (!this._positions || !this._data) return;

        target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
            const ctx = scope.context;
            const hRatio = scope.horizontalPixelRatio;
            const vRatio = scope.verticalPixelRatio;

            const { x1, y1, x2, y2, yMid } = this._positions;

            const left = Math.min(x1, x2) * hRatio;
            const right = Math.max(x1, x2) * hRatio;
            const top = Math.min(y1, y2) * vRatio;
            const bottom = Math.max(y1, y2) * vRatio;
            const midY = yMid * vRatio;

            const isHovered = this._data!.isHovered;
            const isSelected = this._data!.isSelected;

            // Determine colors based on hover state
            const boxColor = isHovered
                ? (this._data!.hoverBoxColor || 'rgba(59, 130, 246, 0.35)')
                : (this._data!.boxColor || 'rgba(59, 130, 246, 0.15)');

            const lineColor = isHovered
                ? (this._data!.hoverLineColor || '#1d4ed8')
                : (this._data!.lineColor || '#2563eb');

            ctx.save();

            // Shaded background
            ctx.fillStyle = boxColor;
            ctx.fillRect(left, top, right - left, bottom - top);

            // Border line
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = (isHovered ? 2 : 1.5) * hRatio; // Slightly thicker border on hover
            ctx.strokeRect(left, top, right - left, bottom - top);

            // 50% Midpoint Line
            ctx.beginPath();
            ctx.setLineDash([4 * hRatio, 4 * hRatio]);
            ctx.moveTo(left, midY);
            ctx.lineTo(right, midY);
            ctx.stroke();

            // Render Handle Nodes when selected or hovered
            if (isSelected || isHovered) {
                const handleSize = 6 * hRatio;
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 2 * hRatio;

                // Draw handles at Point 1 and Point 2 pixel locations
                const px1 = x1 * hRatio;
                const py1 = y1 * vRatio;
                const px2 = x2 * hRatio;
                const py2 = y2 * vRatio;

                ctx.fillRect(px1 - handleSize / 2, py1 - handleSize / 2, handleSize, handleSize);
                ctx.strokeRect(px1 - handleSize / 2, py1 - handleSize / 2, handleSize, handleSize);

                ctx.fillRect(px2 - handleSize / 2, py2 - handleSize / 2, handleSize, handleSize);
                ctx.strokeRect(px2 - handleSize / 2, py2 - handleSize / 2, handleSize, handleSize);
            }

            ctx.restore();
        });
    }
}

class RangeBoxPaneView implements IPrimitivePaneView {
    constructor(private _source: RangeBoxPrimitive) { }

    private _getCoordinateForTime(time: Time): number | null {
        if (!this._source.chart || !this._source.series) return null;

        const timeScale = this._source.chart.timeScale();

        // 1. Try exact time-to-coordinate match (works for existing bars & explicit whitespace times)
        let coord = timeScale.timeToCoordinate(time);
        if (coord !== null) return coord;

        const targetTimestamp = timeToUnixTimestamp(time);
        const seriesData = this._source.series.data();
        if (!seriesData || seriesData.length === 0) return null;

        const firstBar = seriesData[0];
        const lastBar = seriesData[seriesData.length - 1];
        const firstTimestamp = timeToUnixTimestamp(firstBar.time);
        const lastTimestamp = timeToUnixTimestamp(lastBar.time);

        // 2. Point is BEYOND the last candle (In the Post-Whitespace Region)
        if (targetTimestamp > lastTimestamp) {
            // Get logical index of the last candle
            const lastBarCoordinate = timeScale.timeToCoordinate(lastBar.time);
            if (lastBarCoordinate === null) return null;

            // Estimate average time interval between candles to project forward in whitespace
            const barCount = seriesData.length;
            const interval = seriesData[1].time - seriesData[0].time;
            //weekly = 604800, fortnightly = 604800*2, monthly = 604800*4
            const chartTimeframe = interval < 605000 ? 604800 : interval < 605000 * 2 ? 604800 * 2 : 604800 * 4;

            // Calculate how many bars ahead this point is
            const barOffset = Math.round((targetTimestamp - lastTimestamp) / chartTimeframe);

            // Use timeScale's bar spacing to project the coordinate into whitespace
            const visibleRange = timeScale.getVisibleLogicalRange();
            if (!visibleRange) return lastBarCoordinate;

            // Convert last bar's time to logical index, add offset, and convert to coordinate
            // In Lightweight Charts, timeScale supports coordinate mapping for logical indices beyond dataset boundaries
            const lastLogicalIndex = barCount - 1;
            const targetLogicalIndex = lastLogicalIndex + barOffset;

            return timeScale.logicalToCoordinate(targetLogicalIndex as any);
        }

        // 3. Point is BEFORE the first candle (In the Pre-Whitespace Region)
        // if (targetTimestamp < firstTimestamp) {
        //     const firstBarCoordinate = timeScale.timeToCoordinate(firstBar.time);
        //     if (firstBarCoordinate === null) return null;

        //     const barCount = seriesData.length;
        //     const averageInterval = barCount > 1
        //         ? (lastTimestamp - firstTimestamp) / (barCount - 1)
        //         : 86400;

        //     const barOffset = (firstTimestamp - targetTimestamp) / averageInterval;
        //     return timeScale.logicalToCoordinate((-barOffset) as any);
        // }

        // 4. Point is INSIDE the chart range (Find closest candle timestamp across timeframes)
        let closestTime = seriesData[0].time;
        let minDiff = Math.abs(timeToUnixTimestamp(closestTime) - targetTimestamp);

        for (let i = 1; i < seriesData.length; i++) {
            const currentDiff = Math.abs(timeToUnixTimestamp(seriesData[i].time) - targetTimestamp);
            if (currentDiff < minDiff) {
                minDiff = currentDiff;
                closestTime = seriesData[i].time;
            }
        }

        return timeScale.timeToCoordinate(closestTime);
    }

    renderer() {
        const points = this._source.points;
        if (points.length < 2 || !this._source.series || !this._source.chart) {
            return new RangeBoxPaneRenderer(null, null);
        }

        const series = this._source.series;
        // const timeScale = this._source.chart.timeScale();

        const [p1, p2] = points;
        // const x1 = timeScale.timeToCoordinate(p1.time);
        const x1 = this._getCoordinateForTime(p1.time);
        const y1 = series.priceToCoordinate(p1.price);
        // const x2 = timeScale.timeToCoordinate(p2.time);
        const x2 = this._getCoordinateForTime(p2.time);
        const y2 = series.priceToCoordinate(p2.price);

        if (x1 === null || y1 === null || x2 === null || y2 === null) {
            return new RangeBoxPaneRenderer(null, null);
        }

        const topPrice = Math.max(p1.price, p2.price);
        const bottomPrice = Math.min(p1.price, p2.price);

        // Geometric mean for Log scale, Arithmatic for Linear scale
        const midPrice = this._source.options.isLogScale ? Math.sqrt(topPrice * bottomPrice) : (topPrice + bottomPrice) / 2;

        const yMid = series.priceToCoordinate(midPrice) ?? (y1 + y2) / 2;

        return new RangeBoxPaneRenderer(
            { p1, p2, ...this._source.options, isHovered: this._source.isHovered, isSelected: this._source.isSelected, },
            { x1, y1, x2, y2, yMid }
        );
    }
}


export class RangeBoxPrimitive extends BaseDrawingPrimitive {
    public points: Point[] = [];
    public isHovered: boolean = false;
    public isSelected: boolean = false;

    public options = {
        isLogScale: true,
        boxColor: 'rgba(59, 130, 246, 0.15)',
        lineColor: '#2563eb',
        hoverBoxColor: 'rgba(59, 130, 246, 0.35)', // Color when hovered
        hoverLineColor: '#1d4ed8',                  // Border color when hovered
    };

    private _paneViews = [new RangeBoxPaneView(this)];

    constructor(points?: Point[], options?: Partial<typeof this.options>, id?: string) {
        super();
        if (points) this.points = points;
        if (options) this.options = { ...this.options, ...options };
        if (id) this.id = id;
    }

    public setHovered(hovered: boolean) {
        if (this.isHovered !== hovered) {
            this.isHovered = hovered;
            this.requestUpdate(); // Redraw with new hover state
        }
    }

    public setSelected(selected: boolean) {
        if (this.isSelected !== selected) {
            this.isSelected = selected;
            this.requestUpdate();
        }
    }

    // Convert drawing state to JSON for SQLite storage
    public toJSON(): SerializedRangeBox {
        return {
            id: this.id,
            type: 'range-box',
            points: this.points,
            options: this.options,
        };
    }

    // Reconstruct drawing instance from SQLite JSON
    public static fromJSON(json: SerializedRangeBox): RangeBoxPrimitive {
        return new RangeBoxPrimitive(json.points, json.options, json.id);
    }

    public updatePoint(index: number, point: Point) {
        if (this.points[index]) {
            this.points[index] = point;
            this.requestUpdate();
        }
    }

    updatePoints(points: Point[]) {
        this.points = points;
        this.requestUpdate();
    }

    public setOptions(newOptions: Partial<typeof this.options>) {
        this.options = { ...this.options, ...newOptions };
        this.requestUpdate(); // Redraw chart with new visual options
    }

    paneViews() {
        return this._paneViews;
    }

    hitTest(x: number, y: number): PrimitiveHoveredItem | null {
        if (this.points.length < 2 || !this.chart || !this.series) return null;

        const timeScale = this.chart.timeScale();
        const x1 = timeScale.timeToCoordinate(this.points[0].time);
        const y1 = this.series.priceToCoordinate(this.points[0].price);
        const x2 = timeScale.timeToCoordinate(this.points[1].time);
        const y2 = this.series.priceToCoordinate(this.points[1].price);

        if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

        // Check hit on Point 1 handle anchor
        const distP1 = Math.hypot(x - x1, y - y1);
        if (distP1 <= 8) {
            return { cursorStyle: 'nwse-resize', externalId: `${this.id}:p0`, zOrder: 'top' };
        }

        // Check hit on Point 2 handle anchor
        const distP2 = Math.hypot(x - x2, y - y2);
        if (distP2 <= 8) {
            return { cursorStyle: 'nwse-resize', externalId: `${this.id}:p1`, zOrder: 'top' };
        }

        // Check hit on entire box area
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);

        const threshold = 6;

        const isInsideBox = x >= left && x <= right && y >= top && y <= bottom;
        const isNearEdge =
            (Math.abs(x - left) <= threshold || Math.abs(x - right) <= threshold) && y >= top && y <= bottom ||
            (Math.abs(y - top) <= threshold || Math.abs(y - bottom) <= threshold) && x >= left && x <= right;

        if (isInsideBox || isNearEdge) {
            return {
                cursorStyle: 'pointer',
                externalId: this.id,
                zOrder: 'normal',
            };
        }

        return null;
    }
}

