<script>
	import Papa from 'papaparse';

	let parsedData = $state([]);
	let errorMessage = $state('');
	let processingStatus = $state({ active: false, current: 0, total: 0 });

	// Safely derive unique tracking keys out of full data array state
	let tableHeaders = $derived(
		parsedData.length > 0 ? Array.from(new Set(parsedData.flatMap((obj) => Object.keys(obj)))) : []
	);

	function handleFileUpload(event) {
		const file = event.target.files[0];
		if (!file) return;

		parsedData = [];
		errorMessage = '';
		processingStatus = { active: false, current: 0, total: 0 };

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				parsedData = results.data;
			},
			error: (error) => {
				errorMessage = `Parsing configuration failed: ${error.message}`;
			}
		});
	}

	// Chunks network calls sequentially to prevent API request drops
	async function getInfoFromNSE() {
		if (parsedData.length === 0) {
			errorMessage = 'No active datasets loaded. Please upload a standard AMFI CSV file template.';
			return;
		}

		errorMessage = '';
		processingStatus = { active: true, current: 0, total: parsedData.length };

		// Configurable sliding window execution limits
		const CONCURRENCY_LIMIT = 10;
		const dataCopy = [...parsedData];

		for (let i = 0; i < dataCopy.length; i += CONCURRENCY_LIMIT) {
			const batch = dataCopy.slice(i, i + CONCURRENCY_LIMIT);

			const promises = batch.map(async (element) => {
				const symbol = element['NSE Symbol'];
				if (!symbol || symbol === '-') {
					processingStatus.current += 1;
					return element;
				}

				try {
					const response = await fetch(
						`/mfanalysis/efgh/api/getInfoFromNSE?symbol=${encodeURIComponent(symbol.trim())}`
					);

					if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
					const result = await response.json();

					const secInfo = result.data?.nseData?.equityResponse?.[0]?.secInfo;
					if (!secInfo) return element;

					const a = await fetch(
						`/mfanalysis/efgh/api/isHeldByMF?symbol=${encodeURIComponent(symbol.trim())}`
					);
					const b = await a.json();

					return {
						...element,
						Macro: secInfo.macro || '-',
						Sector: secInfo.sector || '-',
						Industry: secInfo.industryInfo || '-',
						'Basic Industry': secInfo.basicIndustry || '-',
						Index: secInfo.index || '-',
						isHeldByMF: b.heldByMF
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

	/**
	 * Converts runtime Svelte array data back into a valid physical CSV stream file download
	 */
	function downloadProcessedCSV() {
		if (parsedData.length === 0) return;

		try {
			// Convert JSON objects back into a safe comma-separated text string
			const csvContent = Papa.unparse(parsedData);

			// Wrap string payload inside a binary blob container representing text/csv formats
			const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(blob);

			// Inject a virtual shadow link into DOM to invoke programmatic download action
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute(
				'download',
				`amfi_enriched_universe_${new Date().toISOString().slice(0, 10)}.csv`
			);

			document.body.appendChild(link);
			link.click();

			// Destruct and clear memory footprint immediately
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (err) {
			errorMessage = `Failed to generate export file: ${err.message}`;
		}
	}
</script>

<main class="max-w-7xl mx-auto p-6 space-y-6 antialiased font-sans">
	<!-- Header Info Banner Component -->
	<header
		class="bg-gradient-to-r from-slate-800 to-indigo-950 text-white p-6 rounded-2xl shadow-md"
	>
		<h1 class="text-2xl font-bold tracking-tight mb-2">
			AMFI Stock Universe Categorization Engine
		</h1>
		<p class="text-sm text-slate-300 max-w-3xl leading-relaxed">
			Use this utility on January and July after stock categorization has been published on AMFI.
			This engine enriches basic capitalization data sets with real-time sector indices tracking
			structures pulled securely from the NSE.
		</p>
	</header>

	<!-- Controls & Actions Section Layout Grid -->
	<section class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
			<h2 class="font-semibold text-slate-800 text-base">Dataset Controls</h2>

			<div class="flex flex-col sm:flex-row sm:items-center gap-4">
				<label class="flex-1 block">
					<span class="sr-only">Choose CSV File</span>
					<input
						type="file"
						accept=".csv"
						onchange={handleFileUpload}
						disabled={processingStatus.active}
						class="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
					/>
				</label>

				<button
					onclick={getInfoFromNSE}
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
				<button
					onclick={downloadProcessedCSV}
					disabled={parsedData.length === 0 || processingStatus.active}
					class="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow transition duration-150 ease-in-out disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
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

		<!-- Requirement Info Box Panel -->
		<div
			class="bg-amber-50/60 border border-amber-200/80 p-5 rounded-xl text-xs text-amber-800 space-y-2"
		>
			<h3
				class="font-bold flex items-center gap-1.5 text-amber-900 uppercase tracking-wider text-[10px]"
			>
				⚠️ Required CSV Schema Notice
			</h3>
			<p class="leading-relaxed">
				Before dropping datasets here, explicitly drop any extraneous items. Excel configurations
				must retain these precise keys exactly:
			</p>
			<div
				class="grid grid-cols-2 gap-1 font-mono bg-white/60 p-2 rounded border border-amber-200 text-amber-950"
			>
				<div>• Sr. No.</div>
				<div>• Company name</div>
				<div>• ISIN</div>
				<div>• NSE Symbol</div>
				<div>• Marketcap (Rs. Cr.)</div>
				<div>• Categorization</div>
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

				<div class="overflow-x-auto max-h-[550px]">
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
