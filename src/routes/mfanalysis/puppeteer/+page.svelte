<script>
	import Papa from 'papaparse';

	let data = $state();
	let csvData = $state({});
	let parsing = $state({});
	let saving = $state({});
	let messages = $state({});

	const portfolioUrl = {
		'HSBC Mutual Fund':
			'https://www.assetmanagement.hsbc.co.in/en/mutual-funds/investor-resources/information-library#&accordion1446811090=2',
		'ICICI Prudential Mutual Fund':
			'https://www.icicipruamc.com/media-center/downloads?currentTabFilter=Disclosures&&subCatTabFilter=MonthlyPortfolioDisclosures',
		'Helios Mutual Fund': 'https://www.heliosmf.in/portfolio-disclosure',
		'WhiteOak Capital Mutual Fund':
			'https://mf.whiteoakamc.com/regulatory-disclosures/scheme-portfolios',
		'Mahindra Mutual Fund':
			'https://www.mahindramanulife.com/downloads#disclosures-portfolio-disclosure-monthly-portfolio-disclosure',
		'ITI Mutual Fund': 'https://www.itiamc.com/statuory-disclosure?type=Portfolio%20Disclosures',
		'BNP Paribas Mutual Fund':
			'https://www.barodabnpparibasmf.in/downloads/monthly-portfolio-scheme',
		'Mirae Asset Mutual Fund': 'https://www.miraeassetmf.co.in/downloads/portfolio',
		'Axis Mutual Fund': 'https://www.axismf.com/statutory-disclosures',
		'Kotak Mahindra Mutual Fund': 'https://www.kotakmf.com/Information/forms-and-downloads',
		'Union Mutual Fund': 'https://www.unionmf.com/about-us/downloads',
		'JM Financial Mutual Fund': 'https://www.jmfinancialmf.com/downloads/Portfolio-Disclosure',
		'Invesco Mutual Fund': 'https://www.invescomutualfund.com/literature-forms/monthly-holdings',
		'IDFC Mutual Fund':
			'https://bandhanmutual.com/statutory-disclosures/scheme-portfolios/monthly-half-yearly',
		'Bandhan Mutual Fund':
			'https://bandhanmutual.com/statutory-disclosures/scheme-portfolios/monthly-half-yearly',
		'Sundaram Mutual Fund': 'https://www.sundarammutual.com/Monthly-Fortnightly-Adhoc-Portfolios',
		'Nippon India Mutual Fund':
			'https://mf.nipponindiaim.com/investor-service/downloads/factsheet-portfolio-and-other-disclosures',
		'Edelweiss Mutual Fund': 'https://www.edelweissmf.com/statutory/portfolio-of-schemes',
		'HDFC Mutual Fund': 'https://www.hdfcfund.com/statutory-disclosure/portfolio/monthly-portfolio',
		'Tata Mutual Fund': 'https://www.tatamutualfund.com/schemes-related/portfolio',
		'Motilal Oswal Mutual Fund':
			'https://www.motilaloswalmf.com/downloads/scheme-portfolio-details',
		'Aditya Birla Sun Life Mutual Fund':
			'https://mutualfund.adityabirlacapital.com/forms-and-downloads/portfolio',
		'SBI Mutual Fund': 'https://www.sbimf.com/portfolios',
		'Navi Mutual Fund': 'https://navi.com/mutual-fund/downloads/portfolio',
		'UTI Mutual Fund': 'https://www.utimf.com/downloads/consolidate-all-portfolio-disclosure',
		'LIC Mutual Fund': 'https://www.licmf.com/downloads/monthly-portfolio',
		'DSP Mutual Fund': 'https://www.dspim.com/mandatory-disclosures/portfolio-disclosures',
		'Canara Robeco Mutual Fund':
			'https://www.canararobeco.com/documents/statutory-disclosures/scheme-dashboard/scheme-monthly-portfolio/',
		'Taurus Mutual Fund': 'https://taurusmutualfund.com/monthly-portfolio',
		'Quant Mutual Fund': 'https://quantmutual.com/statutory-disclosures',
		'Franklin Templeton Mutual Fund': 'https://www.franklintempletonindia.com/reports',
		'PGIM India Mutual Fund':
			'https://www.pgimindia.com/mutual-funds/disclosures/Portfolios/Monthly-Portfolio',
		'JioBlackRock Mutual Fund':
			'https://www.jioblackrockamc.com/statutory-disclosure/disclosures/monthly-portfolio-disclosure',
		'Trust Mutual Fund': 'https://www.trustmf.com/disclosures?activeTab=portfolio-disclosures',
		'Bank of India Mutual Fund': 'https://www.boimf.in/investor-corner',
		'Groww Mutual Fund': 'https://growwmf.in/statutory-disclosure/portfolio',
		'The Wealth Company Mutual Fund':
			'https://www.wealthcompanyamc.in/literature-forms/portfolio-documents/monthly/',
		'Zerodha Mutual Fund': 'https://www.zerodhafundhouse.com/resources/disclosures?source=footer',
		'Samco Mutual Fund': 'https://www.samcomf.com/StatutoryDisclosure#PortfolioDisclosures',
		'': '',
		'': ''
	};

	$effect(() => {
		fetch('/mfanalysis/puppeteer/api/getFundList?sub_category=Mid Cap')
			.then((res) => res.json())
			.then((res) => {
				data = res.content.filter(
					(fund) => fund.index === false && !fund.scheme_name?.toLowerCase().includes('etf')
				);
			});
	});

	$inspect(data);
	function handleFileUpload(event, row) {
		const file = event.target.files?.[0];

		if (!file) return;

		parsing[row.fund_name] = true;
		messages[row.fund_name] = null;

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			dynamicTyping: true,

			complete: (results) => {
				parsing[row.fund_name] = false;

				if (results.errors.length > 0) {
					console.error('CSV parsing errors:', results.errors);

					messages[row.fund_name] = {
						type: 'error',
						text: `CSV contains ${results.errors.length} parsing error(s).`
					};

					return;
				}

				csvData[row.fund_name] = results.data;

				messages[row.fund_name] = {
					type: 'success',
					text: `${results.data.length} rows parsed successfully.`
				};

				console.log('Parsed CSV:', results.data);
			},

			error: (error) => {
				parsing[row.fund_name] = false;

				messages[row.fund_name] = {
					type: 'error',
					text: error.message || 'Failed to parse CSV.'
				};
			}
		});
	}

	async function saveToDatabase(row) {
		const fundName = row.fund_name;
		const rows = csvData[fundName];

		if (!rows?.length) return;

		saving[fundName] = true;
		messages[fundName] = null;

		try {
			const response = await fetch('/mfanalysis/puppeteer/api/saveFundData', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					fund: row,
					data: rows
				})
			});

			if (!response.ok) {
				throw new Error(`Server returned ${response.status}`);
			}

			const result = await response.json();

			messages[fundName] = {
				type: 'success',
				text: result.message || 'Data saved successfully.'
			};

			// Optional: clear parsed data after successful save
			// delete csvData[fundName];
		} catch (error) {
			console.error('Save error:', error);

			messages[fundName] = {
				type: 'error',
				text: error.message || 'Failed to save data.'
			};
		} finally {
			saving[fundName] = false;
		}
	}
