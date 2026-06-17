import { createSeriesMarkers, LineSeries } from "lightweight-charts";
import { ChartState } from "$lib/state/ChartState.svelte";
import { RsiSeriesMarker } from "./RsiSeriesMarker";

import {
    mergeOptionsWithDefaults,
    calculateShapeMargin,
    calculateShapeHeight,
    calculateAdjustedMargin,
    MismatchDirection,
    visibleTimedValues,
    fillSizeAndY,
    ensureNotNull,
    makeFont,
    RangeImpl
} from "./SeriesMarkersPrimitiveHelperFunctions";

/**
 * @implements {ISeriesPrimitive}
 */
export class SeriesMarkersPrimitive {
    _paneView = null;
    _markers = [];
    _indexedMarkers = [];
    _dataChangedHandler = null;
    _series = null;
    _chart = null;
    //  _requestUpdate () => void;
    _autoScaleMarginsInvalidated = true;
    _autoScaleMargins = null;
    _markersPositions = null;
    _cachedBarSpacing = null;
    _recalculationRequired = true;
    _options;

    constructor(options) {
        this._options = mergeOptionsWithDefaults(options);
    }


    attached(param) {
        this._recalculateMarkers();
        this._chart = param.chart;
        this._series = param.series;
        this._paneView = new SeriesMarkersPrimitivePaneView(this._series, ensureNotNull(this._chart), this._options);
        this._requestUpdate = param.requestUpdate;
        this._series.subscribeDataChanged((scope) => this._onDataChanged(scope));
        this._recalculationRequired = true;
        this.requestUpdate();
    }

    requestUpdate() {
        if (this._requestUpdate) {
            this._requestUpdate();
        }
    }

    detached() {
        if (this._series && this._dataChangedHandler) {
            this._series.unsubscribeDataChanged(this._dataChangedHandler);
        }

        this._chart = null;
        this._series = null;
        this._paneView = null;
        this._dataChangedHandler = null;
    }

    setMarkers(markers) {
        this._recalculationRequired = true;
        this._markers = markers;
        this._recalculateMarkers();
        this._autoScaleMarginsInvalidated = true;
        this._markersPositions = null;
        this.requestUpdate();
    }

    markers() {
        return this._markers;
    }

    paneViews() {
        return this._paneView ? [this._paneView] : [];
    }

    updateAllViews() {
        this._updateAllViews();
    }

    hitTest(x, y) {
        if (this._paneView) {
            return this._paneView.renderer()?.hitTest(x, y) ?? null;
        }
        return null;
    }

    autoscaleInfo(startTimePoint, endTimePoint) {
        if (this._options.autoScale && this._paneView) {
            const margins = this._getAutoScaleMargins();
            if (margins) {
                return {
                    priceRange: null,
                    margins: margins,
                };
            }
        }
        return null;
    }

    applyOptions(options) {
        this._options = mergeOptionsWithDefaults({ ...this._options, ...options });
        if (this.requestUpdate) {
            this.requestUpdate();
        }
    }

    _getAutoScaleMargins() {
        const chart = ensureNotNull(this._chart);
        const barSpacing = chart.timeScale().options().barSpacing;
        if (this._autoScaleMarginsInvalidated || barSpacing !== this._cachedBarSpacing) {
            this._cachedBarSpacing = barSpacing;
            if (this._markers.length > 0) {
                const shapeMargin = calculateShapeMargin(barSpacing);
                const marginValue = calculateShapeHeight(barSpacing) * 1.5 + shapeMargin * 2;
                const positions = this._getMarkerPositions();

                this._autoScaleMargins = {
                    above: calculateAdjustedMargin(marginValue, positions.aboveBar, positions.inBar),
                    below: calculateAdjustedMargin(marginValue, positions.belowBar, positions.inBar),
                };
            } else {
                this._autoScaleMargins = null;
            }

            this._autoScaleMarginsInvalidated = false;
        }

        return this._autoScaleMargins;
    }

    _getMarkerPositions() {
        if (this._markersPositions === null) {
            this._markersPositions = this._markers.reduce(
                (acc, marker) => {
                    if (!acc[marker.position]) {
                        acc[marker.position] = true;
                    }
                    return acc;
                },
                {
                    inBar: false,
                    aboveBar: false,
                    belowBar: false,
                    atPriceTop: false,
                    atPriceBottom: false,
                    atPriceMiddle: false,
                }
            );
        }
        return this._markersPositions;
    }

