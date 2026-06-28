<script>
	import TopBarWithDivider from '$lib/components/chart/TopBarWithDivider.svelte';
	import LeftBarWithDivider from '$lib/components/chart/LeftBarWithDivider.svelte';
	import Chart from '$lib/components/chart/Chart.svelte';
	import RightBarWithDividerAndResizer from '$lib/components/chart/RightBarWithDividerAndResizer.svelte';

	import { onMount } from 'svelte';
	import { ChartState } from '$lib/state/ChartState.svelte';

	async function loadInitialData() {
		try {
			const res = await fetch(
				`/proxy?url=${encodeURIComponent(
					'https://groww.in/v1/api/data/mf/web/v1/scheme/140228/graph?benchmark=false&months=60'
				)}`
			);
			const json = await res.json();
			const data = json.folio.data;
			ChartState.lineData = data;
		} catch (err) {
			console.error(err);
		}
	}
	async function loadFlagsData() {
		try {
			const res = await fetch('/api/flags');
			ChartState.flags = await res.json();
		} catch (err) {
			console.error(err);
		}
	}

	onMount(() => {
		loadInitialData();
		loadFlagsData();

		if (typeof window !== 'undefined') {
			// window.isTouchCapable = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
			window.isTouchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		}
	});
</script>

<div class="h-screen w-screen flex flex-col">
	<TopBarWithDivider />
	<div class="H-Flex-1 w-full flex flex-1 overflow-hidden">
		<LeftBarWithDivider />
		<div
			class="ChartArea h-full W-Flex-1 flex flex-1 min-w-0 cursor-crosshair active:cursor-grabbing relative"
		>
			<Chart data={ChartState.barData} scalingMultiplier={ChartState.isMonthly ? 6 : 1} />
			<div
				class="Timeframe absolute bottom-0 right-0 z-20 h-7 w-16 flex items-center justify-center"
			>
				<button
					class:bg-gray-400={ChartState.isMonthly}
					class="border border-gray-400 rounded px-2 box-border"
					onclick={() => (ChartState.isMonthly = !ChartState.isMonthly)}>M</button
				>
			</div>

			<!-- <div class="absolute top-0 left-0 z-20 bg-gray-50/50 w-full h-full"></div> -->
		</div>
		<RightBarWithDividerAndResizer />
	</div>
</div>
