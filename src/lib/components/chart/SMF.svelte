<script>
	import { ChartState } from '$lib/state/ChartState.svelte';
	import StockBlock from './componentblock/StockBlock.svelte';

	let isLocked = $state(true);
	let isHoldingView = $state(false);
	let holdingsData = $state([]);
	let selectedRSI = $state('All');
	let clickedIndexName = $state('');

	let rsiFilteredData = $derived.by(() => {
		return holdingsData.filter((x) => {
			if (selectedRSI === '>55') {
				return x.rsi_14M > 55;
			} else if (selectedRSI === '<55') {
				return x.rsi_14M <= 55;
			} else return x;
		});
	});

	async function fetchRealtyGraphData() {
		const endTimeInMillis = Date.now();
		const startTimeInMillis = 820434600000; //01-01-1996

		const url = `https://groww.in/v1/api/charting_service/v2/chart/delayed/exchange/NSE/segment/CASH/NIFTYREALTY?endTimeInMillis=${endTimeInMillis}&intervalInMinutes=1440&startTimeInMillis=${startTimeInMillis}`;
		const res = await fetch(`/proxy?url=${encodeURIComponent(url)}`);
		const data = (await res.json()).candles;

		ChartState.lineData = data.map((x) => [x[0], x[4]]);
		ChartState.currentScrip = 'Realty Index';
	}

	function fetchBroadMarketData(obj) {
		const getGraphData = async () => {
			const url = `https://groww.in/v1/api/data/mf/web/v1/scheme/${obj.code}/graph?benchmark=false&months=1000`;
			const res = await fetch(`/proxy?url=${encodeURIComponent(url)}`);
			const data = (await res.json()).folio.data;
			ChartState.lineData = data;
			ChartState.currentScrip = obj.name;
		};

		const getHoldingData = async () => {
			const url = `https://groww.in/v1/api/data/mf/web/v6/scheme/search/${obj.id}`;
			const res = await fetch(`/proxy?url=${encodeURIComponent(url)}`);
			const data = (await res.json()).holdings;
			holdingsData = data
				.filter((item) => item.nature_name === 'EQUITY' && item.stock_search_id)
				.map((item) => ({
					...item,
					...window.StockUniverse.data.find((x) => x.stock_search_id === item.stock_search_id)
				}));
			isHoldingView = true;
			clickedIndexName = obj.name;
		};

		isLocked ? getGraphData() : getHoldingData();
	}

	const MARKETCAP = {
		MICRO: {
			code: 151814,
			id: 'motilal-oswal-nifty-microcap-250-index-fund-direct-growth',
			name: 'Motilal Microcap 250'
		},
		SMALL: {
			code: 147623,
			id: 'motilal-oswal-nifty-smallcap-250-index-fund-direct-growth',
			name: 'Motilal Smallcap 250'
		},
		MID: {
			code: 147622,
			id: 'motilal-oswal-nifty-midcap-150-index-fund-direct-growth',
			name: 'Motilal Midcap 150'
		},
		LARGE: {
			code: 147666,
			id: 'axis-nifty-100-index-fund-direct-growth',
			name: 'Axis Largecap 100'
		}
	};

	const SECTOR = {
		REALTY: {
			code: 152521,
			id: 'hdfc-nifty-realty-index-fund-direct-growth',
			name: 'HDFC Realty'
		}
	};
</script>

{#if !isHoldingView}
	<input type="checkbox" bind:checked={isLocked} class="my-2 h-4 border-b border-gray-200" />

	<button
		class="h-10 border-b cursor-pointer hover:bg-gray-100 border-gray-200"
		onclick={() => fetchBroadMarketData(MARKETCAP.MICRO)}
	>
		<span>Microcap 250</span>
	</button>
	<button
		class="h-10 border-b cursor-pointer hover:bg-gray-100 border-gray-200"
		onclick={() => fetchBroadMarketData(MARKETCAP.SMALL)}
	>
		<span>Smallcap 250</span>
	</button>
	<button
		class="h-10 border-b cursor-pointer hover:bg-gray-100 border-gray-200"
		onclick={() => fetchBroadMarketData(MARKETCAP.MID)}
	>
		<span>Midcap 150</span>
	</button>
	<button
		class="h-10 border-b cursor-pointer hover:bg-gray-100 border-gray-200"
		onclick={() => fetchBroadMarketData(MARKETCAP.LARGE)}
	>
		<span>Largecap 100</span>
	</button>

	<button
		class="h-10 border-b cursor-pointer hover:bg-gray-100 border-gray-200"
		onclick={() => (isLocked ? fetchRealtyGraphData() : fetchBroadMarketData(SECTOR.REALTY))}
	>
		<h4>Realty</h4>
	</button>
{:else}
	<label>
		<button class="bg-gray-200 w-8 h-8" onclick={() => (isHoldingView = false)}>&larr;</button>
		<select bind:value={selectedRSI}>
			<option value="All">RSI(14M)</option>
			<option value=">55">RSI &gt; 55</option>
			<option value="<55">RSI &lt; 55</option>
		</select>
		<span>{rsiFilteredData.length}</span>
	</label>

	<button class="h-10 border-b" onclick={() => {}}>
		<span>{clickedIndexName}</span>
	</button>

	<div class="Content flex-1 overflow-auto">
		<StockBlock
			data={rsiFilteredData.map((holding) => ({
				symbol: holding.symbol,
				name: holding.name,
				value: `${Math.round(holding.corpus_per * 100) / 100}%`
			}))}
		/>
	</div>
{/if}
