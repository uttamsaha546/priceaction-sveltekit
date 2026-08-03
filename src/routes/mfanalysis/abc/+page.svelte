<script>
	import { onMount } from 'svelte';
	import {
		createChart,
		CandlestickSeries,
		PriceScaleMode,
		CrosshairMode
	} from 'lightweight-charts';
	import { LineDataToBarData } from './utils';

	let healthcareCanvasElement,
		healthcareChart,
		healthcareSeries,
		pharmaSeries,
		hospitalsSeries = null;

	let isMonthly = $state(false);

	let { data } = $props();

	$inspect(data);

	let barData = $derived.by(() => {
		const SHIFT_FACTOR = 2;
		if (data) {
			return {
				healthcare: LineDataToBarData(data.healthcare, isMonthly ? 'M' : 'W'),
				pharma: LineDataToBarData(data.pharma, isMonthly ? 'M' : 'W'),
				hospitals: LineDataToBarData(data.hospitals, isMonthly ? 'M' : 'W').map((item) => ({
					time: item.time,
					open: item.open * SHIFT_FACTOR,
					high: item.high * SHIFT_FACTOR,
					low: item.low * SHIFT_FACTOR,
					close: item.close * SHIFT_FACTOR
				}))
			};
		}
		return null;
	});

	onMount(() => {
		healthcareChart = createChart(healthcareCanvasElement, {
			width: healthcareCanvasElement.width,
			height: healthcareCanvasElement.height,
			autoSize: true,
			rightPriceScale: {
				mode: PriceScaleMode.Logarithmic
			},
			timeScale: {
				rightOffset: 20,
				barSpacing: 5
			},
			grid: {
				vertLines: {
					color: 'rgba(197, 203, 206, 0.2)'
				},
				horzLines: {
					color: 'rgba(197, 203, 206, 0.2)'
				}
			},
			crosshair: {
				mode: CrosshairMode.Normal
			}
		});

		healthcareSeries = healthcareChart.addSeries(CandlestickSeries, { title: 'Healthcare' });
		pharmaSeries = healthcareChart.addSeries(CandlestickSeries, { title: 'Pharma' });
		hospitalsSeries = healthcareChart.addSeries(CandlestickSeries, { title: 'Hospitals' });
	});

	$effect(() => {
		healthcareChart.priceScale('right').applyOptions({ autoScale: true });
		healthcareSeries.setData(barData?.healthcare);
		pharmaSeries.setData(barData?.pharma);
		hospitalsSeries.setData(barData?.hospitals);
		healthcareChart.priceScale('right').applyOptions({ autoScale: false });
	});
</script>

<div class="flex flex-col gap-4 h-screen w-8/12 m-auto">
	<div class="prose"><h1>Healthcare</h1></div>
	<label class="self-end"><input type="checkbox" bind:checked={isMonthly} /> Monthly</label>
	<div bind:this={healthcareCanvasElement} class="flex-1"></div>
</div>
