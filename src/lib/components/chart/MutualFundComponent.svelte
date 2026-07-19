<script>
	import { ChartState } from '$lib/state/ChartState.svelte';
	import dayjs from 'dayjs';
	import StarIcon from './Icons/StarIcon.svelte';
	import LeftArrowIcon from './Icons/LeftArrowIcon.svelte';
	import StockBlock from './componentblock/StockBlock.svelte';

	let isLocked = $state(true);
	let selectedFundType = $state('Mid Cap');
	let data = $state([]);
	let sortBy = $state('');
	let sortedData = $derived.by(() => {
		if (!data) return [];
		if (sortBy === '3m') {
			return [...data].sort((a, b) => b.return3m - a.return3m);
		} else if (sortBy === '6m') {
			return [...data].sort((a, b) => b.return6m - a.return6m);
		} else if (sortBy === '1y') {
			return [...data].sort((a, b) => b.return1y - a.return1y);
		} else if (sortBy === '3y') {
			return [...data].sort((a, b) => b.return3y - a.return3y);
		} else if (sortBy === '5y') {
			return [...data].sort((a, b) => b.return5y - a.return5y);
		} else {
			return [...data].sort((a, b) => b.aum - a.aum);
		}
	});

	// $inspect(sortedData);

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

	async function fetchGraphData(symbol) {
		const endTime = dayjs().endOf('day').valueOf();
		// let startTime = dayjs(endTime).subtract(10, 'Year').valueOf();
		let startTime = 820434600000; //01-01-1996
		ChartState.isLoading = true;
		const p = await fetch(
			`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/charting_service/v2/chart/delayed/exchange/NSE/segment/CASH/${symbol}?endTimeInMillis=${endTime}&intervalInMinutes=1440&startTimeInMillis=${startTime}`)}`
		);

		const res = await p.json();
		const data = res.candles.map((row) => [row[0], row[4]]);
		ChartState.lineData = data;
		ChartState.isLoading = false;
	}

	$effect(async () => {
		if (!selectedFundType) return;
		const a = await fetch(
			`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/search/v1/derived/scheme?available_for_investment=true&doc_type=scheme&page=0&plan_type=Direct&q=&size=200&sort_by=1&sub_category=${selectedFundType}`)}`
		);
		data = (await a.json()).content.filter((item) => !item.index);
	});

	$effect(async () => {
		if (!clickedFund) return;
		const a = await fetch(
			`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/data/mf/web/v5/scheme/search/${clickedFund.id}`)}`
		);

		clickedFundData = await a.json();
	});
</script>

<!-- Scheme List -->
<div class="ListOfSchemes h-full flex flex-col" class:hidden={isHoldingPage}>
	<div class="Filters flex flex-row items-center justify-between text-sm/tight">
		<select bind:value={selectedFundType}>
			<option value="Large Cap">Large Cap</option>
			<option value="Mid Cap">Mid Cap</option>
			<option value="Small Cap">Small Cap</option>
			<option value="Sectoral">Sectoral</option>
			<option value="Thematic">Thematic</option>
		</select>
		<div>{sortedData.length} funds</div>
		<select bind:value={sortBy}>
			<option value="">Sort</option>
			<option value="3m">3M</option>
			<option value="6m">6M</option>
			<option value="1y">1Y</option>
			<option value="3y">3Y</option>
			<option value="5y">5Y</option>
		</select>
	</div>

	<input type="checkbox" bind:checked={isLocked} />

	<div class="Content flex-1 overflow-auto">
		{#each sortedData as fund}
			<div
				class="FundCard border-b border-gray-200 text-sm p-1 group relative hover:bg-gray-100 cursor-pointer"
				onclick={async () => {
					if (isLocked) {
						ChartState.isLoading = true;
						const a = await fetch(
							`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/data/mf/web/v1/scheme/${fund.scheme_code}/graph?benchmark=false&months=1000`)}`
						);
						const data = (await a.json()).folio;
						ChartState.lineData = data.data;
						ChartState.currentScrip = data.name;
						ChartState.isLoading = false;
					} else {
						isHoldingPage = true;
						clickedFund = fund;
					}
				}}
				role
			>
				<h3 class="truncate">{fund.fund_name}</h3>
				<div class="grid grid-cols-4 gap-2 items-center text-xs/tight text-gray-500">
					<div class="col-start-1 flex flex-row">
						{#if fund.groww_rating}
							{fund.groww_rating} <StarIcon width="14" height="14" />
						{/if}
					</div>

					<div class="col-start-2 col-span-2">
						{Math.round(fund.aum).toLocaleString('en-IN')} Cr
					</div>
					<div class="col-start-4">
						{#if sortBy === ''}
							<p>{fund.return1y}%</p>
						{:else if fund['return' + sortBy]}
							<p>{fund['return' + sortBy]}%</p>
						{/if}
					</div>
				</div>

				<button
					class="bg-gray-300 cursor-pointer rotate-180 hidden group-hover:block absolute top-1 right-1 rounded-full"
					onclick={(e) => {
						e.stopPropagation();
						isHoldingPage = true;
						clickedFund = fund;
					}}
				>
					<LeftArrowIcon width="18" height="18" />
				</button>
			</div>
		{/each}
	</div>
</div>

<!-- Holding Details -->
<div class="SchemeHoldings h-full flex flex-col" class:hidden={!isHoldingPage}>
	<div class="Heading flex flex-row items-start">
		<button class="cursor-pointer" onclick={() => (isHoldingPage = false)}>
			<LeftArrowIcon width="24" height="24" />
		</button>
		<div
			class="text-sm/tight ml-2 truncate"
			role
			onclick={async () => {
				ChartState.isLoading = true;
				const a = await fetch(
					`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/data/mf/web/v1/scheme/${clickedFund.scheme_code}/graph?benchmark=false&months=1000`)}`
				);
				const data = (await a.json()).folio;
				ChartState.lineData = data.data;
				ChartState.currentScrip = data.name;
				ChartState.isLoading = false;
			}}
		>
			<h3 class="truncate">{clickedFund?.fund_name}</h3>
			<div>{holdingsData.length} holdings</div>
		</div>
	</div>

	<div class="Content flex-1 overflow-auto">
		<!-- {#each holdingsData as holding}
			<div
				class="HoldingCard border-b border-gray-300 text-xs/tight p-1"
				onclick={() => {
					fetchGraphData(holding.symbol);
					ChartState.currentScrip = holding.company_name;
				}}
				role
			>
				<div class="flex flex-row justify-between">
					<h3 class="truncate">{holding.symbol}</h3>
					{#if holding.corpus_per}
						<p>{Math.round(holding.corpus_per * 100) / 100}%</p>
					{/if}
				</div>

				<h3 class="truncate text-gray-600 text-sm/tight">{holding.company_name}</h3>
			</div>
		{/each} -->
		<StockBlock
			data={holdingsData.map((holding) => ({
				symbol: holding.symbol,
				name: holding.company_name,
				value: `${Math.round(holding.corpus_per * 100) / 100}%`
			}))}
		/>
	</div>
</div>
