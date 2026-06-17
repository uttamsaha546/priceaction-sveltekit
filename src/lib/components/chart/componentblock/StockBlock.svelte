<script>
	import dayjs from 'dayjs';
	import FlagIcon from '../Icons/FlagIcon.svelte';
	import { ChartState } from '$lib/state/ChartState.svelte';
	let { data, selectedStockId } = $props();

	async function fetchGraphData(symbol) {
		const endTime = dayjs().endOf('day').valueOf();
		const startTime = dayjs(endTime).subtract(5, 'Year').valueOf();
		const p = await fetch(
			`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/charting_service/v2/chart/delayed/exchange/NSE/segment/CASH/${symbol}?endTimeInMillis=${endTime}&intervalInMinutes=1440&startTimeInMillis=${startTime}`)}`
		);

		const res = await p.json();
		const data = res.candles.map((row) => [row[0], row[4]]);
		ChartState.lineData = data;
	}
</script>

{#each data as stock, stockIndex (stock.symbol)}
	<div
		role="listbox"
		tabindex={selectedStockId === stock.symbol ? 0 : -1}
		class={`cursor-pointer transition-all duration-200 py-0.5 hover:bg-gray-100 border-b border-gray-100 flex flex-row items-center ${
			selectedStockId === stock.symbol ? 'ring-2 ring-inset rounded-md' : ''
		}`}
		onclick={() => {
			selectedStockId = stock.symbol;
			fetchGraphData(stock.symbol);
		}}
		onkeydown={(e) => {}}
	>
		<span>
			<FlagIcon color="transparent" />
		</span>

		<div class="flex-1 flex flex-col px-1 overflow-hidden">
			<div class="flex justify-between">
				<span class="text-sm/tight">{stock.symbol}</span>

				<span class="text-xs/tight text-gray-500">
					{Math.floor(stock.marketcap / 10000000).toLocaleString('en-IN')} Cr
				</span>
			</div>

			<span class="text-xs/tight text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
				{stock.name}
			</span>
		</div>
	</div>
{/each}
