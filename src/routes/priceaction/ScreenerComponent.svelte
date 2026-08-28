<script>
	let date = $state(
		(() => {
			const d = new Date();
			const day = d.getDay();

			if (day === 0) d.setDate(d.getDate() - 2); // Sunday → Friday
			if (day === 6) d.setDate(d.getDate() - 1); // Saturday → Friday

			return d.toLocaleDateString('en-CA');
		})()
	);

	let dateHeaders = $derived(
		Array.from({ length: 12 }, (_, i) => {
			const d = new Date(date);
			let count = 0;

			while (count < i) {
				d.setDate(d.getDate() - 1);

				// Skip Saturdays (6) and Sundays (0)
				if (d.getDay() !== 0 && d.getDay() !== 6) {
					count++;
				}
			}

			return d.toLocaleDateString('en-CA');
		})
	);

	let shapedData = $state([]);

	$effect(() => {
		const from = dateHeaders[dateHeaders.length - 1];
		const to = dateHeaders[0];

		fetch(`/priceaction/api/get-bhavcopy-data?from=${from}&to=${to}`)
			.then((x) => x.json())
			.then((data) => {
				const transformedData = {};

				for (const element of data) {
					if (!transformedData[element.symbol]) {
						transformedData[element.symbol] = {
							symbol: element.symbol,
							data: {},
							count: 0
						};
					}

					transformedData[element.symbol].count++;
					transformedData[element.symbol].data[element.date] = element.change;
				}

				shapedData = Object.values(transformedData).sort((a, b) => b.count - a.count);
			});
	});
</script>

<section class="w-full max-w-7xl mx-auto p-6 bg-slate-50 min-h-screen rounded-xl shadow-sm">
	<!-- Control Header Banner -->
	<div
		class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 mb-6 bg-white border border-slate-200 rounded-xl shadow-sm"
	>
		<div>
			<h2 class="text-base font-bold text-slate-800">Historical Price Action Matrix</h2>
			<p class="text-xs text-slate-400 mt-0.5">
				Tracking closing variations across the last 12 active exchange sessions.
			</p>
		</div>

		<div class="w-full sm:w-auto">
			<label
				for="matrix-anchor-date"
				class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1"
				>Anchor Tracking Date</label
			>
			<input
				id="matrix-anchor-date"
				type="date"
				bind:value={date}
				class="w-full sm:w-56 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
			/>
		</div>
	</div>

	<!-- High Density Data Matrix Grid -->
	{#if shapedData.length > 0}
		<div class="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-slate-100 border-b border-slate-200 divide-x divide-slate-200">
						<th
							class="px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-100 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
							>#</th
						>
						<th
							class="px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-100 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
							>Symbol</th
						>
						<th
							class="px-3 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider text-center"
							>Hits</th
						>
						{#each dateHeaders as dateHeader}
							<th
								class="px-3 py-2.5 text-xs font-bold text-slate-500 text-center font-mono whitespace-nowrap min-w-[75px]"
							>
								{new Date(dateHeader).toLocaleDateString('en-GB', {
									day: '2-digit',
									month: 'short'
								})}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200">
					{#each shapedData as row, rowIndex}
						<tr class="hover:bg-slate-50 transition-colors divide-x divide-slate-100 group">
							<!-- Sticky Left Symbol column for perfect tracking on small screens -->
							<td
								class="px-4 py-1.5 text-sm font-bold text-slate-700 bg-white sticky left-0 z-10 group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-mono whitespace-nowrap"
							>
								{rowIndex}
							</td>
							<td
								class="px-4 py-1.5 text-sm font-bold text-slate-700 bg-white sticky left-0 z-10 group-hover:bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-mono whitespace-nowrap"
							>
								{row.symbol}
							</td>

							<td class="px-3 py-1.5 text-xs font-semibold text-center whitespace-nowrap">
								<span
									class="inline-block min-w-6 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
								>
									{row.count}
								</span>
							</td>

							{#each dateHeaders as singleDate}
								<td
									class="px-3 py-1.5 text-xs font-mono font-semibold text-center whitespace-nowrap"
								>
									{#if row.data[singleDate] !== undefined}
										{@const changeVal = parseFloat(row.data[singleDate])}
										<span
											class={changeVal > 0
												? 'text-emerald-600'
												: changeVal < 0
													? 'text-rose-600'
													: 'text-slate-400'}
										>
											{changeVal > 0 ? '+' : ''}{changeVal}%
										</span>
									{:else}
										<span class="text-slate-300 font-normal select-none">—</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<!-- Fallback Loader UI during API requests -->
		<div
			class="flex flex-col items-center justify-center p-20 bg-white border border-slate-200 rounded-xl text-center min-h-87.5"
		>
			<svg class="animate-spin h-8 w-8 text-blue-500 mb-3" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<p class="text-sm font-medium text-slate-400 animate-pulse">
				Calculating data arrays across timeframe...
			</p>
		</div>
	{/if}
</section>
