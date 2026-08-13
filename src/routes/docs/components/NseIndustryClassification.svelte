<script>
	import { deserialize, enhance } from '$app/forms';
	import Papa from 'papaparse';

	let parsedData = $state([]);
	let errorMessage = $state('');
	let processingStatus = $state({ active: false, current: 0, total: 0 });

	// Safely derive unique tracking keys out of full data array state
	let tableHeaders = $derived(
		parsedData.length > 0 ? Array.from(new Set(parsedData.flatMap((obj) => Object.keys(obj)))) : []
	);

	$effect(() => {
		async function loadData() {
			const res = await fetch('/docs/api/amfi-marketcap-classification');

			if (!res.ok) {
				throw new Error(`Request failed: ${res.status}`);
			}

			const data = await res.json();

			parsedData = data;
		}

		loadData().catch((error) => {
			console.error('Failed to load classifications:', error);
		});
	});

	// Chunks network calls sequentially to prevent API request drops
	async function getIndustryClassificationFromNSE() {
		if (parsedData.length === 0) {
			errorMessage = 'No active datasets loaded. Please upload a standard AMFI CSV file template.';
			return;
		}

		errorMessage = '';
		processingStatus = { active: true, current: 0, total: parsedData.length };

		// Configurable sliding window execution limits
		const CONCURRENCY_LIMIT = 50;
		const dataCopy = [...parsedData];

		for (let i = 0; i < dataCopy.length; i += CONCURRENCY_LIMIT) {
			const batch = dataCopy.slice(i, i + CONCURRENCY_LIMIT);

			const promises = batch.map(async (element) => {
				const symbol = element.symbol;
				if (!symbol || symbol === '-') {
					processingStatus.current += 1;
					return element;
				}

				try {
					const response = await fetch(
						`/docs/api/industry-classification-from-nse?symbol=${encodeURIComponent(symbol)}`
					);

					if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
					const result = await response.json();

					const secInfo = result.data?.nseData?.equityResponse?.[0]?.secInfo;
					if (!secInfo) return element;

					return {
						...element,
						macro: secInfo.macro,
						sector: secInfo.sector,
						industry: secInfo.industryInfo,
						basic_industry: secInfo.basicIndustry,
						primary_index: secInfo.index ?? null,
						all_index: secInfo.indexList.join(', ')
					};
				} catch (err) {
					console.warn(`Failed metadata query resolution for ticket: ${symbol}`, err);
					return { ...element, 'Fetch Error': 'Failed resolution mapping' };
				} finally {
					processingStatus.current += 1;
				}
			});

			const updatedBatchResults = await Promise.all(promises);

			// Thread safe splice mutation back inside the main reactive state context
			const startIndex = i;
			parsedData.splice(startIndex, updatedBatchResults.length, ...updatedBatchResults);
			parsedData = [...parsedData];

			// Optional tiny cool-off period between consecutive window operations
			await new Promise((resolve) => setTimeout(resolve, 150));
		}

		processingStatus.active = false;
	}

	function handleSubmit() {
		// saving = true;
		// message = {
		// 	type: 'info',
		// 	text: 'Saving...'
		// };

		return async ({ result }) => {
			// saving = false;

			if (result.type === 'success') {
				// message = {
				// 	type: 'success',
				// 	text: `Successfully saved ${result.data.count} rows.`
				// };
				// parsedData = [];
			} else {
				// message = {
				// 	type: 'error',
				// 	text: result.data?.error ?? 'Failed to save data.'
				// };
			}
		};
	}
</script>

<main class="max-w-7xl mx-auto p-6 space-y-6 antialiased font-sans">
	<!-- Controls & Actions Section Layout Grid -->
	<section class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-3 space-y-4">
			<div class="flex flex-col sm:flex-row sm:items-center gap-4">
				<h2 class="font-semibold text-slate-800 text-base">Dataset Controls</h2>
				<button
					onclick={getIndustryClassificationFromNSE}
					disabled={parsedData.length === 0 || processingStatus.active}
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
						Run Aggregation Pipeline
					{/if}
				</button>

				<!-- NEW: Enriched Data Download Button Container -->
				<form method="POST" action="?/saveNseIndustryClassification" use:enhance={handleSubmit}>
					<input type="hidden" name="data" value={JSON.stringify(parsedData)} />
					<button
						type="submit"
						disabled={parsedData.length === 0 || processingStatus.active}
						class="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow transition duration-150 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
					>
						Save
					</button>
				</form>
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
