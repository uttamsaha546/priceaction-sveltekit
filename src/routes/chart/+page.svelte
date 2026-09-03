<script>
	import TopBarWithDivider from '$lib/components/chart/TopBarWithDivider.svelte';
	import LeftBarWithDivider from '$lib/components/chart/LeftBarWithDivider.svelte';
	import ChartComponent from '$lib/components/chart/ChartComponent.svelte';
	import RightBarWithDividerAndResizer from '$lib/components/chart/RightBarWithDividerAndResizer.svelte';
	import { ChartState } from '$lib/state/ChartState.svelte';
	import { onMount } from 'svelte';

	async function loadInitialData() {
		ChartState.isLoading = true;
		try {
			const res = await fetch(
				`/proxy?url=${encodeURIComponent(
					'https://groww.in/v1/api/data/mf/web/v1/scheme/140228/graph?benchmark=false&months=60'
				)}`
			).then((x) => x.json());

			ChartState.lineData = res.folio.data;
		} catch (err) {
			console.error(err);
		} finally {
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

	let scalingMultiplier = $derived.by(() => {
		if (ChartState.timeframe === 'M') return ChartState.scaleM;
		else if (ChartState.timeframe === 'F') return ChartState.scaleF;
		else return ChartState.scaleW;
	});

	onMount(() => {
		loadFlagsTableData();
		loadInitialData();
	});
</script>

<div class="h-screen w-screen flex flex-col main-container">
	<TopBarWithDivider />
	<div class="H-Flex-1 w-full flex flex-1 overflow-hidden">
		<LeftBarWithDivider />
		<div
			class="ChartArea h-full W-Flex-1 flex flex-1 min-w-0 cursor-crosshair active:cursor-grabbing relative"
		>
			<ChartComponent data={ChartState.barData} {scalingMultiplier} />
			<div
				class="Timeframe absolute bottom-0 right-0 z-20 h-7 w-16 flex items-center justify-center"
			>
				<button
					class:bg-gray-400={ChartState.timeframe === 'M'}
					class="border border-gray-400 rounded px-2 box-border"
					onclick={() =>
						ChartState.timeframe === 'M'
							? (ChartState.timeframe = 'W')
							: (ChartState.timeframe = 'M')}>M</button
				>
			</div>

			<!-- Chart Data Loading Indicator -->
			{#if ChartState.isLoading}
				<div class="absolute top-0 left-0 z-20 bg-gray-50/50 w-full h-full"></div>
			{/if}
		</div>
		<RightBarWithDividerAndResizer />
	</div>
</div>
