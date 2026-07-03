<!-- src/lib/components/PriceChart.svelte -->
<script>
	import {
		createChart,
		CandlestickSeries,
		CrosshairMode,
		PriceScaleMode
	} from 'lightweight-charts';
	import { onMount } from 'svelte';

	let { fund = {}, width = 600, height = 400 } = $props();

	let chartContainer = $state(null);
	let candlestickChartSeries = null;
	let resizeObserver = null;

	class CandlestickChart {
		constructor(chartContainer) {
			this._chart = createChart(chartContainer, {
				height: height,
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
					scaleMargins: { top: 0.05, bottom: 0 },
					mode: PriceScaleMode.Logarithmic,
					visible: false
				},
				timeScale: { barSpacing: 4, rightOffset: 5 },
				autoSize: true,
				handleScale: false
			});

			this._series = this._chart.addSeries(CandlestickSeries);

			this._defLogFormula = {
				logicalOffset: 4,
				coordOffset: 0.0001
			};
		}

		remove() {
			this._chart.remove();
		}

		setData(lineData) {
			const barData = this._LineDataToBarData(lineData);
			this._series.setData(barData);
			// keep zoom locked
			const scalingFactor = Math.round((this._chart.panes()[0].getHeight() / 150) * 100) / 100;
			this._setPriceToPixelRatio(this._chart.priceScale('right'), scalingFactor); //make the price double every 200 pixel
		}

		_LineDataToBarData(lineData) {
			const weekStartMap = new Map();
			const sorted = [...lineData].sort((a, b) => a[0] - b[0]);
			for (let [timestamp, value] of sorted) {
				const length = String(timestamp).length;
				if (length === 9 || length === 10) {
					timestamp *= 1000; //convert to miliseconds if in seconds, 9 = 1973 – March 2001, 10 = Current Era (Until Year 2286)
				} else if (length == 12 || length === 13) {
					//keep timestamp as it is in milisecond, 12 = 1973 – March 2001, 10 = Current Era (Until Year 2286)
				} else {
					console.warn(`Unexpected timestamp length: ${length}. Timestamp: ${timestamp}`);
					continue;
				}

				if (value == null) continue;

				const date = new Date(timestamp);

				const weekStartKey = this._getWeekStartUTC(timestamp);

				if (!weekStartMap.has(weekStartKey)) {
					weekStartMap.set(weekStartKey, {
						time: Math.floor(weekStartKey / 1000),
						open: value,
						high: value,
						low: value,
						close: value
					});
				} else {
					const candle = weekStartMap.get(weekStartKey);

					candle.high = Math.max(candle.high, value);
					candle.low = Math.min(candle.low, value);
					candle.close = value;
				}
			}

			return [...weekStartMap.values()];
		}

		_getWeekStartUTC(timestamp) {
			const d = new Date(timestamp);
			const day = d.getUTCDay();
			const diff = day === 0 ? -6 : 1 - day;

			d.setUTCDate(d.getUTCDate() + diff);
			d.setUTCHours(0, 0, 0, 0);

			return d.getTime();
		}

		_setPriceToPixelRatio(priceScale, factor) {
			const visiblePriceRange = priceScale.getVisibleRange();
			if (!visiblePriceRange) return;

			const maxValue = visiblePriceRange.to;
			priceScale.setVisibleRange({
				from: this._toLog(maxValue / factor, this._defLogFormula),
				to: this._toLog(maxValue, this._defLogFormula)
			});

			priceScale.applyOptions({ autoScale: false });
		}

		_toLog(price, logFormula) {
			const m = Math.abs(price);
			if (m < 1e-15) {
				return 0;
			}

			const res = Math.log10(m + logFormula.coordOffset) + logFormula.logicalOffset;
			return price < 0 ? -res : res;
		}
	}

	onMount(() => {
		if (!chartContainer) return;
		candlestickChartSeries = new CandlestickChart(chartContainer);

		return () => candlestickChartSeries.remove();
	});

	$effect(() => {
		fetch(
			`/proxy?url=${encodeURIComponent(
				`https://groww.in/v1/api/data/mf/web/v1/scheme/${fund.groww_code}/graph?benchmark=false&months=60`
			)}`
		)
			.then((res) => res.json())
			.then((data) => {
				const lineData = data.folio.data;
				candlestickChartSeries.setData(lineData);
			});
	});
</script>

<!-- The outer element wrapper controls sizing cleanly via CSS styles -->
<div class="chart-wrapper" style="--max-width: {width}px; --height: {height}px;">
	<div bind:this={chartContainer} class="chart-holder"></div>
</div>

<style>
	.chart-wrapper {
		/* On mobile: 100% of parent width minus card padding. On desktop: stops at 600px. */
		width: 100%;
		/* Change max-width to allow full stretching on big desktop grids */
		max-width: 100%;
		height: var(--height);
		position: relative;
	}
	.chart-holder {
		width: 100%;
		height: 100%;
	}
</style>
