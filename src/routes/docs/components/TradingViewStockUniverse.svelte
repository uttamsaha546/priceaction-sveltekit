<script>
	import { AppState } from '$lib/state/AppState.svelte';
	import { onMount } from 'svelte';

	let tableHeaders = $derived(Object.keys(tradingViewStockUniverse?.data?.[0]));
	let updating = $state(false);
	let tradingViewStockUniverse = $state({});

	function handleUpdate() {
		updating = true;

		fetch('/docs/api/set-tradingview-stock-universe')
			.then((res) => res.json())
			.then((data) => {
				tradingViewStockUniverse = data;
				updating = false;
			});
	}

	onMount(() => {
		fetch('/docs/api/get-tradingview-stock-universe')
			.then((res) => res.json())
			.then((data) => {
				tradingViewStockUniverse = data;
				AppState.TradingViewStockUniverse = data;
			});
	});
</script>

<main class="max-w-7xl mx-auto p-6 space-y-6 antialiased font-sans">
	<section class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-3">
			<div class="text-2xl font-bold">TradingView Stock Universe</div>
			<!-- Controls & Actions Section Layout Grid -->
			<div class="flex flex-row justify-between items-center">
				<p class="font-semibold text-slate-800 text-base mt-4">
					Last Updated: {new Date(tradingViewStockUniverse?.meta?.updated_at) ?? 'Not Updated Yet'}
				</p>
				<button
					onclick={handleUpdate}
					disabled={updating}
					class="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold
            text-white transition-colors hover:bg-blue-700 focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50"
				>
					{updating ? 'Updating...' : 'Update'}
				</button>
			</div>

			<!-- Dynamic Data Table Presentation View -->
			{#if tradingViewStockUniverse?.data?.length > 0}
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
							{#each tradingViewStockUniverse?.data as row, rowIndex}
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
			{:else}
				<div class="overflow-x-auto max-h-100 text-center">No Data to show</div>
			{/if}
		</div>
	</section>
</main>
