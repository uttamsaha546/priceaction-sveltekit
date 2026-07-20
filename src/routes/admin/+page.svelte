<script>
	import { goto } from '$app/navigation';
	let { data } = $props();
	// $inspect(data);

	async function browseTable(tableName) {
		await goto(`/admin/browse-table/${tableName}`);
	}

	async function updateTable(tableName) {
		if (tableName === 'stock_universe') {
			const a = await fetch(`/api/stock-universe/update`, {
				method: 'POST',
				body: JSON.stringify({})
			});
		} else if (tableName === 'groww') {
			const a = await fetch(`/api/groww/update`, {
				method: 'POST',
				body: JSON.stringify({})
			});
		}
	}
</script>

<table>
	<thead>
		<tr>
			<th>Table Name</th>
			<th>Row Count</th>
			<th>Actions</th>
		</tr>
	</thead>
	<tbody>
		{#each data.tables as table}
			<tr>
				<td>{table.name}</td>
				<td>{table.rowCount}</td>
				<td>
					<button onclick={() => browseTable(table.name)}>Browse</button>
					<button onclick={() => updateTable(table.name)}>Update</button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		border: 1px solid #ddd;
		padding: 8px;
	}
</style>
