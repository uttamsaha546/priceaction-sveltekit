<script>
	import { onMount, onDestroy } from 'svelte';
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
	import { SmaSeriesPrimitive as _21WeekSmaSeriesPrimitive } from '$lib/utils/21WeekSmaSeriesPrimitive';
	import { SmaSeriesPrimitive as _21WeekSmaSeriesPrimitive10pct } from '$lib/utils/21WeekSmaSeriesPrimitive10pct';
	import { CustomShapePrimitive } from '$lib/utils/CustomShapePrimitive';
	import { DonchianHighPrimitive } from '$lib/utils/DonchianHighPrimitive';
	import { _52WeekHighPrimitive } from '$lib/utils/52WeekHighPrimitive';
	import { MeasureToolPrimitive } from './Tools/MeasureToolPrimitive';
	import { ToolState } from '$lib/state/ToolState.svelte';
	import { TrendAnglePrimitive } from './Tools/TrendAnglePrimitive';
	import { SafeEntryZonePrimitive } from './Tools/SafeEntryZonePrimitive';
	import dayjs from 'dayjs';
	import { DrawingManager } from '$lib/drawings/index';

	let chart, chartContainer, candlestickSeries, volumeSeries;
	let drawingManager;

	let { data, scalingMultiplier = 1 } = $props();

	const TempSerieses = [];

	let volume = true;

	// export async function loadDrawings(symbol) {
	// 	drawingManager.setSymbol(symbol);

	// 	// 2. Fetch Saved Drawings from SQLite Database
	// 	const dbResponse = await fetch(`/api/get-drawings?symbol=${symbol}`).then((res) => res.json());
	// 	if (dbResponse && dbResponse.drawings) {
	// 		drawingManager.loadDrawings(dbResponse.drawings);
	// 	}
	// }

	onMount(async () => {
		// Create Chart
		chart = createChart(chartContainer, {
			width: chartContainer.clientWidth,
			height: chartContainer.clientHeight,
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

		candlestickSeries = chart.addSeries(CandlestickSeries);

		// Initialize DrawingManager with Save Callback
		drawingManager = new DrawingManager(chart, candlestickSeries, '', async (symbol, drawings) => {
			// Save updated drawings to SQLite API endpoint
			await fetch('/api/save-drawings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ symbol, drawings })
			});
		});

		ChartState.drawingManager = drawingManager;

		if (volume) {
			volumeSeries = chart.addSeries(HistogramSeries, {
				priceFormat: {
					type: 'volume'
				},
				priceScaleId: ''
			});
			volumeSeries.priceScale().applyOptions({
				scaleMargins: {
					top: 0.7,
					bottom: 0
				}
			});
		}

		const smaSeries = new SmaSeriesPrimitive();
		candlestickSeries.attachPrimitive(smaSeries);

		const _21WeekSmaSeries = new _21WeekSmaSeriesPrimitive();
		candlestickSeries.attachPrimitive(_21WeekSmaSeries);

		const _21WeekSmaSeries10pct = new _21WeekSmaSeriesPrimitive10pct();
		candlestickSeries.attachPrimitive(_21WeekSmaSeries10pct);

		const rsiSeries = new CustomShapePrimitive();
		candlestickSeries.attachPrimitive(rsiSeries);
		const donchianHighSeries = new DonchianHighPrimitive();
		candlestickSeries.attachPrimitive(donchianHighSeries);
		const _52WeekHighSeries = new _52WeekHighPrimitive();
		candlestickSeries.attachPrimitive(_52WeekHighSeries);

		const measurePlugin = new MeasureToolPrimitive();
		candlestickSeries.attachPrimitive(measurePlugin);
		const trendAnglePlugin = new TrendAnglePrimitive();
		candlestickSeries.attachPrimitive(trendAnglePlugin);

		const safeEntryZonePlugin = new SafeEntryZonePrimitive();
		candlestickSeries.attachPrimitive(safeEntryZonePlugin);

		if (window.isTouchable) {
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
			// 		const targetPrice = candlestickSeries.coordinateToPrice(virtualY);

			// 		if (!targetTime || !targetPrice) return;

			// 		// 2. FORCIBLY move the crosshair to the finger position
			// 		// This keeps the crosshair lines visible on mobile without long-pressing!
			// 		chart.setCrosshairPosition(targetPrice, targetTime, candlestickSeries);

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
			// 	const targetPrice = candlestickSeries.coordinateToPrice(virtualY);

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
				if (ToolState.activeTool === 'cross') return;
				if (!param.time || !param.point) {
					currentMouseData = { time: null, price: null };
					return;
				}

				currentMouseData = {
					time: param.time,
					price: candlestickSeries.coordinateToPrice(param.point.y)
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
					price: candlestickSeries.coordinateToPrice(param.point.y)
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
							const mainBar = candlestickSeries.dataByIndex(i);
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

	onDestroy(() => {
		if (chart) chart.remove();
	});

	function handleKeyDown(event) {
		// Press Delete or Backspace to remove selected drawing
		if (event.key === 'Delete' || event.key === 'Backspace') {
			drawingManager.deleteDrawing();
		}
	}

	function changeSelectedColor(color) {
		const selectedId = drawingManager.getSelectedDrawingId();
		if (selectedId) {
			drawingManager.updateDrawingOptions(selectedId, { lineColor: color });
		}
	}

	// For subsequent data updates
	$effect(() => {
		if (!candlestickSeries || !data || !chart || data.length === 0) return;

		const priceScale = candlestickSeries.priceScale();
		priceScale.setAutoScale(true);

		candlestickSeries.setData(data);
		// drawingManager.setSymbol(ChartState.currentScrip);

		volumeSeries.setData(ChartState.volumeBarData);

		// keep zoom locked. make the price double every 100 pixel
		const scalingFactor = candlestickSeries.getPane().getHeight() / scalingMultiplier;

		ChartState.scaleFactor = scalingFactor.toFixed(1);
		setPriceToPixelRatio(priceScale, scalingFactor);
		// priceScale.applyOptions({ autoScale: false });
	});

	$effect(() => {
		if (ToolState.activeTool === 'range-box') {
			drawingManager.setTool('range-box');
		}
	});

	// ===== Functions Start ====
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
	// ===== Functions End =====
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="h-full w-full relative">
	<div bind:this={chartContainer} class="ChartContainer w-full h-full"></div>
</div>
