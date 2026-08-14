<script>
	import { enhance } from '$app/forms';

	let parsedData = $state([]);
	let errorMessage = $state('');
	let processingStatus = $state({ active: false, current: 0, total: 0 });
	// let savingStatus = $state({ active: false, current: 0, total: 0 });
	let isHoldingFetched = $state(false);

	let tableHeaders = $derived(
		parsedData.length > 0 ? Array.from(new Set(parsedData.flatMap((obj) => Object.keys(obj)))) : []
	);

	function handleGetMutualFunds() {
		return async ({ result }) => {
			console.log(result);

			const processedData = result.data.map((x) => ({
				fund_name: x.fund_name,
				id: x.id,
				sub_category: x.sub_category
			}));

			parsedData = processedData;
		};
	}

	// Chunks network calls sequentially to prevent API request drops
	async function handleGetMutualFundsHoldings() {
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

		const CONCURRENCY_LIMIT = 100;
		const dataCopy = [...parsedData];

		for (let i = 0; i < dataCopy.length; i += CONCURRENCY_LIMIT) {
			const batch = dataCopy.slice(i, i + CONCURRENCY_LIMIT);

			await Promise.all(
				batch.map(async (element, batchIndex) => {
					const originalIndex = i + batchIndex;
					const id = element.id;

					if (!id) {
						processingStatus.current += 1;
						return;
					}

					try {
						const response = await fetch(
							`/docs/api/mutual-fund-holdings-from-groww?fund_id=${encodeURIComponent(id)}`
						);

						if (!response.ok) {
							throw new Error(`HTTP Error ${response.status}`);
						}

						const result = await response.json();
						const holdings = result.data?.holdings;

						if (holdings) {
							parsedData[originalIndex] = {
								...parsedData[originalIndex],
								count: holdings.map((x) => x.nature_name === 'EQUITY').length
							};
						}
					} catch (err) {
						console.warn(`Failed metadata query resolution for ${id}`, err);

						parsedData[originalIndex] = {
							...parsedData[originalIndex],
							'Fetch Error': 'Failed resolution mapping'
						};
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
		isHoldingFetched = true;
	}

	async function handleSaveSuccessfulHoldings() {
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
					const id = element.id;
					const count = element.count;

					if (!id && !count) {
						processingStatus.current += 1;
						return;
					}

					try {
						const response = await fetch(
							`/docs/api/save-mutual-fund-holdings-stocks-info?fund_id=${encodeURIComponent(id)}`
						);

						if (!response.ok) {
							throw new Error(`HTTP Error ${response.status}`);
						}

						const result = await response.json();
						const status = result.status;

						parsedData[originalIndex] = {
							...parsedData[originalIndex],
							status: status
						};
					} catch (err) {
						console.warn(`Failed metadata query resolution for ${id}`, err);

						parsedData[originalIndex] = {
							...parsedData[originalIndex],
							'Fetch Error': 'Failed resolution mapping'
						};
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
			<div class="flex flex-col sm:flex-row sm:items-center gap-4">
				<form method="POST" action="?/getMutualFundsFromGroww" use:enhance={handleGetMutualFunds}>
					<button
						type="submit"
						class="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow transition duration-150 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>Get Mutual Funds</button
					>
				</form>

				<button
					type="button"
					onclick={handleGetMutualFundsHoldings}
					disabled={processingStatus.active || parsedData.length === 0}
					class="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow transition duration-150 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{processingStatus.active && !isHoldingFetched
						? `Processing ${processingStatus.current}/${processingStatus.total}...`
						: 'Get ALL Mutual Funds Holdings'}
				</button>

				<button
					type="button"
					onclick={handleSaveSuccessfulHoldings}
					disabled={!isHoldingFetched || parsedData.length === 0}
					class="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow transition duration-150 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{processingStatus.active && isHoldingFetched
						? `Saving ${processingStatus.current}/${processingStatus.total}...`
						: `Save Successful Holdings`}
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
								{#each tableHeaders as header}
									<th
										class="p-3.5 border-r border-slate-200/60 last:border-0 tracking-wide text-slate-600 bg-slate-50"
										>{header}</th
									>
								{/each}
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/80 text-slate-600">
							{#each parsedData as row}
								<tr class="hover:bg-slate-50/80 transition-colors odd:bg-white even:bg-slate-50/30">
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
