<!-- src/routes/+page.svelte -->
<script>
	import PriceChart from '$lib/components/mfanalysis/PriceChart.svelte';
	let { data } = $props();
	$inspect(data);
</script>

<h1>{data.category}</h1>

<div class="container">
	{#each data.funds as fund}
		<div class="card">
			<div class="truncate">{fund.name}</div>
			<PriceChart {fund} />
		</div>
	{/each}
</div>

<style>
	.container {
		display: grid;
		/* Mobile defaults: single column taking up 100% space */
		grid-template-columns: 1fr;
		gap: 1rem;
		width: 100%;
		box-sizing: border-box;
	}

	.card {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		background: #ffffff;
		width: 100%;
		box-sizing: border-box;
		overflow: hidden;
	}
	.truncate {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	/* 🖥️ DESKTOP MEDIA QUERY FOR TWO CARDS PER ROW */
	@media (min-width: 769px) {
		.container {
			/* Automatically splits space into exactly two columns */
			grid-template-columns: repeat(2, 1fr);
			width: 100%;
			margin: 0 auto; /* Centers the whole container on ultra-wide monitors */
		}
	}
</style>
