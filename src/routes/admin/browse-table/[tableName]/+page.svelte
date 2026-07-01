<script>
	let { data } = $props();
	$inspect(data);
</script>

<h3>Table: {data.tableName}, Rows: {data.tableData.length}</h3>

<table>
	<thead>
		<tr>
			{#each Object.keys(data.tableData[0]) as key}
				{#if key === 'value'}
					<th></th>
				{:else}
					<th>{key}</th>
				{/if}
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each data.tableData as row}
			<tr>
				{#each Object.keys(row) as key}
					{#if key === 'value'}
						<td></td>
					{:else}
						<td>{row[key]}</td>
					{/if}
				{/each}
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
