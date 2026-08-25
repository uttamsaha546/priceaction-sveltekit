<script>
	import { tick } from 'svelte';
	import { parseWorkbook, worksheetToRows, flattenHoldings } from './parser';
	import * as XLSX from 'xlsx';

	let fileInput;
	let url = '';

	let loading = $state(false);
	let error = $state('');
	let success = $state('');

	let workbook = $state(null);
	let sheets = $state([]);
	let holdings = $state([]);

	let selectedSheet = $state(null);
	let showRawEditor = $state(false);
	let uniqueHoldings;

	let validation = $state({
		valid: false,
		errors: [],
		warnings: []
	});

	async function handleFile(event) {
		const file = event.target.files?.[0];

		if (!file) return;

		loading = true;
		error = '';
		success = '';

		try {
			const buffer = await file.arrayBuffer();

			workbook = XLSX.read(buffer, {
				type: 'array',
				cellDates: true,
				raw: true
			});

			sheets = parseWorkbook(workbook);

			holdings = sheets.flatMap((sheet) =>
				(sheet.holdings ?? []).map((holding) => ({
					...holding,
					sheetName: sheet.sheetName,
					fundName: sheet.fundName,
					reportDate: sheet.reportDate,
					securityType: 'equity'
				}))
			);

			uniqueHoldings = flattenHoldings(sheets);

			selectedSheet = sheets[0]?.sheetName ?? null;

			// validate();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	$inspect(sheets);

	async function fetchUrl() {
		if (!url.trim()) return;

		loading = true;
		error = '';

		try {
			const response = await fetch('/mf-import/api/import', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					url: url.trim()
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Import failed');
			}

			workbook = result.workbook;
			sheets = result.sheets;
			holdings = result.holdings;

			selectedSheet = sheets[0]?.sheetName ?? null;

			validation = result.validation;
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	function deleteHolding(index) {
		holdings.splice(index, 1);
		holdings = holdings;

		validate();
	}

	function updateHolding(index, key, value) {
		holdings[index][key] = value;
		holdings = holdings;

		validate();
	}

	function validate() {
		const errors = [];
		const seen = new Set();

		for (let i = 0; i < holdings.length; i++) {
			const h = holdings[i];

			if (!h.name) {
				errors.push({
					index: i,
					message: 'Missing name'
				});
			}

			if (!/^IN[A-Z0-9]{10}$/.test(h.isin || '')) {
				errors.push({
					index: i,
					message: 'Invalid ISIN'
				});
			}

			if (h.quantity === null || h.quantity === undefined || !Number.isFinite(Number(h.quantity))) {
				errors.push({
					index: i,
					message: 'Invalid quantity'
				});
			}

			const key = `${h.fundName}|${h.reportDate}|${h.isin}`;

			if (seen.has(key)) {
				errors.push({
					index: i,
					message: 'Duplicate holding'
				});
			}

			seen.add(key);
		}

		validation = {
			valid: errors.length === 0,
			errors,
			warnings: []
		};
	}

	async function submit() {
		validate();

		if (!validation.valid) {
			return;
		}

		loading = true;
		error = '';
		success = '';

		try {
			const response = await fetch('/mf-import/api/save', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					holdings
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Save failed');
			}

			success = `Imported ${result.count} holdings successfully.`;
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>MF Portfolio Import</title>
</svelte:head>

<div class="page">
	<div class="header">
		<div>
			<h1>MF Portfolio Import</h1>
			<p>Upload a mutual fund portfolio disclosure and extract equity holdings.</p>
		</div>
	</div>

	{#if !workbook}
		<div class="upload-card">
			<h2>Upload Portfolio</h2>

			<div
				class="dropzone"
				role="button"
				tabindex="0"
				onclick={() => fileInput?.click()}
				onkeydown={(e) => {
					if (e.key === 'Enter') fileInput?.click();
				}}
			>
				<div class="upload-icon">↑</div>

				<strong> Click to upload Excel file </strong>

				<span> .xls or .xlsx </span>

				<input bind:this={fileInput} type="file" accept=".xls,.xlsx" onchange={handleFile} hidden />
			</div>

			<div class="divider">
				<span>OR</span>
			</div>

			<div class="url-input">
				<input bind:value={url} placeholder="https://example.com/portfolio.xlsx" />

				<button onclick={fetchUrl} disabled={loading}> Fetch </button>
			</div>
		</div>
	{:else}
		<div class="workspace">
			<div class="summary">
				<div>
					<span>Sheets</span>
					<strong>{sheets.length}</strong>
				</div>

				<div>
					<span>Holdings</span>
					<strong>{holdings.length}</strong>
				</div>

				<div>
					<span>Valid</span>
					<strong>
						{validation.errors.length === 0 ? '✓' : '✗'}
					</strong>
				</div>
			</div>

			<div class="content">
				<aside class="sidebar">
					<h3>Sheets</h3>

					{#each sheets as sheet}
						<button
							class:active={selectedSheet === sheet.sheetName}
							class="sheet-button"
							onclick={() => (selectedSheet = sheet.sheetName)}
						>
							<div>
								<strong>{sheet.fundName || 'Unknown fund'}</strong>

								<small>
									{sheet.sheetName}
								</small>
							</div>

							<span class={`badge ${sheet.type}`}>
								<input type="checkbox" defaultChecked={sheet.hasEquity} />
							</span>

							<span class="count">
								{sheet.holdings?.length ?? 0}
							</span>
						</button>
					{/each}
				</aside>

				<main class="main">
					{#if selectedSheet}
						{@const sheet = sheets.find((s) => s.sheetName === selectedSheet)}

						<div class="sheet-header">
							<div>
								<h2>{sheet?.fundName}</h2>

								<p>
									{sheet?.sheetName}

									{#if sheet?.reportDate}
										· {sheet.reportDate}
									{/if}
								</p>
							</div>

							<button class="secondary" onclick={() => (showRawEditor = !showRawEditor)}>
								{showRawEditor ? 'Hide Raw Workbook' : 'Inspect Raw Workbook'}
							</button>
						</div>
					{/if}

					{#if showRawEditor && workbook && selectedSheet}
						{@const worksheet = workbook.Sheets[selectedSheet]}
						{@const rawRows = worksheetToRows(worksheet)}

						<div class="raw-editor">
							<h3>Raw Workbook</h3>

							<p>
								The automatic parser uses this workbook as its source. You normally don't need to
								edit it.
							</p>

							<table>
								<tbody>
									{#each rawRows as row, ri}
										<tr>
											<td class="row-number">{ri + 1}</td>

											{#each row as cell}
												<td>{cell ?? ''}</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}

					<div class="table-container">
						<table class="holdings">
							<thead>
								<tr>
									<th>#</th>
									<th>Security</th>
									<th>ISIN</th>
									<th>Quantity</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{#each holdings as holding, index}
									{#if holding.sheetName === selectedSheet}
										<tr class:error-row={validation.errors.some((e) => e.index === index)}>
											<td>{index + 1}</td>

											<td>
												<input
													value={holding.name}
													onchange={(e) => updateHolding(index, 'name', e.currentTarget.value)}
												/>
											</td>

											<td>
												<input
													value={holding.isin}
													onchange={(e) =>
														updateHolding(index, 'isin', e.currentTarget.value.toUpperCase())}
												/>
											</td>

											<td>
												<input
													type="number"
													value={holding.quantity}
													onchange={(e) =>
														updateHolding(index, 'quantity', Number(e.currentTarget.value))}
												/>
											</td>

											<td>
												<button class="delete" title="Delete" onclick={() => deleteHolding(index)}>
													×
												</button>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>

					{#if validation.errors.length}
						<div class="validation-errors">
							<h3>
								{validation.errors.length} validation errors
							</h3>

							{#each validation.errors.slice(0, 20) as err}
								<div>
									Row {err.index + 1}:
									{err.message}
								</div>
							{/each}
						</div>
					{/if}

					<div class="bottom-bar">
						<div>
							<strong>{uniqueHoldings.length}</strong>
							holdings extracted
						</div>

						<button
							class="primary"
							disabled={loading || !validation.valid || holdings.length === 0}
							onclick={submit}
						>
							{loading ? 'Importing...' : 'Import Holdings'}
						</button>
					</div>
					<div class="table-container">
						<table class="holdings">
							<thead>
								<tr>
									<th>#</th>
									<th>Security</th>
									<th>ISIN</th>
									<th>Quantity</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{#each uniqueHoldings as holding, index}
									<tr class:error-row={validation.errors.some((e) => e.index === index)}>
										<td>{index + 1}</td>

										<td>{holding.name}</td>

										<td>{holding.isin}</td>

										<td>{holding.quantity}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</main>
			</div>
		</div>
	{/if}

	{#if error}
		<div class="alert error">
			{error}
		</div>
	{/if}

	{#if success}
		<div class="alert success">
			{success}
		</div>
	{/if}
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		background: #f5f6f8;
		color: #1f2937;
	}

	.page {
		min-height: 100vh;
		padding: 32px;
	}

	.header {
		margin-bottom: 24px;
	}

	h1 {
		margin: 0;
		font-size: 28px;
	}

	h2 {
		margin: 0;
		font-size: 19px;
	}

	h3 {
		margin: 0 0 12px;
		font-size: 14px;
	}

	p {
		color: #6b7280;
	}

	.upload-card {
		max-width: 700px;
		margin: 80px auto;
		padding: 32px;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
	}

	.dropzone {
		border: 2px dashed #d1d5db;
		border-radius: 10px;
		padding: 60px 20px;
		text-align: center;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.dropzone:hover {
		border-color: #6366f1;
		background: #fafaff;
	}

	.upload-icon {
		font-size: 32px;
	}

	.divider {
		text-align: center;
		margin: 25px 0;
		color: #9ca3af;
	}

	.url-input {
		display: flex;
		gap: 8px;
	}

	input {
		width: 100%;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 8px 10px;
		font: inherit;
	}

	button {
		border: 0;
		border-radius: 6px;
		padding: 9px 14px;
		cursor: pointer;
		font: inherit;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.workspace {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		overflow: hidden;
	}

	.summary {
		display: flex;
		gap: 40px;
		padding: 18px 24px;
		border-bottom: 1px solid #e5e7eb;
	}

	.summary div {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.summary span {
		font-size: 12px;
		color: #6b7280;
	}

	.summary strong {
		font-size: 18px;
	}

	.content {
		display: flex;
		min-height: 700px;
	}

	.sidebar {
		width: 280px;
		border-right: 1px solid #e5e7eb;
		padding: 16px;
		overflow-y: auto;
	}

	.sheet-button {
		width: 100%;
		background: transparent;
		text-align: left;
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.sheet-button:hover,
	.sheet-button.active {
		background: #f3f4f6;
	}

	.sheet-button > div {
		flex: 1;
		min-width: 0;
	}

	.sheet-button strong {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sheet-button small {
		display: block;
		color: #9ca3af;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.badge,
	.security-type {
		font-size: 10px;
		padding: 3px 6px;
		border-radius: 4px;
		background: #eee;
	}

	.count {
		font-size: 12px;
		color: #6b7280;
	}

	.main {
		flex: 1;
		min-width: 0;
	}

	.sheet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid #e5e7eb;
	}

	.sheet-header p {
		margin: 5px 0 0;
		font-size: 13px;
	}

	.primary {
		background: #111827;
		color: white;
	}

	.secondary {
		background: #f3f4f6;
	}

	.table-container {
		overflow: auto;
		max-height: 600px;
	}

	.holdings {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}

	th {
		position: sticky;
		top: 0;
		background: #f9fafb;
		text-align: left;
		font-weight: 600;
		z-index: 1;
	}

	th,
	td {
		padding: 9px 10px;
		border-bottom: 1px solid #e5e7eb;
		white-space: nowrap;
	}

	td input {
		min-width: 100px;
		padding: 5px 7px;
	}

	.error-row {
		background: #fff7f7;
	}

	.delete {
		background: transparent;
		color: #dc2626;
		font-size: 18px;
		padding: 2px 8px;
	}

	.bottom-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 24px;
		border-top: 1px solid #e5e7eb;
	}

	.validation-errors {
		margin: 16px;
		padding: 14px;
		background: #fff7ed;
		border: 1px solid #fed7aa;
		border-radius: 8px;
		font-size: 13px;
	}

	.validation-errors div {
		margin: 4px 0;
	}

	.alert {
		position: fixed;
		right: 20px;
		bottom: 20px;
		padding: 14px 18px;
		border-radius: 8px;
		box-shadow: 0 4px 20px #0002;
	}

	.alert.error {
		background: #fee2e2;
		color: #991b1b;
	}

	.alert.success {
		background: #dcfce7;
		color: #166534;
	}

	.raw-editor {
		margin: 16px;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: auto;
		max-height: 500px;
	}

	.raw-editor h3,
	.raw-editor p {
		padding: 0 16px;
	}

	.raw-editor table {
		border-collapse: collapse;
		font-size: 11px;
	}

	.raw-editor td {
		border: 1px solid #ddd;
		padding: 4px 8px;
	}

	.row-number {
		background: #f3f4f6;
		color: #6b7280;
	}
</style>
