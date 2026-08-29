<script>
	import dayjs from 'dayjs';
	import FlagIcon from '../Icons/FlagIcon.svelte';
	import { ChartState } from '$lib/state/ChartState.svelte';
	import { deserialize } from '$app/forms';

	/**
	 * @data = [{symbol=stock ticker, name=stock name, value = marketcap, weight etc}...]
	 */

	let { data, selectedStockId = 0 } = $props();
	let contextMenu = $state({ visible: false, x: 0, y: 0, stock: null });
	let stockColors = $derived(ChartState.flags);
	// $inspect(data);
	const colorMap = {
		red: 'rgb(255,82,82)',
		blue: 'rgb(41,121,255)',
		green: 'rgb(129,199,132)',
		orange: 'rgb(251,192,45)',
		purple: 'rgb(186,104,200)',
		cyan: 'rgb(0,229,255)',
		pink: 'rgb(244,143,177)',
		transparent: 'transparent'
	};

	const flagColors = ['red', 'blue', 'green', 'orange', 'purple', 'cyan', 'pink'];

	async function fetchGraphData(symbol) {
		const endTime = dayjs().endOf('day').valueOf();
		// let startTime = dayjs(endTime).subtract(10, 'Year').valueOf();
		let startTime = 820434600000; //01-01-1996
		ChartState.isLoading = true;
		const pastRes = fetch(
			`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/charting_service/v2/chart/delayed/exchange/NSE/segment/CASH/${symbol}?endTimeInMillis=${endTime}&intervalInMinutes=1440&startTimeInMillis=${startTime}`)}`
		)
			.then((res) => res.json())
			.then((res) => {
				return res.candles;
			});

		const latestRes = fetch(
			`/proxy?url=https://groww.in/v1/api/stocks_data/v1/tr_live_prices/exchange/NSE/segment/CASH/${symbol}/latest`
		)
			.then((x) => x.json())
			.then((data) => {
				return data;
			});

		const [pastData, latestData] = await Promise.all([pastRes, latestRes]);

		const pastLineData = pastData.map((row) => [row[0], row[4]]);
		const pastVolumeData = pastData.map((row) => [row[0], row[5]]);

		ChartState.lineData = [...pastLineData, [latestData.lastTradeTime, latestData.ltp]];
		ChartState.volumeLineData = [...pastVolumeData, [latestData.lastTradeTime, latestData.volume]];
		ChartState.isLoading = false;
	}

	async function getEarningsTrend(symbol) {
		// console.log(await nseScraper.get(symbol.split('.')[0]));
		// const [resA, resB] = await Promise.all([
		// 	fetch(
		// 		`/proxy?url=${encodeURIComponent(`https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol=NAVINFLUOR&period=Quarterly`)}`
		// 	),
		// 	fetch(
		// 		`/proxy?url=${encodeURIComponent(`https://www.nseindia.com/api/integrated-filing-results?&symbol=NAVINFLUOR&type=Integrated%20Filing-%20Financials&page=1&size=20`)}`
		// 	)
		// ]);
		// const [financialResults, integratedFiling] = await Promise.all([resA.json(), resB.json()]);
		// const x = [...integratedFiling.data, ...financialResults];
		// const y = x.filter((x) => x.xbrl.endsWith('.xml') && x.consolidated === 'Consolidated');
		// const periodEnded = y.map((x) => x.toDate || x.qe_Date);
		// const promises = y.map((x) => extractNseXbrlData(`/proxy?url=${encodeURIComponent(x.xbrl)}`));
		// const allP = await Promise.all(promises);
		// // console.log(allP);
		// const obj = allP.reduce((acc, currentDocument) => {
		// 	// Dynamically loop through every financial key present ('revenue', 'netProfit', etc.)
		// 	Object.keys(currentDocument).forEach((key) => {
		// 		if (Array.isArray(currentDocument[key])) {
		// 			const quarterlyDocument = currentDocument[key].filter(
		// 				(x) => dayjs(x.endDate).diff(x.startDate, 'day') < 100
		// 			);
		// 			acc[key] = [...(acc[key] || []), ...quarterlyDocument];
		// 		}
		// 	});
		// 	return acc;
		// }, {});
		// const ttmNetProfit = [];
		// for (let i = 0; i < obj.netProfit.length - 4; i++) {
		// 	const ttmValue = obj.netProfit.slice(i, i + 4).reduce((acc, x) => {
		// 		return acc + x.value;
		// 	}, 0);
		// 	ttmNetProfit.push({ quarterEnding: obj.netProfit[i].endDate, value: ttmValue });
		// }
		// for (let i = 1; i < ttmNetProfit.length; i++) {
		// 	const pctCh = (ttmNetProfit[i - 1].value / ttmNetProfit[i].value - 1) * 100;
		// 	console.log([ttmNetProfit[i - 1].quarterEnding, pctCh]);
		// }
		// const formData = new FormData();
		// formData.append('symbol', symbol);
		// const a = await fetch('?/getEarningsTrend', {
		// 	method: 'POST',
		// 	body: formData
		// });
		// const b = deserialize(await a.text());
		// // console.log(b);
		// const earningsTrend = b.data.earningsTrend.trend;
		// const currentYear =
		// 	Math.round(earningsTrend.find((x) => x.period === '0y').growth * 10000) / 100;
		// const nextYear = Math.round(earningsTrend.find((x) => x.period === '+1y').growth * 10000) / 100;
		// ChartState.bottomRight = { currentYear, nextYear };
	}

	async function getFinancialResults(symbol) {
		const formData = new FormData();
		formData.append('symbol', symbol);
		const response = await fetch(`?/getFinancialResults`, {
			method: 'POST',
			body: formData
		});
		const responseData = deserialize(await response.text());

		ChartState.EarningsData = responseData.data;
		console.log(responseData);
		// console.log(ChartState.histogramData);
	}

	function closeMenu() {
		contextMenu.visible = false;
	}
