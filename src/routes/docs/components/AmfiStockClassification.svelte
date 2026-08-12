<script>
	import Papa from 'papaparse';
	import { enhance } from '$app/forms';

	let message = $state(null);
	let parsedData = $state([]);
	let tableHeaders = $derived(Object.keys(parsedData?.[0]));
	let saving = $state(false);

	function handleFileUpload(event) {
		message = null;

		const file = event.target.files?.[0];

		if (!file) return;

		const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');

		if (!isCsv) {
			message = {
				type: 'error',
				text: 'Please upload a valid CSV file.'
			};

			event.target.value = '';
			return;
		}

		const requiredHeaders = ['name', 'isin', 'bse_symbol', 'nse_symbol', 'mcap', 'category'];

		const validCategories = new Set(['Large Cap', 'Mid Cap', 'Small Cap']);

		Papa.parse(file, {
			header: true,
			transformHeader: (header) => header.trim(),
			skipEmptyLines: true,
			dynamicTyping: false,

			complete: (results) => {
				if (results.errors.length > 0) {
					console.error('CSV parsing errors:', results.errors);

					message = {
						type: 'error',
						text: `CSV contains ${results.errors.length} parsing error(s).`
					};

					return;
				}

				const actualHeaders = results.meta.fields || [];

				const missingHeaders = requiredHeaders.filter((header) => !actualHeaders.includes(header));

				if (missingHeaders.length > 0) {
					message = {
						type: 'error',
						text: `Invalid CSV headers. Missing: ${missingHeaders.join(', ')}`
					};

					return;
				}

				// const parsedData = [];
				const invalidRows = [];

				results.data.forEach((row, index) => {
					const name = String(row.name ?? '').trim();
					const isin = String(row.isin ?? '').trim();
					const nseSymbol = String(row.nse_symbol ?? '').trim();
					const bseSymbol = String(row.bse_symbol ?? '').trim();
					const category = String(row.category ?? '').trim();

					const symbol =
						nseSymbol && nseSymbol !== '-'
							? nseSymbol
							: bseSymbol && bseSymbol !== '-'
								? bseSymbol
								: null;

					const marketcap = Number(
						String(row.mcap ?? '')
							.replaceAll(',', '')
							.trim()
					);

					if (
						!name ||
						!isin ||
						!symbol ||
						!Number.isFinite(marketcap) ||
						!validCategories.has(category)
					) {
						invalidRows.push(row);
						return;
					}

					parsedData.push({
						name,
						isin,
						symbol,
						marketcap,
						category
					});
				});

				if (invalidRows.length > 0) {
					console.log('Invalid Rows:', invalidRows);
				}

				// csvData = parsedData;

				message = {
					type: 'success',
					text: `${parsedData.length} rows parsed successfully.`
				};

				console.log('Parsed CSV:', $state.snapshot(parsedData));
			},

			error: (error) => {
				console.error('CSV parsing error:', error);

				message = {
					type: 'error',
					text: 'Failed to parse the CSV file.'
				};
			}
		});
	}

	function handleSubmit() {
		saving = true;
		message = {
			type: 'info',
			text: 'Saving...'
		};

		return async ({ result }) => {
			saving = false;

			if (result.type === 'success') {
				message = {
					type: 'success',
					text: `Successfully saved ${result.data.count} rows.`
				};
				parsedData = [];
			} else {
				message = {
					type: 'error',
					text: result.data?.error ?? 'Failed to save data.'
				};
			}
		};
	}
</script>

<main class="max-w-7xl mx-auto p-6 space-y-6 antialiased font-sans">
	<section class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-3">
			<!-- Controls & Actions Section Layout Grid -->
			<h2 class="font-semibold text-slate-800 text-base mt-4">xxx rows as of July 2026</h2>
			<form method="POST" action="?/saveAmfiMarketcapClassification" use:enhance={handleSubmit}>
				<div class="flex flex-col sm:flex-row sm:items-center gap-4">
					<label for="csv-file" class="flex-1 block">
						<span class="sr-only">Choose CSV File</span>
						<input
							id="csv-file"
							type="file"
							accept=".csv,text/csv"
							onchange={handleFileUpload}
							class="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg
			file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700
			 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
						/>

						<input type="hidden" name="data" value={JSON.stringify(parsedData)} />
					</label>
					<button
						type="submit"
						disabled={parsedData.length === 0 || saving}
						class="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold
            text-white transition-colors hover:bg-blue-700 focus:outline-none
            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
				</div>
			</form>

			<!-- Status Notifications Displays -->
			{#if message}
				<div
					class="mt-4 text-sm"
					class:success={message.type === 'success'}
					class:error={message.type === 'error'}
					class:info={message.type === 'info'}
				>
					{message.text}
				</div>
			{/if}

			<!-- Dynamic Data Table Presentation View -->
			{#if parsedData.length > 0}
				<div class="overflow-x-auto max-h-100">
					<table class="w-full text-left border-collapse text-xs whitespace-nowrap">
						<thead
							class="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700 z-10"
						>
							<tr>
								{#each tableHeaders as header}
									<th
										class="p-3.5 border-r border-slate-200/60 last:border-0 tracking-wide text-slate-600 bg-slate-50"
										>{header}</th
									>
								{/each}
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-200/80 text-slate-600">
							{#each parsedData as row}
								<tr class="hover:bg-slate-50/80 transition-colors odd:bg-white even:bg-slate-50/30">
									{#each tableHeaders as header}
										<td class="p-3 border-r border-slate-200/40 last:border-0 font-medium">
											{#if !row[header]}
												<span class="text-slate-400 italic">—</span>
											{:else if header === 'Fetch Error'}
												<span class="text-red-500 font-semibold">{row[header]}</span>
											{:else}
												{row[header]}
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</section>
</main>

<style>
	.success {
		color: #047857;
	}

	.error {
		color: #dc2626;
	}

	.info {
		color: #2563eb;
	}
</style>
