<script>
	const categories = ['Large Cap', 'Mid Cap', 'Small Cap', 'Sectoral', 'Thematic'];

	let selectedCategory = $state('Mid Cap');
	let selectedTableHeaders = $state(['fund_name'])
	let sortKey = $state('');
	let sortDirection = $state('asc');

	let { data: growwMfScreenerData } = $props();
$inspect(growwMfScreenerData)
	let tableHeaders = [
		'fund_name',
		'sub_category',
		'equity_count',
		'equity_pct',
		'rsi_14W_gt55',
		'rsi_14M_gt55',
		'return6m',
		'return1y',
		'top10_weight',
		'sector_weight'
	];
	
	const sectors = [
	'Capital Goods',
	'Financial Services',
	'Healthcare',
	'Automobile and Auto Components',
	'Consumer Durables',
	'Chemicals',
	'Fast Moving Consumer Goods',
	'Consumer Services',
	'Information Technology',
	'Services',
	'Construction',
	'Metals & Mining',
	'Realty',
	'Oil Gas & Consumable Fuels',
	'Textiles',
	'Construction Materials',
	'Power',
	'Media Entertainment & Publication',
	'Telecommunication',
	'Utilities',
	'Forest Materials',
	'Diversified'
];

let displayHeaders = $derived.by(() => {
	const headers = [];

	for (const header of selectedTableHeaders) {
		if (header === 'sector_weight') {
			headers.push(...sectors);
		} else {
			headers.push(header);
		}
	}

	return headers;
});

	let filteredData = $derived.by(() => {
		if (!selectedCategory) return growwMfScreenerData.data;

		return growwMfScreenerData.data.filter((x) => x.sub_category === selectedCategory);
	});

	let sortedData = $derived.by(() => {
		const data = [...filteredData];

		if (!sortKey) return data;

		return data.sort((a, b) => {
			const aValue =
	a[sortKey] !== undefined
		? a[sortKey]
		: a.sector_weight?.[sortKey];

const bValue =
	b[sortKey] !== undefined
		? b[sortKey]
		: b.sector_weight?.[sortKey];

			// Empty / null values go to the bottom
			if (aValue == null || aValue === '' || aValue === 'N/A') return 1;
			if (bValue == null || bValue === '' || bValue === 'N/A') return -1;

			// Numeric sorting
			const aNumber = Number(aValue);
			const bNumber = Number(bValue);

			if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) {
				return sortDirection === 'asc' ? aNumber - bNumber : bNumber - aNumber;
			}

			// String sorting
			const comparison = String(aValue).localeCompare(String(bValue), undefined, {
				sensitivity: 'base'
			});

			return sortDirection === 'asc' ? comparison : -comparison;
		});
	});

	function sortBy(header) {
		if (sortKey === header) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = header;
			sortDirection = 'asc';
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
			
			<!-- Table Header Checkboxes -->
			<div class="flex flex-wrap items-center gap-6">
				{#each tableHeaders as header}
					<label class="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
						<input
							type="checkbox"
							value={header}
							bind:group={selectedTableHeaders}
							class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
						/>
						{header}
					</label>
				{/each}
			</div>

			<hr class="border-slate-100" />

			<!-- Holdings Data Table View -->
			<div class="flex flex-wrap items-center gap-3">
				{#if sortedData.length > 0}
					<div
						class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden md:col-span-3"
					>
						<div class="overflow-x-auto max-h-[550px]">
							<table class="w-full text-left border-collapse text-xs whitespace-nowrap">
								<thead
									class="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700 z-10"
								>
									<tr>
										{#each displayHeaders as header}
											<th class="p-0 border-r border-slate-200/60 last:border-0 bg-slate-50">
												<button
													type="button"
													class="w-full h-full p-3.5 flex items-center justify-between gap-3
						hover:bg-slate-100 transition-colors text-left
						tracking-wide text-slate-600"
													onclick={() => sortBy(header)}
												>
													<span>{header}</span>

													{#if sortKey === header}
														<span class="text-indigo-600 text-sm">
															{sortDirection === 'asc' ? '▲' : '▼'}
														</span>
													{:else}
														<span class="text-slate-300 text-sm">↕</span>
													{/if}
												</button>
											</th>
										{/each}
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-200/80 text-slate-600">
									{#each sortedData as row}
										<tr
											class="hover:bg-slate-50/80 transition-colors odd:bg-white even:bg-slate-50/30"
										>
											{#each displayHeaders as header}
												<td class="p-3 border-r border-slate-200/40 last:border-0 font-medium">
                            {#if sectors.includes(header)}
			{#if row.sector_weight?.[header] == null}
				<span class="text-slate-400 italic">—</span>
			{:else}
				{row.sector_weight[header].toFixed(2)}%
			{/if}
		{:else if row[header] === 'N/A' || !row[header]}
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
	</section>
</main>
