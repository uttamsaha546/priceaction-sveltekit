function ensureNotNull(value) {
    if (value === null) {
        throw new Error('Value is null');
    }
    return value;
}
function ensureDefined(value) {
    if (value === undefined) {
        throw new Error('Value is undefined');
    }
    return value;
}
function assert(condition, message) {
    if (!condition) {
        throw new Error('Assertion failed' + (message ? ': ' + message : ''));
    }
}
function isNumber(value) {
    return (typeof value === 'number') && (isFinite(value));
}
const seriesMarkerOptionsDefaults = {
    autoScale: true,
    zOrder: 'normal',
};

function mergeOptionsWithDefaults(options) {
    return {
        ...seriesMarkerOptionsDefaults,
        ...options,
    }
}

class SeriesPrimitiveAdapter {
    constructor(series, primitive) {
        this._internal__series = series;
        this._internal__primitive = primitive;
        this._private__attach();
    }
    detach() {
        this._internal__series.detachPrimitive(this._internal__primitive);
    }
    getSeries() {
        return this._internal__series;
    }
    applyOptions(options) {
        if (this._internal__primitive && this._internal__primitive._internal_applyOptions) {
            this._internal__primitive._internal_applyOptions(options);
        }
    }
    _private__attach() {
        this._internal__series.attachPrimitive(this._internal__primitive);
    }
}

class SeriesMarkersPrimitiveWrapper extends SeriesPrimitiveAdapter {
    constructor(series, primitive, markers) {
        super(series, primitive);
        if (markers) {
            this.setMarkers(markers);
        }
    }
    setMarkers(markers) {
        this._internal__primitive._internal_setMarkers(markers);
    }
    markers() {
        return this._internal__primitive._internal_markers();
    }
}

export function createSeriesMarkers(series, markers, options) {
    const wrapper = new SeriesMarkersPrimitiveWrapper(series, new SeriesMarkersPrimitive(options ?? {}));
    if (markers) {
        wrapper.setMarkers(markers);
    }
    return wrapper;
}

const defaultReplacementRe = /[2-9]/g;
class TextWidthCache {
    constructor(size = 50) {
        this._private__actualSize = 0;
        this._private__usageTick = 1;
        this._private__oldestTick = 1;
        this._private__tick2Labels = {};
        this._private__cache = new Map();
        this._private__maxSize = size;
    }
    _internal_reset() {
        this._private__actualSize = 0;
        this._private__cache.clear();
        this._private__usageTick = 1;
        this._private__oldestTick = 1;
        this._private__tick2Labels = {};
    }
    _internal_measureText(ctx, text, optimizationReplacementRe) {
        return this._private__getMetrics(ctx, text, optimizationReplacementRe).width;
    }
    _internal_yMidCorrection(ctx, text, optimizationReplacementRe) {
        const metrics = this._private__getMetrics(ctx, text, optimizationReplacementRe);
        // if actualBoundingBoxAscent/actualBoundingBoxDescent are not supported we use 0 as a fallback
        return ((metrics.actualBoundingBoxAscent || 0) - (metrics.actualBoundingBoxDescent || 0)) / 2;
    }
    _private__getMetrics(ctx, text, optimizationReplacementRe) {
        const re = optimizationReplacementRe || defaultReplacementRe;
        const cacheString = String(text).replace(re, '0');
        if (this._private__cache.has(cacheString)) {
            return ensureDefined(this._private__cache.get(cacheString))._internal_metrics;
        }
        if (this._private__actualSize === this._private__maxSize) {
            const oldestValue = this._private__tick2Labels[this._private__oldestTick];
            delete this._private__tick2Labels[this._private__oldestTick];
            this._private__cache.delete(oldestValue);
            this._private__oldestTick++;
            this._private__actualSize--;
        }
        ctx.save();
        ctx.textBaseline = 'middle';
        const metrics = ctx.measureText(cacheString);
        ctx.restore();
        if (metrics.width === 0 && !!text.length) {
            // measureText can return 0 in FF depending on a canvas size, don't cache it
            return metrics;
        }
        this._private__cache.set(cacheString, { _internal_metrics: metrics, _internal_tick: this._private__usageTick });
        this._private__tick2Labels[this._private__usageTick] = cacheString;
        this._private__actualSize++;
        this._private__usageTick++;
        return metrics;
    }
}

