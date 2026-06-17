<script>
	import CloseIcon from './Icons/CloseIcon.svelte';
	let modalContainer;

	let {
		isOpen,
		onClose,
		title = 'Title',
		children = 'Content',
		size = 'large',
		backdrop = true
	} = $props();

	function handleCloseModal() {
		onClose?.();
	}

	function handleKeyDown(event) {
		if (event.key === 'Escape') {
			handleCloseModal();
		}
	}

	$effect(() => {
		if (!modalContainer) return;

		if (isOpen && !modalContainer.open) {
			modalContainer.showModal();
		}

		if (!isOpen && modalContainer.open) {
			modalContainer.close();
		}
	});
</script>

<dialog
	bind:this={modalContainer}
	class="modal w-1/2"
	class:backdrop:bg-transparent={!backdrop}
	style:width={size === 'small' ? '50%' : '80%'}
	onkeydown={handleKeyDown}
	onclose={handleCloseModal}
>
	<div class="h-full p-0.5">
		<div class="Heading flex flex-row items-center mb-4">
			<h1 class="flex-1 font-semibold text-xl">{title}</h1>

			<button
				class="hover:bg-gray-200 hover:rounded-sm p-2"
				onclick={handleCloseModal}
				aria-label="Close modal"
			>
				<CloseIcon />
			</button>
		</div>

		{@render children?.()}
	</div>
</dialog>

<style>
	.modal {
		width: 50%;
		height: 95%;
		max-width: 840px;
		max-height: 680px;
		margin: auto;
		padding: 1rem;
		border: 0;
		border-radius: 0.5rem;
		position: relative;
		box-shadow: rgba(0, 0, 0, 0.2) 0px 2px 4px 0px;
		user-select: none;
	}
</style>