    _recalculateMarkers() {
        if (!this._recalculationRequired || !this._chart || !this._series) {
            return;
        }
        const timeScale = this._chart.timeScale();
        const seriesData = this._series?.data();
        if (timeScale.getVisibleLogicalRange() == null || !this._series || seriesData.length === 0) {
            this._indexedMarkers = [];
            return;
        }

        const firstDataIndex = timeScale.timeToIndex(ensureNotNull(seriesData[0].time), true);
        this._indexedMarkers = this._markers.map((marker, index) => {
            const timePointIndex = timeScale.timeToIndex(marker.time, true);
            const searchMode = timePointIndex < firstDataIndex ? MismatchDirection.NearestRight : MismatchDirection.NearestLeft;
            const seriesDataByIndex = ensureNotNull(this._series).dataByIndex(timePointIndex, searchMode);
            const finalIndex = timeScale.timeToIndex(ensureNotNull(seriesDataByIndex).time, false);

            // You must explicitly define the types so that the minification build processes the field names correctly
            const baseMarker = {
                time: finalIndex,
                position: marker.position,
                shape: marker.shape,
                color: marker.color,
                id: marker.id,
                internalId: index,
                text: marker.text,
                size: marker.size,
                price: marker.price,
                originalTime: marker.time,
            };

            if (
                marker.position === 'atPriceTop' ||
                marker.position === 'atPriceBottom' ||
                marker.position === 'atPriceMiddle'
            ) {
                if (marker.price === undefined) {
                    throw new Error(`Price is required for position ${marker.position}`);
                }
                return {
                    ...baseMarker,
                    position: marker.position, // TypeScript knows this is SeriesMarkerPricePosition
                    price: marker.price,
                };
            } else {
                return {
                    ...baseMarker,
                    position: marker.position, // TypeScript knows this is SeriesMarkerBarPosition
                    price: marker.price, // Optional for bar positions
                };
            }
        });
        this._recalculationRequired = false;
    }

    _updateAllViews(updateType) {
        if (this._paneView) {
            this._recalculateMarkers();
            this._paneView.setMarkers(this._indexedMarkers);
            this._paneView.updateOptions(this._options);
            this._paneView.update(updateType);
        }
    }

    _onDataChanged(scope) {
        this._recalculationRequired = true;
        this.requestUpdate();
    }
}


/**
 * @implements {IPrimitivePaneView}
 */
class SeriesMarkersPrimitivePaneView {
    _series;
    _chart;
    _data;
    _markers = [];
    _options;

    _invalidated = true;
    _dataInvalidated = true;

    _renderer = new SeriesMarkersPrimitivePaneRenderer();

    constructor(series, chart, options) {
        this._series = series;
        this._chart = chart;
        this._data = {
            items: [],
            visibleRange: null,
        };
        this._options = options;
    }

    renderer() {
        if (!this._series.options().visible) {
            return null;
        }

        if (this._invalidated) {
            this._makeValid();
        }

        const layout = this._chart.options()['layout'];
        this._renderer.setParams(layout.fontSize, layout.fontFamily, this._options.zOrder);
        this._renderer.setData(this._data);

        return this._renderer;
    }

    setMarkers(markers) {
        this._markers = markers;
        this.update('data');
    }

    update(updateType) {
        this._invalidated = true;
        if (updateType === 'data') {
            this._dataInvalidated = true;
        }
    }

    updateOptions(options) {
        this._invalidated = true;
        this._options = options;
    }

    zOrder() {
        return this._options.zOrder === 'aboveSeries' ? 'top' : this._options.zOrder;
    }

