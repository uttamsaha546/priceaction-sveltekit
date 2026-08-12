<script>
	import Papa from 'papaparse';

	let message = $state({});
	let csvData = $state([]);

	function handleFileUpload(event) {
		message = {};
		const file = event.target.files?.[0];

		if (!file) return;

		const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');

		if (!isCsv) {
			message = { type: 'error', text: 'Please upload a valid CSV file.' };
			event.target.value = '';
			return;
		}

		const requiredHeaders = ['name', 'isin', 'bse_symbol', 'nse_symbol', 'mcap', 'category'];

		Papa.parse(file, {
			header: true,
			transformHeader: (header) => header.trim(),
			skipEmptyLines: true,
			dynamicTyping: true,

			complete: (results) => {
				if (results.errors.length > 0) {
					console.error('CSV parsing errors:', results.errors);

					message = {
						type: 'error',
						text: `CSV contains ${results.errors.length} parsing error(s).`
					};
					return;
				}

				// Get headers from the parsed CSV
				const actualHeaders = results.meta.fields || [];

				// Check for missing headers
				const missingHeaders = requiredHeaders.filter((header) => !actualHeaders.includes(header));

				// Check for unexpected headers (optional)
				const unexpectedHeaders = actualHeaders.filter(
					(header) => !requiredHeaders.includes(header)
				);

				if (missingHeaders.length > 0) {
					console.error(`Invalid CSV headers. Missing: ${missingHeaders.join(', ')}`);

					message = {
						type: 'error',
						text: `Invalid CSV headers. Missing: ${missingHeaders.join(', ')}`
					};

					return;
				}

				results.data = results.data
					.map((x) => {
						const symbol =
							x.nse_symbol.trim() !== '-'
								? x.nse_symbol
								: x.bse_symbol.trim() !== '-'
									? x.bse_symbol
									: null;
						if (symbol) {
							return {
								name: x.name.trim(),
								isin: x.isin.trim(),
								symbol,
								marketcap: parseFloat(String(x.mcap).replaceAll(',', '')),
								category: x.category
							};
						}

						return null;
					})
					.filter(Boolean);

				console.log('Parsed CSV:', results.data);

				csvData = results.data;

				message = {
					type: 'success',
					text: `${results.data.length} rows parsed. see console`
				};
			},

			error: (error) => {}
		});
	}
</script>

<form class="p-6">
	<label for="csv-file" class="mb-2 block text-sm font-medium text-gray-700">
		Upload CSV file
	</label>

	<input
		id="csv-file"
		type="file"
		accept=".csv,text/csv"
		onchange={(event) => handleFileUpload(event)}
		class="w-md cursor-pointer rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-600
				file:mr-4 file:cursor-pointer file:border-0 file:bg-blue-600 file:px-4 file:py-2
				file:text-sm file:font-medium file:text-white
				hover:file:bg-blue-700
				focus:outline-none focus:ring-2 focus:ring-blue-500"
	/>

	<button
		type="submit"
		disabled={!csvData.length > 0}
		class=" rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white
			transition-colors hover:bg-blue-700
			focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
			disabled:cursor-not-allowed disabled:opacity-50"
	>
		Save
	</button>

	{#if message}
		<div
			class:success={message.type === 'success'}
			class:error={message.type === 'error'}
			class="text-sm"
		>
			{message.text}
		</div>
	{/if}
</form>

<style>
	.success {
		color: #047857;
	}

	.error {
		color: #dc2626;
	}
</style>