const defaultFontFamily = `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`;
function makeFont(size, family, style) {
    if (style !== undefined) {
        style = `${style} `;
    }
    else {
        style = '';
    }
    if (family === undefined) {
        family = defaultFontFamily;
    }
    return `${style}${size}px ${family}`;
}
function ceiledEven(x) {
    const ceiled = Math.ceil(x);
    return (ceiled % 2 !== 0) ? ceiled - 1 : ceiled;
}
function ceiledOdd(x) {
    const ceiled = Math.ceil(x);
    return (ceiled % 2 === 0) ? ceiled - 1 : ceiled;
}
function size(barSpacing, coeff) {
    const result = Math.min(Math.max(barSpacing, 12 /* Constants.MinShapeSize */), 30 /* Constants.MaxShapeSize */) * coeff;
    return ceiledOdd(result);
}
function shapeSize(shape, originalSize) {
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
function calculateShapeHeight(barSpacing) {
    return ceiledEven(size(barSpacing, 1));
}
function shapeMargin(barSpacing) {
    return Math.max(size(barSpacing, 0.1), 3 /* Constants.MinShapeMargin */);
}
function calculateAdjustedMargin(margin, hasSide, hasInBar) {
    if (hasSide) {
        return margin;
    }
    else if (hasInBar) {
        return Math.ceil(margin / 2);
    }
    return 0;
}
function boundCompare(lower, arr, value, compare, start = 0, to = arr.length) {
    let count = to - start;
    while (0 < count) {
        const count2 = (count >> 1);
        const mid = start + count2;
        if (compare(arr[mid], value) === lower) {
            start = mid + 1;
            count -= count2 + 1;
        }
        else {
            count = count2;
        }
    }
    return start;
}
const lowerBound = boundCompare.bind(null, true);
const upperBound = boundCompare.bind(null, false);
function lowerBoundItemsCompare(item, time) {
    return item._internal_time < time;
}
function upperBoundItemsCompare(item, time) {
    return time < item._internal_time;
}
function visibleTimedValues(items, range, extendedRange) {
    const firstBar = range._internal_left();
    const lastBar = range._internal_right();
    const from = lowerBound(items, firstBar, lowerBoundItemsCompare);
    const to = upperBound(items, lastBar, upperBoundItemsCompare);
    if (!extendedRange) {
        return { from, to };
    }
    let extendedFrom = from;
    let extendedTo = to;
    if (from > 0 && from < items.length && items[from]._internal_time >= firstBar) {
        extendedFrom = from - 1;
    }
    if (to > 0 && to < items.length && items[to - 1]._internal_time <= lastBar) {
        extendedTo = to + 1;
    }
    return { from: extendedFrom, to: extendedTo };
}

function fillSizeAndY(rendererItem, marker, seriesData, offsets, textHeight, shapeMargin, series, chart) {
    const price = getPrice(seriesData, marker, series.priceScale().options().invertScale);
    if (price === undefined) {
        return;
    }
    const ignoreOffset = isPriceMarker(marker.position);
    const timeScale = chart.timeScale();
    const sizeMultiplier = isNumber(marker.size) ? Math.max(marker.size, 0) : 1;
    const shapeSize = calculateShapeHeight(timeScale.options().barSpacing) * sizeMultiplier;
    const halfSize = shapeSize / 2;
    rendererItem._internal_size = shapeSize;
    const position = marker.position;
    switch (position) {
        case 'inBar':
        case 'atPriceMiddle': {
            rendererItem._internal_y = ensureNotNull(series.priceToCoordinate(price));
            if (rendererItem._internal_text !== undefined) {
                rendererItem._internal_text._internal_y = rendererItem._internal_y + halfSize + shapeMargin + textHeight * (0.5 + 0.1 /* Constants.TextMargin */);
            }
            return;
        }
        case 'aboveBar':
        case 'atPriceTop': {
            const offset = ignoreOffset ? 0 : offsets._internal_aboveBar;
            rendererItem._internal_y = (ensureNotNull(series.priceToCoordinate(price)) - halfSize - offset);
            if (rendererItem._internal_text !== undefined) {
                rendererItem._internal_text._internal_y = rendererItem._internal_y - halfSize - textHeight * (0.5 + 0.1 /* Constants.TextMargin */);
                offsets._internal_aboveBar += textHeight * (1 + 2 * 0.1 /* Constants.TextMargin */);
            }
            if (!ignoreOffset) {
                offsets._internal_aboveBar += shapeSize + shapeMargin;
            }
            return;
        }
        case 'belowBar':
        case 'atPriceBottom': {
            const offset = ignoreOffset ? 0 : offsets._internal_belowBar;
            rendererItem._internal_y = (ensureNotNull(series.priceToCoordinate(price)) + halfSize + offset);
            if (rendererItem._internal_text !== undefined) {
                rendererItem._internal_text._internal_y = (rendererItem._internal_y + halfSize + shapeMargin + textHeight * (0.5 + 0.1 /* Constants.TextMargin */));
                offsets._internal_belowBar += textHeight * (1 + 2 * 0.1 /* Constants.TextMargin */);
            }
            if (!ignoreOffset) {
                offsets._internal_belowBar += shapeSize + shapeMargin;
            }
            return;
        }
    }
}
function isPriceMarker(position) {
    return position === 'atPriceTop' || position === 'atPriceBottom' || position === 'atPriceMiddle';
}
function getPrice(seriesData, marker, isInverted) {
    if (isPriceMarker(marker.position) && marker.price !== undefined) {
        return marker.price;
    }
    if (isValueData(seriesData)) {
        return seriesData.value;
    }
    if (isOhlcData(seriesData)) {
        if (marker.position === 'inBar') {
            return seriesData.close;
        }
        if (marker.position === 'aboveBar') {
            if (!isInverted) {
                return seriesData.high;
            }
            return seriesData.low;
        }
        if (marker.position === 'belowBar') {
            if (!isInverted) {
                return seriesData.low;
            }
            return seriesData.high;
        }
    }
    return;
}
function isValueData(data) {
    // eslint-disable-next-line no-restricted-syntax
    return 'value' in data && typeof data.value === 'number';
}
function isOhlcData(data) {
    // eslint-disable-next-line no-restricted-syntax
    return 'open' in data && 'high' in data && 'low' in data && 'close' in data;
}
function drawItem(item, ctx, horizontalPixelRatio, verticalPixelRatio) {
    ctx.fillStyle = item._internal_color;
    if (item._internal_text !== undefined) {
        drawText(ctx, item._internal_text._internal_content, item._internal_text._internal_x, item._internal_text._internal_y, horizontalPixelRatio, verticalPixelRatio);
    }
    drawShape(item, ctx, bitmapShapeItemCoordinates(item, horizontalPixelRatio, verticalPixelRatio));
}
function drawShape(item, ctx, coordinates) {
    if (item._internal_size === 0) {
        return;
    }
    switch (item._internal_shape) {
        case 'arrowDown':
            drawArrow(false, ctx, coordinates, item._internal_size);
            return;
        case 'arrowUp':
            drawArrow(true, ctx, coordinates, item._internal_size);
            return;
        case 'circle':
            drawCircle(ctx, coordinates, item._internal_size);
            return;
        case 'square':
            drawSquare(ctx, coordinates, item._internal_size);
            return;
    }
    ensureNever(item._internal_shape);
}
function drawText(ctx, text, x, y, horizontalPixelRatio, verticalPixelRatio) {
    ctx.save();
    ctx.scale(horizontalPixelRatio, verticalPixelRatio);
    ctx.fillText(text, x, y);
    ctx.restore();
}

function hitTestText(textX, textY, textWidth, textHeight, x, y) {
    const halfHeight = textHeight / 2;
    return x >= textX && x <= textX + textWidth &&
        y >= textY - halfHeight && y <= textY + halfHeight;
}

function hitTestItem(item, x, y) {
    if (item._internal_text !== undefined && hitTestText(item._internal_text._internal_x, item._internal_text._internal_y, item._internal_text._internal_width, item._internal_text._internal_height, x, y)) {
        return true;
    }
    return hitTestShape(item, x, y);
}
function hitTestShape(item, x, y) {
    if (item._internal_size === 0) {
        return false;
    }
    switch (item._internal_shape) {
        case 'arrowDown':
            return hitTestArrow(true, item._internal_x, item._internal_y, item._internal_size, x, y);
        case 'arrowUp':
            return hitTestArrow(false, item._internal_x, item._internal_y, item._internal_size, x, y);
        case 'circle':
            return hitTestCircle(item._internal_x, item._internal_y, item._internal_size, x, y);
        case 'square':
            return hitTestSquare(item._internal_x, item._internal_y, item._internal_size, x, y);
    }
}

function drawCircle(ctx, coords, size) {
    const circleSize = shapeSize('circle', size);
    const halfSize = (circleSize - 1) / 2;
    ctx.beginPath();
    ctx.arc(coords._internal_x, coords._internal_y, halfSize * coords._internal_pixelRatio, 0, 2 * Math.PI, false);
    ctx.fill();
}

function hitTestCircle(centerX, centerY, size, x, y) {
    const circleSize = shapeSize('circle', size);
    const tolerance = 2 + circleSize / 2;
    const xOffset = centerX - x;
    const yOffset = centerY - y;
    const dist = Math.sqrt(xOffset * xOffset + yOffset * yOffset);
    return dist <= tolerance;
}

function bitmapShapeItemCoordinates(item, horizontalPixelRatio, verticalPixelRatio) {
    const tickWidth = Math.max(1, Math.floor(horizontalPixelRatio));
    const correction = (tickWidth % 2) / 2;
    return {
        _internal_x: Math.round(item._internal_x * horizontalPixelRatio) + correction,
        _internal_y: item._internal_y * verticalPixelRatio,
        _internal_pixelRatio: horizontalPixelRatio,
    };
}

class RangeImpl {
    constructor(left, right) {
        assert(left <= right, 'right should be >= left');
        this._private__left = left;
        this._private__right = right;
    }
    _internal_left() {
        return this._private__left;
    }
    _internal_right() {
        return this._private__right;
    }
    _internal_count() {
        return this._private__right - this._private__left + 1;
    }
    _internal_contains(index) {
        return this._private__left <= index && index <= this._private__right;
    }
    _internal_equals(other) {
        return this._private__left === other._internal_left() && this._private__right === other._internal_right();
    }
}


// @implements{ISeriesPrimitive}
class SeriesMarkersPrimitive {
    constructor(options) {
        this._private__paneView = null;
        this._private__markers = [];
        this._private__indexedMarkers = [];
        this._private__dataChangedHandler = null;
        this._private__series = null;
        this._private__chart = null;
        this._private__autoScaleMarginsInvalidated = true;
        this._private__autoScaleMargins = null;
        this._private__markersPositions = null;
        this._private__cachedBarSpacing = null;
        this._private__recalculationRequired = true;
        this._private__options = mergeOptionsWithDefaults(options);
    }
    attached(param) {
        this._private__recalculateMarkers();
        this._private__chart = param.chart;
        this._private__series = param.series;
        this._private__paneView = new SeriesMarkersPaneView(this._private__series, ensureNotNull(this._private__chart), this._private__options);
        this._private__requestUpdate = param.requestUpdate;
        this._private__series.subscribeDataChanged((scope) => this._private__onDataChanged(scope));
        this._private__recalculationRequired = true;
        this._internal_requestUpdate();
    }
    _internal_requestUpdate() {
        if (this._private__requestUpdate) {
            this._private__requestUpdate();
        }
    }
    detached() {
        if (this._private__series && this._private__dataChangedHandler) {
            this._private__series.unsubscribeDataChanged(this._private__dataChangedHandler);
        }
        this._private__chart = null;
        this._private__series = null;
        this._private__paneView = null;
        this._private__dataChangedHandler = null;
    }
    _internal_setMarkers(markers) {
        this._private__recalculationRequired = true;
        this._private__markers = markers;
        this._private__recalculateMarkers();
        this._private__autoScaleMarginsInvalidated = true;
        this._private__markersPositions = null;
        this._internal_requestUpdate();
    }
    _internal_markers() {
        return this._private__markers;
    }
    paneViews() {
        return this._private__paneView ? [this._private__paneView] : [];
    }
    updateAllViews() {
        this._private__updateAllViews();
    }
    hitTest(x, y) {
        if (this._private__paneView) {
            return this._private__paneView.renderer()?._internal_hitTest(x, y) ?? null;
        }
        return null;
    }
    autoscaleInfo(startTimePoint, endTimePoint) {
        if (this._private__options.autoScale && this._private__paneView) {
            const margins = this._private__getAutoScaleMargins();
            if (margins) {
                return {
                    priceRange: null,
                    margins: margins,
                };
            }
        }
        return null;
    }
    _internal_applyOptions(options) {
        this._private__options = mergeOptionsWithDefaults({ ...this._private__options, ...options });
        if (this._internal_requestUpdate) {
            this._internal_requestUpdate();
        }
    }
    _private__getAutoScaleMargins() {
        const chart = ensureNotNull(this._private__chart);
        const barSpacing = chart.timeScale().options().barSpacing;
        if (this._private__autoScaleMarginsInvalidated || barSpacing !== this._private__cachedBarSpacing) {
            this._private__cachedBarSpacing = barSpacing;
            if (this._private__markers.length > 0) {
                const shapeMargin$1 = shapeMargin(barSpacing);
                const marginValue = calculateShapeHeight(barSpacing) * 1.5 + shapeMargin$1 * 2;
                const positions = this._private__getMarkerPositions();
                this._private__autoScaleMargins = {
                    above: calculateAdjustedMargin(marginValue, positions.aboveBar, positions.inBar),
                    below: calculateAdjustedMargin(marginValue, positions.belowBar, positions.inBar),
                };
            }
            else {
                this._private__autoScaleMargins = null;
            }
            this._private__autoScaleMarginsInvalidated = false;
        }
        return this._private__autoScaleMargins;
    }
    _private__getMarkerPositions() {
        if (this._private__markersPositions === null) {
            this._private__markersPositions = this._private__markers.reduce((acc, marker) => {
                if (!acc[marker.position]) {
                    acc[marker.position] = true;
                }
                return acc;
            }, {
                inBar: false,
                aboveBar: false,
                belowBar: false,
                atPriceTop: false,
                atPriceBottom: false,
                atPriceMiddle: false,
            });
        }
        return this._private__markersPositions;
    }
    _private__recalculateMarkers() {
        if (!this._private__recalculationRequired || !this._private__chart || !this._private__series) {
            return;
        }
        const timeScale = this._private__chart.timeScale();
        const seriesData = this._private__series?.data();
        if (timeScale.getVisibleLogicalRange() == null || !this._private__series || seriesData.length === 0) {
            this._private__indexedMarkers = [];
            return;
        }
        const firstDataIndex = timeScale.timeToIndex(ensureNotNull(seriesData[0].time), true);
        this._private__indexedMarkers = this._private__markers.map((marker, index) => {
            const timePointIndex = timeScale.timeToIndex(marker.time, true);
            const searchMode = timePointIndex < firstDataIndex ? 1 /* MismatchDirection.NearestRight */ : -1 /* MismatchDirection.NearestLeft */;
            const seriesDataByIndex = ensureNotNull(this._private__series).dataByIndex(timePointIndex, searchMode);
            const finalIndex = timeScale.timeToIndex(ensureNotNull(seriesDataByIndex).time, false);
            // You must explicitly define the types so that the minification build processes the field names correctly
            const baseMarker = {
                time: finalIndex,
                position: marker.position,
                shape: marker.shape,
                color: marker.color,
                id: marker.id,
                _internal_internalId: index,
                text: marker.text,
                size: marker.size,
                price: marker.price,
                _internal_originalTime: marker.time,
            };
            if (marker.position === 'atPriceTop' ||
                marker.position === 'atPriceBottom' ||
                marker.position === 'atPriceMiddle') {
                if (marker.price === undefined) {
                    throw new Error(`Price is required for position ${marker.position}`);
                }
                return {
                    ...baseMarker,
                    position: marker.position, // TypeScript knows this is SeriesMarkerPricePosition
                    price: marker.price,
                };
            }
            else {
                return {
                    ...baseMarker,
                    position: marker.position, // TypeScript knows this is SeriesMarkerBarPosition
                    price: marker.price, // Optional for bar positions
                };
            }
        });
        this._private__recalculationRequired = false;
    }
    _private__updateAllViews(updateType) {
        if (this._private__paneView) {
            this._private__recalculateMarkers();
            this._private__paneView._internal_setMarkers(this._private__indexedMarkers);
            this._private__paneView._internal_updateOptions(this._private__options);
            this._private__paneView._internal_update(updateType);
        }
    }
    _private__onDataChanged(scope) {
        this._private__recalculationRequired = true;
        this._internal_requestUpdate();
    }
}

// @implements {IPrimitivePaneView}
class SeriesMarkersPaneView {
    constructor(series, chart, options) {
        this._private__markers = [];
        this._private__invalidated = true;
        this._private__dataInvalidated = true;
        this._private__renderer = new SeriesMarkersRenderer();
        this._private__series = series;
        this._private__chart = chart;
        this._private__data = {
            _internal_items: [],
            _internal_visibleRange: null,
        };
        this._private__options = options;
    }
    renderer() {
        if (!this._private__series.options().visible) {
            return null;
        }
        if (this._private__invalidated) {
            this._internal__makeValid();
        }
        const layout = this._private__chart.options()['layout'];
        this._private__renderer._internal_setParams(layout.fontSize, layout.fontFamily, this._private__options.zOrder);
        this._private__renderer._internal_setData(this._private__data);
        return this._private__renderer;
    }
    _internal_setMarkers(markers) {
        this._private__markers = markers;
        this._internal_update('data');
    }
    _internal_update(updateType) {
        this._private__invalidated = true;
        if (updateType === 'data') {
            this._private__dataInvalidated = true;
        }
    }
    _internal_updateOptions(options) {
        this._private__invalidated = true;
        this._private__options = options;
    }
    zOrder() {
        return this._private__options.zOrder === 'aboveSeries' ? 'top' : this._private__options.zOrder;
    }
    _internal__makeValid() {
        const timeScale = this._private__chart.timeScale();
        const seriesMarkers = this._private__markers;
        if (this._private__dataInvalidated) {
            this._private__data._internal_items = seriesMarkers.map((marker) => ({
                _internal_time: marker.time,
                _internal_x: 0,
                _internal_y: 0,
                _internal_size: 0,
                _internal_shape: marker.shape,
                _internal_color: marker.color,
                _internal_externalId: marker.id,
                _internal_internalId: marker._internal_internalId,
                _internal_text: undefined,
            }));
            this._private__dataInvalidated = false;
        }
        const layoutOptions = this._private__chart.options()['layout'];
        this._private__data._internal_visibleRange = null;
        const visibleBars = timeScale.getVisibleLogicalRange();
        if (visibleBars === null) {
            return;
        }
        const visibleBarsRange = new RangeImpl(Math.floor(visibleBars.from), Math.ceil(visibleBars.to));
        const firstValue = this._private__series.data()[0];
        if (firstValue === null) {
            return;
        }
        if (this._private__data._internal_items.length === 0) {
            return;
        }
        let prevTimeIndex = NaN;
        const shapeMargin$1 = shapeMargin(timeScale.options().barSpacing);
        const offsets = {
            _internal_aboveBar: shapeMargin$1,
            _internal_belowBar: shapeMargin$1,
        };
        this._private__data._internal_visibleRange = visibleTimedValues(this._private__data._internal_items, visibleBarsRange, true);
        for (let index = this._private__data._internal_visibleRange.from; index < this._private__data._internal_visibleRange.to; index++) {
            const marker = seriesMarkers[index];
            if (marker.time !== prevTimeIndex) {
                // new bar, reset stack counter
                offsets._internal_aboveBar = shapeMargin$1;
                offsets._internal_belowBar = shapeMargin$1;
                prevTimeIndex = marker.time;
            }
            const rendererItem = this._private__data._internal_items[index];
            rendererItem._internal_x = ensureNotNull(timeScale.logicalToCoordinate(marker.time));
            if (marker.text !== undefined && marker.text.length > 0) {
                rendererItem._internal_text = {
                    _internal_content: marker.text,
                    _internal_x: 0,
                    _internal_y: 0,
                    _internal_width: 0,
                    _internal_height: 0,
                };
            }
            const dataAt = this._private__series.dataByIndex(marker.time, 0 /* MismatchDirection.None */);
            if (dataAt === null) {
                continue;
            }
            fillSizeAndY(rendererItem, marker, dataAt, offsets, layoutOptions.fontSize, shapeMargin$1, this._private__series, this._private__chart);
        }
        this._private__invalidated = false;
    }
}

// @implements {IPrimitivePaneRenderer}
class SeriesMarkersRenderer {
    constructor() {
        this._private__data = null;
        this._private__textWidthCache = new TextWidthCache();
        this._private__fontSize = -1;
        this._private__fontFamily = '';
        this._private__font = '';
        this._private__zOrder = 'normal';
    }
    _internal_setData(data) {
        this._private__data = data;
    }
    _internal_setParams(fontSize, fontFamily, zOrder) {
        if (this._private__fontSize !== fontSize || this._private__fontFamily !== fontFamily) {
            this._private__fontSize = fontSize;
            this._private__fontFamily = fontFamily;
            this._private__font = makeFont(fontSize, fontFamily);
            this._private__textWidthCache._internal_reset();
        }
        this._private__zOrder = zOrder;
    }
    _internal_hitTest(x, y) {
        if (this._private__data === null || this._private__data._internal_visibleRange === null) {
            return null;
        }
        for (let i = this._private__data._internal_visibleRange.from; i < this._private__data._internal_visibleRange.to; i++) {
            const item = this._private__data._internal_items[i];
            if (item && hitTestItem(item, x, y)) {
                return {
                    zOrder: 'normal',
                    externalId: item._internal_externalId ?? '',
                    itemType: 'marker',
                };
            }
        }
        return null;
    }
    draw(target) {
        if (this._private__zOrder === 'aboveSeries') {
            return;
        }
        target.useBitmapCoordinateSpace((scope) => {
            this._internal__drawImpl(scope);
        });
    }
    drawBackground(target) {
        if (this._private__zOrder !== 'aboveSeries') {
            return;
        }
        target.useBitmapCoordinateSpace((scope) => {
            this._internal__drawImpl(scope);
        });
    }
    _internal__drawImpl({ context: ctx, horizontalPixelRatio, verticalPixelRatio }) {
        if (this._private__data === null || this._private__data._internal_visibleRange === null) {
            return;
        }
        ctx.textBaseline = 'middle';
        ctx.font = this._private__font;
        for (let index = this._private__data._internal_visibleRange.from; index < this._private__data._internal_visibleRange.to; index++) {
            const item = this._private__data._internal_items[index];
            if (item._internal_text !== undefined) {
                item._internal_text._internal_width = this._private__textWidthCache._internal_measureText(ctx, item._internal_text._internal_content);
                item._internal_text._internal_height = this._private__fontSize;
                item._internal_text._internal_x = item._internal_x - item._internal_text._internal_width / 2;
            }
            drawItem(item, ctx, horizontalPixelRatio, verticalPixelRatio);
        }
    }
}