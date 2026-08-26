<script>
	import { invalidate } from '$app/navigation';
	import * as XLSX from 'xlsx';
	import { parseWorkbook, flattenHoldings, parseZip } from './parser';

	let { data } = $props();
	// $inspect(data.amcList);
	const excludedAMCs = [91, 65, 89, 90];
	let amcList = $derived(data.amcList.filter((x) => !excludedAMCs.includes(parseInt(x.mf_id))));

	let parsing = $state({});
	let error = $state({});
	let success = $state({});
	let saving = $state({});

	let portfolioMonth = $state('');
	const portfolioMonths = $derived(
		Array.from({ length: 12 }, (_, i) => {
			const date = new Date();
			date.setMonth(date.getMonth() - i);

			const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

			const label = date.toLocaleDateString('en-IN', {
				month: 'long',
				year: 'numeric'
			});

			return { value, label };
		})
	);

	let workbook = $state({});
	let sheets = $state({});
	let holdings = $state({});
	let uniqueHoldings = $state({});
	let selectedSheet = $state({});

	let superUniqueHoldings = $state([]);
	let superUniqueHoldingsObj = $state({});

	async function handleFileUpload(event, row) {
		const file = event.target.files?.[0];
		const key = row.mf_name;

		if (!file) return;

		parsing[key] = true;
		error[key] = '';
		success[key] = '';

		try {
			const extension = file.name.split('.').pop()?.toLowerCase();

			if (!['zip', 'xlsx', 'xls'].includes(extension ?? '')) {
				throw new Error('Only ZIP, XLSX, or XLS files are supported.');
			}

			let buffer;

			if (extension === 'zip') {
				buffer = await parseZip(file);
			} else {
				buffer = await file.arrayBuffer();
			}

			workbook[key] = XLSX.read(buffer, {
				type: 'array',
				cellDates: true,
				raw: true
			});

			sheets[key] = parseWorkbook(workbook[key]);

			holdings[key] = sheets[key].flatMap((sheet) =>
				(sheet.holdings ?? []).map((holding) => ({
					...holding,
					sheetName: sheet.sheetName,
					fundName: sheet.fundName,
					reportDate: sheet.reportDate,
					securityType: 'equity'
				}))
			);

			uniqueHoldings[key] = flattenHoldings(sheets[key]);

			uniqueHoldings[key].forEach((element) => {
				if (!superUniqueHoldingsObj[element.isin]) {
					superUniqueHoldingsObj[element.isin] = element;
				} else {
					superUniqueHoldingsObj[element.isin].quantity += element.quantity;
				}
			});

			superUniqueHoldings = Object.values(superUniqueHoldingsObj);
		} catch (e) {
			error[key] = e instanceof Error ? e.message : String(e);
		} finally {
			parsing[key] = false;
		}
	}

	function handleDownload() {
		const worksheet = XLSX.utils.json_to_sheet(superUniqueHoldings);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Universe');
		XLSX.writeFile(workbook, 'DataExport.xlsx');
	}

	$inspect(sheets);
</script>

<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
	<div class="border-b border-gray-200 px-6 py-4">
		<h2 class="text-lg font-semibold text-gray-900">Import Monthly Portfolio Disclosure</h2>

		<p class="mt-1 text-sm text-gray-500">
			Upload fund data and save it to the database. {amcList?.length} AMCs
		</p>

		<div class="mt-4 flex items-center gap-3">
			<label for="portfolio-month" class="text-sm font-medium text-gray-700">
				Portfolio Month
			</label>

			<select
				id="portfolio-month"
				bind:value={portfolioMonth}
				class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
			>
				<option value="" disabled>Select month</option>

				{#each portfolioMonths as month}
					<option value={month.value}>
						{month.label}
					</option>
				{/each}
			</select>

			<span class="sticky top-0">Unique Holdings: {superUniqueHoldings?.length}</span>
			<button
				onclick={handleDownload}
				class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
				>Download</button
			>
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-225 text-left text-sm">
			<thead class="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
				<tr>
					<th class="px-6 py-3 font-semibold"> AMC </th>

					<th class="px-6 py-3 font-semibold"> Messeges </th>

					<th class="px-6 py-3 text-center font-semibold"> Action </th>
				</tr>
			</thead>

			<tbody class="divide-y divide-gray-100">
				{#each amcList ?? [] as row}
					{@const fundName = row.mf_name}
					{@const key = row.mf_name}
					{@const logo_url = `https://www.amfiindia.com${row?.icons[0]?.url ?? ''}`}
					{@const click_url = row.amc_monthly_portfolio_disclosure}

					<tr class="transition-colors hover:bg-gray-50">
						<!-- AMCs -->
						<td class="px-6 py-4">
							<div class="flex items-center gap-3">
								<img
									src={logo_url}
									alt={fundName}
									width="60"
									height="60"
									class="border border-gray-200 bg-white object-contain"
								/>

								<div>
									<p class="font-medium text-gray-900">
										<a href={click_url} target="_blank">{fundName}</a>
									</p>
								</div>
							</div>
						</td>

						<!-- Messeges -->
						<td class="px-6 py-4">
							{#if holdings[key]}
								<span
									class="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
								>
									{holdings[key]?.length} Rows parsed
								</span>

								<span
									class="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
								>
									{uniqueHoldings[key]?.length} unique holding
								</span>
							{/if}
						</td>

						<!-- Upload -->
						<td class="px-6 py-4">
							<label
								class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
							>
								{#if parsing[fundName]}
									<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
										<circle
											cx="12"
											cy="12"
											r="9"
											class="opacity-25"
											stroke="currentColor"
											stroke-width="3"
										/>

										<path
											d="M21 12a9 9 0 0 1-9 9"
											stroke="currentColor"
											stroke-width="3"
											stroke-linecap="round"
										/>
									</svg>

									Parsing...
								{:else}
									Upload Excel/Zip
								{/if}

								<input
									type="file"
									accept=".xlsx, .xls, .zip"
									class="hidden"
									disabled={parsing[fundName]}
									onchange={(event) => handleFileUpload(event, row)}
								/>
							</label>

							<!-- {#if parsedRows?.length}
								<p class="mt-2 text-xs text-gray-500">
									{parsedRows.length} rows loaded
								</p>
							{/if} -->
						</td>

						<!-- Save -->
						<!-- <td class="px-6 py-4 text-center">
							<button
								type="button"
								disabled={!parsedRows?.length || !portfolioMonth || saving[fundName]}
								onclick={() => saveToDatabase(row)}
								class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
							>
								{#if saving[fundName]}
									<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
										<circle
											cx="12"
											cy="12"
											r="9"
											class="opacity-25"
											stroke="currentColor"
											stroke-width="3"
										/>

										<path
											d="M21 12a9 9 0 0 1-9 9"
											stroke="currentColor"
											stroke-width="3"
											stroke-linecap="round"
										/>
									</svg>

									Saving...
								{:else}
									Save to Database
								{/if}
							</button>
						</td> -->
					</tr>

					<!-- Status -->
					<!-- {#if messages[fundName]}
						<tr>
							<td colspan="5" class="px-6 py-2">
								<div
									class:success={messages[fundName].type === 'success'}
									class:error={messages[fundName].type === 'error'}
									class="text-xs"
								>
									{messages[fundName].text}
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="px-6 py-12 text-center">
								<p class="text-sm font-medium text-gray-600">No funds found</p>

								<p class="mt-1 text-xs text-gray-400">
									There are currently no Mid Cap funds to display.
								</p>
							</td>
						</tr>
					{/if} -->
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.success {
		color: #047857;
	}

	.error {
		color: #dc2626;
	}
</style>
