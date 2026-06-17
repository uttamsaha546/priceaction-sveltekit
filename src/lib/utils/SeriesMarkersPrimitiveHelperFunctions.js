const seriesMarkerOptionsDefaults = {
    autoScale: true,
    zOrder: 'normal',
};

export function mergeOptionsWithDefaults(options) {
    return {
        ...seriesMarkerOptionsDefaults,
        ...options,
    }
}

export function ensureNotNull(value) {
    if (value === null) {
        throw new Error('Value is null');
    }

    return value;
}

const Constants = {
    MinShapeSize: 12,
    MaxShapeSize: 30,
    MinShapeMargin: 3,

    TextMargin: 0.1,
}

export function calculateShapeMargin(barSpacing) {
    return Math.max(size(barSpacing, 0.1), Constants.MinShapeMargin);
}

export function calculateShapeHeight(barSpacing) {
    return ceiledEven(size(barSpacing, 1));
}

export function calculateAdjustedMargin(margin, hasSide, hasInBar) {
    if (hasSide) {
        return margin;
    } else if (hasInBar) {
        return Math.ceil(margin / 2);
    }

    return 0;
}

function size(barSpacing, coeff) {
    const result = Math.min(Math.max(barSpacing, Constants.MinShapeSize), Constants.MaxShapeSize) * coeff;
    return ceiledOdd(result);
}

function ceiledOdd(x) {
    const ceiled = Math.ceil(x);
    return (ceiled % 2 === 0) ? ceiled - 1 : ceiled;
}

function ceiledEven(x) {
    const ceiled = Math.ceil(x);
    return (ceiled % 2 !== 0) ? ceiled - 1 : ceiled;
}


/**
 * Search direction if no data found at provided index
 */
export const MismatchDirection = {
    /**
     * Search the nearest left item
     */
    NearestLeft: -1,
    /**
     * Do not search
     */
    None: 0,
    /**
     * Search the nearest right item
     */
    NearestRight: 1,
}

export const lowerBound = boundCompare.bind(null, true);
export const upperBound = boundCompare.bind(null, false);
function boundCompare(
    lower,
    arr,
    value,
    compare,
    start,
    to = arr.length) {
    let count = to - start;
    while (0 < count) {
        const count2 = (count >> 1);
        const mid = start + count2;
        if (compare(arr[mid], value) === lower) {
            start = mid + 1;
            count -= count2 + 1;
        } else {
            count = count2;
        }
    }

    return start;
}

function lowerBoundItemsCompare(item, time) {
    return item.time < time;
}

function upperBoundItemsCompare(item, time) {
    return time < item.time;
}

export function visibleTimedValues(items, range, extendedRange) {
    const firstBar = range.left();
    const lastBar = range.right();

    const from = lowerBound(items, firstBar, lowerBoundItemsCompare);
    const to = upperBound(items, lastBar, upperBoundItemsCompare);

    if (!extendedRange) {
        return { from, to };
    }

    let extendedFrom = from;
    let extendedTo = to;

    if (from > 0 && from < items.length && items[from].time >= firstBar) {
        extendedFrom = from - 1;
    }

    if (to > 0 && to < items.length && items[to - 1].time <= lastBar) {
        extendedTo = to + 1;
    }

    return { from: extendedFrom, to: extendedTo };
}

export function isNumber(value) {
    return (typeof value === 'number') && (isFinite(value));
}
// const Constants = {
//     TextMargin: 0.1,
// }
function ensureNever(value) { }

export function fillSizeAndY(
    rendererItem,
    marker,
    seriesData,
    offsets,
    textHeight,
    shapeMargin,
    series,
    chart
) {
    const price = getPrice(seriesData, marker, series.priceScale().options().invertScale);
    if (price === undefined) {
        return;
    }
    const ignoreOffset = isPriceMarker(marker.position);
    const timeScale = chart.timeScale();
    const sizeMultiplier = isNumber(marker.size) ? Math.max(marker.size, 0) : 1;
    const shapeSize = calculateShapeHeight(timeScale.options().barSpacing) * sizeMultiplier;

    const halfSize = shapeSize / 2;
    rendererItem.size = shapeSize;

    const position = marker.position;
    switch (position) {
        case 'inBar':
        case 'atPriceMiddle': {
            rendererItem.y = ensureNotNull(series.priceToCoordinate(price));
            if (rendererItem.text !== undefined) {
                rendererItem.text.y = rendererItem.y + halfSize + shapeMargin + textHeight * (0.5 + Constants.TextMargin);
            }
            return;
        }
        case 'aboveBar':
        case 'atPriceTop': {
            const offset = ignoreOffset ? 0 : offsets.aboveBar;
            rendererItem.y = (ensureNotNull(series.priceToCoordinate(price)) - halfSize - offset);
            if (rendererItem.text !== undefined) {
                rendererItem.text.y = rendererItem.y - halfSize - textHeight * (0.5 + Constants.TextMargin);
                offsets.aboveBar += textHeight * (1 + 2 * Constants.TextMargin);
            }
            if (!ignoreOffset) {
                offsets.aboveBar += shapeSize + shapeMargin;
            }
            return;
        }
        case 'belowBar':
        case 'atPriceBottom': {
            const offset = ignoreOffset ? 0 : offsets.belowBar;
            rendererItem.y = (ensureNotNull(series.priceToCoordinate(price)) + halfSize + offset);
            if (rendererItem.text !== undefined) {
                rendererItem.text.y = (rendererItem.y + halfSize + shapeMargin + textHeight * (0.5 + Constants.TextMargin));
                offsets.belowBar += textHeight * (1 + 2 * Constants.TextMargin);
            }
            if (!ignoreOffset) {
                offsets.belowBar += shapeSize + shapeMargin;
            }
            return;
        }
    }

    ensureNever(position);
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

function isPriceMarker(position) {
    return position === 'atPriceTop' || position === 'atPriceBottom' || position === 'atPriceMiddle';
}

function isValueData(data) {
    return 'value' in data && typeof (data).value === 'number';
}

function isOhlcData(data) {
    return 'open' in data && 'high' in data && 'low' in data && 'close' in data;
}


/**
 * Default font family.
 * Must be used to generate font string when font is not specified.
 */
export const defaultFontFamily = `-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif`;

/**
 * Generates a font string, which can be used to set in canvas' font property.
 * If no family provided, {@link defaultFontFamily} will be used.
 *
 * @param size - Font size in pixels.
 * @param family - Optional font family.
 * @param style - Optional font style.
 * @returns The font string.
 */
export function makeFont(size, family, style) {
    if (style !== undefined) {
        style = `${style} `;
    } else {
        style = '';
    }

    if (family === undefined) {
        family = defaultFontFamily;
    }

    return `${style}${size}px ${family}`;
}


export class RangeImpl {
    _left;
    _right;

    constructor(left, right) {
        assert(left <= right, 'right should be >= left');

        this._left = left;
        this._right = right;
    }

    left() {
        return this._left;
    }

    right() {
        return this._right;
    }

    count() {
        return this._right - this._left + 1;
    }

    contains(index) {
        return this._left <= index && index <= this._right;
    }

    equals(other) {
        return this._left === other.left() && this._right === other.right();
    }
}

/**
 * Checks an assertion. Throws if the assertion is failed.
 *
 * @param condition - Result of the assertion evaluation
 * @param message - Text to include in the exception message
 */
export function assert(condition, message) {
    if (!condition) {
        throw new Error('Assertion failed' + (message ? ': ' + message : ''));
    }
}