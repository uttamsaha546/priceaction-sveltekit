import { createSeriesMarkers, LineSeries } from "lightweight-charts";
import { ChartState } from "$lib/state/ChartState.svelte";

export class SmaSeriesPrimitive {

    attached(param) {
        const { chart, series } = param;
        this._mainSeries = series;
        this._chart = chart;


        this._smaSeries = this._chart.addSeries(LineSeries, {
            color: '#2962FF',
            lineWidth: 2,
            priceScaleId: 'right',
            crosshairMarkerVisible: false,
            priceLineVisible: false,
        })

        this._mainSeries.subscribeDataChanged(this._updateData)

        this._updateData()
    }

    _updateData = () => {
        // console.log('renered')
        const mainSeriesData = this._mainSeries.data();
        const smaValues = calculateSMA(mainSeriesData, ChartState.interval==="M" ? 12 : ChartState.interval==="F" ? 24: 52);
        this._smaSeries.setData(smaValues);
    }

    dataByIndex(index) {
        return this._smaSeries.dataByIndex(index);
    }
}

/**
 * Calculate SMA from Candlestick data
 * @param {CandlestickData[]} data 
 * @param {number} period 
 * @returns {LineData[]}
 */

function calculateSMA(data, period) {
    if (!period) return [];

    return data
        .map((c, i, arr) => {
            if (i < period) return null;

            const sum = arr
                .slice(i - period, i)
                .reduce((a, b) => a + b.close, 0);

            return { time: c.time, value: sum / period };
        })
        .filter(Boolean);
}