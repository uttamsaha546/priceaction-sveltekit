<script>
	import { onMount } from 'svelte';
	import StockBlock from './componentblock/StockBlock.svelte';

	let priceactionScreenerData = $state([]);
	let rsi14WFilter = $state('');
	let rsi14MFilter = $state('');
	let changeFilter = $state('4');

	onMount(async () => {
		const res = await fetch(`/priceaction/api/get-priceaction-screener-data`);
		priceactionScreenerData = await res.json();
	});

	let filteredData = $derived.by(() => {
		const results = [];
		const targetThreshold = changeFilter ? Number(changeFilter) : 3;

		for (const item of priceactionScreenerData) {
			// Weekly RSI condition
			if (rsi14WFilter === 'up' && item.rsi_14W <= 55) continue;
			if (rsi14WFilter === 'down' && item.rsi_14W > 55) continue;

			// Monthly RSI condition
			if (rsi14MFilter === 'up' && item.rsi_14M <= 55) continue;
			if (rsi14MFilter === 'down' && item.rsi_14M > 55) continue;

			// Count how many days exceed the threshold
			let daysOverThreshold = 0;
			if (item.data) {
				for (const val of Object.values(item.data)) {
					if (val > targetThreshold) {
						daysOverThreshold++;
					}
				}
			}

			// If a filter is active, only include stocks with at least one matching day
			if (changeFilter && daysOverThreshold === 0) continue;

			// Store the transformed object directly
			results.push({
				symbol: item.symbol,
				name: item.name,
				value: changeFilter ? daysOverThreshold : item.count // Use mutated count if filtering by change
			});
		}

		return results;
	});
	// $inspect(filteredData);
</script>

<div class="p-1 w-full overflow-hidden">PriceactionComponent</div>
<div class="p-1 flex flex-row gap-2 flex-wrap">
	<select bind:value={rsi14WFilter} class="outline outline-gray-200 rounded">
		<option value="">RSI(14W)</option>
		<option value="up">{'RSIW>55'}</option>
		<option value="down">{'RSIW<55'}</option>
	</select>

	<select bind:value={rsi14MFilter} class="outline outline-gray-200 rounded">
		<option value="">RSI(14M)</option>
		<option value="up">{'RSIM>55'}</option>
		<option value="down">{'RSIM<55'}</option>
	</select>

	<select bind:value={changeFilter} class="outline outline-gray-200 rounded">
		<option value="3">{'>3%'}</option>
		<option value="4">{'>4%'}</option>
		<option value="5">{'>5%'}</option>
	</select>

	<span>{filteredData.length}</span>
</div>

<div class="p-1 flex flex-row gap-2 flex-wrap"></div>

<div class="overflow-auto flex-1">
	<StockBlock data={filteredData.sort((a, b) => b.value - a.value)} />
</div>