    _makeValid() {
        const timeScale = this._chart.timeScale();
        const seriesMarkers = this._markers;
        if (this._dataInvalidated) {
            this._data.items = seriesMarkers.map((marker) => ({
                time: marker.time,
                x: 0,
                y: 0,
                size: 0,
                shape: marker.shape,
                color: marker.color,
                externalId: marker.id,
                internalId: marker.internalId,
                text: undefined,
            }));
            this._dataInvalidated = false;
        }

        const layoutOptions = this._chart.options()['layout'];

        this._data.visibleRange = null;
        const visibleBars = timeScale.getVisibleLogicalRange();

        if (visibleBars === null) {
            return;
        }
        const visibleBarsRange = new RangeImpl(Math.floor(visibleBars.from), Math.ceil(visibleBars.to));
        const firstValue = this._series.data()[0];
        if (firstValue === null) {
            return;
        }
        if (this._data.items.length === 0) {
            return;
        }
        let prevTimeIndex = NaN;
        const shapeMargin = calculateShapeMargin(timeScale.options().barSpacing);
        const offsets = {
            aboveBar: shapeMargin,
            belowBar: shapeMargin,
        };

        this._data.visibleRange = visibleTimedValues(this._data.items, visibleBarsRange, true);
        for (let index = this._data.visibleRange.from; index < this._data.visibleRange.to; index++) {
            const marker = seriesMarkers[index];
            if (marker.time !== prevTimeIndex) {
                // new bar, reset stack counter
                offsets.aboveBar = shapeMargin;
                offsets.belowBar = shapeMargin;
                prevTimeIndex = marker.time;
            }

            const rendererItem = this._data.items[index];
            rendererItem.x = ensureNotNull(timeScale.logicalToCoordinate(marker.time));
            if (marker.text !== undefined && marker.text.length > 0) {
                rendererItem.text = {
                    content: marker.text,
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                };
            }

            const dataAt = this._series.dataByIndex(marker.time, MismatchDirection.None);
            if (dataAt === null) {
                continue;
            }
            fillSizeAndY(rendererItem, marker, dataAt, offsets, layoutOptions.fontSize, shapeMargin, this._series, this._chart);
        }

        this._invalidated = false;
    }
}


/**
 * @implements {IPrimitivePaneRenderer}
 */
class SeriesMarkersPrimitivePaneRenderer {
    _data = null;
    _textWidthCache = new TextWidthCache();
    _fontSize = -1;
    _fontFamily = '';
    _font = '';
    _zOrder = 'normal';

    setData(data) {
        this._data = data;
    }

    setParams(fontSize, fontFamily, zOrder) {
        if (this._fontSize !== fontSize || this._fontFamily !== fontFamily) {
            this._fontSize = fontSize;
            this._fontFamily = fontFamily;
            this._font = makeFont(fontSize, fontFamily);
            this._textWidthCache.reset();
        }
        this._zOrder = zOrder;
    }

    hitTest(x, y) {
        if (this._data === null || this._data.visibleRange === null) {
            return null;
        }

        for (let i = this._data.visibleRange.from; i < this._data.visibleRange.to; i++) {
            const item = this._data.items[i];
            if (item && hitTestItem(item, x, y)) {
                return {
                    zOrder: 'normal',
                    externalId: item.externalId ?? '',
                    itemType: 'marker',
                };
            }
        }

        return null;
    }

    draw(target) {
        if (this._zOrder === 'aboveSeries') {
            return;
        }
        target.useBitmapCoordinateSpace((scope) => {
            this._drawImpl(scope);
        });
    }

    drawBackground(target) {
        if (this._zOrder !== 'aboveSeries') {
            return;
        }
        target.useBitmapCoordinateSpace((scope) => {
            this._drawImpl(scope);
        });
    }

    _drawImpl({ context: ctx, horizontalPixelRatio, verticalPixelRatio }) {
        if (this._data === null || this._data.visibleRange === null) {
            return;
        }

        ctx.textBaseline = 'middle';
        ctx.font = this._font;

        for (let index = this._data.visibleRange.from; index < this._data.visibleRange.to; index++) {
            const item = this._data.items[index];
            if (item.text !== undefined) {
                item.text.width = this._textWidthCache.measureText(ctx, item.text.content);
                item.text.height = this._fontSize;
                item.text.x = item.x - item.text.width / 2;
            }
            drawItem(item, ctx, horizontalPixelRatio, verticalPixelRatio);

        }
    }
}

function bitmapShapeItemCoordinates(item, horizontalPixelRatio, verticalPixelRatio) {
    const tickWidth = Math.max(1, Math.floor(horizontalPixelRatio));
    const correction = (tickWidth % 2) / 2;
    return {
        x: Math.round(item.x * horizontalPixelRatio) + correction,
        y: item.y * verticalPixelRatio,
        pixelRatio: horizontalPixelRatio,
    };
}

