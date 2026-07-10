<script>
	import { onMount } from 'svelte';
	import dayjs from 'dayjs';
	import StockBlock from './componentblock/StockBlock.svelte';
	import { goto } from '$app/navigation';
	import { deserialize } from '$app/forms';

	let data = $state([]);
	let selectedStockId = $state('');
	let rsi = $state('up');

	let filteredStockList = $derived(
		(data ?? []).filter(
			(row) =>
				!rsi ||
				(rsi === 'up' && row.rsi14_monthly > 55) ||
				(rsi === 'down' && row.rsi14_monthly <= 55)
		)
	);

	onMount(async () => {
		const formData = new FormData();
		formData.append('key', 'my_holding');
		const response = await fetch('?/getPortfolioHolding', { method: 'POST', body: formData });
		const result = deserialize(await response.text());
		// console.log(result.data.holding);
		data = result.data.holding;
	});
	// $inspect(filteredStockList);
</script>

<div class="p-1 w-full overflow-hidden">
	<h1>My Portfolio Analysis</h1>
	<button
		onclick={() => goto('/portfolio')}
		class="border border-gray-200 rounded px-2 active:bg-gray-200 hover:bg-gray-100"
	>
		Update
	</button>
	<!-- <span>{dayjs(data.meta?.updatedAt).format('DD-MMM-YYYY')}</span> -->
	<span>{filteredStockList.length}</span>

	<div class="FiltersContainer">
		<!-- RSI Filter -->
		<select name="rsi" class="w-48 truncate border border-gray-200 rounded px-2" bind:value={rsi}>
			<option value={''} class="w-48"> RSI(14M) </option>
			<option value={'up'}>{'RSI >55'}</option>
			<option value={'down'}>{'RSI <55'}</option>
		</select>
	</div>
</div>

<div class="overflow-auto flex-1">
	<StockBlock
		data={filteredStockList.map((x) => ({
			symbol: x.symbol,
			name: x.Scrip,
			value: `${x.HoldingPct}% (${x.HoldingAmt})`
		}))}
		{selectedStockId}
	/>
</div>
