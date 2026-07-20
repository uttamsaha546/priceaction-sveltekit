<script>
	import TopBarWithDivider from '$lib/components/chart/TopBarWithDivider.svelte';
	import LeftBarWithDivider from '$lib/components/chart/LeftBarWithDivider.svelte';
	import Chart from '$lib/components/chart/Chart.svelte';
	import RightBarWithDividerAndResizer from '$lib/components/chart/RightBarWithDividerAndResizer.svelte';

	import { onMount } from 'svelte';
	import { ChartState } from '$lib/state/ChartState.svelte';

	async function loadInitialData() {
		try {
			ChartState.isLoading = true;
			const res = await fetch(
				`/proxy?url=${encodeURIComponent(
					'https://groww.in/v1/api/data/mf/web/v1/scheme/140228/graph?benchmark=false&months=60'
				)}`
			);
			const json = await res.json();
			const data = json.folio.data;
			ChartState.lineData = data;
			ChartState.isLoading = false;
		} catch (err) {
			console.error(err);
			ChartState.isLoading = false;
		}
	}
	async function loadFlagsTableData() {
		try {
			const res = await fetch('/api/flags');
			ChartState.flags = await res.json();
		} catch (err) {
			console.error(err);
		}
	}

	async function loadGrowwTableData() {
		try {
			const res = await fetch('/api/groww');
			const data = await res.json();
			const keyValuePair = {};

			data.forEach((item) => {
				keyValuePair[item.searchId] = item;
			});
			ChartState.groww = keyValuePair;
		} catch (err) {
			console.error(err);
		}
	}

	onMount(() => {
		loadFlagsTableData();
		loadGrowwTableData();
		loadInitialData();

		if (typeof window !== 'undefined') {
			// window.isTouchCapable = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
			window.isTouchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		}
	});
</script>

<div class="h-screen w-screen flex flex-col main-container">
	<TopBarWithDivider />
	<div class="H-Flex-1 w-full flex flex-1 overflow-hidden">
		<LeftBarWithDivider />
		<div
			class="ChartArea h-full W-Flex-1 flex flex-1 min-w-0 cursor-crosshair active:cursor-grabbing relative"
		>
			<Chart data={ChartState.barData} scalingMultiplier={ChartState.isMonthly ? 30 : 1} />
			<div
				class="Timeframe absolute bottom-0 right-0 z-20 h-7 w-16 flex items-center justify-center"
			>
				<button
					class:bg-gray-400={ChartState.isMonthly}
					class="border border-gray-400 rounded px-2 box-border"
					onclick={() => (ChartState.isMonthly = !ChartState.isMonthly)}>M</button
				>
			</div>

			<div class="Timeframe absolute bottom-10 right-16 z-20 flex items-center justify-center">
				{#if ChartState.bottomRight}
					<table>
						<thead><tr><th>Current Year</th><th>Next Year</th></tr></thead><tbody>
							<tr
								><td>{ChartState?.bottomRight.currentYear}</td><td
									>{ChartState?.bottomRight.nextYear}</td
								></tr
							></tbody
						>
					</table>
				{/if}
			</div>

			{#if ChartState.isLoading}
				<div class="absolute top-0 left-0 z-20 bg-gray-50/50 w-full h-full"></div>
			{/if}
		</div>
		<RightBarWithDividerAndResizer />
	</div>
</div>

<style>
	/* .main-container {
		background-color: rgb(235, 235, 235);
	} */

	/* Table Layout and Typography */
	table {
		border-collapse: collapse; /* Merges borders into single clean lines */

		font-size: 0.9rem;
		font-family: sans-serif;

		width: 100%;
	}

	/* Header Styling */
	thead tr {
		background-color: #009879;
		color: #ffffff;
		text-align: left;
		font-weight: bold;
	}

	/* Cell Padding */
	th,
	td {
		padding: 5px 8px;
	}

	/* Row Borders & Alternating Zebra Stripes */
	tbody tr {
		border-bottom: 1px solid #dddddd;
	}

	tbody tr:nth-of-type(even) {
		background-color: #f3f3f3; /* Darkens every second row */
	}

	/* Bottom Highlight Line */
	tbody tr:last-of-type {
		border-bottom: 2px solid #009879;
	}

	/* Interactive Hover Feedback */
	tbody tr:hover {
		background-color: #f1f1f1;
	}
</style>
