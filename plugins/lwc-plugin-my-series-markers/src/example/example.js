import { CandlestickSeries, createChart, PriceScaleMode } from 'lightweight-charts';
import { generateCandlestickData } from '../sample-data.js';
import { MySeriesMarkers } from '../my-series-markers.js';

const chart = ((window).chart = createChart('chart', {
	autoSize: true,
}));

const lineSeries = chart.addSeries(CandlestickSeries, {
	priceScale: {
		mode: PriceScaleMode.Logarithmic
	}
});
const data = generateCandlestickData();
lineSeries.setData(data);

const time1 = data[data.length - 50].time;
const time2 = data[data.length - 10].time;

const primitive = new MySeriesMarkers([
	{ price: 100, time: time1, position: 'aboveBar', text: 'A' },
	{ price: 120, time: time2, position: 'belowBar', text: 'B' }]
);

lineSeries.attachPrimitive(primitive);
