<script>
	import { onMount } from 'svelte';

	let parsedData = $state([]);
	let errorMessage = $state('');
	let processingStatus = $state({ active: false, current: 0, total: 0 });

	let tableHeaders = $derived(
		parsedData.length > 0 ? Array.from(new Set(parsedData.flatMap((obj) => Object.keys(obj)))) : []
	);

	onMount(async () => {
		const stock_id_symbol_map = await fetch('/docs/api/get-groww-stock-id-symbol-map')
			.then((x) => x.json())
			.then((data) => {
				return new Map(data.map((x) => [x.stock_search_id, x.symbol]));
			});

		fetch(
			'/proxy?url=https://groww.in/v1/api/data/mf/web/v6/scheme/search/groww-nifty-total-market-index-fund-direct-growth'
		)
			.then((x) => x.json())
			.then((x) => {
				parsedData = x.holdings
					.filter((x) => x.nature_name === 'EQUITY' && x.stock_search_id)
					.map((x) => {
						return {
							stock_search_id: x.stock_search_id,
							symbol: stock_id_symbol_map.get(x.stock_search_id)
						};
					});
			});
	});

	async function handleMapButtonClick() {
		if (parsedData.length === 0) {
			errorMessage = 'No active datasets loaded.';
			return;
		}

		errorMessage = '';
		processingStatus = {
			active: true,
			current: 0,
			total: parsedData.length
		};

		const CONCURRENCY_LIMIT = 10;
		const dataCopy = [...parsedData];

		for (let i = 0; i < dataCopy.length; i += CONCURRENCY_LIMIT) {
			const batch = dataCopy.slice(i, i + CONCURRENCY_LIMIT);

			await Promise.all(
				batch.map(async (element, batchIndex) => {
					const originalIndex = i + batchIndex;
					const stock_search_id = element.stock_search_id;

					try {
						const response = await fetch(
							`/docs/api/set-groww-stock-id-symbol-map?stock_search_id=${encodeURIComponent(stock_search_id)}`
						);

						if (!response.ok) {
							throw new Error(`HTTP Error ${response.status}`);
						}

						const result = await response.json();

						parsedData[originalIndex] = {
							...parsedData[originalIndex],
							...result
						};
					} catch (err) {
						console.warn(`Failed metadata query resolution for ${stock_search_id}`, err);
					} finally {
						processingStatus.current += 1;
					}
				})
			);

			// Force a new array reference for Svelte reactivity
			parsedData = [...parsedData];

			await new Promise((resolve) => setTimeout(resolve, 150));
		}

		processingStatus.active = false;
	}
</script>

<main class="max-w-7xl mx-auto p-6 space-y-6 antialiased font-sans">
	<section class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-3">
			<div class="text-2xl font-bold">Stock ID &harr; Symbol Map</div>
			<!-- Controls & Actions Section Layout Grid -->
			<div class="flex flex-row justify-between items-center">
				<p class="font-semibold text-slate-800 text-base mt-4">
					Last Updated:
					<!-- {new Date(tradingViewStockUniverse?.meta?.updated_at) ?? 'Not Updated Yet'} -->
				</p>
				<button
					onclick={handleMapButtonClick}
					disabled={processingStatus.active}
					class="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow transition duration-150 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if processingStatus.active}
						<svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Processing ({processingStatus.current}/{processingStatus.total})
					{:else}
						Map
					{/if}
				</button>
			</div>
		</div>

		<!-- Status Notifications Displays -->
		{#if errorMessage}
			<div
				class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2"
			>
				<span>❌</span>
				{errorMessage}
			</div>
		{/if}

		<!-- Dynamic Data Table Presentation View -->
		{#if parsedData.length > 0}
			<div
				class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden md:col-span-3"
			>
				<!-- Progress Loading Processing Top Bar Indicator -->
				{#if processingStatus.active}
					<div class="w-full bg-slate-100 h-1.5 relative overflow-hidden">
						<div
							class="bg-indigo-600 h-1.5 transition-all duration-300 ease-out"
							style="width: {(processingStatus.current / processingStatus.total) * 100}%"
						></div>
					</div>
				{/if}

				<div class="overflow-x-auto max-h-100">
					<table class="w-full text-left border-collapse text-xs whitespace-nowrap">
						<thead
							class="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700 z-10"
						>
							<tr>
								<th
									class="p-3.5 border-r border-slate-200/60 last:border-0 tracking-wide text-slate-600 bg-slate-50"
									>#</th
								>
								{#each tableHeaders as header}
									<th
										class="p-3.5 border-r border-slate-200/60 last:border-0 tracking-wide text-slate-600 bg-slate-50"
										>{header}</th
									>
								{/each}
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/80 text-slate-600">
							{#each parsedData as row, rowIndex}
								<tr class="hover:bg-slate-50/80 transition-colors odd:bg-white even:bg-slate-50/30">
									<td class="p-3 border-r border-slate-200/40 last:border-0 font-medium"
										>{rowIndex}</td
									>
									{#each tableHeaders as header}
										<td class="p-3 border-r border-slate-200/40 last:border-0 font-medium">
											{#if !row[header]}
												<span class="text-slate-400 italic">—</span>
											{:else if header === 'Fetch Error'}
												<span class="text-red-500 font-semibold">{row[header]}</span>
											{:else}
												{row[header]}
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<footer
					class="bg-slate-50 border-t border-slate-200 px-4 py-3 text-slate-500 flex justify-between items-center text-xs font-medium"
				>
					<span>Workspace Registry Context</span>
					<span>Total Indexed In-Memory Rows: <b>{parsedData.length} Records</b></span>
				</footer>
			</div>
		{/if}
	</section>
</main>
