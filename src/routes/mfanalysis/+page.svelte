<script>
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>MF Analysis</title>
</svelte:head>

<div class="prose flex flex-col m-auto justify-center h-screen w-screen">
	<h3><a href={resolve('/mfanalysis/overview')}>Overview</a></h3>
	<h3><a href="/mfanalysis/manage">Manage</a></h3>
	<h3><a href="/mfanalysis/category/Index">Index</a></h3>
	<h3><a href="/mfanalysis/category/Healthcare">Healthcare</a></h3>
	<h3><a href="/mfanalysis/category/Technology">Technology</a></h3>
	<h3><a href="/mfanalysis/category/Auto">Auto</a></h3>
	<h3><a href="/mfanalysis/category/Small Cap">Small Cap</a></h3>
</div>
