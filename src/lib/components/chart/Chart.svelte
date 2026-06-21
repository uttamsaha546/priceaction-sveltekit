<script>
	import { onMount } from 'svelte';
	import {
		createChart,
		CandlestickSeries,
		CrosshairMode,
		PriceScaleMode
	} from 'lightweight-charts';
	import { ChartState } from '$lib/state/ChartState.svelte';
	import { SmaSeriesPrimitive } from '$lib/utils/SmaSeriesPrimitive';
	import { CustomShapePrimitive } from '$lib/utils/CustomShapePrimitive';
	import { DonchianHighPrimitive } from '$lib/utils/DonchianHighPrimitive';

	let chart;
	let container;
	let mainSeries;
	let { data, scalingMultiplier = 1 } = $props();

	onMount(() => {
		chart = createChart(container, {
			width: container.clientWidth,
			height: container.clientHeight,
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
				mode: PriceScaleMode.Logarithmic
			},
			timeScale: { rightOffset: 10, barSpacing: 4 },
			autoSize: true
		});

		mainSeries = chart.addSeries(CandlestickSeries);

		const smaSeries = new SmaSeriesPrimitive();
		mainSeries.attachPrimitive(smaSeries);
		const rsiSeries = new CustomShapePrimitive();
		mainSeries.attachPrimitive(rsiSeries);
		const donchianHighSeries = new DonchianHighPrimitive();
		mainSeries.attachPrimitive(donchianHighSeries);

		return () => chart.remove();
	});

	// For subsequent data updates
	$effect(() => {
		if (!mainSeries || !data || !chart || !data.length === 0) return;

		mainSeries.setData(data);

		const priceScale = chart.priceScale('right');

		// keep zoom locked. make the price double every 100 pixel
		const scalingFactor = Math.round((chart.panes()[0].getHeight() / 100) * 100) / 100;
		ChartState.scaleFactor = (scalingFactor * scalingMultiplier).toFixed(1);
		setPriceToPixelRatio(priceScale, scalingFactor * scalingMultiplier);
		// 🔥 pan vertically if needed
		panPriceScaleIntoView(priceScale, data, scalingFactor * scalingMultiplier);
	});

	// Functions Start
	function setPriceToPixelRatio(priceScale, factor) {
		const visiblePriceRange = priceScale.getVisibleRange();
		if (!visiblePriceRange) return;

		const maxValue = visiblePriceRange.to;
		priceScale.setVisibleRange({
			from: toLog(maxValue / factor, defLogFormula),
			to: toLog(maxValue, defLogFormula)
		});
	}

	const defLogFormula = {
		logicalOffset: 4,
		coordOffset: 0.0001
	};

	function toLog(price, logFormula) {
		const m = Math.abs(price);
		if (m < 1e-15) {
			return 0;
		}

		const res = Math.log10(m + logFormula.coordOffset) + logFormula.logicalOffset;
		return price < 0 ? -res : res;
	}

	function panPriceScaleIntoView(priceScale, data, scalingFactor) {
		const range = priceScale.getVisibleRange();
		if (!range || !data?.length) return;

		const prices = data.map((d) => d.high ?? d.value);
		const maxPrice = Math.max(...prices);

		const shift = maxPrice - range.to;

		if (shift !== 0) {
			priceScale.setVisibleRange({
				from: toLog((range.to + shift) / scalingFactor, defLogFormula),
				to: toLog(range.to + shift, defLogFormula)
			});
		}
	}
	// Functions End
</script>

<div class="h-full w-full relative">
	<div bind:this={container} class="ChartContainer w-full h-full"></div>
</div>
