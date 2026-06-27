<script>
	import MeasureIcon from './Icons/MeasureIcon.svelte';
	import TrendAngleIcon from './Icons/TrendAngleIcon.svelte';

	let activeTool = $state('');
</script>

<div class="LeftBarWithDivider h-full w-12 flex flex-row">
	<div class="LeftBarTools h-full w-11 flex flex-col">
		<div
			class="FixedArea h-full w-11 p-1 flex flex-col items-center gap-2 border-l border-gray-200"
		>
			<!-- Index Analysis Nifty Icon  -->
			<button
				class={`${activeTool === 1 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1`}
				onclick={() => toggleTool(1)}
			>
				<TrendAngleIcon />
			</button>

			<!-- Stocks Analysis Icon  -->
			<button
				class={`${activeTool === 2 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1`}
				onclick={() => toggleTool(2)}
			>
				<MeasureIcon />
			</button>
		</div>
	</div>
	<div class="Divider h-full w-1 bg-gray-200"></div>
</div>
