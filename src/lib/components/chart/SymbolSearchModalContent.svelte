<script>
	import SearchIcon from './Icons/SearchIcon.svelte';
	import CloseIconFilled from './Icons/CloseIconFilled.svelte';
	import { ChartState } from '$lib/state/ChartState.svelte';
	import dayjs from 'dayjs';
	import { npsSchemeList } from '$lib/files/npsSchemeList';

	const Type = {
		Stock: 1,
		MF: 2,
		ETF: 3,
		Inedx: 4,
		Nps: 5,
		Global: 6
	};
	const Source = {
		Groww: 1,
		Dhan: 2,
		NpsTrust: 3,
		YahooFinance: 4
	};

	let searchInput = $state('');
	let type = $state(Type.Stock);
	let source = $state(Source.Dhan);
	let searchResult = $state([]);

	let inputElement;

	function clearSearch() {
		searchInput = '';
		searchResult = [];

		requestAnimationFrame(() => {
			inputElement?.focus();
		});
	}

	let controller;
	$effect(() => {
		source; // make source a dependancy
		type; //make type a dependancy
		const q = searchInput.trim();
		if (!q) return;
		const t = setTimeout(() => {
			// cancel previous request (if still running)
			controller?.abort();
			controller = new AbortController();
			// run search / fetch here directly
			search(q, controller.signal);
		}, 500);

		return () => {
			clearTimeout(t);
			controller?.abort();
		};
	});

	async function search(debouncedQuery, signal) {
		try {
			if (source === Source.Dhan) {
				const res = await fetch(
					'https://openweb-search.dhan.co/Search/category',
					{
						method: 'POST',
						body: JSON.stringify({
							Data: {
								searchterm: debouncedQuery,
								inst:
									type === Type.Stock
										? 'E'
										: type === Type.MF
											? 'MF'
											: type === Type.Index
												? 'I'
												: 'ETF',
								optionflag: false
							}
						})
					},
					signal
				);
				const data = (await res.json()).data;

				if (type === Type.Stock) {
					const seen = new Set();
					searchResult = data.filter((row) => {
						if (row.Series_s !== 'EQ') return false;
						if (seen.has(row.CompName_t)) return false;

						seen.add(row.CompName_t);
						return true;
					});
				} else {
					searchResult = data;
				}
			} else if (source === Source.NpsTrust) {
				const filteredData = npsSchemeList.filter((obj) =>
					new RegExp(debouncedQuery, 'i').test(obj.schemename)
				);
				searchResult = filteredData;
			} else if (source === Source.YahooFinance) {
				const res = await fetch(
					'/proxy?url=' +
						encodeURIComponent(
							'https://query1.finance.yahoo.com/v1/finance/search?q=' + debouncedQuery
						)
				);
				searchResult = (await res.json()).quotes;
			}
		} catch (err) {
			if (err.name === 'AbortError') return; // expected
			console.error('Error at SymbolSearchModalContent.svelte', err);
		}
	}

	// $inspect(searchResult);

	async function fetchLineData(params) {
		ChartState.isLoading = true;

		if (source === Source.Dhan && type === Type.Stock) {
			await loadDrawings(params.Sym_t);
		}

		if (
			source === Source.Dhan &&
			(type === Type.Stock || type === Type.ETF || type === Type.Index)
		) {
			const dayEnd = dayjs().endOf('day').unix();

			const getDataH = await fetch(
				`/proxy?url=${encodeURIComponent('https://openweb-ticks.dhan.co/getDataH')}`,
				{
					method: 'POST',
					body: JSON.stringify({
						END: dayEnd,
						END_TIME: dayjs.unix(dayEnd).toDate().toUTCString(),
						EXCH: params._Exch_s,
						EXPCODE: 0,
						INST: params.Inst_s,
						INTERVAL: 'D',
						SEC_ID: parseInt(params.Sid_s),
						SEG: params.Seg_s,
						START: 214684200,
						START_TIME: 'Wed, 20 Oct 1976 18:30:00 GMT',
						SYM: params.Sym_t
					})
				}
			);

			const DataH = await getDataH.json();

			let { t: timestamp, c: close } = DataH.data;

			ChartState.lineData = timestamp.map((_, i) => [timestamp[i], close[i]]);
			ChartState.currentScrip = params.CompName_t;
		} else if (source === Source.Dhan && type === Type.MF) {
			const a = await fetch('/proxy?url=https://mf-openweb-search.dhan.co/chart', {
				method: 'POST',
				body: JSON.stringify({
					aes_key: '',
					entity_id: 'Openweb',
					ip: '',
					source: 'W',
					data: {
						client_id: '',
						end_date: '',
						period: 'max',
						sCode: params.dmfm_cmots_scheme_code || params.dhan_code,
						start_date: ''
					}
				})
			});
			let { d: date, n: nav } = (await a.json()).data[0];
			ChartState.lineData = date.map((_, i) => [new Date(date[i]).getTime(), nav[i]]);
			ChartState.currentScrip = params.dmfm_custom_scheme_name;
		} else if (source === Source.NpsTrust && type === Type.Nps) {
			fetch(
				`/proxy?url=${encodeURIComponent(`https://npstrust.org.in/nav-graphs-details?lnavdata=${params.pfmcode}&yearval=all&subcat=${params.schemecode}&vaname=${params.pfmname}`)}`
			)
				.then((response) => {
					if (!response.ok) {
						throw new Error('Network response was not ok ' + response.statusText);
					}
					return response.json();
				})
				.then((json) => {
					ChartState.lineData = json.data.map((x) => [x[0], x[1]]);
					ChartState.currentScrip = params.schemename;
				})
				.catch((error) => {
					console.error('Fetch error at NPS section at SymbolSearchModalContent.svelte', error);
				});
		} else if (source === Source.NseIndia && type === Type.Index) {
			const splitDateRange = (from, to, maxDays = 100) => {
				const ranges = [];
				let start = dayjs(from, 'DD-MM-YYYY');
				const end = dayjs(to, 'DD-MM-YYYY');

				while (start.isBefore(end)) {
					let chunkEnd = start.add(maxDays, 'day');
					if (chunkEnd.isAfter(end)) {
						chunkEnd = end;
					}

					ranges.push({
						from: start.format('DD-MM-YYYY'),
						to: chunkEnd.format('DD-MM-YYYY')
					});

					start = chunkEnd.add(1, 'day');
				}

				return ranges;
			};

			const fetchChunk = async (range) => {
				const response = await fetch(
					`/proxy?url=${encodeURIComponent(`https://www.nseindia.com/api/historicalOR/indicesHistory?indexType=${params.indexType}&from=${range.from}&to=${range.to}`)}`,
					{
						headers: {
							Accept: 'application/json, text/javascript, */*; q=0.01',
							Referer: 'https://www.niftyindices.com/reports/historical-data',
							'X-Requested-With': 'XMLHttpRequest',
							'User-Agent': 'Mozilla/5.0'
						}
					}
				);

				if (!response.ok) {
					throw new Error('Network response was not ok ' + response.statusText);
				}

				const json = await response.json();
				return json.data || [];
			};

			const fetchHistoricalData = async () => {
				try {
					let mergedData;
					const to = dayjs().endOf('day');
					const from = to.subtract(5, 'year');
					const ranges = splitDateRange(from, to);
					// Parallel requests
					const results = await Promise.all(ranges.map((range) => fetchChunk(range)));

					mergedData = results.flat();

					if (!mergedData?.length) return;

					mergedData = mergedData.sort(
						(a, b) => dayjs(a.EOD_TIMESTAMP).valueOf() - dayjs(b.EOD_TIMESTAMP).valueOf()
					);

					ChartState.lineData = mergedData.map((item) => [
						dayjs(item.EOD_TIMESTAMP).valueOf(),
						item.EOD_CLOSE_INDEX_VAL
					]);
				} catch (error) {
					console.error('Fetch error at NseIndex at SymbolSearchModalContent.svelte:', error);
				}
			};

			fetchHistoricalData();
		} else if (source === Source.NiftyIndices && type === Type.Index) {
			const now = new Date();
			fetch(
				'/proxy?url=https://www.niftyindices.com/Backpage.aspx/getHistoricaldatatabletoString',
				{
					method: 'POST',
					body: JSON.stringify({
						cinfo:
							"{'name':'NIFTY CHEMICALS','startDate':'01-Apr-2025','endDate':'16-Feb-2026','indexName':'NIFTY CHEMICALS'}"
					}),
					headers: {
						'Content-Type': 'application/json; charset=utf-8',
						Accept: 'application/json, text/javascript, */*; q=0.01',
						Referer: 'https://www.niftyindices.com/reports/historical-data',
						'X-Requested-With': 'XMLHttpRequest',
						'User-Agent':
							'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
					}
				}
			)
				.then((response) => {
					if (!response.ok) {
						throw new Error('Network response was not ok ' + response.statusText);
					}
					return response.json();
				})
				.then((json) => {
					json = JSON.parse(json.d);
					// console.log(json);
					ChartState.lineData = json.map((item, _) => [item.timestamp, item.close]);
					// console.log(chartData);
				})
				.catch((error) => {
					console.error('Fetch error at NiftyIndices:', error);
				});
		} else if (source === Source.YahooFinance && type === Type.Global) {
			const dayEnd = dayjs().endOf('day').unix();
			const getDayOHLC = await fetch(
				`/proxy?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${params.symbol}?period1=1356978600&period2=${dayEnd}&interval=1d`)}`
			);
			const res = await getDayOHLC.json();
			const { timestamp, meta, indicators } = res.chart.result[0];
			let { close } = indicators.quote[0];
			ChartState.lineData = timestamp.map((_, i) => [timestamp[i], close[i]]);
			ChartState.currentScrip = params.longname;
		}

		ChartState.isLoading = false;
	}

	async function loadDrawings(symbol) {
		ChartState.drawingManager.setSymbol(symbol);

		// 2. Fetch Saved Drawings from SQLite Database
		const dbResponse = await fetch(`/api/get-drawings?symbol=${symbol}`).then((res) => res.json());
		if (dbResponse && dbResponse.drawings) {
			ChartState.drawingManager.loadDrawings(dbResponse.drawings);
		}
	}
</script>

<div class="inputContainer border border-gray-200 rounded p-1 flex flex-row items-center">
	<span class="shrink-0"><SearchIcon /></span>
	<input
		bind:this={inputElement}
		bind:value={searchInput}
		class="W-Flex-1 flex-1 focus:outline-0 px-1"
		placeholder="Symbol"
	/>
	{#if searchInput}
		<button class="hover:bg-gray-200 rounded p-1" onclick={clearSearch}><CloseIconFilled /></button>
	{/if}
</div>

<div class="spacer h-2"></div>

<div class="typeContainer flex-row gap-2">
	<button
		onclick={() => {
			type = Type.Stock;
			source = Source.Dhan;
		}}
		class={`${type === Type.Stock ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}  px-3 py-0.5 rounded-2xl`}
		>Stock</button
	>
	<button
		onclick={() => {
			type = Type.MF;
			source = Source.Dhan;
		}}
		class={`${type === Type.MF ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}  px-3 py-0.5 rounded-2xl`}
		>MF</button
	>
	<button
		onclick={() => {
			type = Type.ETF;
			source = Source.Dhan;
		}}
		class={`${type === Type.ETF ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}  px-3 py-0.5 rounded-2xl`}
		>ETF</button
	>
	<button
		onclick={() => {
			type = Type.Index;
			source = Source.Dhan;
		}}
		class={`${type === Type.Index ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}  px-3 py-0.5 rounded-2xl`}
		>Index</button
	>
	<button
		onclick={() => {
			type = Type.Nps;
			source = Source.NpsTrust;
		}}
		class={`${type === Type.Nps ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}  px-3 py-0.5 rounded-2xl`}
		>NPS</button
	>
	<button
		onclick={() => {
			type = Type.Global;
			source = Source.YahooFinance;
		}}
		class={`${type === Type.Global ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}  px-3 py-0.5 rounded-2xl`}
		>Global</button
	>
</div>

<div class="spacer h-2"></div>

<div class="searchResultContainer flex-1 overflow-auto">
	<div>
		{#each searchResult as row, index}
			<div
				class="flex flex-row gap-4 border-b border-gray-200 hover:bg-gray-200 h-10 items-center"
				onclick={() => {
					ChartState.activeModal = null;
					fetchLineData(row);
				}}
				onkeydown={() => {}}
				role="button"
				tabindex="0"
			>
				{#if type === Type.Stock}
					<div class="symbol flex-1">{row.Sym_t}</div>
					<div class="name flex-2">{row.disp_sym_s}</div>
					<div class="exchange flex-1 flex flex-row items-center justify-end gap-1">
						<span class="text-[#707070] text-sm">{row.disp_inst_s?.toLowerCase()}</span>
						<span>{row.d_exch}</span>
						<img
							src={`https://s3-symbol-logo.tradingview.com/source/${row.d_exch}.svg`}
							class="rounded-full"
							alt="logo"
						/>
					</div>
				{:else if type === Type.MF}
					<div class="symbol flex-1">{row.dmfm_isin_code}</div>
					<div class="name flex-2">{row.dmfm_custom_scheme_name}</div>
				{:else if type === Type.ETF}
					<div class="symbol flex-1">{row.Sym_t}</div>
					<div class="name flex-2">{row.disp_sym_s}</div>
					<div class="exchange flex-1 flex flex-row items-center justify-end gap-1">
						<span>ETF</span>
					</div>
				{:else if type === Type.Index}
					<div class="symbol flex-1">{row.Sym_t}</div>
					<div class="name flex-2">{row.disp_sym_s}</div>
					<div class="exchange flex-1 flex flex-row items-center justify-end gap-1">
						<span>Index</span>
					</div>
				{:else if type === Type.Nps}
					<div class="symbol flex-1">{row.schemecode}</div>
					<div class="name flex-2">{row.schemename}</div>
					<div class="exchange flex-1 flex flex-row items-center justify-end gap-1">
						<span>NPS</span>
					</div>
				{:else if type === Type.Global}
					<div class="symbol flex-1">{row.symbol}</div>
					<div class="name flex-2 truncate">{row.longname ?? row.shortname}</div>
					<div class="type w-16">{row.typeDisp}</div>
					<div class="type flex-1 truncate text-right">{row.exchDisp}</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