</script>

<svelte:window onclick={closeMenu} />

{#each data as stock, stockIndex (stockIndex)}
	<div
		role="listbox"
		tabindex={selectedStockId === stock.symbol ? 0 : -1}
		class="cursor-pointer transition-all duration-200 py-0.5 border-b border-gray-100 flex flex-row items-center group z-10 relative overflow-hidden
		{selectedStockId === stock.symbol ? 'ring-2 ring-inset rounded-md' : ''} 
		{contextMenu.visible && contextMenu.stock?.symbol === stock.symbol
			? 'bg-[rgb(187,217,251)]'
			: 'hover:bg-gray-100'}"
		oncontextmenu={(e) => {
			e.preventDefault();
			contextMenu = {
				visible: true,
				x: Math.min(e.clientX, window.innerWidth - 200),
				y: Math.min(e.clientY, window.innerHeight - 100),
				stock
			};
		}}
	>
		<!-- Flags -->
		<span
			class="group-hover:[&_svg]:text-gray-300 text-transparent transition-colors duration-150"
			onclick={async () => {
				const symbol = stock.symbol;
				const isColored = stockColors[symbol];
				const p = await fetch('/api/flags', {
					method: 'POST',
					body: JSON.stringify({
						symbol: symbol,
						color: isColored ? '' : 'green'
					})
				});
				ChartState.flags = await p.json();
			}}
			role
		>
			<FlagIcon color={colorMap[stockColors?.[stock?.symbol]] ?? 'currentColor'} />
		</span>

		<div
			class="flex-1 flex flex-col px-1 overflow-hidden"
			onclick={(e) => {
				e.stopPropagation();
				selectedStockId = stock.symbol;
				fetchGraphData(stock.symbol);
				ChartState.currentScrip = stock.name;

				// getEarningsTrend(`${stock.symbol}.NS`);
				// getFinancialResults(stock.symbol);
			}}
			role
		>
			<div class="flex justify-between">
				<span class="text-sm/tight">{stock.symbol}</span>

				<span class="text-xs/tight text-gray-500">
					{stock.value}
				</span>
			</div>

			<span class="text-xs/tight text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
				{stock.name}
			</span>
		</div>
	</div>
{/each}

<!-- /* Context Menu */ -->
{#if contextMenu.visible}
	<div
		class="fixed bg-white shadow-lg border rounded text-sm z-50 py-1"
		style="top: {contextMenu.y}px; left: {contextMenu.x}px;"
	>
		<!-- Flag/Unflag -->
		<div
			class="px-3 py-1 hover:bg-gray-100 cursor-pointer"
			onclick={async () => {
				const symbol = contextMenu.stock.symbol;
				const isColored = stockColors[symbol];
				const p = await fetch('/api/flags', {
					method: 'POST',
					body: JSON.stringify({
						symbol: symbol,
						color: isColored ? '' : 'green'
					})
				});
				ChartState.flags = await p.json();
				closeMenu();
			}}
			role
		>
			Flag/Unflag {contextMenu.stock.symbol}
		</div>

		<!-- Flag Colors -->
		<div class="flex gap-2 px-3 py-1.5 hover:bg-gray-100">
			{#each flagColors as color, i}
				<div
					class="w-4 h-4 rounded-full cursor-pointer relative group flex items-center justify-center"
					style={stockColors?.[contextMenu.stock.symbol] === color
						? `outline: 2px solid ${colorMap[color]}; outline-offset: -2px; background-color: transparent;`
						: `background-color: ${colorMap[color]};`}
					onclick={async () => {
						const symbol = contextMenu.stock.symbol;
						const isColored = stockColors[symbol];
						const p = await fetch('/api/flags', {
							method: 'POST',
							body: JSON.stringify({
								symbol: symbol,
								color: isColored ? '' : color
							})
						});
						ChartState.flags = await p.json();
						closeMenu();
					}}
					role
				>
					<div
						style={stockColors?.[contextMenu.stock.symbol] === color
							? `background-color: ${colorMap[color]}`
							: ''}
						class:bg-white={stockColors?.[contextMenu.stock.symbol] !== color}
						class:opacity-0={stockColors?.[contextMenu.stock.symbol] !== color}
						class:group-hover:opacity-60={stockColors?.[contextMenu.stock.symbol] !== color}
						class="w-2 h-2 rounded-full opacity-0 transition-opacity duration-150"
					></div>
				</div>
			{/each}
		</div>

		<!-- Add to watchlist -->
		<div
			class="px-3 py-1 hover:bg-gray-100 cursor-pointer"
			onclick={() => {
				closeMenu();
			}}
			role
		>
			Add {contextMenu.stock.symbol} to watchlist
		</div>
	</div>
{/if}
