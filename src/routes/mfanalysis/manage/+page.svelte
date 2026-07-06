<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	const cols = ['scheme_code', 'scheme_name'];
	const categories = ['Mid Cap', 'Small Cap', 'Healthcare', 'Technology', 'Transportation'];

	let searchInput = $state('');
	let isSyncing = $state(false);

	let filteredData = $derived({
		content: data.content.filter(
			(fund) =>
				fund.scheme_name.toLowerCase().includes(searchInput.toLowerCase()) ||
				fund.scheme_code.toLowerCase().includes(searchInput.toLowerCase())
		)
	});
</script>

{#snippet selectMenu(scheme_code, investment_universe)}
	<form method="POST" action="?/updateScheme" use:enhance>
		<input type="hidden" name="scheme_code" value={scheme_code} />
		<select
			name="investment_universe"
			value={investment_universe}
			onchange={(e) => e.currentTarget.form.requestSubmit()}
		>
			<option value="" disabled selected hidden>Select...</option>
			{#each categories as category}
				<option>{category}</option>
			{/each}
		</select>
	</form>
{/snippet}

<!-- <div class="m-auto">
	<div class="m-5">
		<label>
			Search
			<input bind:value={searchInput} class="outline px-2 py-0.5 rounded outline-gray-200" />
		</label>
	</div>

	<table>
		<thead>
			<tr>
				{#each cols as col}
					<th>{col}</th>
				{/each}
				<th>investment_universe</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredData.content as fund}
				<tr>
					{#each cols as col}
						<td>{fund[col]}</td>
					{/each}
					<td>{@render selectMenu(fund.scheme_code, fund.investment_universe)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div> -->

<div class="max-w-6xl mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100 my-8">
	<div
		class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-gray-100"
	>
		<div>
			<h2 class="text-xl font-semibold text-gray-800">Scheme Universe Management</h2>
			<p class="text-sm text-gray-500 mt-0.5">
				Map Groww mutual fund schemes to your localized investment universes.
			</p>
		</div>

		<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
			<label class="text-sm font-medium text-gray-600 flex items-center gap-2">
				<span class="sr-only">Search</span>
				<input
					bind:value={searchInput}
					placeholder="Search schemes..."
					class="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-400"
				/>
			</label>

			<form
				method="POST"
				action="?/syncFromGroww"
				use:enhance={() => {
					isSyncing = true;
					return async ({ update }) => {
						isSyncing = false;
						await update();
					};
				}}
			>
				<button
					type="submit"
					disabled={isSyncing}
					class="w-full sm:w-auto px-4 py-1.5 text-sm font-medium rounded-lg text-white transition-all shadow-sm flex items-center justify-center gap-2
                    {isSyncing
						? 'bg-gray-400 cursor-not-allowed'
						: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'}"
				>
					{#if isSyncing}
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
						<span>Syncing File...</span>
					{:else}
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
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.253 8H18"
							></path>
						</svg>
						<span>Fetch Latest Schemes</span>
					{/if}
				</button>
			</form>
		</div>
	</div>

	{#if form?.syncSuccess}
		<div
			class="mb-4 p-3 text-sm text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-100"
		>
			✓ Successfully pulled live data from Groww and rewrote local JSON dataset configuration cache.
		</div>
	{/if}
	{#if form?.syncError}
		<div class="mb-4 p-3 text-sm text-red-800 bg-red-50 rounded-lg border border-red-100">
			✕ Sync Failed: {form.syncError}
		</div>
	{/if}

	<div class="overflow-x-auto rounded-lg border border-gray-200">
		<table class="w-full text-left border-collapse text-sm text-gray-600">
			<thead>
				<tr
					class="bg-gray-50 border-b border-gray-200 text-gray-700 font-medium tracking-wide uppercase text-xs"
				>
					{#each cols as col}
						<th class="px-4 py-3 font-semibold">{col.replace('_', ' ')}</th>
					{/each}
					<th class="px-4 py-3 font-semibold">Investment Universe</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#each filteredData.content as fund (fund.scheme_name)}
					<tr class="hover:bg-gray-50/70 transition-colors">
						{#each cols as col}
							<td class="px-4 py-3.5 text-gray-800 font-mono text-xs max-w-xs truncate">
								{#if col === 'scheme_name'}
									<span class="font-sans text-sm font-normal text-gray-900">{fund[col]}</span>
								{:else}
									{fund[col]}
								{/if}
							</td>
						{/each}
						<td class="px-4 py-3.5">
							{@render selectMenu(fund.scheme_code, fund.investment_universe)}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan={cols.length + 1} class="px-4 py-8 text-center text-gray-400 bg-gray-50/30">
							No matching mutual fund schemes found.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
