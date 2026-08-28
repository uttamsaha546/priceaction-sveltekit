<script>
	import { onMount } from 'svelte';
	import StockBlock from './componentblock/StockBlock.svelte';

	let priceactionScreenerData = $state([]);

	onMount(() => {
		fetch(`/priceaction/api/get-priceaction-screener-data`)
			.then((x) => x.json())
			.then((data) => {
				priceactionScreenerData = data;
			});
	});
</script>

<div class="p-1 w-full overflow-hidden">PriceactionComponent</div>
<div class="overflow-auto flex-1">
	<StockBlock
		data={priceactionScreenerData.map((x) => {
			return { symbol: x.symbol, name: x.name, value: x.count };
		})}
	/>
</div>
