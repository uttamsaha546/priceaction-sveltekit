<script>
	import Papa from 'papaparse';

	let parsedData = $state([]);
	let previewData = $state([]);
	let errorMessage = $state('');
	let processingStatus = $state({ active: false, current: 0, total: 0, label: '' });

	const categories = ['Large Cap', 'Mid Cap', 'Small Cap', 'Sectoral', 'Thematic'];
	let selectedCategories = $state([]);

	// Safely derive unique tracking keys out of full active data array
	let tableHeaders = $derived(
		parsedData.length > 0 ? Array.from(new Set(parsedData.flatMap((obj) => Object.keys(obj)))) : []
	);

	let previewHeaders = $derived(
		previewData.length > 0
			? Array.from(new Set(previewData.flatMap((obj) => Object.keys(obj))))
			: []
	);

	/**
	 * Preview endpoint call to check holding updated dates before fetching full data
	 */
	async function previewHoldingsDate() {
		errorMessage = '';

		try {
			const response = await fetch('/mfanalysis/ijkl/api/previewHoldingsDate');

			if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

			const result = await response.json();
			const portfolio_date = result.portfolio_date
				? new Date(result.portfolio_date).toLocaleDateString('en-IN', {
						day: '2-digit',
						month: 'short',
						year: 'numeric'
					})
				: 'N/A';

			alert('Portfolio Date: ' + portfolio_date);
		} catch (err) {
			errorMessage = `Failed to fetch preview dates: ${err.message}`;
		} finally {
			processingStatus.active = false;
		}
	}

	/**
	 * Main pipeline execution to fetch Groww holdings from backend for selected categories
	 */
	async function runAggregationPipeline() {
		if (selectedCategories.length === 0) {
			errorMessage = 'Please select at least one category to fetch holdings.';
			return;
		}

		errorMessage = '';
		parsedData = [];
		processingStatus = {
			active: true,
			current: 0,
			total: selectedCategories.length,
			label: 'Fetching Groww Holdings'
		};

		try {
			const response = await fetch('/mfanalysis/ijkl/api/getGrowwHoldings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ categories: selectedCategories })
			});

			if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

			const result = await response.json();
			console.log('Aggregation Result:', result);
		} catch (err) {
			errorMessage = `Aggregation pipeline failed: ${err.message}`;
		} finally {
			processingStatus.active = false;
		}
	}

	/**
	 * Export dynamic holdings data to CSV
	 */
	function downloadProcessedCSV() {
		if (parsedData.length === 0) return;

		try {
			const csvContent = Papa.unparse(parsedData);
			const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(blob);

			const link = document.createElement('a');
			link.href = url;
			link.setAttribute(
				'download',
				`groww_mf_holdings_${new Date().toISOString().slice(0, 10)}.csv`
			);

			document.body.appendChild(link);
			link.click();

			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (err) {
			errorMessage = `Failed to generate export file: ${err.message}`;
		}
	}
</script>

<main class="max-w-7xl mx-auto p-6 space-y-6 antialiased font-sans">
	<!-- Header Banner -->
	<header
		class="bg-gradient-to-r from-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-md"
	>
		<h1 class="text-2xl font-bold tracking-tight mb-2">Groww Mutual Fund Holdings Engine</h1>
		<p class="text-sm text-slate-300 max-w-3xl leading-relaxed">
			Select categories to preview recent holdings update dates or run the aggregation pipeline to
			pull complete portfolio data.
		</p>
	</header>

	<!-- Controls & Actions -->
	<section class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-3 space-y-5">
			<h2 class="font-semibold text-slate-800 text-base">Select Categories</h2>

			<!-- Category Checkboxes -->
			<div class="flex flex-wrap items-center gap-6">
				{#each categories as category}
					<label class="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
						<input
							type="checkbox"
							value={category}
							bind:group={selectedCategories}
							class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
						/>
						{category}
					</label>
				{/each}
			</div>

			<hr class="border-slate-100" />

			<!-- Action Controls -->
			<div class="flex flex-wrap items-center gap-3">
				<!-- Preview Button -->
				<button
					onclick={previewHoldingsDate}
					disabled={processingStatus.active}
					class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium text-sm rounded-lg shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
				>
					<svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
						/>
					</svg>
					Preview Updated Dates
				</button>

				<!-- Aggregation Pipeline Button -->
				<button
					onclick={runAggregationPipeline}
					disabled={selectedCategories.length === 0 || processingStatus.active}
					class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
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
						{processingStatus.label}...
					{:else}
						Run Aggregation Pipeline
					{/if}
				</button>

				<!-- Export CSV Button -->
				<button
					onclick={downloadProcessedCSV}
					disabled={parsedData.length === 0 || processingStatus.active}
					class="ml-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
				>
					<svg
						class="w-4 h-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4"
						></path>
					</svg>
					Download CSV
				</button>
			</div>
		</div>

		<!-- Error Banner -->
		{#if errorMessage}
			<div
				class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 md:col-span-3"
			>
				<span>❌</span>
				{errorMessage}
			</div>
		{/if}

		<!-- Holdings Date Preview Table -->
		{#if previewData.length > 0 && parsedData.length === 0}
			<div
				class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden md:col-span-3 space-y-2 p-4"
			>
				<h3 class="font-semibold text-slate-800 text-sm">Holdings Update Status Preview</h3>
				<div class="overflow-x-auto max-h-[300px]">
					<table class="w-full text-left border-collapse text-xs whitespace-nowrap">
						<thead
							class="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700"
						>
							<tr>
								{#each previewHeaders as header}
									<th class="p-3 border-r border-slate-200 last:border-0">{header}</th>
								{/each}
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each previewData as row}
								<tr class="hover:bg-slate-50">
									{#each previewHeaders as header}
										<td class="p-2.5 border-r border-slate-100 last:border-0 font-medium">
											{row[header] ?? '—'}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Main Holdings Data Table View -->
		{#if parsedData.length > 0}
			<div
				class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden md:col-span-3"
			>
				<div class="overflow-x-auto max-h-[550px]">
					<table class="w-full text-left border-collapse text-xs whitespace-nowrap">
						<thead
							class="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700 z-10"
						>
							<tr>
								{#each tableHeaders as header}
									<th
										class="p-3.5 border-r border-slate-200/60 last:border-0 tracking-wide text-slate-600 bg-slate-50"
									>
										{header}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/80 text-slate-600">
							{#each parsedData as row}
								<tr class="hover:bg-slate-50/80 transition-colors odd:bg-white even:bg-slate-50/30">
									{#each tableHeaders as header}
										<td class="p-3 border-r border-slate-200/40 last:border-0 font-medium">
											{#if row[header] === 'N/A' || !row[header]}
												<span class="text-slate-400 italic">—</span>
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
					<span>Active Categories: <b>{selectedCategories.join(', ')}</b></span>
					<span>Total Holdings Loaded: <b>{parsedData.length} Records</b></span>
				</footer>
			</div>
		{/if}
	</section>
</main>
