<script>
	import { onMount } from 'svelte';

	import PlusIcon from './Icons/PlusIcon.svelte';
	import DownArrowHeadIcon from './Icons/DownArrowHeadIcon.svelte';
	import NewWatchlistIcon from './Icons/NewWatchlistIcon.svelte';
	import PencilIcon from './Icons/PencilIcon.svelte';
	import BroomIcon from './Icons/BroomIcon.svelte';
	import RemoveIcon from './Icons/RemoveIcon.svelte';

	import StockBlock from './componentblock/StockBlock.svelte';
	import CloseIcon from './Icons/CloseIcon.svelte';
	import SearchIcon from './Icons/SearchIcon.svelte';
	import DustbinIcon from './Icons/DustbinIcon.svelte';

	let watchlists = $state([]);
	let currentWatchlist = $state(null);

	let isOpen = $state(false);

	let dropdownEl;

	// --------------------------------------------------
	// Native dialogs
	// --------------------------------------------------

	let createDialog;
	let clearDialog;
	let deleteDialog;
	let addSymbolDialog;

	// --------------------------------------------------
	// Rename
	// --------------------------------------------------

	let isRenaming = $state(false);
	let renameValue = $state('');
	let renameInput = $state(null);

	// --------------------------------------------------
	// Dialog state
	// --------------------------------------------------

	let dialogWatchlist = $state(null);

	// --------------------------------------------------
	// Create
	// --------------------------------------------------

	let newWatchlistName = $state('');
	let createInput;

	// --------------------------------------------------
	// Add Symbol
	// --------------------------------------------------

	let symbolInput;
	let symbolInputValue = $state('');

	// --------------------------------------------------
	// Load watchlists
	// --------------------------------------------------

	onMount(async () => {
		await loadWatchlists();
	});

	async function loadWatchlists() {
		try {
			const response = await fetch('/api/watchlists');

			if (!response.ok) {
				throw new Error('Failed to load watchlists');
			}

			const result = await response.json();

			watchlists = result.data ?? [];

			currentWatchlist = watchlists[0] ?? null;
		} catch (error) {
			console.error('Failed to load watchlists:', error);
		}
	}

	// --------------------------------------------------
	// Dropdown
	// --------------------------------------------------

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function selectWatchlist(watchlist) {
		if (isRenaming) {
			cancelRename();
		}

		currentWatchlist = watchlist;
		isOpen = false;
	}

	function handleOutsideClick(event) {
		if (isOpen && dropdownEl && !dropdownEl.contains(event.target)) {
			isOpen = false;
		}
	}

	// --------------------------------------------------
	// Native dialog
	// --------------------------------------------------

	function handleDialogClick(event, dialog) {
		/*
		 * The <dialog> element itself is the area
		 * outside the actual dialog content.
		 */
		if (event.target === dialog) {
			dialog.close();
		}
	}

	// --------------------------------------------------
	// CREATE
	// --------------------------------------------------

	function openCreateDialog() {
		isOpen = false;

		newWatchlistName = '';

		createDialog?.showModal();

		if (!window.isTouchable) {
			setTimeout(() => {
				createInput?.focus();
			});
		}
	}

	async function createWatchlist() {
		const name = newWatchlistName.trim();

		if (!name) {
			createInput?.focus();
			return;
		}

		// name is the primary key
		const exists = watchlists.some((watchlist) => watchlist.name === name);

		if (exists) {
			console.error('Watchlist already exists:', name);
			createInput?.focus();
			return;
		}

		try {
			const response = await fetch('/api/create-watchlist', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name
				})
			});

			if (!response.ok) {
				throw new Error('Failed to create watchlist');
			}

			const result = await response.json();

			const createdWatchlist = result.data ?? {
				name,
				entries: []
			};

			watchlists = [...watchlists, createdWatchlist];

			currentWatchlist = createdWatchlist;

			newWatchlistName = '';

			createDialog?.close();
		} catch (error) {
			console.error('Failed to create watchlist:', error);
		}
	}

	function handleCreateKeydown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			createWatchlist();
		}

		if (event.key === 'Escape') {
			createDialog?.close();
		}
	}

	// --------------------------------------------------
	// RENAME
	// --------------------------------------------------

	function startRename() {
		if (!currentWatchlist) return;

		isOpen = false;

		renameValue = currentWatchlist.name;
		isRenaming = true;

		setTimeout(() => {
			renameInput?.focus();
			renameInput?.select();
		});
	}

	function cancelRename() {
		renameValue = '';
		isRenaming = false;
	}

	async function saveRename() {
		if (!currentWatchlist || !isRenaming) {
			return;
		}

		const oldName = currentWatchlist.name;
		const newName = renameValue.trim();

		// Empty name -> cancel
		if (!newName) {
			cancelRename();
			return;
		}

		// Nothing changed
		if (newName === oldName) {
			cancelRename();
			return;
		}

		// name is the primary key
		const exists = watchlists.some((watchlist) => watchlist.name === newName);

		if (exists) {
			console.error('Watchlist already exists:', newName);
			renameInput?.focus();
			return;
		}

		try {
			const response = await fetch(`/api/rename-watchlist`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					newName,
					oldName
				})
			});

			if (!response.ok) {
				throw new Error('Failed to rename watchlist');
			}

			const updatedWatchlist = {
				...currentWatchlist,
				name: newName
			};

			watchlists = watchlists.map((watchlist) =>
				watchlist.name === oldName ? updatedWatchlist : watchlist
			);

			currentWatchlist = updatedWatchlist;

			cancelRename();
		} catch (error) {
			console.error('Failed to rename watchlist:', error);
		}
	}

	function handleRenameKeydown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveRename();
		}

		if (event.key === 'Escape') {
			cancelRename();
		}
	}

	// --------------------------------------------------
	// CLEAR
	// --------------------------------------------------

	function openClearDialog() {
		if (!currentWatchlist) return;

		isOpen = false;

		dialogWatchlist = currentWatchlist;

		clearDialog?.showModal();
	}

	async function clearWatchlist() {
		if (!dialogWatchlist) return;

		const name = dialogWatchlist.name;

		try {
			const response = await fetch(`/api/clear-watchlist`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name
				})
			});

			if (!response.ok) {
				throw new Error('Failed to clear watchlist');
			}

			watchlists = watchlists.map((watchlist) =>
				watchlist.name === name
					? {
							...watchlist,
							entries: []
						}
					: watchlist
			);

			if (currentWatchlist?.name === name) {
				currentWatchlist = {
					...currentWatchlist,
					entries: []
				};
			}

			dialogWatchlist = null;

			clearDialog?.close();
		} catch (error) {
			console.error('Failed to clear watchlist:', error);
		}
	}

	// --------------------------------------------------
	// DELETE
	// --------------------------------------------------

	function openDeleteDialog(watchlist, event) {
		/*
		 * Prevent selecting the watchlist.
		 */
		event.stopPropagation();

		isOpen = false;

		dialogWatchlist = watchlist;

		deleteDialog?.showModal();
	}

	async function deleteWatchlist() {
		if (!dialogWatchlist) return;

		const name = dialogWatchlist.name;

		try {
			const response = await fetch(`/api/delete-watchlist`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name
				})
			});

			if (!response.ok) {
				throw new Error('Failed to delete watchlist');
			}

			watchlists = watchlists.filter((watchlist) => watchlist.name !== name);

			if (currentWatchlist?.name === name) {
				currentWatchlist = watchlists[0] ?? null;
			}

			dialogWatchlist = null;

			deleteDialog?.close();
		} catch (error) {
			console.error('Failed to delete watchlist:', error);
		}
	}

	// --------------------------------------------------
	// ADD SYMBOL
	// --------------------------------------------------

	function openAddSymbolDialog() {
		isOpen = false;
		addSymbolDialog?.showModal();

		if (!window.isTouchable) {
			setTimeout(() => {
				symbolInput?.focus();
			});
		}
	}

	let searchResult = $state([
		{
			symbol: 'NAVINFLUOR',
			name: 'Navin Flourine International'
		},
		{
			symbol: 'VBL',
			name: 'Varun Beverages'
		}
	]);

	let currentWatchlistSymbols = $derived(
		new Set(
			watchlists
				?.find((watchlist) => watchlist.name === currentWatchlist?.name)
				?.entries?.map((x) => x.symbol) ?? []
		)
	);
	// $inspect(currentWatchlistSymbols);
	async function addToWatchlist({ symbol, name }) {
		if (!currentWatchlist || !symbol) return;

		const response = await fetch(`/api/add-to-watchlist`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				symbol,
				watchlist: currentWatchlist.name
			})
		});

		if (!response.ok) {
			console.error('Failed to add to watchlist');
			return;
		}

		// Update local state
		watchlists = watchlists.map((watchlist) =>
			watchlist.name === currentWatchlist.name
				? {
						...watchlist,
						entries: [...(watchlist.entries ?? []), { symbol, name }]
					}
				: watchlist
		);

		currentWatchlist = watchlists.find((watchlist) => watchlist.name === currentWatchlist.name);
	}

	async function removeFromWatchlist(symbol) {
		if (!currentWatchlist || !symbol) return;

		const response = await fetch(`/api/remove-from-watchlist`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				symbol,
				watchlist: currentWatchlist.name
			})
		});

		if (!response.ok) {
			console.error('Failed to remove from watchlist');
			return;
		}

		// Update local state
		watchlists = watchlists.map((watchlist) =>
			watchlist.name === currentWatchlist.name
				? {
						...watchlist,
						entries: (watchlist.entries ?? []).filter((entry) => entry.symbol !== symbol)
					}
				: watchlist
		);

		currentWatchlist = watchlists.find((watchlist) => watchlist.name === currentWatchlist.name);
	}

	let controller;
	$effect(() => {
		symbolInputValue;
		if (!symbolInputValue.trim()) return;

		const t = setTimeout(() => {
			// cancel previous request (if still running)
			controller?.abort();
			controller = new AbortController();
			// run search / fetch here directly
			search(symbolInputValue, controller.signal);
		}, 500);

		return () => {
			clearTimeout(t);
			controller?.abort();
		};
	});

	async function search(query, signal) {
		searchResult = await fetch(
			`/proxy?ttl=0&url=${encodeURIComponent(`https://groww.in/v1/api/search/v3/query/global/st_p_query?entity_type=stocks&is_us_stocks=1&page=0&query=${query}&size=6&web=true`)}`,
			{ signal }
		)
			.then((x) => x.json())
			.then((x) =>
				x.data.content.map((row) => ({
					name: row.title,
					symbol: row.nse_scrip_code ?? row.bse_scrip_code
				}))
			);
	}

	let priceLivePointsMap = $state({});
	$effect(() => {
		fetch(
			`/proxy?ttl=0&url=https://groww.in/v1/api/stocks_data/v1/tr_live_delayed/segment/CASH/latest_aggregated`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					exchangeAggReqMap: {
						NSE: {
							priceSymbolList: Array.from(currentWatchlistSymbols),
							indexSymbolList: []
						},
						BSE: {
							priceSymbolList: [],
							indexSymbolList: []
						}
					}
				})
			}
		)
			.then((x) => x.json())
			.then((x) => {
				priceLivePointsMap = x.exchangeAggRespMap.NSE.priceLivePointsMap;
			});
	});