</script>

<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
	<div class="border-b border-gray-200 px-6 py-4">
		<h2 class="text-lg font-semibold text-gray-900">Mid Cap Funds</h2>

		<p class="mt-1 text-sm text-gray-500">
			Upload fund data and save it to the database. {data?.length} Funds
		</p>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full min-w-[900px] text-left text-sm">
			<thead class="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
				<tr>
					<th class="px-6 py-3 font-semibold"> Fund </th>

					<th class="px-6 py-3 font-semibold"> 6M Return </th>

					<th class="px-6 py-3 font-semibold"> 1Y Return </th>

					<th class="px-6 py-3 font-semibold"> CSV </th>

					<th class="px-6 py-3 text-center font-semibold"> Action </th>
				</tr>
			</thead>

			<tbody class="divide-y divide-gray-100">
				{#each data ?? [] as row}
					{@const fundName = row.fund_name}
					{@const parsedRows = csvData[fundName]}

					<tr class="transition-colors hover:bg-gray-50">
						<!-- Fund -->
						<td class="px-6 py-4">
							<div class="flex items-center gap-3">
								<img
									src={row.logo_url}
									alt={fundName}
									width="40"
									height="40"
									class="h-10 w-10 rounded-full border border-gray-200 bg-white object-contain"
								/>

								<div>
									<p class="font-medium text-gray-900">
										<a href={portfolioUrl[row.fund_house]} target="_blank">{fundName}</a>
									</p>

									<p class="text-xs text-gray-500">Mid Cap</p>
								</div>
							</div>
						</td>

						<!-- 6M -->
						<td class="px-6 py-4">
							<span
								class="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
							>
								{row.return6m}%
							</span>
						</td>

						<!-- 1Y -->
						<td class="px-6 py-4">
							<span
								class="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
							>
								{row.return1y}%
							</span>
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
									Upload CSV
								{/if}

								<input
									type="file"
									accept=".csv,text/csv"
									class="hidden"
									disabled={parsing[fundName]}
									onchange={(event) => handleFileUpload(event, row)}
								/>
							</label>

							{#if parsedRows?.length}
								<p class="mt-2 text-xs text-gray-500">
									{parsedRows.length} rows loaded
								</p>
							{/if}
						</td>

						<!-- Save -->
						<td class="px-6 py-4 text-center">
							<button
								type="button"
								disabled={!parsedRows?.length || saving[fundName]}
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
						</td>
					</tr>

					<!-- Status -->
					{#if messages[fundName]}
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
					{/if}
				{:else}
					<tr>
						<td colspan="5" class="px-6 py-12 text-center">
							<p class="text-sm font-medium text-gray-600">No funds found</p>

							<p class="mt-1 text-xs text-gray-400">
								There are currently no Mid Cap funds to display.
							</p>
						</td>
					</tr>
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
