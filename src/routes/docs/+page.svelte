<script>
	import { fstat } from 'fs';
</script>

<article class="prose max-w-5xl mx-auto p-4">
	<h1>Caching on Server Side</h1>
	<p>
		To prevent multiple api call to external server for same resources (api calls to Groww, Dhan,
		etc), caching on server is needed. Caching with Javascript Map works but it only exixts in
		memory, so it disappears when Node.js or Termux restarts. To preserve it, you need to
		periodically save it to persistent storage (like JSON file/SQLite db/Redis) and reload it on
		startup.
	</p>
	<h4>For a Termux-hosted Node.js server</h4>

	<div aria-label="JSON file" class="py-1">
		<!-- The details tag handles all open/close state natively -->
		<details class="group border border-gray-200 rounded-lg bg-white overflow-hidden">
			<!-- The summary tag acts as the clickable header -->
			<summary
				class="list-none p-1 font-semibold flex justify-between items-center cursor-pointer bg-gray-50 hover:bg-gray-100 select-none [&::-webkit-details-marker]:hidden"
			>
				Small cache (&lt 10 MB): JSON file is easiest
				<!-- Icon Wrapper -->
				<span class="text-xl font-medium leading-none select-none">
					<!-- Plus shown by default, hidden when open -->
					<span class="block group-open:hidden">+</span>
					<!-- Minus hidden by default, shown when open -->
					<span class="hidden group-open:block">−</span>
				</span>
			</summary>

			<!-- Content revealed only when open -->
			<div class="p-1 text-gray-600 border-t border-gray-100 animate-fadeIn">
				<pre><code class="language-javascript">
                    import fs from 'fs';
                    
                    const cache = new Map();

                    //Load cache on startup
                    <!-- function loadCache(){
                        if (fs.existsSync('cache.json')){
                            const data = JSON.parse(fs.readFileSync('cache.json', 'utf8'));
                            return new Map(data);
                        }
                        return new Map();
                    } -->
                </code></pre>
			</div>
		</details>
	</div>

	<div aria-label="SQLite" class="py-1">
		<details class="group border border-gray-200 rounded-lg bg-white overflow-hidden">
			<summary
				class="list-none p-1 font-semibold flex justify-between items-center cursor-pointer bg-gray-50 hover:bg-gray-100 select-none [&::-webkit-details-marker]:hidden"
			>
				Medium cache (10 MB-1 GB): SQLite is usually the best choice

				<span class="text-xl font-medium leading-none select-none">
					<span class="block group-open:hidden">+</span>
					<span class="hidden group-open:block">−</span>
				</span>
			</summary>
			<div class="p-1 text-gray-600 border-t border-gray-100 animate-fadeIn">
				This content expands instantly without any JavaScript!
			</div>
		</details>
	</div>

	<div aria-label="Redis" class="py-1">
		<details class="group border border-gray-200 rounded-lg bg-white overflow-hidden">
			<summary
				class="list-none p-1 font-semibold flex justify-between items-center cursor-pointer bg-gray-50 hover:bg-gray-100 select-none [&::-webkit-details-marker]:hidden"
			>
				High update rate or multiple processes: Redis

				<span class="text-xl font-medium leading-none select-none">
					<span class="block group-open:hidden">+</span>
					<span class="hidden group-open:block">−</span>
				</span>
			</summary>
			<div class="p-1 text-gray-600 border-t border-gray-100 animate-fadeIn">
				This content expands instantly without any JavaScript!
			</div>
		</details>
	</div>
</article>