</script>

<!-- ================================================= -->
<!-- OUTSIDE CLICK FOR DROPDOWN -->
<!-- ================================================= -->

<svelte:window onclick={handleOutsideClick} />

<!-- ================================================= -->
<!-- WATCHLIST HEADER -->
<!-- ================================================= -->

<div class="WatchlistName flex flex-row items-center gap-1 px-1 m-1">
	<div class="relative text-left flex-1 min-w-0" bind:this={dropdownEl}>
		{#if isRenaming}
			<input
				bind:this={renameInput}
				bind:value={renameValue}
				class="w-full min-w-0
					text-sm font-semibold
					rounded p-1
					outline outline-blue-500"
				onblur={saveRename}
				onkeydown={handleRenameKeydown}
			/>
		{:else}
			<button
				class="w-full text-sm font-semibold
		hover:bg-gray-100
		rounded p-1
		flex flex-row
		items-center gap-2
		group"
				class:bg-gray-100={isOpen}
				onclick={toggleDropdown}
			>
				<span class="px-px truncate">
					{currentWatchlist?.name ?? 'No watchlist'}
				</span>

				<span
					class="shrink-0 transform
						transition-transform
						duration-300
						{isOpen ? 'rotate-180' : ''}
						group-hover:translate-y-0.5"
				>
					<DownArrowHeadIcon />
				</span>
			</button>

			{#if isOpen}
				<div
					class="absolute -left-1
						top-full mt-1 w-46
						bg-white
						border border-gray-200
						rounded shadow-lg
						z-50 py-1
						flex flex-col"
				>
					<button
						class="flex flex-row
							items-center gap-1
							hover:bg-gray-100
							w-full px-2 py-px
							text-left"
						onclick={openCreateDialog}
					>
						<NewWatchlistIcon />
						<span>Create new list...</span>
					</button>

					<button
						class="flex flex-row
							items-center gap-1
							hover:bg-gray-100
							w-full px-2 py-px
							text-left
							disabled:opacity-40"
						onclick={startRename}
						disabled={!currentWatchlist}
					>
						<PencilIcon />
						<span>Rename</span>
					</button>

					<button
						class="flex flex-row
							items-center gap-1
							hover:bg-gray-100
							w-full px-2 py-px
							text-left
							disabled:opacity-40"
						onclick={openClearDialog}
						disabled={!currentWatchlist}
					>
						<BroomIcon />
						<span>Clear list</span>
					</button>

					<hr class="my-1.5 text-gray-200" />

					{#each watchlists as watchlist (watchlist.name)}
						{@const isCurrent = watchlist.name === currentWatchlist?.name}

						<button
							onclick={() => selectWatchlist(watchlist)}
							class="group w-full
								text-left px-2 py-0.75
								flex flex-row
								justify-between
								items-center"
							class:bg-blue-600={isCurrent}
							class:text-white={isCurrent}
							class:hover:bg-gray-100={!isCurrent}
						>
							<span class="truncate">
								{watchlist.name}
							</span>

							<span
								class="relative w-5 h-5
									shrink-0
									flex items-center
									justify-center"
							>
								<span class="absolute" class:group-hover:invisible={!isCurrent}>
									{watchlist.entries?.length ?? 0}
								</span>

								<span
									class="absolute
										invisible
										p-0.5 rounded"
									class:group-hover:visible={!isCurrent}
									class:hover:bg-gray-300={!isCurrent}
									onclick={(event) => openDeleteDialog(watchlist, event)}
									onkeydown={() => {}}
									role
								>
									<RemoveIcon />
								</span>
							</span>
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	{#if !isRenaming}
		<button class="hover:bg-gray-200 rounded shrink-0" onclick={openAddSymbolDialog}>
			<PlusIcon />
		</button>
	{/if}
</div>

<!-- ================================================= -->
<!-- STOCK BLOCK -->
<!-- ================================================= -->

<div>
	<StockBlock
		data={currentWatchlist?.entries.map((row) => {
			const dayChangePerc = priceLivePointsMap[row.symbol]?.dayChangePerc;
			return {
				name: row.name,
				symbol: row.symbol,
				value:
					dayChangePerc != null
						? dayChangePerc > 0
							? `+${dayChangePerc.toFixed(2)}%`
							: `${dayChangePerc.toFixed(2)}%`
						: '',
				valueStyle: dayChangePerc > 0 ? 'text-green-600 text-xs' : 'text-red-600 text-xs'
			};
		})}
	/>
</div>

<!-- ================================================= -->
<!-- CREATE DIALOG -->
<!-- ================================================= -->

<dialog
	bind:this={createDialog}
	class="m-auto
		p-0
		w-120
		rounded-lg
		shadow-xl
		border
		border-gray-200
		backdrop:bg-transparent"
	onclick={(event) => handleDialogClick(event, createDialog)}
>
	<div class="bg-white rounded flex flex-row justify-between">
		<div class="pl-9 py-9 flex-1">
			<h2 class="font-semibold text-xl">Create Watchlist</h2>

			<form
				class="mt-4"
				onsubmit={(event) => {
					event.preventDefault();
					createWatchlist();
				}}
			>
				<input
					bind:this={createInput}
					bind:value={newWatchlistName}
					placeholder="New watchlist name"
					class="w-full
					border border-gray-300
					rounded px-2 py-1.5
					text-sm outline-none
					focus:border-blue-500"
					onkeydown={handleCreateKeydown}
				/>

				<div
					class="flex justify-end
					gap-2 mt-4"
				>
					<button
						type="button"
						class="px-3 py-1
						rounded
						hover:bg-gray-100"
						onclick={() => createDialog.close()}
					>
						Cancel
					</button>

					<button
						type="submit"
						class="px-3 py-1 rounded bg-blue-600 text-white
		hover:bg-blue-700
		disabled:opacity-50
		disabled:cursor-not-allowed
		disabled:hover:bg-blue-600"
						disabled={!newWatchlistName.trim()}
					>
						Create
					</button>
				</div>
			</form>
		</div>

		<div class="pt-2 pr-2">
			<button class="hover:bg-gray-200 p-2 rounded" onclick={() => createDialog.close()}>
				<CloseIcon />
			</button>
		</div>
	</div>
</dialog>

<!-- ================================================= -->
<!-- CLEAR DIALOG -->
<!-- ================================================= -->

<dialog
	bind:this={clearDialog}
	class="m-auto
		p-0
		w-120
		rounded-lg
		shadow-xl
		border
		border-gray-200
		backdrop:bg-transparent"
	onclick={(event) => handleDialogClick(event, clearDialog)}
>
	<div class="bg-white rounded flex flex-row justify-between">
		<div class="pl-9 py-9 flex-1">
			<h2 class="font-semibold text-xl">Clear all symbols?</h2>

			<p class="mt-4">
				Doing this will remove all symbols from
				<strong>
					{dialogWatchlist?.name}
				</strong> watchlist.
			</p>

			<div
				class="flex justify-end
					gap-2 mt-4"
			>
				<button
					class="px-3 py-1
						rounded
						hover:bg-gray-100"
					onclick={() => clearDialog.close()}
				>
					Cancel
				</button>

				<button
					class="px-3 py-1
						rounded
						bg-red-600
						text-white
						hover:bg-red-700"
					onclick={clearWatchlist}
				>
					Clear
				</button>
			</div>
		</div>
		<div class="pt-2 pr-2">
			<button class="hover:bg-gray-200 p-2 rounded" onclick={() => clearDialog.close()}>
				<CloseIcon />
			</button>
		</div>
	</div>
</dialog>

<!-- ================================================= -->
<!-- DELETE DIALOG -->
<!-- ================================================= -->

<dialog
	bind:this={deleteDialog}
	class="m-auto
		p-0
		w-120
		rounded-lg
		shadow-xl
		border
		border-gray-200
		backdrop:bg-transparent"
	onclick={(event) => handleDialogClick(event, deleteDialog)}
>
	<div class="bg-white rounded flex flex-row justify-between">
		<div class="pl-9 py-9 flex-1">
			<h2 class="font-semibold text-xl">Delete this watchlist?</h2>

			<p class="mt-4">
				Doing this will permanently delete
				<strong>
					{dialogWatchlist?.name}
				</strong> watchlist.
			</p>

			<div
				class="flex justify-end
					gap-2 mt-5"
			>
				<button
					class="px-3 py-1
						rounded
						hover:bg-gray-100"
					onclick={() => deleteDialog.close()}
				>
					Cancel
				</button>

				<button
					class="px-3 py-1
						rounded
						bg-red-600
						text-white
						hover:bg-red-700"
					onclick={deleteWatchlist}
				>
					Delete
				</button>
			</div>
		</div>
		<div class="pt-2 pr-2">
			<button class="hover:bg-gray-200 p-2 rounded" onclick={() => deleteDialog.close()}>
				<CloseIcon />
			</button>
		</div>
	</div>
</dialog>

<!-- ================================================= -->
<!-- ADD SYMBOL -->
<!-- ================================================= -->

<dialog
	bind:this={addSymbolDialog}
	class="m-auto
		p-0
		w-7/8
		max-w-200
		h-11/12
		max-h-150
		rounded-lg
		shadow-xl
		border
		border-gray-200
		"
	onclick={(event) => handleDialogClick(event, addSymbolDialog)}
>
	<div class="bg-white rounded">
		<!-- Heading -->
		<div class="px-5 flex flex-row justify-between items-center">
			<h2 class="font-semibold text-xl py-4">Add Symbol</h2>
			<button class="hover:bg-gray-200 p-2 rounded" onclick={() => addSymbolDialog.close()}>
				<CloseIcon />
			</button>
		</div>
		<!-- Search -->
		<div class="px-5 py-2 flex flex-row border-t-gray-200 border-b-gray-200 border-t border-b">
			<span><SearchIcon /></span>
			<input
				bind:this={symbolInput}
				bind:value={symbolInputValue}
				type="text"
				class="pl-2 flex-1 outline-none"
				placeholder="Search"
			/>
		</div>
		<!-- Type Ribbon -->
		<div class="px-5 py-2">
			<button class="bg-gray-900 text-white px-3 py-0.5 rounded-full">Stock</button>
		</div>

		<!-- Search Result -->
		<div class="grid grid-cols-[4fr_8fr_1fr]">
			{#each searchResult as row (row)}
				<div
					class="px-5 group col-span-3
				grid grid-cols-subgrid
				hover:bg-gray-100
				h-10 items-center"
				>
					<div>{row.symbol}</div>

					<div class="truncate">
						{row.name}
					</div>

					<div class="flex items-center">
						{#if currentWatchlistSymbols.has(row.symbol)}
							<button
								class="rounded
							bg-white
							hover:bg-gray-200
							hover:text-red-600"
								onclick={() => removeFromWatchlist(row.symbol)}
							>
								<DustbinIcon />
							</button>
						{:else}
							<button
								class="rounded
							bg-white
							hover:bg-gray-200"
								onclick={() => addToWatchlist({ symbol: row.symbol, name: row.name })}
							>
								<PlusIcon />
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</dialog>
