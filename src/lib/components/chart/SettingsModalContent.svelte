<script>
	import { ChartState } from '$lib/state/ChartState.svelte';
	import { onMount } from 'svelte';

	let squeezeW = $state();
	let squeezeM = $state();

	onMount(() => {
		let settings = localStorage.getItem('settings');
		if (settings) {
			settings = JSON.parse(settings);
			squeezeW = settings?.squeezeW || 30;
			squeezeM = settings?.squeezeM || 0.2;
		} else {
			squeezeW = 30;
			squeezeM = 0.2;
		}
	});

	$effect(() => {
		ChartState.scaleW = squeezeW;
		ChartState.scaleM = squeezeM;

		localStorage.setItem(
			'settings',
			JSON.stringify({
				squeezeW,
				squeezeM
			})
		);
	});

	$inspect(ChartState.scaleW);

	function revertToDefault() {
		squeezeW = 30;
		squeezeM = 0.2;
		localStorage.setItem(
			'settings',
			JSON.stringify({
				squeezeW,
				squeezeM
			})
		);
	}
</script>

<div>Settings Content</div>

<section class="flex flex-col gap-2">
	<label>
		Squeeze price scale in Weekly timeframe by
		<input type="range" min="1" max="500" bind:value={squeezeW} />
		<input min="1" max="500" bind:value={squeezeW} />
	</label>

	<label>
		Squeeze price scale in Monthly timeframe by
		<input type="range" min="0.01" max="100" step="0.01" bind:value={squeezeM} />
		<input min="0.1" max="100" bind:value={squeezeM} />
	</label>

	<div>
		Monthly Interval SMA lenth
		<input class="border outline-0" type="number" /> Months
	</div>

	<div>
		Weekly Interval SMA length
		<input class="border outline-0" type="number" /> Weeks
	</div>

	<button class="bg-indigo-700 text-white" onclick={revertToDefault}>Default</button>
</section>
