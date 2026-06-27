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
	import { _52WeekHighPrimitive } from '$lib/utils/52WeekHighPrimitive';
	import { MeasureToolPrimitive } from './Tools/MeasureToolPrimitive';
	import { ToolState } from '$lib/state/ToolState.svelte';
	import { TrendAnglePrimitive } from './Tools/TrendAnglePrimitive';

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
				scaleMargins: { top: 0.1, bottom: 0 },
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
		const _52WeekHighSeries = new _52WeekHighPrimitive();
		mainSeries.attachPrimitive(_52WeekHighSeries);

		const measurePlugin = new MeasureToolPrimitive();
		mainSeries.attachPrimitive(measurePlugin);
		const trendAnglePlugin = new TrendAnglePrimitive();
		mainSeries.attachPrimitive(trendAnglePlugin);

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
				measurePlugin.updatePoints(null, null);
				trendAnglePlugin.updatePoints(null, null);
			}
		});

		//For touch screen
		// Track the current virtual crosshair position in pixels
		let virtualX = 0;
		let virtualY = 0;

		function setChartMobileInteractions(enabled) {
			chart.applyOptions({
				handleScroll: enabled,
				handleScale: enabled
			});
		}
		const chartElement = chart.chartElement();

		// Track when the finger moves across the screen
		chartElement.addEventListener(
			'touchmove',
			(e) => {
				if (ToolState.activeTool !== 'measure' && ToolState.activeTool !== 'trendAngle') return;
				if (measureState === 'locked') return; // Don't move cursor if drawing is locked
				if (e.touches.length !== 1) return;

				// Prevent screen from scrolling or chart panning
				e.preventDefault();

				const touch = e.touches[0];
				const rect = chartElement.getBoundingClientRect();

				// Save current pixel locations
				virtualX = touch.clientX - rect.left;
				virtualY = touch.clientY - rect.top;

				// 1. Convert pixels to chart coordinates
				const timeScale = chart.timeScale();
				const targetTime = timeScale.coordinateToTime(virtualX);
				const targetPrice = mainSeries.coordinateToPrice(virtualY);

				if (!targetTime || !targetPrice) return;

				// 2. FORCIBLY move the crosshair to the finger position
				// This keeps the crosshair lines visible on mobile without long-pressing!
				chart.setCrosshairPosition(targetPrice, targetTime, mainSeries);

				// 3. Update the live preview if we've already dropped our first anchor
				if (measureState === 'started' && startPoint) {
					currentPoint = { time: targetTime, price: targetPrice };
					updateActivePlugin(startPoint, currentPoint);
				}
			},
			{ passive: false }
		);

		let touchStartTime = 0;

		chartElement.addEventListener('touchstart', (e) => {
			if (e.touches.length === 1) {
				touchStartTime = Date.now();

				// If a tool is chosen, block the background chart from panning on drag
				if (ToolState.activeTool === 'measure' || ToolState.activeTool === 'trendAngle') {
					setChartMobileInteractions(false);
				}
			}
		});

		chartElement.addEventListener('touchend', (e) => {
			const touchDuration = Date.now() - touchStartTime;

			// A tap is typically a touch release that takes less than 250 milliseconds
			const isTap = touchDuration < 250;
			if (!isTap) {
				// If it was a long drag rather than a tap, just leave the crosshair parked
				return;
			}

			// Convert our last tracked virtual position into usable points
			const timeScale = chart.timeScale();
			const targetTime = timeScale.coordinateToTime(virtualX);
			const targetPrice = mainSeries.coordinateToPrice(virtualY);

			if (!targetTime || !targetPrice) return;
			const tappedPoint = { time: targetTime, price: targetPrice };

			// ==========================================
			// 3-STEP SELECTION LOGIC
			// ==========================================
			if (ToolState.activeTool === 'measure' || ToolState.activeTool === 'trendAngle') {
				if (measureState === 'idle') {
					// TAP 1: Log the startPoint exactly under the crosshair
					measureState = 'started';
					startPoint = tappedPoint;
					currentPoint = tappedPoint;
					updateActivePlugin(startPoint, currentPoint);
				} else if (measureState === 'started') {
					// TAP 2: Lock the currentPoint and freeze drawing
					measureState = 'locked';
					currentPoint = tappedPoint;
					updateActivePlugin(startPoint, currentPoint);

					// Revert active tool sidebar button
					ToolState.activeTool = 'cross';

					// Re-enable normal chart scrolling/panning gestures
					setChartMobileInteractions(true);

					// Hide the virtual crosshair lines now that we are done
					chart.clearCrosshairPosition();
				}
			} else if (measureState === 'locked' && ToolState.activeTool === 'cross') {
				// TAP 3: Tap anywhere else while locked to remove the drawings
				measureState = 'idle';
				startPoint = null;
				currentPoint = null;
				measurePlugin.updatePoints(null, null);
				trendAnglePlugin.updatePoints(null, null);
			}
		});

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
