<script>
	async function testButton() {
		const a = await fetch('/testPage/testApi');
		const j = await a.json();
		console.log(j);
	}
</script>

<div class="w-screen h-screen flex items-center justify-center">
	<button
		class="bg-indigo-600 text-white font-bold px-2 py-1 rounded hover:bg-indigo-700 cursor-pointer active:bg-indigo-700/80 shadow"
		onclick={testButton}
	>
		Click to Test
	</button>
</div>
