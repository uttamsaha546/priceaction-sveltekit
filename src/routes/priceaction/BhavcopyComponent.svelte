<script>
	import { onMount } from 'svelte';

	let initializing = $state(true); // Added for initial component lifecycle load
	let processing = $state(false);
	let date = $state(new Date().toLocaleDateString('en-CA'));
	let tableData = $state([]);
	let tableHeaders = $state([]);

	async function getBhavcopyDataGroupByDate() {
		try {
			const res = await fetch(`/priceaction/api/get-bhavcopy-data-group-by-date`);
			const data = await res.json();
			tableData = Array.isArray(data) ? data : data.records || [];
			tableHeaders = tableData.length > 0 ? Object.keys(tableData[0]) : [];
		} catch (err) {
			console.error('Failed to load table data:', err);
		} finally {
			initializing = false; // Turn off initial spinner once request terminates
		}
	}

	onMount(getBhavcopyDataGroupByDate);

	async function fetchBhavcopyAndSave() {
		if (processing) return;
		processing = true;
		try {
			const res = await fetch(`/priceaction/api/fetch-bhavcopy-and-save?date=${date}`);
			await res.json();
			await getBhavcopyDataGroupByDate();
		} catch (err) {
			console.error('Error saving data:', err);
		} finally {
			processing = false;
		}
	}

	async function deleteBhavcopy(targetDate) {
		if (!confirm(`Are you sure you want to delete records for ${targetDate}?`)) return;
		try {
			const res = await fetch(`/priceaction/api/delete-bhavcopy?date=${targetDate}`);
			await res.json();
			await getBhavcopyDataGroupByDate();
		} catch (err) {
			console.error('Error deleting record:', err);
		}
	}
</script>

<section class="max-w-4xl mx-auto p-6 bg-slate-50 min-h-screen rounded-xl shadow-sm">
	<!-- Control Header Panel -->
	<div
		class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mb-6 bg-white border border-slate-200 rounded-xl shadow-sm"
	>
		<div class="w-full sm:w-auto">
			<label
				for="bhavcopy-date"
				class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
				>Select Exchange Date</label
			>
			<input
				id="bhavcopy-date"
				type="date"
				bind:value={date}
				class="w-full sm:w-64 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-sm"
			/>
		</div>

		<button
			onclick={fetchBhavcopyAndSave}
			disabled={processing || initializing}
			class="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all flex items-center justify-center min-w-[130px]"
		>
			{#if processing}
				<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Processing...
			{:else}
				Fetch & Save
			{/if}
		</button>
	</div>

	<!-- Render States: Initializing Spinner -> Data Table -> Empty State Fallback -->
	{#if initializing}
		<div
			class="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-xl shadow-sm min-h-[300px]"
		>
			<svg class="animate-spin h-10 w-10 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<p class="text-sm font-medium text-slate-500 animate-pulse">
				Syncing log index from database...
			</p>
		</div>
	{:else}
		{#if tableData.length > 0}
			<div class="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
				<table class="w-full text-left border-collapse">
					<thead>
						<tr class="bg-slate-100 border-b border-slate-200">
							{#each tableHeaders as header}
								<th class="px-6 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider"
									>{header}</th
								>
							{/each}
							<th
								class="px-6 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider text-right"
								>Action</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200">
						{#each tableData as row}
							<tr class="hover:bg-slate-50 transition-colors group">
								{#each tableHeaders as header}
									<td class="px-6 py-2 text-sm font-medium text-slate-700 whitespace-nowrap">
										{#if header === 'date'}
											<span
												class="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 border border-slate-200"
												>{row[header]}</span
											>
										{:else if header === 'count'}
											<span
												class="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full text-xs border border-blue-100"
												>{row[header]} records</span
											>
										{:else}
											{row[header]}
										{/if}
									</td>
								{/each}
								<td class="px-6 py-2 text-sm text-right whitespace-nowrap">
									<button
										onclick={() => deleteBhavcopy(row.date)}
										class="text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded border border-rose-200 opacity-90 group-hover:opacity-100 transition-all active:scale-95"
									>
										Delete
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<!-- Empty State Vector Container -->
			<div
				class="flex flex-col items-center justify-center p-12 bg-white border border-dashed border-slate-300 rounded-xl text-center"
			>
				<svg
					class="w-12 h-12 text-slate-300 mb-3"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
					></path>
				</svg>
				<h3 class="text-sm font-semibold text-slate-700">No trading logs indexed</h3>
				<p class="text-xs text-slate-400 mt-1 max-w-xs">
					Pick a target trade date above to query and populate data from the NSE server cluster.
				</p>
			</div>
		{/if}
	{/if}
</section>