function drawItem(item, ctx, horizontalPixelRatio, verticalPixelRatio) {
    ctx.fillStyle = item.color;
    if (item.text !== undefined) {
        drawText(ctx, item.text.content, item.text.x, item.text.y, horizontalPixelRatio, verticalPixelRatio);
    }

    drawShape(item, ctx, bitmapShapeItemCoordinates(item, horizontalPixelRatio, verticalPixelRatio));
}

function drawShape(item, ctx, coordinates) {
    if (item.size === 0) {
        return;
    }


    switch (item.shape) {
        case 'arrowDown':
            drawArrow(false, ctx, coordinates, item.size);
            return;
        case 'arrowUp':
            drawArrow(true, ctx, coordinates, item.size);
            return;
        case 'circle':
            drawCircle(ctx, coordinates, item.size);
            return;
        case 'square':
            drawSquare(ctx, coordinates, item.size);
            return;
    }

    ensureNever(item.shape);
}

function hitTestItem(item, x, y) {
    if (item.text !== undefined && hitTestText(item.text.x, item.text.y, item.text.width, item.text.height, x, y)) {
        return true;
    }

    return hitTestShape(item, x, y);
}

function hitTestShape(item, x, y) {
    if (item.size === 0) {
        return false;
    }

    switch (item.shape) {
        case 'arrowDown':
            return hitTestArrow(true, item.x, item.y, item.size, x, y);
        case 'arrowUp':
            return hitTestArrow(false, item.x, item.y, item.size, x, y);
        case 'circle':
            return hitTestCircle(item.x, item.y, item.size, x, y);
        case 'square':
            return hitTestSquare(item.x, item.y, item.size, x, y);
    }
}

function drawCircle(
    ctx,
    coords,
    size
) {
    const circleSize = shapeSize('circle', size);
    const halfSize = (circleSize - 1) / 2;

    ctx.beginPath();
    ctx.arc(coords.x, coords.y, halfSize * coords.pixelRatio, 0, 2 * Math.PI, false);

    ctx.fill();
}

export function shapeSize(shape, originalSize) {
    switch (shape) {
        case 'arrowDown':
        case 'arrowUp':
            return size(originalSize, 1);
        case 'circle':
            return size(originalSize, 0.8);
        case 'square':
            return size(originalSize, 0.7);
    }
}




const defaultReplacementRe = /[2-9]/g;

export class TextWidthCache {
    _maxSize;
    _actualSize = 0;
    _usageTick = 1;
    _oldestTick = 1;
    _tick2Labels = {};
    _cache = new Map();

    constructor(size = 50) {
        this._maxSize = size;
    }

    reset() {
        this._actualSize = 0;
        this._cache.clear();
        this._usageTick = 1;
        this._oldestTick = 1;
        this._tick2Labels = {};
    }

    measureText(ctx, text, optimizationReplacementRe) {
        return this._getMetrics(ctx, text, optimizationReplacementRe).width;
    }

    yMidCorrection(ctx, text, optimizationReplacementRe) {
        const metrics = this._getMetrics(ctx, text, optimizationReplacementRe);
        // if actualBoundingBoxAscent/actualBoundingBoxDescent are not supported we use 0 as a fallback
        return ((metrics.actualBoundingBoxAscent || 0) - (metrics.actualBoundingBoxDescent || 0)) / 2;
    }

    _getMetrics(ctx, text, optimizationReplacementRe) {
        const re = optimizationReplacementRe || defaultReplacementRe;
        const cacheString = String(text).replace(re, '0');

        if (this._cache.has(cacheString)) {
            return ensureDefined(this._cache.get(cacheString)).metrics;
        }

        if (this._actualSize === this._maxSize) {
            const oldestValue = this._tick2Labels[this._oldestTick];
            delete this._tick2Labels[this._oldestTick];
            this._cache.delete(oldestValue);
            this._oldestTick++;
            this._actualSize--;
        }

        ctx.save();
        ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(cacheString);
        ctx.restore();

        if (metrics.width === 0 && !!text.length) {
            // measureText can return 0 in FF depending on a canvas size, don't cache it
            return metrics;
        }

        this._cache.set(cacheString, { metrics: metrics, tick: this._usageTick });
        this._tick2Labels[this._usageTick] = cacheString;
        this._actualSize++;
        this._usageTick++;
        return metrics;
    }
}