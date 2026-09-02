<script>
	import { ChartState } from '$lib/state/ChartState.svelte';
	import Modal from './Modal.svelte';
	import SettingsModalContent from './SettingsModalContent.svelte';
	import SymbolSearchModalContent from './SymbolSearchModalContent.svelte';
	import SettingsIcon from './Icons/SettingsIcon.svelte';
	import { goto } from '$app/navigation';
	import CloseIcon from './Icons/CloseIcon.svelte';
	import AxisIcon from './Icons/AxisIcon.svelte';
	import { onMount } from 'svelte';

	// =====================
	// SETTINGS
	// ====================

	let settingsDialog;
	function openSettingsDialog() {
		settingsDialog?.showModal();
	}

	function closeSettingsDialog(e) {
		e.stopPropagation();
		settingsDialog.close();
	}

	let squeezeW = $state();
	let squeezeM = $state();
	let squeezeF = $state();

	onMount(() => {
		let settings = localStorage.getItem('settings');
		if (settings) {
			settings = JSON.parse(settings);
			squeezeW = settings?.squeezeW || 100;
			squeezeF = settings?.squeezeF || 50;
			squeezeM = settings?.squeezeM || 25;
		} else {
			squeezeW = 100;
			squeezeF = 50;
			squeezeM = 25;
		}
	});

	$effect(() => {
		ChartState.scaleW = squeezeW;
		ChartState.scaleF = squeezeF;
		ChartState.scaleM = squeezeM;

		localStorage.setItem(
			'settings',
			JSON.stringify({
				squeezeW,
				squeezeF,
				squeezeM
			})
		);
	});

	// Drag
	let x = $state(0);
	let y = $state(0);

	let dragging = $state(false);
	let startX = 0;
	let startY = 0;

	function startDrag(event) {
		// Only respond to the primary mouse button
		if (event.button !== 0) return;

		if (event.target.closest('button')) return;

		dragging = true;

		startX = event.clientX - x;
		startY = event.clientY - y;

		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function drag(event) {
		if (!dragging) return;

		x = event.clientX - startX;
		y = event.clientY - startY;
	}

	function stopDrag(event) {
		dragging = false;

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}
</script>

<div class="h-full flex flex-row gap-2 items-center">
	<div class="ProfilePicture w-11 flex flex-row justify-center">
		<button onclick={() => goto('/')} class="px-2 py-px rounded-full bg-gray-200">U</button>
	</div>

	<div class="Tools flex-1 flex flex-row gap-2">
		<div class="Search">
			<button
				class="bg-gray-100 hover:bg-gray-200 font-bold rounded-2xl w-36 p-px"
				onclick={() => {
					ChartState.activeModal = 'search';
				}}
			>
				Search</button
			>
		</div>
		<div class="ScaleFactor">{ChartState.scaleFactor}</div>
		<div class="Current Scrip Name">
			{typeof ChartState.currentScrip === 'object'
				? ChartState.currentScrip.name
				: ChartState.currentScrip}
		</div>
	</div>

	<button
		class:bg-gray-400={ChartState.timeframe === 'F'}
		class="border border-gray-400 rounded px-2 box-border"
		onclick={() =>
			ChartState.timeframe === 'F' ? (ChartState.timeframe = 'W') : (ChartState.timeframe = 'F')}
		>F</button
	>

	<div class="Settings w-11 flex flex-row justify-center">
		<button
			class="hover:bg-gray-200 rounded p-0.5"
			onclick={() => {
				// ChartState.activeModal = 'settings';
				openSettingsDialog();
			}}
		>
			<SettingsIcon />
		</button>
	</div>
</div>

<!-- {#if ChartState.activeModal} -->
<Modal
	isOpen={ChartState.activeModal}
	title={ChartState.activeModal === 'settings' ? 'Settings' : 'Symbol search'}
	onClose={() => (ChartState.activeModal = null)}
	size={ChartState.activeModal === 'settings' ? 'small' : 'large'}
	backdrop={ChartState.activeModal === 'settings' ? false : true}
>
	<!-- <div class:hidden={ChartState.activeModal !== 'settings'}>
		<SettingsModalContent />
	</div> -->
	<div class:hidden={ChartState.activeModal !== 'search'}>
		<SymbolSearchModalContent />
	</div>
</Modal>
<!-- {/if} -->

<!-- ================================================= -->
<!-- SETTINGS DIALOG -->
<!-- ================================================= -->

<dialog
	bind:this={settingsDialog}
	class="m-auto
		p-0
		w-130
		rounded-lg
		shadow-xl
		border
		border-gray-200
		backdrop:bg-transparent"
	style={`transform: translate(${x}px, ${y}px);`}
>
	<div class="bg-white rounded">
		<div
			class="flex flex-row justify-between px-5 py-4 cursor-grab select-none"
			onpointerdown={startDrag}
			onpointermove={drag}
			onpointerup={stopDrag}
		>
			<h2 class="font-semibold text-xl">Settings</h2>
			<button class="hover:bg-gray-200 p-2 rounded" onclick={closeSettingsDialog}>
				<CloseIcon />
			</button>
		</div>
		<hr class="text-gray-200" />

		<div class="h-72 flex flex-row">
			<div class="flex-1 mt-1">
				<button class="px-5 py-1 w-full flex flex-row items-center gap-2 hover:bg-gray-200"
					><span><AxisIcon /></span>
					<span>Scales</span></button
				>
			</div>
			<div class="w-px h-full bg-gray-200"></div>
			<div class="flex-2 px-5 py-4 grid grid-cols-[1fr_2fr_1fr] content-start gap-2">
				<label class="grid grid-cols-subgrid col-span-3 gap-2 items-center">
					<span>Weekly</span>
					<input type="range" min="1" max="500" bind:value={squeezeW} />
					<input
						min="1"
						max="500"
						bind:value={squeezeW}
						class="w-12 px-2 focus:outline-blue-500 focus:outline-1 rounded"
					/>
				</label>

				<label class="grid grid-cols-subgrid col-span-3 gap-2 items-center">
					Fortnightly
					<input type="range" min="1" max="100" bind:value={squeezeF} />
					<input
						min="1"
						max="100"
						bind:value={squeezeF}
						class="w-12 px-2 focus:outline-blue-500 focus:outline-1 rounded"
					/>
				</label>

				<label class="grid grid-cols-subgrid col-span-3 gap-2 items-center">
					Monthly
					<input type="range" min="1" max="100" bind:value={squeezeM} />
					<input
						min="1"
						max="100"
						bind:value={squeezeM}
						class="w-12 px-2 focus:outline-blue-500 focus:outline-1 rounded"
					/>
				</label>
			</div>
		</div>

		<hr class="text-gray-200" />
		<div
			class="flex justify-end
					gap-2 m-5"
		>
			<button
				class="px-3 py-1
						rounded
						outline
						hover:bg-gray-100"
				onclick={closeSettingsDialog}
			>
				Cancel
			</button>

			<button
				class="px-3 py-1 rounded bg-gray-800 text-white
		hover:bg-gray-700"
				onclick={closeSettingsDialog}
			>
				Ok
			</button>
		</div>
	</div>
</dialog>
