<!-- src/routes/mfanalysis/category/[slug]/+page.svelte -->
<script>
	import PriceChart from '../../$lib/PriceChart.svelte';
	let { data } = $props();
	$inspect(data);
</script>

<svelte:head>
	<title>Chart - {data.category}</title>
</svelte:head>

<h1>{data.category}</h1>

<div class="container">
	{#each data.funds as fund}
		<div class="card">
			<div class="truncate">{fund.fund_name}</div>
			<!-- <div>{fund.aum.toLocaleString('en-IN')} Cr</div> -->
			<PriceChart scheme_code={fund.scheme_code} />
		</div>
	{/each}
</div>

<style>
	/* Apply 1 column on touch devices */
	@media (hover: none) and (pointer: coarse) {
		.container {
			display: grid;
			/* Mobile defaults: single column taking up 100% space */
			grid-template-columns: 1fr;
			gap: 1rem;
			width: 100%;
			box-sizing: border-box;
		}
	}

	/* Apply 2 columns ONLY on mouse/trackpad desktop devices */
	@media (hover: hover) and (pointer: fine) {
		.container {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
			width: 100%;
			margin: 0 auto; /* Centers the whole container on ultra-wide monitors */
		}
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
</style>
