<!-- src/lib/components/PriceChart.svelte -->
<script>
	import {
		createChart,
		CandlestickSeries,
		CrosshairMode,
		PriceScaleMode
	} from 'lightweight-charts';
	import { onMount, onDestroy } from 'svelte';
	import { setPriceToPixelRatio } from '$lib/helper/functions';

	let { fund = {}, width = 600, height = 400 } = $props();

	let chartContainer = $state(null);
	let chart = null;
	let mainSeries = null;
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
				autoSize: true
			});

			this._series = this._chart.addSeries(CandlestickSeries);
		}

		remove() {
			this._chart.remove();
		}

		setData(lineData) {
			const barData = lineData;
			this._series.setData(barData);
		}
	}

	onMount(() => {
		if (!chartContainer) return;

		mainSeries = new CandlestickChart(chartContainer);

		return () => mainSeries.remove();
	});

	$effect(() => {
		fetch(`/api/${fund.groww_code}/graph`)
			.then((res) => res.json())
			.then((data) => {
				const formattedData = getWeeklyOHLC(data.folio.data);
				if (mainSeries && formattedData) {
					mainSeries.setData(formattedData);

					// keep zoom locked
					const scalingFactor = Math.round((chart.panes()[0].getHeight() / 150) * 100) / 100;
					setPriceToPixelRatio(chart.priceScale('right'), scalingFactor); //make the price double every 200 pixel
				}
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
