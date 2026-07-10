<script>
	import { onMount } from 'svelte';
	import dayjs from 'dayjs';
	import StockBlock from './componentblock/StockBlock.svelte';

	let data = $state({});
	let selectedStockId = $state('');
	let sector = $state('');
	let industry = $state('');
	let rsi = $state('up');

	let sectorList = $derived(Array.from(new Set((data.data ?? []).map((row) => row.sector))));
	let industryList = $derived(
		Array.from(
			new Set((data.data ?? []).filter((row) => row.sector === sector).map((row) => row.industry))
		)
	);

	let filteredStockList = $derived(
		(data.data ?? []).filter(
			(row) =>
				(!sector || row.sector === sector) &&
				(!industry || row.industry === industry) &&
				(!rsi ||
					(rsi === 'up' && row.rsi14_monthly > 60) ||
					(rsi === 'down' && row.rsi14_monthly < 55) ||
					(rsi === 'c' && row.rsi14_monthly > 70) ||
					(rsi === 'b' && row.rsi14_monthly <= 70 && row.rsi14_monthly > 65) ||
					(rsi === 'a' && row.rsi14_monthly <= 65 && row.rsi14_monthly > 60) ||
					(rsi === 'a-' && row.rsi14_monthly <= 60 && row.rsi14_monthly > 55) ||
					(rsi === 'x' && row.rsi14_monthly <= 55 && row.rsi14_monthly > 50) ||
					(rsi === 'y' && row.rsi14_monthly <= 50 && row.rsi14_monthly > 45) ||
					(rsi === 'z' && row.rsi14_monthly <= 45))
		)
	);

	onMount(async () => {
		const p = await fetch('/api/stock-universe');
		data = await p.json();
	});

	async function RefreshStockUniverse() {
		const p = await fetch('/api/stock-universe/update', { method: 'POST' });
		data = await p.json();
	}
</script>

<div class="p-1 w-full overflow-hidden">
	<h1>StocksAnalysisComponent</h1>
	<button
		onclick={() => RefreshStockUniverse()}
		class="border border-gray-200 rounded px-2 active:bg-gray-200 hover:bg-gray-100"
	>
		Update
	</button>
	<span>{dayjs(data.meta?.updatedAt).format('DD-MMM-YYYY')}</span>
	<span>{filteredStockList.length}</span>

	<div class="FiltersContainer">
		<!-- Sector Filter -->
		<select
			name="sector"
			class="w-48 truncate border border-gray-200 rounded px-2"
			bind:value={sector}
			onchange={(e) => {
				sector = e.target.value;
				industry = '';
			}}
		>
			<option value={''} class="w-48"> Sector </option>
			{#each sectorList as sectorName (sectorName)}
				<option value={sectorName} class="w-48">
					{sectorName}
				</option>
			{/each}
		</select>

		<!-- Industry Filter -->
		<select
			name="industry"
			class="w-48 truncate border border-gray-200 rounded px-2"
			bind:value={industry}
		>
			<option value={''} class="w-48"> Industry </option>
			{#each industryList as industryName (industryName)}
				<option value={industryName} class="w-48">
					{industryName}
				</option>
			{/each}
		</select>

		<!-- RSI Filter -->
		<select name="rsi" class="w-48 truncate border border-gray-200 rounded px-2" bind:value={rsi}>
			<option value={''} class="w-48"> RSI(14M) </option>
			<option value={'up'}>{'RSI >60'}</option>
			<option value={'down'}>{'RSI <55'}</option>
			<option value={'c'}>{'RSI 100-70) C'}</option>
			<option value={'b'}>{'RSI (65-70] B'}</option>
			<option value={'a'}>{'RSI (60-65] A'}</option>
			<option value={'a-'}>{'RSI (55-60] A-'}</option>
			<option value={'x'}>{'RSI (50-55] X'}</option>
			<option value={'y'}>{'RSI (45-50] Y'}</option>
			<option value={'z'}>{'RSI [ 0-45] Z'}</option>
		</select>
	</div>
</div>

<div class="overflow-auto flex-1">
	<StockBlock
		data={filteredStockList.map((x) => ({
			symbol: x.symbol,
			name: x.name,
			value: `${Math.round(x.marketcap / 10000000).toLocaleString('en-IN')} Cr`
		}))}
		{selectedStockId}
	/>
</div>
