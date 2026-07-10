<script>
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import * as XLSX from 'xlsx';
	import Pie from './Pie.svelte';
	import dayjs from 'dayjs';
	import { autofocus } from './temp';
	// 1. Accept server reactive bounds safely
	let { data } = $props();

	const initialView = browser ? localStorage.getItem('lastview') : null;
	let view = $state(initialView || 'holding');

	let inputElements = {};
	let textareaElement;

	$effect(() => {
		// This automatically runs whenever the 'view' variable changes
		localStorage.setItem('lastview', view);
	});

	// if (browser) $inspect(data);

	// 2. Initialize an empty local reactive state shell
	let localRows = $state({ nps: {}, midcap: {}, smallcap: {}, direct: {} });
	let textareaString = $derived(JSON.stringify(localRows.direct.holding, null, 2));

	// 3. Keep localRows in perfect alignment whenever server `data` changes
	$effect(async () => {
		const navData = await fetchNAVData();
		localRows = {
			nps: { ...data.nps, ...navData.nps },
			midcap: { ...data.midcap, ...navData.midcap },
			smallcap: { ...data.smallcap, ...navData.smallcap },
			direct: { ...data.direct },
			amfi: { ...data.amfi },
			my_holding: { ...data.my_holding }
		};
		const my_holding = getMyHoldings($state.snapshot(localRows));
		localRows.my_holding = { ...localRows.my_holding, ...my_holding };
	});
	if (browser) $inspect(localRows);

	let fetchedJson = $state({ asOn: '', holdings: [], key: '', scrip: '' });
	let editingIndex = $state(null);

	async function saveUnit(key, unitValue) {
		const formData = new FormData();
		formData.append('key', key);
		formData.append('unit', unitValue || 0);

		const response = await fetch('?/saveUnit', {
			method: 'POST',
			body: formData
		});

		const result = deserialize(await response.text());

		if (result.type === 'success') {
			await invalidateAll();
		} else {
			alert('Failed to save changes to the database.');
		}
	}

	async function handleWindowClick(event) {
		if (editingIndex === null) return;

		const target = event.target;
		const currentKey = editingIndex;

		const activeElement = currentKey === 'direct' ? textareaElement : inputElements[currentKey];

		if (target !== activeElement) {
			editingIndex = null;
			if (currentKey === 'direct') {
				localRows.direct.holding = JSON.parse(textareaString);
				await saveHolding(
					currentKey,
					JSON.stringify(localRows[currentKey].holding),
					dayjs().format('DD-MMM-YYYY')
				);
			} else {
				await saveUnit(currentKey, localRows[currentKey].unit);
			}
		}
	}

	async function handleFetchBtnClick(key) {
		try {
			if (key === 'nps') {
				const a = await fetch(
					`/proxy?url=${encodeURIComponent(`https://api.icicipension.in/get_check/portfolio/${dayjs().subtract(1, 'M').format('MMM').toLocaleLowerCase()}/${dayjs().format('YYYY')}`)}`
				);
				const b = await a.json();
				if (b) {
					const c = b.data[0].attributes.Scheme_Details.data.attributes.hash;
					const buffer = await fetch(`/proxy?url=https://media.icicipension.in/${c}.xls`, {
						headers: {
							'user-agent':
								'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
							accept: '*/*'
						}
					}).then((x) => x.arrayBuffer());
					const workbook = XLSX.read(buffer, { type: 'array' });
					const worksheet = workbook.Sheets['Scheme E - Tier l'];

					const dated = dayjs(worksheet.B3?.w).format('DD-MMM-YYYY') ?? 'N/A';
					const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 5 });

					let accept = false;
					const d = jsonData
						.map((row) => {
							if (row.Particulars === 'Subtotal') accept = false;
							if (row.Particulars === 'Shares') {
								accept = true;
								return false;
							}
							if (accept && row.Particulars) {
								return {
									Scrip: row.Particulars,
									ISIN: row['ISIN No.'],
									HoldingPct: parseFloat(row['% of Portfolio']) * 100
								};
							}
							return false;
						})
						.filter(Boolean);

					fetchedJson = { asOn: dated, holdings: d, key: key, scrip: localRows[key].name };
				}
			} else if (key === 'midcap' || key === 'smallcap') {
				const isin = key === 'midcap' ? 'INF843K01AO4' : 'INF194KB1AL4';
				const a = await fetch('/proxy?url=https://mf-openweb-search.dhan.co/SectorAllocation', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						entity_id: 'DhanWeb',
						source: 'W',
						token_id: '9c5688945773312281d7',
						data: { scheme_isin: isin }
					})
				}).then((x) => x.json());

				if (a.status === 'success' && a.data?.length > 0) {
					const dated = dayjs(a.data[0].pmd_portfolio_date).format('DD-MMM-YYYY');
					const b = a.data
						.sort((m, n) => parseFloat(n.pmd_weighting) - parseFloat(m.pmd_weighting))
						.map((row) => {
							if (row.pmd_holdingtype !== 'E' || row.pmd_weighting === '0') return false;
							return {
								Scrip: row.pmd_name,
								ISIN: row.pmd_isin,
								HoldingPct: parseFloat(row.pmd_weighting)
							};
						})
						.filter(Boolean);

					fetchedJson = { asOn: dated, holdings: b, key: key, scrip: localRows[key].name };
				}
			}
		} catch (err) {
			console.error('Error fetching composition data:', err);
			alert('Failed to load portfolio breakdown.');
		}
	}

	async function saveHolding(key, holding, holding_date) {
		const formData = new FormData();
		formData.append('key', key);
		formData.append('holding', holding);
		formData.append('holding_date', holding_date);

		const response = await fetch('?/saveHolding', {
			method: 'POST',
			body: formData
		});

		const result = deserialize(await response.text());

		if (result.type === 'success') {
			await invalidateAll();
		} else {
			alert('Failed to save changes to the database.');
		}
	}

	async function fetchNAVData() {
		const [npsResponse, midcapResponse, smallcapResponse] = await Promise.all([
			fetch('/proxy?url=https://api.icicipension.in/latestnav', {
				headers: { authorization: 'Bearer e07nxj3145bapcxg' }
			}),
			fetch(
				`/proxy?url=${encodeURIComponent('https://www.amfiindia.com/api/latest-nav?type=&mfid=47&category=Equity%20Scheme%20-%20Mid%20Cap%20Fund&search=growth')}`
			),
			fetch(
				`/proxy?url=${encodeURIComponent('https://www.amfiindia.com/api/latest-nav?type=&mfid=48&category=Equity%20Scheme%20-%20Small%20Cap%20Fund&search=growth')}`
			)
		]);

		const failures = [];
		if (!npsResponse.ok) failures.push(`NPS (${npsResponse.status})`);
		if (!midcapResponse.ok) failures.push(`Midcap (${midcapResponse.status})`);
		if (!smallcapResponse.ok) failures.push(`Smallcap (${smallcapResponse.status})`);

		if (failures.length > 0) {
			throw new Error(`API fetch failed for: ${failures.join(', ')}`);
		}

		const [npsRaw, midcapRaw, smallcapRaw] = await Promise.all([
			npsResponse.json().catch(() => ({})), // returns {} on JSON failure
			midcapResponse.json().catch(() => ({})),
			smallcapResponse.json().catch(() => ({}))
		]);

		const npsData = npsRaw?.government;
		const midcapData = midcapRaw?.data?.[0]?.categories?.[0]?.groups?.[0]?.schemes?.find(
			(x) => x.schemeId === '140228'
		);
		const smallcapData = smallcapRaw?.data?.[0]?.categories?.[0]?.groups?.[0]?.schemes?.find(
			(x) => x.schemeId === '147946'
		);

		return {
			nps: {
				nav: parseFloat(npsData?.tier1_e_gov),
				nav_date: dayjs(npsData?.government?.date).format('DD-MMM-YYYY')
			},
			midcap: {
				nav: parseFloat(midcapData?.netAssetValue),
				nav_date: dayjs(midcapData?.date).format('DD-MMM-YYYY')
			},
			smallcap: {
				nav: parseFloat(smallcapData?.netAssetValue),
				nav_date: dayjs(smallcapData?.date).format('DD-MMM-YYYY')
			}
		};
	}

	function getMyHoldings(localRows) {
		// console.log(localRows);
		const isinSet = [
			...new Set([
				...localRows.nps.holding.map((x) => x.ISIN),
				...localRows.midcap.holding.map((x) => x.ISIN),
				...localRows.smallcap.holding.map((x) => x.ISIN),
				...localRows.direct.holding.map((x) => x.ISIN)
			])
		];

		const npsHoldingMap = new Map(localRows.nps.holding.map((x) => [x.ISIN, x]));
		const midcapHoldingMap = new Map(localRows.midcap.holding.map((x) => [x.ISIN, x]));
		const smallcapHoldingMap = new Map(localRows.smallcap.holding.map((x) => [x.ISIN, x]));
		const directHoldingMap = new Map(localRows.direct.holding.map((x) => [x.ISIN, x]));
		const amfiMarketcapMap = new Map(localRows.amfi.holding.map((x) => [x.ISIN, x]));

		const totalDirectHolding = localRows.direct.holding.reduce((acc, row) => {
			acc += row.unit * row.nav;
			return acc;
		}, 0);

		const totalHolding =
			totalDirectHolding +
			localRows.nps.nav * localRows.nps.unit +
			localRows.midcap.nav * localRows.midcap.unit +
			localRows.smallcap.nav * localRows.smallcap.unit;

		const my_holding = isinSet
			.map((isin) => {
				const Scrip =
					npsHoldingMap.get(isin)?.Scrip ??
					midcapHoldingMap.get(isin)?.Scrip ??
					smallcapHoldingMap.get(isin)?.Scrip ??
					directHoldingMap.get(isin).Scrip;

				const ISIN = isin;
				const HoldingAmt =
					(npsHoldingMap.get(isin)
						? (npsHoldingMap.get(isin).HoldingPct * localRows.nps.nav * localRows.nps.unit) / 100
						: 0) +
					(midcapHoldingMap.get(isin)
						? (midcapHoldingMap.get(isin).HoldingPct *
								localRows.midcap.nav *
								localRows.midcap.unit) /
							100
						: 0) +
					(smallcapHoldingMap.get(isin)
						? (smallcapHoldingMap.get(isin).HoldingPct *
								localRows.smallcap.nav *
								localRows.smallcap.unit) /
							100
						: 0) +
					(directHoldingMap.get(isin)
						? directHoldingMap.get(isin).unit * directHoldingMap.get(isin).nav
						: 0);

				const HoldingPct = (HoldingAmt * 100) / totalHolding;

				const hasIn =
					(npsHoldingMap.get(isin)
						? `NPS (${Math.round((npsHoldingMap.get(isin).HoldingPct * localRows.nps.nav * localRows.nps.unit) / 100).toLocaleString('en-IN')}), `
						: '') +
					(midcapHoldingMap.get(isin)
						? `Mid Cap (${Math.round((midcapHoldingMap.get(isin).HoldingPct * localRows.midcap.nav * localRows.midcap.unit) / 100).toLocaleString('en-IN')}), `
						: '') +
					(smallcapHoldingMap.get(isin)
						? `Small Cap (${Math.round((smallcapHoldingMap.get(isin).HoldingPct * localRows.smallcap.nav * localRows.smallcap.unit) / 100).toLocaleString('en-IN')}),`
						: '') +
					(directHoldingMap.get(isin)
						? `Direct (${Math.round(directHoldingMap.get(isin).unit * directHoldingMap.get(isin).nav).toLocaleString('en-IN')}),`
						: '');

				return {
					Scrip,
					ISIN,
					symbol: amfiMarketcapMap.get(isin)?.symbol,
					HoldingAmt_num: Math.round(HoldingAmt),
					HoldingAmt: Math.round(HoldingAmt).toLocaleString('en-IN'),
					HoldingPct_num: HoldingPct,
					HoldingPct: HoldingPct.toFixed(2),
					hasIn
				};
			})
			.sort((a, b) => b.HoldingPct - a.HoldingPct);

		const marketcap_weight = {
			large_amt: 0,
			large_pct: 0,
			mid_amt: 0,
			mid_pct: 0,
			small_amt: 0,
			small_pct: 0,
			other_amt: 0,
			other_pct: 0
		};
		my_holding.map((row) => {
			const isin = row.ISIN;
			if (amfiMarketcapMap.get(isin)) {
				const mcap = amfiMarketcapMap.get(isin).Marketcap;
				if (mcap === 'Large Cap') {
					marketcap_weight.large_amt += row.HoldingAmt_num;
					marketcap_weight.large_pct += row.HoldingPct_num;
				} else if (mcap === 'Mid Cap') {
					marketcap_weight.mid_amt += row.HoldingAmt_num;
					marketcap_weight.mid_pct += row.HoldingPct_num;
				} else if (mcap === 'Small Cap') {
					marketcap_weight.small_amt += row.HoldingAmt_num;
					marketcap_weight.small_pct += row.HoldingPct_num;
				} else {
					marketcap_weight.other_amt += row.HoldingAmt_num;
					marketcap_weight.other_pct += row.HoldingPct_num;
				}
			} else {
				marketcap_weight.other_amt += row.HoldingAmt_num;
				marketcap_weight.other_pct += row.HoldingPct_num;
			}
		});

		return { holding: my_holding, marketcap_weight };
	}

	async function mapMarketcap() {
		const buffer = await fetch(
			`/proxy?url=https://portal.amfiindia.com/spages/AverageMarketCapitalization30Jun2026.xlsx`
		).then((x) => x.arrayBuffer());

		const workbook = XLSX.read(buffer, { type: 'array' });
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const json = XLSX.utils
			.sheet_to_json(sheet, { range: 1 })
			.slice(0, 2000)
			.map((row) => {
				return {
					Scrip: row['Company name'],
					ISIN: row['ISIN'],
					symbol: row['NSE Symbol'] === '-' ? row['BSE Symbol'] : row['NSE Symbol'],
					Marketcap: row['Categorization as per SEBI Circular dated Oct 6, 2017']
				};
			});
		console.log(json);
		fetchedJson = {
			asOn: dayjs().format('DD-MMM-YYYY'),
			holdings: json,
			key: 'amfi',
			scrip: 'Marketcap Map'
		};
	}
