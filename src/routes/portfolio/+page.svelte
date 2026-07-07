<script>
	import * as XLSX from 'xlsx';

	// 1. Destructure data arriving from your server load script
	let { data } = $props();

	let cols = ['Scrip', 'Units', 'NAV Text', 'Current Value', 'Actions'];

	// 2. Map real server API data seamlessly into initial row states
	let rows = $state([
		{
			Scrip: 'ICICI Scheme E',
			Units: 120.45, // Placeholder user units
			'Latest NAV': data.nps.nav,
			'NAV Date': data.nps.date,
			get 'NAV Text'() {
				return `${this['Latest NAV']}` + ` (${this['NAV Date']})`;
			},
			get 'Current Value'() {
				return (this.Units * this['Latest NAV']).toFixed(2);
			}
		},
		{
			Scrip: 'Edelweiss Mid Cap',
			Units: 85.32,
			'Latest NAV': data.midcap.nav,
			'NAV Date': data.midcap.date,
			get 'NAV Text'() {
				return `${this['Latest NAV']}` + ` (${this['NAV Date']})`;
			},
			get 'Current Value'() {
				return (this.Units * this['Latest NAV']).toFixed(2);
			}
		},
		{
			Scrip: 'Bandhan Small Cap',
			Units: 210.15,
			'Latest NAV': data.smallcap.nav,
			'NAV Date': data.smallcap.date,
			get 'NAV Text'() {
				return `${this['Latest NAV']}` + ` (${this['NAV Date']})`;
			},
			get 'Current Value'() {
				return (this.Units * this['Latest NAV']).toFixed(2);
			}
		},
		{
			Scrip: 'Direct Stocks',
			Units: 1,
			'NAV Text': 1500.0, // Manual asset tracking
			get 'Current Value'() {
				return (this.Units * this['NAV Text']).toFixed(2);
			}
		}
	]);

	let fetchedJson = $state({ asOn: '', holdings: [], scrip: '' });
	// Track which row is currently being edited
	let editingIndex = $state(null);

	// Click outside handler logic
	function handleWindowClick(event) {
		// If we aren't editing, do nothing
		if (editingIndex === null) return;

		// Check if the click target is inside our editing input or the action buttons
		const target = event.target;
		if (!target.closest('.editing-input') && !target.closest('.action-btn')) {
			editingIndex = null;
		}
	}

	async function handleFetchBtnClick(Scrip) {
		try {
			if (Scrip === 'ICICI Scheme E') {
				const a = await fetch(
					'/proxy?url=https://api.icicipension.in/get_check/portfolio/jun/2026'
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

					const dated = worksheet.B3?.w ?? 'N/A';
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
									ISIN: row['ISIN No.'] ?? 'N/A',
									HoldingPct: row['% of Portfolio'] ? (row['% of Portfolio'] * 100).toFixed(2) : 0
								};
							}
							return false;
						})
						.filter(Boolean);

					fetchedJson = { asOn: dated, holdings: d, scrip: Scrip };
				}
			} else if (Scrip === 'Edelweiss Mid Cap' || Scrip === 'Bandhan Small Cap') {
				const isin = Scrip === 'Edelweiss Mid Cap' ? 'INF843K01AO4' : 'INF194KB1AL4';
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
					const dated = a.data[0].pmd_portfolio_date;
					const b = a.data
						.sort((m, n) => parseFloat(n.pmd_weighting) - parseFloat(m.pmd_weighting))
						.map((row) => {
							if (row.pmd_holdingtype !== 'E' || row.pmd_weighting === '0') return false;
							return {
								Scrip: row.pmd_name,
								ISIN: row.pmd_isin,
								HoldingPct: parseFloat(row.pmd_weighting).toFixed(2)
							};
						})
						.filter(Boolean);

					fetchedJson = { asOn: dated, holdings: b, scrip: Scrip };
				}
			}
		} catch (err) {
			console.error('Error fetching composition data:', err);
			alert('Failed to load portfolio breakdown.');
		}
	}

	// Fixed: Included the missing button event handler
	function handleSaveBreakdown() {
		console.log(`Saving portfolio state data for ${fetchedJson.scrip}`, fetchedJson.holdings);
		alert(`Saved breakdown parameters for ${fetchedJson.scrip}!`);
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div class="p-6 max-w-7xl mx-auto">
	<table
		class="w-full text-left border-collapse border border-gray-200 shadow-sm rounded-lg overflow-hidden"
	>
		<thead>
			<tr class="bg-gray-100 text-gray-700 font-semibold text-sm">
				{#each cols as col}
					<th class="p-3 border border-gray-200">{col}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i}
				<tr class="hover:bg-gray-50 transition-colors">
					{#each cols as col}
						{#if col === 'Actions'}
							<td class="p-3 border border-gray-200">
								<div class="flex items-center gap-2">
									<button
										class="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium px-3 py-1.5 rounded-md text-xs shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
										onclick={() => handleFetchBtnClick(row.Scrip)}
									>
										Fetch Portfolio
									</button>

									<button
										class="action-btn inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium px-3 py-1.5 rounded-md text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
										onclick={(e) => {
											e.stopPropagation(); // Stop window catch immediately
											editingIndex = editingIndex === i ? null : i;
										}}
									>
										{editingIndex === i ? 'Done' : 'Update Units'}
									</button>
								</div>
							</td>
						{:else}
							<td class="p-3 border border-gray-200 text-sm text-gray-600">
								{#if col === 'Units' && editingIndex === i}
									<input
										type="number"
										step="any"
										class="editing-input w-full px-2 py-1 border border-indigo-500 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
										bind:value={row.Units}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === 'Escape') {
												editingIndex = null;
											}
										}}
										autofocus
									/>
								{:else if col === 'Units'}
									<span
										class="cursor-pointer border-b border-dashed border-gray-400 hover:text-indigo-600"
										onclick={(e) => {
											e.stopPropagation(); // Avoid triggering immediate clickaway close
											editingIndex = i;
										}}
										role="button"
										tabindex="0"
										onkeydown={(e) => e.key === 'Enter' && (editingIndex = i)}
									>
										{row[col]}
									</span>
								{:else}
									{row[col]}
								{/if}
							</td>
						{/if}
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
