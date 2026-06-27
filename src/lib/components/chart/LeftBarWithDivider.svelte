<script>
	import MeasureIcon from './Icons/MeasureIcon.svelte';
	import TrendAngleIcon from './Icons/TrendAngleIcon.svelte';
	import { ToolState } from '$lib/state/ToolState.svelte';
	import CrosshairIcon from './Icons/CrosshairIcon.svelte';
</script>

<div class="LeftBarWithDivider h-full w-12 flex flex-row">
	<div class="LeftBarTools h-full w-11 flex flex-col">
		<div
			class="FixedArea h-full w-11 p-1 flex flex-col items-center gap-2 border-l border-gray-200"
		>
			<!-- Default Cross Tool  -->
			<button
				class={`${ToolState.activeTool === 'cross' ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1`}
				onclick={() => (ToolState.activeTool = 'cross')}
			>
				<CrosshairIcon />
			</button>
			<!-- Trend Angle Tool  -->
			<button
				class={`${ToolState.activeTool === 'trendAngle' ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1`}
				onclick={() => (ToolState.activeTool = 'trendAngle')}
			>
				<TrendAngleIcon />
			</button>

			<!-- Measure Tool  -->
			<button
				class={`${ToolState.activeTool === 'measure' ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1`}
				onclick={() => (ToolState.activeTool = 'measure')}
			>
				<MeasureIcon />
			</button>
		</div>
	</div>
	<div class="Divider h-full w-1 bg-gray-200"></div>
</div>