</script>

<svelte:window onclickcapture={handleWindowClick} />

<div class="p-1 max-w-7xl mx-auto">
	<table
		class="w-full text-left border-collapse border border-gray-200 shadow-sm rounded-lg overflow-hidden"
	>
		<thead>
			<tr class="bg-gray-100 text-gray-700 font-semibold text-sm">
				<th class="p-1 border border-gray-200">Name</th>
				<th class="p-1 border border-gray-200">Unit</th>
				<th class="p-1 border border-gray-200">NAV</th>
				<th class="p-1 border border-gray-200">Market Value</th>
				<th class="p-1 border border-gray-200">Action</th>
			</tr>
		</thead>
		<tbody>
			{#snippet tableRow(key)}
				{@const row = localRows[key]}
				<tr class="hover:bg-gray-50 transition-colors">
					<td class="p-2 border border-gray-200 text-sm text-gray-600">
						{row.name}
						{#if row.holding}
							<span class="block text-xs text-green-600 font-normal mt-0.5">
								✓ Allocation composition synced ({row.holding_date})
							</span>
						{/if}
					</td>

					<td class="p-2 border border-gray-200 text-sm text-gray-600">
						{#if editingIndex === key}
							<input
								bind:this={inputElements[key]}
								bind:value={localRows[key].unit}
								type="number"
								step="any"
								class="editing-input w-32 px-2 py-1 border border-indigo-500 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
								onkeydown={async (e) => {
									if (e.key === 'Enter') {
										const currentKey = editingIndex;
										editingIndex = null;
										await saveUnit(currentKey, localRows[currentKey].unit);
									} else if (e.key === 'Escape') {
										editingIndex = null;
										localRows[key].unit = data[key].unit;
									}
								}}
								use:autofocus
							/>
						{:else}
							<button
								class="text-left cursor-pointer border-b border-dashed border-gray-400 hover:text-indigo-600 focus:outline-none"
								onclick={(e) => {
									e.stopPropagation();
									editingIndex = key;
								}}
							>
								{row.unit ?? 0}
							</button>
						{/if}
					</td>

					<td class="p-2 border border-gray-200 text-sm text-gray-600">
						<div>{row.nav ? row.nav.toFixed(2) : '0.00'}</div>
						<div class="text-xs">({row.nav_date})</div>
					</td>

					<td class="p-2 border border-gray-200 text-sm text-gray-600">
						{((row.unit ?? 0) * (row.nav ?? 0)).toLocaleString('en-IN', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}
					</td>

					<td class="p-1 border border-gray-200">
						<button
							class="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium px-2 py-1 rounded-md text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
							onclick={() => handleFetchBtnClick(key)}
						>
							Fetch Portfolio
						</button>
					</td>
				</tr>
			{/snippet}
			{@render tableRow('nps')}
			{@render tableRow('midcap')}
			{@render tableRow('smallcap')}
		</tbody>
	</table>

	<h1>Direct Stocks</h1>
	<textarea
		class="editing-input w-full border-amber-500 border outline-amber-500 rounded p-2"
		rows="5"
		bind:value={textareaString}
		bind:this={textareaElement}
		onfocus={() => {
			editingIndex = 'direct';
		}}
	></textarea>
</div>

<!-- Breakdown Table Preview Component -->
{#if fetchedJson?.holdings?.length > 0}
	<div class="mt-8 p-5 border border-blue-200 bg-blue-50/20 rounded-xl shadow-sm">
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
			<h3 class="text-base font-bold text-gray-800">
				Fetched Portfolio Breakdown of <span class="text-blue-700">{fetchedJson.scrip}</span> as on {fetchedJson.asOn}
			</h3>
			<div>
				<button
					class="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors shadow-sm"
					onclick={async () => {
						await saveHolding(
							fetchedJson.key,
							JSON.stringify(fetchedJson.holdings),
							fetchedJson.asOn
						);
						fetchedJson = null;
					}}
				>
					Save to Row Data
				</button>

				<button
					onclick={() => (fetchedJson = null)}
					class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors shadow-sm"
					>Ok</button
				>
			</div>
		</div>

		<div class="overflow-x-auto border border-gray-200 rounded-lg bg-white">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-200">
						{#each Object.keys(fetchedJson.holdings[0]) as header}
							<th class="p-2.5 font-semibold text-xs text-gray-600 uppercase tracking-wider"
								>{header}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each fetchedJson.holdings as item}
						<tr class="hover:bg-gray-50/50 transition-colors">
							{#each Object.keys(fetchedJson.holdings[0]) as key}
								<td class="p-2.5 text-sm text-gray-600">
									{item[key]}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}

<!-- My Holdings -->
<div>
	<button onclick={mapMarketcap}>Map Marketcap</button>
	<div class="flex flex-row justify-around bg-gray-200 p-2 m-2">
		<button
			onclick={() => (view = 'holding')}
			class="rounded px-2 py-1.5"
			class:bg-indigo-600={view === 'holding'}
			class:text-white={view === 'holding'}>All Holdings</button
		>
		<button
			onclick={() => (view = 'analysis')}
			class="rounded px-2 py-1.5"
			class:bg-indigo-600={view === 'analysis'}
			class:text-white={view === 'analysis'}>Top 10 Holdings</button
		>
		<h2>Sector Allocation</h2>
	</div>

	{#if (localRows?.my_holding?.holding?.length > 0) & (view === 'holding')}
		<div class="flex flex-row justify-end gap-2 p-2">
			<p>Last Saved: {localRows.my_holding.holding_date}</p>
			<button
				class="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-2 py-0.5 rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
				onclick={() =>
					saveHolding(
						'my_holding',
						JSON.stringify(localRows.my_holding.holding),
						dayjs().format('DD-MMM-YYYY')
					)}>Save</button
			>
		</div>
		<table class="w-full text-left border-collapse">
			<thead>
				<tr class="bg-gray-50 border-b border-gray-200">
					<th class="p-2.5 font-semibold text-xs text-gray-600 uppercase tracking-wider">Sl. No.</th
					>
					{#each Object.keys(localRows.my_holding.holding[0]) as header}
						<th class="p-2.5 font-semibold text-xs text-gray-600 uppercase tracking-wider"
							>{header}</th
						>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each localRows.my_holding.holding as item, index}
					<tr class="hover:bg-gray-50/50 transition-colors">
						<td class="p-2.5 text-sm text-gray-600">
							{index + 1}
						</td>
						{#each Object.keys(localRows.my_holding.holding[0]) as key}
							<td class="p-2.5 text-sm text-gray-600">
								{item[key]}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	{#if (localRows?.my_holding?.holding?.length > 0) & (view === 'analysis')}
		{@const marketcap_weight = localRows.my_holding.marketcap_weight}
		<p>
			Large: {marketcap_weight.large_pct.toFixed(2)}
			({marketcap_weight.large_amt.toLocaleString('en-IN')})
		</p>
		<p>
			Mid: {marketcap_weight.mid_pct.toFixed(2)} ({marketcap_weight.mid_amt.toLocaleString(
				'en-IN'
			)})
		</p>
		<p>
			Small: {marketcap_weight.small_pct.toFixed(2)} ({marketcap_weight.small_amt.toLocaleString(
				'en-IN'
			)})
		</p>
		<p>
			Other: {marketcap_weight.other_pct.toFixed(2)} ({marketcap_weight.other_amt.toLocaleString(
				'en-IN'
			)})
		</p>

		{@const sections = [
			{
				value: marketcap_weight.large_amt,
				percent: marketcap_weight.large_pct,
				color: '#ff6b6b',
				text: 'Large'
			},
			{
				value: marketcap_weight.mid_amt,
				percent: marketcap_weight.mid_pct,
				color: '#4dadf7',
				text: 'Mid'
			},
			{
				value: marketcap_weight.small_amt,
				percent: marketcap_weight.small_pct,
				color: '#33d9b2',
				text: 'Small'
			},
			{
				value: marketcap_weight.other_amt,
				percent: marketcap_weight.other_pct,
				color: '#ffb142',
				text: 'Other'
			}
		]}
		<Pie {sections} size={300} />
	{/if}
</div>
