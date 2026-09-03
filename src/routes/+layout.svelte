<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// Check if the client is touch device
	if (typeof window !== 'undefined') {
		window.isTouchable =
			window.matchMedia('(any-pointer: coarse)').matches ||
			'ontouchstart' in window ||
			navigator.maxTouchPoints > 0 ||
			navigator.msMaxTouchPoints > 0;
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
