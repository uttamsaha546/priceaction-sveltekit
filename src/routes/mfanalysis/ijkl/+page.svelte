<script>
	const categories = ['Large Cap', 'Mid Cap', 'Small Cap', 'Sectoral', 'Thematic'];

	let selectedCategory = $state('');

	let { data: growwMfScreenerData } = $props();

	$inspect(growwMfScreenerData);

	// Safely derive unique tracking keys out of full active data array
	let tableHeaders = ['fund_name', 'sub_category'];

	let filteredData = $derived.by(() => {
		// if (!selectedCategory) return growwMfScreenerData.growwMfScreenerData;
		// const filtered = growwMfScreenerData.growwMfScreenerData.filter(
		// 	(x) => x.sub_category === selectedCategory
		// );
		return [];
	});

	$inspect(filteredData);

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
			<h2 class="font-semibold text-slate-800 text-base">Select Category</h2>

			<!-- Category Checkboxes -->
			<div class="flex flex-wrap items-center gap-6">
				<label class="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
					<input
						type="radio"
						name="category"
						value=""
						defaultChecked
						bind:group={selectedCategory}
						class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
					/>
					All
				</label>
				{#each categories as category}
					<label class="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
						<input
							type="radio"
							name="category"
							value={category}
							bind:group={selectedCategory}
							class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
						/>
						{category}
					</label>
				{/each}
			</div>

			<hr class="border-slate-100" />

			<!-- Holdings Data Table View -->
			<div class="flex flex-wrap items-center gap-3">
				{#if filteredData.length > 0}
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
									{#each filteredData as row}
										<tr
											class="hover:bg-slate-50/80 transition-colors odd:bg-white even:bg-slate-50/30"
										>
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
							<span>Active Categories: <b>{selectedCategory}</b></span>
							<span>Total Holdings Loaded: <b>{filteredData.length} Records</b></span>
						</footer>
					</div>
				{/if}
			</div>
		</div>

		<!-- Error Banner -->
		<!-- {#if errorMessage}
			<div
				class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 md:col-span-3"
			>
				<span>❌</span>
				{errorMessage}
			</div>
		{/if} -->
	</section>
</main>
