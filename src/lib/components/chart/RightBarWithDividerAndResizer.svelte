<script>
	import IndexAnalysisComponent from './IndexAnalysisComponent.svelte';
	import StocksAnalysisComponent from './StocksAnalysisComponent.svelte';
	import WatchlistComponent from './WatchlistComponent.svelte';
	import NiftyIcon from './Icons/NiftyIcon.svelte';
	import StocksIcon from './Icons/StocksIcon.svelte';
	import WatchlistIcon from './Icons/WatchlistIcon.svelte';
	import MutualFundComponent from './MutualFundComponent.svelte';
	import PortfolioComponent from './PortfolioComponent.svelte';
	import SMF from './SMF.svelte';
	import PriceactionComponent from './PriceactionComponent.svelte';

	let width = $state(0);
	let lastExpandedWidth = $state(190);
	let isDragging = $state(false);
	let dragStartPointX = $state(0);
	let dragStartWidth = $state(0);

	let activeTool = $state(0);
	let lastActiveTool = $state(1);

	function toggleTool(toolId) {
		if (activeTool === toolId && width > 0) {
			lastExpandedWidth = width;
			width = 0;
			activeTool = 0;
			return;
		}

		activeTool = toolId;
		width = lastExpandedWidth;
		lastActiveTool = toolId;
	}

	$effect(() => {
		const onPointerMove = (e) => {
			if (!isDragging) return;

			const deltaX = dragStartPointX - e.clientX;
			const newWidth = dragStartWidth + deltaX;
			if (newWidth > 50) {
				width = Math.max(200, newWidth);
				lastExpandedWidth = width;
				activeTool = lastActiveTool;
			} else if (newWidth < 50) {
				width = 0;
				activeTool = 0;
			}
		};

		const onPointerUp = () => {
			isDragging = false;
			document.body.style.cursor = 'default';
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);

		return () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};
	});
</script>

<div class="RightBarWithDividerAndResizer flex flex-row select-none">
	<!-- Resizer -->
	<div
		class="DividerAndResizer h-full w-1 bg-gray-200 cursor-ew-resize"
		role="separator"
		onpointerdown={(e) => {
			isDragging = true;
			dragStartPointX = e.clientX;
			dragStartWidth = width;
			document.body.style.cursor = 'ew-resize';
		}}
	></div>

	<!-- Panel -->
	<div class="RightBarWithExpandableArea h-full flex flex-row">
		<!-- Expanded Area Content Here -->
		<div class="ExpandableArea h-full flex flex-col overflow-auto" style:width="{width}px">
			<div class:hidden={activeTool !== 1} class="h-full">
				<WatchlistComponent />
			</div>
			<div class:hidden={activeTool !== 2} class="h-full">
				<IndexAnalysisComponent />
			</div>

			<div class:hidden={activeTool !== 3} class="h-full flex flex-col">
				<StocksAnalysisComponent />
			</div>
			<div class:hidden={activeTool !== 4} class="h-full flex flex-col">
				<MutualFundComponent />
			</div>
			<div class:hidden={activeTool !== 5} class="h-full flex flex-col">
				<PortfolioComponent />
			</div>
			<div class:hidden={activeTool !== 6} class="h-full flex flex-col">
				<SMF />
			</div>
			<div class:hidden={activeTool !== 7} class="h-full flex flex-col">
				<PriceactionComponent />
			</div>
		</div>

		<!-- RightBar Tools Icon Here -->
		<div class="RightBarTools h-full flex flex-col">
			<div
				class="FixedArea h-full w-11 p-1 flex flex-col items-center gap-2 border-l border-gray-200"
			>
				<!-- Watchlist Icon  -->
				<button
					class={`${activeTool === 1 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1.5`}
					onclick={() => toggleTool(1)}
				>
					<WatchlistIcon />
				</button>

				<!-- Index Analysis Nifty Icon  -->
				<button
					class={`${activeTool === 2 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1.5`}
					onclick={() => toggleTool(2)}
				>
					<NiftyIcon />
				</button>

				<!-- Stocks Analysis Icon  -->
				<button
					class={`${activeTool === 3 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1.5`}
					onclick={() => toggleTool(3)}
				>
					<StocksIcon />
				</button>

				<!-- Mutual Fund Icon  -->
				<button
					class={`${activeTool === 4 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1.5`}
					onclick={() => toggleTool(4)}
				>
					<div>MF</div>
				</button>

				<!-- Portfolio Icon  -->
				<button
					class={`${activeTool === 5 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1.5`}
					onclick={() => toggleTool(5)}
				>
					<div>PF</div>
				</button>

				<!-- SMF Icon  -->
				<button
					class={`${activeTool === 6 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1.5`}
					onclick={() => toggleTool(6)}
				>
					<div>SMF</div>
				</button>

				<!-- Priceaction Icon  -->
				<button
					class={`${activeTool === 7 ? 'bg-gray-200 hover:bg-gray-300' : 'hover:bg-gray-200/75'} rounded p-1.5`}
					onclick={() => toggleTool(7)}
				>
					<div>PA</div>
				</button>
			</div>
		</div>
	</div>
</div>
