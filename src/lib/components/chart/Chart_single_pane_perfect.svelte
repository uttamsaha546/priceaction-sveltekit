<script>
	import { onMount } from 'svelte';
	import {
		createChart,
		CandlestickSeries,
		CrosshairMode,
		PriceScaleMode,
		LineSeries,
		HistogramSeries
	} from 'lightweight-charts';
	import { ChartState } from '$lib/state/ChartState.svelte';
	import { SmaSeriesPrimitive } from '$lib/utils/SmaSeriesPrimitive';
	import { CustomShapePrimitive } from '$lib/utils/CustomShapePrimitive';
	import { DonchianHighPrimitive } from '$lib/utils/DonchianHighPrimitive';
	import { _52WeekHighPrimitive } from '$lib/utils/52WeekHighPrimitive';
	import { MeasureToolPrimitive } from './Tools/MeasureToolPrimitive';
	import { ToolState } from '$lib/state/ToolState.svelte';
	import { TrendAnglePrimitive } from './Tools/TrendAnglePrimitive';
	import { SafeEntryZonePrimitive } from './Tools/SafeEntryZonePrimitive';

	let chart;
	let container;
	let mainSeries;
	let histogramSeries;
	let { data, scalingMultiplier = 1 } = $props();

	const TempSerieses = [];

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
				scaleMargins: { top: 0.1, bottom: 0 },
				mode: PriceScaleMode.Logarithmic
			},
			timeScale: { rightOffset: 10, barSpacing: 4 },
			autoSize: true
		});

		window.chart = chart;

		mainSeries = chart.addSeries(CandlestickSeries);
		// histogramSeries = chart.addSeries(
		// 	HistogramSeries,
		// 	{
		// 		// priceScaleId: '',
		// 		// priceFormat: { type: 'volume' }
		// 	},
		// 	1
		// );

		// histogramSeries.priceScale().applyOptions({
		// 	// set the positioning of the volume series
		// 	// scaleMargins: {
		// 	// 	top: 0.8, // highest point of the series will be 70% away from the top
		// 	// 	bottom: 0
		// 	// },
		// 	mode: PriceScaleMode.Logarithmic
		// });

		// histogramSeries = chart.addSeries(
		// 	HistogramSeries,
		// 	{
		// 		autoscaleInfoProvider: () => {
		// 			if (!chart || !histogramSeries) return null;

		// 			const logicalRange = chart.timeScale().getVisibleLogicalRange();
		// 			if (!logicalRange) return null;

		// 			let maxVisibleVolume = 0;

		// 			// Loop through visible bars to grab the highest peak currently shown
		// 			for (let i = Math.floor(logicalRange.from); i <= Math.ceil(logicalRange.to); i++) {
		// 				const dataPoint = histogramSeries.dataByIndex(i);
		// 				if (dataPoint && dataPoint.value > maxVisibleVolume) {
		// 					maxVisibleVolume = dataPoint.value;
		// 				}
		// 			}

		// 			if (maxVisibleVolume === 0) return null;

		// 			// 2. Apply your "50 pixels to double" logarithmic scale math
		// 			const paneHeight = chart.panes()[1]?.getHeight() || 150;
		// 			const scaleFactor = paneHeight / 50;

		// 			// In log base 2, dividing the top value by (2 ^ scaleFactor)
		// 			// ensures your exact fixed logarithmic distance math is satisfied
		// 			const scaleFloor = maxVisibleVolume / scaleFactor;

		// 			return {
		// 				priceRange: {
		// 					minValue: scaleFloor,
		// 					maxValue: maxVisibleVolume
		// 				}
		// 			};
		// 		}
		// 	},
		// 	1 // Pinned to Pane 1
		// );

		// histogramSeries.priceScale().applyOptions({
		// 	mode: PriceScaleMode.Logarithmic,
		// 	autoScale: true // Let our provider handle the sliding viewport windows
		// });

		window.mainSeries = mainSeries;

		const smaSeries = new SmaSeriesPrimitive();
		mainSeries.attachPrimitive(smaSeries);
		const rsiSeries = new CustomShapePrimitive();
		mainSeries.attachPrimitive(rsiSeries);
		const donchianHighSeries = new DonchianHighPrimitive();
		mainSeries.attachPrimitive(donchianHighSeries);
		const _52WeekHighSeries = new _52WeekHighPrimitive();
		mainSeries.attachPrimitive(_52WeekHighSeries);

		const measurePlugin = new MeasureToolPrimitive();
		mainSeries.attachPrimitive(measurePlugin);
		const trendAnglePlugin = new TrendAnglePrimitive();
		mainSeries.attachPrimitive(trendAnglePlugin);

		const safeEntryZonePlugin = new SafeEntryZonePrimitive();
		mainSeries.attachPrimitive(safeEntryZonePlugin);

		if (window.isTouchCapable) {
			//For touch screen
			let measureState = $state('idle');
			let startPoint = null;
			let currentPoint = null;
			let currentMouseData = { time: null, price: null };
			// Track the current virtual crosshair position in pixels
			let virtualX = 0;
			let virtualY = 0;

			// Helper to push points cleanly to the tool in use
			function updateActivePlugin(start, end) {
				if (ToolState.activeTool === 'measure') {
					measurePlugin.updatePoints(start, end);
				} else if (ToolState.activeTool === 'trendAngle') {
					trendAnglePlugin.updatePoints(start, end);
				}
			}

			function setChartMobileInteractions(enabled) {
				chart.applyOptions({
					handleScroll: enabled,
					handleScale: enabled
				});
			}
			const chartElement = chart.chartElement();

			// Track when the finger moves across the screen
			// chartElement.addEventListener(
			// 	'touchmove',
			// 	(e) => {
			// 		e.preventDefault();
			// 		console.log(e);
			// 		if (ToolState.activeTool !== 'measure' && ToolState.activeTool !== 'trendAngle') return;
			// 		if (measureState === 'locked') return; // Don't move cursor if drawing is locked
			// 		if (e.touches.length !== 1) return;

			// 		// Prevent screen from scrolling or chart panning
			// 		e.preventDefault();

			// 		const touch = e.touches[0];
			// 		const rect = chartElement.getBoundingClientRect();

			// 		// Save current pixel locations
			// 		virtualX = touch.clientX - rect.left;
			// 		virtualY = touch.clientY - rect.top;

			// 		// 1. Convert pixels to chart coordinates
			// 		const timeScale = chart.timeScale();
			// 		const targetTime = timeScale.coordinateToTime(virtualX);
			// 		const targetPrice = mainSeries.coordinateToPrice(virtualY);

			// 		if (!targetTime || !targetPrice) return;

			// 		// 2. FORCIBLY move the crosshair to the finger position
			// 		// This keeps the crosshair lines visible on mobile without long-pressing!
			// 		chart.setCrosshairPosition(targetPrice, targetTime, mainSeries);

			// 		// 3. Update the live preview if we've already dropped our first anchor
			// 		if (measureState === 'started' && startPoint) {
			// 			currentPoint = { time: targetTime, price: targetPrice };
			// 			updateActivePlugin(startPoint, currentPoint);
			// 		}
			// 	},
			// 	{ passive: false }
			// );

			// let touchStartTime = 0;

			// chartElement.addEventListener('touchstart', (e) => {
			// 	e.preventDefault();
			// 	console.log(e);
			// 	if (e.touches.length === 1) {
			// 		touchStartTime = Date.now();

			// 		// If a tool is chosen, block the background chart from panning on drag
			// 		if (ToolState.activeTool === 'measure' || ToolState.activeTool === 'trendAngle') {
			// 			setChartMobileInteractions(false);
			// 		}
			// 	}
			// });

			// chartElement.addEventListener('touchend', (e) => {
			// 	e.preventDefault();
			// 	console.log(e);
			// 	const touchDuration = Date.now() - touchStartTime;

			// 	// A tap is typically a touch release that takes less than 250 milliseconds
			// 	const isTap = touchDuration < 250;
			// 	if (!isTap) {
			// 		// If it was a long drag rather than a tap, just leave the crosshair parked
			// 		return;
			// 	}

			// 	// Convert our last tracked virtual position into usable points
			// 	const timeScale = chart.timeScale();
			// 	const targetTime = timeScale.coordinateToTime(virtualX);
			// 	const targetPrice = mainSeries.coordinateToPrice(virtualY);

			// 	if (!targetTime || !targetPrice) return;
			// 	const tappedPoint = { time: targetTime, price: targetPrice };

			// 	// ==========================================
			// 	// 3-STEP SELECTION LOGIC
			// 	// ==========================================
			// 	if (ToolState.activeTool === 'measure' || ToolState.activeTool === 'trendAngle') {
			// 		if (measureState === 'idle') {
			// 			// TAP 1: Log the startPoint exactly under the crosshair
			// 			measureState = 'started';
			// 			startPoint = tappedPoint;
			// 			currentPoint = tappedPoint;
			// 			updateActivePlugin(startPoint, currentPoint);
			// 		} else if (measureState === 'started') {
			// 			// TAP 2: Lock the currentPoint and freeze drawing
			// 			measureState = 'locked';
			// 			currentPoint = tappedPoint;
			// 			updateActivePlugin(startPoint, currentPoint);

			// 			// Revert active tool sidebar button
			// 			ToolState.activeTool = 'cross';

			// 			// Re-enable normal chart scrolling/panning gestures
			// 			setChartMobileInteractions(true);

			// 			// Hide the virtual crosshair lines now that we are done
			// 			chart.clearCrosshairPosition();
			// 		}
			// 	} else if (measureState === 'locked' && ToolState.activeTool === 'cross') {
			// 		// TAP 3: Tap anywhere else while locked to remove the drawings
			// 		measureState = 'idle';
			// 		startPoint = null;
			// 		currentPoint = null;
			// 		measurePlugin.updatePoints(null, null);
			// 		trendAnglePlugin.updatePoints(null, null);
			// 	}
			// });

			// Register start event first
			chartElement.addEventListener(
				'touchstart',
				(e) => {
					// Simply having this active helps trigger touchmove
				},
				{ passive: false }
			);

			// Update your move event
			chartElement.addEventListener(
				'touchmove',
				(e) => {
					e.preventDefault();
					console.log(e);
				},
				{ passive: false }
			);
		} else {
			//For desktops
			// Valid states: 'idle', 'started', 'locked'
			let measureState = $state('idle');
			let startPoint = null;
			let currentPoint = null;
			let currentMouseData = { time: null, price: null };

			// Helper to push points cleanly to the tool in use
			function updateActivePlugin(start, end) {
				if (ToolState.activeTool === 'measure') {
					measurePlugin.updatePoints(start, end);
				} else if (ToolState.activeTool === 'trendAngle') {
					trendAnglePlugin.updatePoints(start, end);
				} else if (ToolState.activeTool === 'trendLine') {
					safeEntryZonePlugin.updatePoints(start, end);
				}
			}

			// 1. Monitor the mouse cursor tracking
			chart.subscribeCrosshairMove((param) => {
				if (!param.time || !param.point) {
					currentMouseData = { time: null, price: null };
					return;
				}

				currentMouseData = {
					time: param.time,
					price: mainSeries.coordinateToPrice(param.point.y)
				};

				// Only track updates visually if we are actively drawing the measure tool
				if (measureState === 'started' && startPoint) {
					currentPoint = currentMouseData;
					updateActivePlugin(startPoint, currentPoint);
				}
			});

			// 2. Handle the 3-Step Click Cycle
			chart.subscribeClick((param) => {
				if (!param.time || !param.point) return;

				// Prevent random chart clicks from triggering measure logic if the tool isn't active
				// EXCEPT when we need to clear a locked drawing (measureState === 'locked')
				const currentTool = ToolState.activeTool;
				if (currentTool === 'cross' && measureState !== 'locked') return;

				if (ToolState.activeTool === 'clearDrawings') {
					measurePlugin.updatePoints(null, null);
					trendAnglePlugin.updatePoints(null, null);
					safeEntryZonePlugin.updatePoints(null, null);
				}

				const clickedPoint = {
					time: param.time,
					price: mainSeries.coordinateToPrice(param.point.y)
				};

				if (measureState === 'idle') {
					// ==========================================
					// CLICK 1: Set start point & start tracking
					// ==========================================
					measureState = 'started';
					startPoint = clickedPoint;
					currentPoint = clickedPoint;
					updateActivePlugin(startPoint, currentPoint);
				} else if (measureState === 'started') {
					// ==========================================
					// CLICK 2: Finish calculation & Lock drawing
					// ==========================================
					measureState = 'locked';
					currentPoint = clickedPoint;

					// 1. Update the canvas point first while the active state conditions align
					updateActivePlugin(startPoint, currentPoint);

					if (ToolState.activeTool === 'trendLine') {
						const startIndex = chart.timeScale().timeToIndex(startPoint.time);
						const endIndex = chart.timeScale().timeToIndex(currentPoint.time);

						let diffPct = [];
						for (let i = startIndex; i <= endIndex; i++) {
							const mainBar = mainSeries.dataByIndex(i);
							const bottom = mainBar.close > mainBar.open ? mainBar.open : mainBar.close;
							const sma = smaSeries.dataByIndex(i);
							diffPct.push(bottom / sma.value - 1);
						}
						const avgDiffPct = diffPct.reduce((a, b) => a + b, 0) / diffPct.length;

						// const data = [];
						// for (let i = startIndex; i <= endIndex; i++) {
						// 	const sma = smaSeries.dataByIndex(i);
						// 	data.push({ time: sma.time, value: sma.value * (1 + avgDiffPct * 0.75) });
						// }

						// const newseries = chart.addSeries(LineSeries, {
						// 	crosshairMarkerVisible: false,
						// 	priceLineVisible: false,
						// 	zOrder: 'top',
						// 	color: 'purple'
						// });
						// newseries.setData(data);

						// updateActivePlugin(null, null);

						// TempSerieses.push(newseries);

						updateActivePlugin(
							{
								time: startPoint.time,
								price: smaSeries.dataByIndex(startIndex).value * (1 + avgDiffPct * 0.75)
							},
							{
								time: currentPoint.time,
								price: smaSeries.dataByIndex(endIndex).value * (1 + avgDiffPct * 0.75)
							}
						);
					}

					// 2. Automatically revert the UI sidebar back to the default crosshair tool
					ToolState.activeTool = 'cross';
				} else if (measureState === 'locked') {
					// ==========================================
					// CLICK 3: Wipe canvas artifacts completely
					// ==========================================
					measureState = 'idle';
					startPoint = null;
					currentPoint = null;

					// Always clear the plugin drawing regardless of what activeTool currently is
					// Clear BOTH plugins to ensure nothing remains stuck on screen
					if (ToolState.activeTool === 'clearDrawings') {
						measurePlugin.updatePoints(null, null);
						trendAnglePlugin.updatePoints(null, null);
						// safeEntryZonePlugin.updatePoints(null, null);
						// TempSerieses.forEach((series) => chart.removeSeries(series));
						ToolState.activeTool = 'cross';
					}
				}
			});
		}

		return () => chart.remove();
	});

	// For subsequent data updates
	$effect(() => {
		if (!mainSeries || !data || !chart || !data.length === 0) return;

		mainSeries.priceScale().applyOptions({ autoScale: true });
		mainSeries.setData(data);

		const priceScale = chart.priceScale('right');

		// keep zoom locked. make the price double every 100 pixel
		const scalingFactor = chart.panes()[0].getHeight() / 100;
		ChartState.scaleFactor = (scalingFactor * scalingMultiplier).toFixed(1);
		setPriceToPixelRatio(priceScale, scalingFactor * scalingMultiplier);
		// 🔥 pan vertically if needed
		// panPriceScaleIntoView(priceScale, data, scalingFactor * scalingMultiplier);
	});

	// $effect(() => {
	// 	const data = ChartState.ttmResult;
	// 	// $inspect(data);
	// 	// const min = Math.min(...data.map((x) => x.revenue));
	// 	// console.log(min);
	// 	const markers = data.map((x) => {
	// 		return {
	// 			time: x.time,
	// 			value: x.revenue
	// 		};
	// 	});
	// 	// console.log(markers);

	// 	// histogramSeries.priceScale().applyOptions({ autoScale: true });
	// 	histogramSeries.setData(markers);
	// 	// console.log(chart.panes()[0].getHeight());
	// 	// setPriceToPixelRatio(histogramSeries.priceScale(), chart.panes()[1].getHeight() / 50);
	// 	// histogramSeries.priceScale().applyOptions({ autoScale: false });

	// 	// chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
	// 	// 	if (!logicalRange) return;

	// 	// 	// Get all the data points currently loaded in your series
	// 	// 	const allData = histogramSeries.data();
	// 	// 	if (allData.length === 0) return;

	// 	// 	let maxVisibleVolume = 0;

	// 	// 	// Find the highest volume value within the currently visible horizontal window
	// 	// 	for (let i = Math.floor(logicalRange.from); i <= Math.ceil(logicalRange.to); i++) {
	// 	// 		// Map logical index back to data array index
	// 	// 		const dataPoint = histogramSeries.dataByIndex(i);
	// 	// 		if (dataPoint && dataPoint.value > maxVisibleVolume) {
	// 	// 			maxVisibleVolume = dataPoint.value;
	// 	// 		}
	// 	// 	}

	// 	// 	if (maxVisibleVolume > 0) {
	// 	// 		// Calculate your lower bound based on your "50 pixels to double" logic.
	// 	// 		// For example, if your pane height is roughly 150px (3 doubles max),
	// 	// 		// we can set the bottom floor relative to the current max peak.
	// 	// 		const scaleFloor = maxVisibleVolume / (chart.panes()[1].getHeight() / 50); // Adjust divisor based on your specific grid setup

	// 	// 		histogramSeries.priceScale().applyOptions({
	// 	// 			autoscaleInfoProvider: () => ({
	// 	// 				priceRange: {
	// 	// 					minValue: scaleFloor,
	// 	// 					maxValue: maxVisibleVolume
	// 	// 				}
	// 	// 			})
	// 	// 		});
	// 	// 	}
	// 	// });
	// });

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
