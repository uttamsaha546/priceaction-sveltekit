<script>
	import { onMount } from 'svelte';
	import PlusIcon from './Icons/PlusIcon.svelte';
	import DownArrowHeadIcon from './Icons/DownArrowHeadIcon.svelte';
	import NewWatchlistIcon from './Icons/NewWatchlistIcon.svelte';
	import PencilIcon from './Icons/PencilIcon.svelte';
	import BroomIcon from './Icons/BroomIcon.svelte';
	import Modal from './Modal.svelte';
	import SymbolSearchModalContent from './SymbolSearchModalContent.svelte';
	import CreateWatchlistModalContent from './CreateWatchlistModalContent.svelte';
	
	import StockBlock from './componentblock/StockBlock.svelte';

	let watchlists = $state([]);
	let currentWatchlist = $state([]);
	onMount(async () => {
		const p = await fetch('/api/watchlists');
		watchlists = (await p.json()).data;
		currentWatchlist = watchlists[0];
	});

	let isOpen = $state(false);
	let isModal = $state(false);
	
	const modalIdMap ={
	'CREATE WATCHLIST': 1,
	'ADD SYMBOL':2
	}
	
	let modalId = $state(0);

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function selectWatchlist(watchlist) {
		currentWatchlist = watchlist;
		isOpen = false; // Close menu after selection
	}
</script>

<div class="WatchlistName flex flex-row items-center justify-between gap-1 px-1 m-1">
	<div class="relative inline-block text-left">
		<button
			class="text-sm font-semibold hover:bg-gray-200 rounded p-1 flex flex-row items-center gap-2 group"
			onclick={toggleDropdown}
		>
			<span>{currentWatchlist?.name}</span>
			<span
				class="transform transition-transform duration-400 {isOpen
					? 'rotate-180'
					: ''} group-hover:translate-y-0.5"
			>
				<DownArrowHeadIcon />
			</span>
		</button>

		{#if isOpen}
			<div
				class="absolute -left-1 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-50 py-1"
			>
				<button class="flex flex-row"><PencilIcon /><span>Rename</span></button>
				<button class="flex flex-row"><BroomIcon /><span>Clear list</span></button>
				<button class="flex flex-row"
				onclick={()=>{modalId=1; isModal=true}}
				><NewWatchlistIcon /><span>Create new list...</span></button>

				<hr />
				{#each watchlists as watchlist}
					<button
						onclick={() => selectWatchlist(watchlist)}
						class="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 transition-colors
                           {currentWatchlist?.id === watchlist.id ? 'font-bold bg-gray-50' : ''}"
					>
						{watchlist.name}
					</button>
				{/each}
			</div>
		{/if}
	</div>
	<button class="hover:bg-gray-200 rounded" onclick={() => {modalId=2; isModal = true}}>
		<PlusIcon />
	</button>
</div>

<div>

<StockBlock data={currentWatchlist?.entries}/>
</div>

<!-- {#if isModal} -->
<Modal
	isOpen={isModal}
	title={modalId===2? 'Add symbol': 'Create Watchlist'}
	onClose={() => (isModal = false)}
	size={'large'}
	backdrop={false}
>
{#if (modalId ===2)}
	<SymbolSearchModalContent />
	{:else if (modalId===1)}
	 <CreateWatchlistModalContent/>
	{/if}
</Modal>
<!-- {/if} -->
