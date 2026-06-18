import { CandlestickSeries, createChart, PriceScaleMode, CrosshairMode } from 'lightweight-charts';
import { generateCandlestickData } from '../sample-data.js';
import { MySeriesMarkers } from '../my-series-markers.js';

const chart = ((window).chart = createChart('chart', {
			// width: container.clientWidth,
			// height: container.clientHeight,
			layout: {
				background: { color: '#fff' },
				attributionLogo: false
			},
			grid: {
				vertLines: { color: '#f0f3fa' },
				horzLines: { color: '#f0f3fa' }
			},
			crosshair: { mode: CrosshairMode.Normal },
			rightPriceScale: {
				scaleMargins: { top: 0, bottom: 0 },
				mode: PriceScaleMode.Logarithmic,
				autoScale:false
			},
			timeScale: { rightOffset: 5, barSpacing: 4 },
			autoSize: true
		}));

const lineSeries = chart.addSeries(CandlestickSeries);
const data = generateCandlestickData();
lineSeries.setData(data);

const primitive = new MySeriesMarkers();

lineSeries.attachPrimitive(primitive);
