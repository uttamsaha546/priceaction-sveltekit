<script>
	import ScreenerComponent from './ScreenerComponent.svelte';
	import BhavcopyComponent from './BhavcopyComponent.svelte';

	let activeTab = $state('SCREENER');
</script>

<div class="w-full max-w-7xl mx-auto p-4 sm:p-6 bg-slate-50 min-h-screen">
	<!-- Segmented Tab Navigation Control -->
	<div
		class="flex items-center justify-start p-1 mb-6 max-w-xs bg-slate-200/80 rounded-xl border border-slate-300/40 backdrop-blur-sm"
	>
		<button
			onclick={() => (activeTab = 'BHAVCOPY')}
			class="flex-1 text-center py-2 text-xs font-bold tracking-wide uppercase rounded-lg transition-all duration-200 select-none
				{activeTab === 'BHAVCOPY'
				? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5'
				: 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'}"
		>
			Bhavcopy
		</button>

		<button
			onclick={() => (activeTab = 'SCREENER')}
			class="flex-1 text-center py-2 text-xs font-bold tracking-wide uppercase rounded-lg transition-all duration-200 select-none
				{activeTab === 'SCREENER'
				? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5'
				: 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'}"
		>
			Screener
		</button>
	</div>

	<!-- Render Context Layout Area -->
	<main class="transition-all duration-300 ease-in-out">
		{#if activeTab === 'SCREENER'}
			<div class="animate-fadeIn">
				<ScreenerComponent />
			</div>
		{:else if activeTab === 'BHAVCOPY'}
			<div class="animate-fadeIn">
				<BhavcopyComponent />
			</div>
		{/if}
	</main>
</div>
