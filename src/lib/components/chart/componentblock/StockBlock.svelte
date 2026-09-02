<script>
	import FlagIcon from '../Icons/FlagIcon.svelte';
	import { ChartState } from '$lib/state/ChartState.svelte';
	import { tick } from 'svelte';

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

	export async function loadDrawings(symbol) {
		ChartState.drawingManager.setSymbol(symbol);

		// 2. Fetch Saved Drawings from SQLite Database
		const dbResponse = await fetch(`/api/get-drawings?symbol=${symbol}`).then((res) => res.json());
		if (dbResponse && dbResponse.drawings) {
			ChartState.drawingManager.loadDrawings(dbResponse.drawings);
		}
	}

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

		const ttl = getCacheTTL();
		const latestRes = fetch(
			`/proxy?ttl=${ttl}&url=${encodeURIComponent(`https://groww.in/v1/api/stocks_data/v1/tr_live_prices/exchange/NSE/segment/CASH/${symbol}/latest`)}`
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

	let rowElements = $state([]);
	async function selectStock(stock) {
		selectedStockId = stock.symbol;

		await loadDrawings(stock.symbol);
		fetchGraphData(stock.symbol);

		ChartState.currentScrip = {
			name: stock.name,
			id: stock.symbol
		};

		await tick();

		const index = data.findIndex((s) => s.symbol === stock.symbol);
		rowElements[index]?.focus();
	}

	function closeMenu() {
		contextMenu.visible = false;
	}

	// =======================
	// CACHE LIFE
	// =======================
	import dayjs from 'dayjs';
	import timezone from 'dayjs/plugin/timezone';
	import utc from 'dayjs/plugin/utc';

	dayjs.extend(utc);
	dayjs.extend(timezone);

	function getCacheTTL() {
		const now = dayjs().tz('Asia/Kolkata');

		const isWeekday = now.day() >= 1 && now.day() <= 5;

		const open = now.hour(9).minute(15).second(0).millisecond(0);
		const close = now.hour(15).minute(30).second(0).millisecond(0);

		// NSE is open
		if (isWeekday && now >= open && now < close) {
			return 0;
		}

		// Find next weekday
		let nextOpen = open;

		if (now >= close || !isWeekday) {
			nextOpen = now.add(1, 'day').startOf('day').hour(9).minute(15);
		}

		while (nextOpen.day() === 0 || nextOpen.day() === 6) {
			nextOpen = nextOpen.add(1, 'day');
		}

		return Math.max(1, nextOpen.diff(now, 'second'));
	}
</script>

<svelte:window onclick={closeMenu} />

{#each data as stock, stockIndex (stock.symbol)}
	<div
		bind:this={rowElements[stockIndex]}
		role="listbox"
		tabindex={selectedStockId === stock.symbol ? 0 : -1}
		class="outline-none cursor-pointer transition-all duration-200 py-0.5 border-b border-gray-100 flex flex-row items-center group z-10 relative overflow-hidden
		{selectedStockId === stock.symbol ? 'ring-2 ring-inset rounded-md' : ''} 
		{contextMenu.visible && contextMenu.stock?.symbol === stock.symbol
			? 'bg-[rgb(187,217,251)]'
			: 'hover:bg-gray-100'}"
		onclick={() => selectStock(stock)}
		onkeydown={(e) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault();

				const next = data[stockIndex + 1];
				if (next) {
					selectStock(next);
				}
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();

				const previous = data[stockIndex - 1];
				if (previous) {
					selectStock(previous);
				}
			}

			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				selectStock(stock);
			}
		}}
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
			// onclick={async (e) => {
			// 	e.stopPropagation();
			// 	selectedStockId = stock.symbol;
			// 	await loadDrawings(stock.symbol);
			// 	fetchGraphData(stock.symbol);
			// 	ChartState.currentScrip = { name: stock.name, id: stock.symbol };
			// }}
			role
		>
			<div class="flex justify-between">
				<span class="text-sm/tight">{stock.symbol}</span>

				<span class={stock.valueStyle ? stock.valueStyle : 'text-xs/tight text-gray-500'}>
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
			{#each flagColors as color, i (i)}
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
