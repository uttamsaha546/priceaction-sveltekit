<script>
	import { ChartState } from '$lib/state/ChartState.svelte';
	import Modal from './Modal.svelte';
	import SettingsModalContent from './SettingsModalContent.svelte';
	import SymbolSearchModalContent from './SymbolSearchModalContent.svelte';
	import SettingsIcon from './Icons/SettingsIcon.svelte';
</script>

<div class="h-full flex flex-row gap-2 items-center">
	<div class="ProfilePicture w-11 flex flex-row justify-center">
		<button class="px-2 py-px rounded-full bg-gray-200">U</button>
	</div>

	<div class="Tools flex-1 flex flex-row gap-2">
		<div class="Search">
			<button
				class="bg-gray-100 hover:bg-gray-200 font-bold rounded-2xl w-36 p-px"
				onclick={() => {
					ChartState.activeModal = 'search';
				}}
			>
				A</button
			>
		</div>
		<div class="ScaleFactor">{ChartState.scaleFactor}</div>
	</div>

	<div class="Settings w-11 flex flex-row justify-center">
		<button
			class="hover:bg-gray-200 rounded p-0.5"
			onclick={() => {
				ChartState.activeModal = 'settings';
			}}
		>
			<SettingsIcon />
		</button>
	</div>
</div>

{#if ChartState.activeModal}
	<Modal
		isOpen={true}
		title={ChartState.activeModal === 'settings' ? 'Settings' : 'Symbol search'}
		onClose={() => (ChartState.activeModal = null)}
		size={ChartState.activeModal === 'settings' ? 'small' : 'large'}
		backdrop={ChartState.activeModal === 'settings' ? false : true}
	>
		{#if ChartState.activeModal === 'settings'}
			<SettingsModalContent />
		{:else if ChartState.activeModal === 'search'}
			<SymbolSearchModalContent />
		{/if}
	</Modal>
{/if}
