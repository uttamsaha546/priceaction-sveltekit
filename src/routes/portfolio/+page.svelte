<script>
	import * as XLSX from 'xlsx';

	let cols = ['Scrip', 'Units', 'Latest NAV', 'Current Value', 'Actions'];
	let rows = [
		{
			Scrip: 'ICICI Scheme E',
			Units: 1,
			'Latest NAV': 12,
			'Current Value': 12
		},
		{
			Scrip: 'Edelweiss Mid Cap',
			Units: 1,
			'Latest NAV': 12,
			'Current Value': 12
		},
		{
			Scrip: 'Bandhan Small Cap',
			Units: 1,
			'Latest NAV': 12,
			'Current Value': 12
		},
		{
			Scrip: 'Direct Stocks',
			Units: 1,
			'Latest NAV': 12,
			'Current Value': 12
		}
	];

	let fetchedJson = $state({});

	async function handleFetchBtnClick(Scrip) {
		if (Scrip === 'ICICI Scheme E') {
			const a = await fetch('https://api.icicipension.in/get_check/portfolio/jun/2026');
			const b = await a.json();
			if (b) {
				const c = b.data[0].attributes.Scheme_Details.data.attributes.url;
				const buffer = await fetch(c).then((x) => x.arrayBuffer());
				const workbook = XLSX.read(buffer, { type: 'array' });
				// const sheet = workbook.SheetNames['Scheme E - Tier l'];
				const worksheet = workbook.Sheets['Scheme E - Tier l'];

				const dated = worksheet.B3.w;
				const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 5 });

				let accept = false;
				const d = jsonData
					.map((row) => {
						if (row.Particulars === 'Subtotal') {
							accept = false;
						}
						if (row.Particulars === 'Shares') {
							accept = true;
							return false;
						}
						if (accept) {
							return {
								Scrip: row.Particulars,
								ISIN: row['ISIN No.'],
								HoldingPct: Math.round(row['% of Portfolio'] * 100 * 100) / 100
							};
						}

						return false;
					})
					.filter((x) => x);

				fetchedJson = { asOn: dated, holdings: d, scrip: 'ICICI Scheme E' };
			}
		} else if (Scrip === 'Edelweiss Mid Cap') {
			const a = await fetch(
				'/proxy?url=https://groww.in/v1/api/data/mf/web/v6/scheme/search/edelweiss-mid-and-small-cap-fund-direct-growth'
			).then((x) => x.json());
			console.log(a);
		}
	}
</script>

<table class="w-full text-left border-collapse border border-gray-200">
	<thead>
		<tr class="bg-gray-100">
			{#each cols as col}
				<th class="p-2 border border-gray-200 capitalize">{col}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each rows as row}
			<tr class="hover:bg-gray-50">
				{#each cols as col}
					{#if col === 'Actions'}
						<td class="p-3 text-sm">
							<div class="flex items-center gap-2">
								<!-- Fetch Portfolio: Primary blue, sleek interactive transitions -->
								<button
									class="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium px-3 py-1.5 rounded-md text-xs shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
									onclick={() => handleFetchBtnClick(row.Scrip)}
								>
									Fetch Portfolio
								</button>

								<!-- Update Units: Soft gray border style to keep it visually quiet -->
								<button
									class="inline-flex items-center justify-center bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-300 font-medium px-3 py-1.5 rounded-md text-xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
								>
									Update Units
								</button>
							</div>
						</td>
					{:else}
						<td class="p-2 border border-gray-200">{row[col]}</td>
					{/if}
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

{#if fetchedJson?.holdings?.length > 0}
	<div class="mt-8">
		<h3 class="text-lg font-bold mb-4">
			Fetched Portfolio Breakdown of {fetchedJson.scrip} as on {fetchedJson.asOn}
			<button
				class="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-150 shadow-sm shadow-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
				onclick={handleSaveBreakdown}
			>
				<!-- Included an inline SVG save icon for a premium utility aesthetic -->
				<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
					/>
				</svg>
				Save to Row Data
			</button>
		</h3>
		<table class="w-full text-left border-collapse border border-gray-200">
			<thead>
				<tr class="bg-gray-100">
					<!-- Extract keys dynamically from the first object -->
					{#each Object.keys(fetchedJson.holdings[0]) as header}
						<th class="p-2 border border-gray-200 capitalize">{header}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each fetchedJson.holdings as item}
					<tr class="hover:bg-gray-50">
						{#each Object.keys(fetchedJson.holdings[0]) as key}
							<td class="p-2 border border-gray-200">
								{item[key]}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
