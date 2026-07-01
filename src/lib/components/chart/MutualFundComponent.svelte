<script>
	import { ChartState } from '$lib/state/ChartState.svelte';
	import dayjs from 'dayjs';
	import StarIcon from './Icons/StarIcon.svelte';

	let selectedFundType = $state(null);
	let data = $state([]);

	let isHoldingPage = $state(false);
	let clickedFund = $state(null);
	let clickedFundData = $state(null);

	let holdingsData = $derived.by(() => {
		if (!clickedFundData) return [];
		return clickedFundData.holdings
			.filter((item) => item.nature_name === 'EQUITY')
			.map((item) => ({
				...item,
				...ChartState.groww[item.stock_search_id]
			}));
	});

	$inspect(holdingsData);
	$inspect(ChartState.groww);

	async function fetchGraphData(symbol) {
		const endTime = dayjs().endOf('day').valueOf();
		let startTime = dayjs(endTime).subtract(10, 'Year').valueOf();
		const p = await fetch(
			`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/charting_service/v2/chart/delayed/exchange/NSE/segment/CASH/${symbol}?endTimeInMillis=${endTime}&intervalInMinutes=1440&startTimeInMillis=${startTime}`)}`
		);

		const res = await p.json();
		const data = res.candles.map((row) => [row[0], row[4]]);
		ChartState.lineData = data;
	}

	$effect(async () => {
		if (!selectedFundType) return;
		const a = await fetch(
			`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/search/v1/derived/scheme?available_for_investment=true&doc_type=scheme&page=0&plan_type=Direct&q=&size=100&sort_by=1&sub_category=${selectedFundType}`)}`
		);
		data = (await a.json()).content.filter((item) => !item.index).sort((a, b) => b.aum - a.aum);
	});

	$effect(async () => {
		if (!clickedFund) return;
		const a = await fetch(
			`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/data/mf/web/v5/scheme/search/${clickedFund.id}`)}`
		);

		clickedFundData = await a.json();
	});
</script>

<div>
	<div class="MutualFundComponentList" class:hidden={isHoldingPage}>
		<div class="Filters">
			<select bind:value={selectedFundType}>
				<option value="Large Cap">Large Cap</option>
				<option value="Mid Cap">Mid Cap</option>
				<option value="Small Cap">Small Cap</option>
			</select>
			<div>{data.length} funds</div>
		</div>

		<div class="Content">
			{#each data as fund}
				<div
					class="FundCard border-b text-sm p-1"
					onclick={async () => {
						const a = await fetch(
							`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/data/mf/web/v1/scheme/${fund.scheme_code}/graph?benchmark=false&months=1000`)}`
						);
						const data = (await a.json()).folio;
						ChartState.lineData = data.data;
						ChartState.currentScrip = data.name;
					}}
					role
				>
					<h3 class="truncate">{fund.fund_name}</h3>
					<div class="flex flex-row justify-between">
						<div class="flex flex-row items-center text-gray-600 text-sm/tight gap-1">
							<div class="flex flex-row items-center">
								<span>{fund.groww_rating}</span>
								<StarIcon />
							</div>

							<div>{Math.round(fund.aum).toLocaleString('en-IN')} Cr</div>
						</div>
						<div
							class="hover:bg-gray-200 cursor-pointer"
							onclick={(e) => {
								e.stopPropagation();
								isHoldingPage = true;
								clickedFund = fund;
							}}
							role
						>
							Open
						</div>

						<p>{fund.return1y}%</p>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="MutualFundHoldings" class:hidden={!isHoldingPage}>
		<div class="hover:bg-gray-200 cursor-pointer" onclick={() => (isHoldingPage = false)} role>
			Close
		</div>
		<div>
			<h3 class="truncate">{clickedFund?.fund_name}</h3>
			<p>{holdingsData.length} holdings</p>
		</div>

		{#each holdingsData as holding}
			<div
				class="HoldingCard border-b text-sm p-1"
				onclick={() => {
					fetchGraphData(holding.symbol);
					ChartState.currentScrip = holding.company_name;
				}}
				role
			>
				<div class="flex flex-row justify-between">
					<h3 class="truncate">{holding.symbol}</h3>
					<p>{Math.round(holding.corpus_per * 100) / 100}%</p>
				</div>

				<h3 class="truncate text-gray-600 text-sm/tight">{holding.company_name}</h3>
			</div>
		{/each}
	</div>
</div>
