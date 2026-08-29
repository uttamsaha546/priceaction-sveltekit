<div class="min-h-screen bg-slate-950 text-white">
	<div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
		<!-- Header -->
		<div class="mb-10 text-center">
			<div
				class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl
                       bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20"
			>
				<svg
					class="h-7 w-7"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
				>
					<path d="M3 3v18h18" />
					<path d="m7 16 4-5 3 3 6-8" />
				</svg>
			</div>

			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Stock Analytics</h1>

			<p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
				Market data, mutual fund analysis, portfolio tracking, and price action tools in one place.
			</p>
		</div>

		<!-- Navigation -->
		<nav class="grid gap-4 sm:grid-cols-2">
			<!-- Chart -->
			<a
				href="/chart"
				class="group relative overflow-hidden rounded-2xl border border-slate-800
                       bg-slate-900/70 p-6 transition-all duration-300
                       hover:-translate-y-1 hover:border-indigo-500/50
                       hover:bg-slate-900 hover:shadow-xl hover:shadow-indigo-500/10"
			>
				<div
					class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl
                           bg-indigo-500/10 text-indigo-400
                           transition group-hover:bg-indigo-500 group-hover:text-white"
				>
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M3 3v18h18" />
						<path d="m7 16 4-5 3 3 6-8" />
					</svg>
				</div>

				<h2 class="text-lg font-semibold">Chart</h2>
				<p class="mt-1 text-sm text-slate-400">Explore stock charts and technical indicators.</p>

				<span
					class="absolute right-6 top-6 text-slate-600 transition
                           group-hover:translate-x-1 group-hover:text-indigo-400"
				>
					→
				</span>
			</a>

			<!-- MF Analysis -->
			<a
				href="/mfanalysis"
				class="group relative overflow-hidden rounded-2xl border border-slate-800
                       bg-slate-900/70 p-6 transition-all duration-300
                       hover:-translate-y-1 hover:border-emerald-500/50
                       hover:bg-slate-900 hover:shadow-xl hover:shadow-emerald-500/10"
			>
				<div
					class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl
                           bg-emerald-500/10 text-emerald-400
                           transition group-hover:bg-emerald-500 group-hover:text-white"
				>
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M4 19V5" />
						<path d="M4 19h16" />
						<path d="m7 15 3-4 3 2 5-7" />
					</svg>
				</div>

				<h2 class="text-lg font-semibold">MF Analysis</h2>
				<p class="mt-1 text-sm text-slate-400">Analyze mutual fund holdings and exposure.</p>

				<span
					class="absolute right-6 top-6 text-slate-600 transition
                           group-hover:translate-x-1 group-hover:text-emerald-400"
				>
					→
				</span>
			</a>

			<!-- Portfolio -->
			<a
				href="/portfolio"
				class="group relative overflow-hidden rounded-2xl border border-slate-800
                       bg-slate-900/70 p-6 transition-all duration-300
                       hover:-translate-y-1 hover:border-amber-500/50
                       hover:bg-slate-900 hover:shadow-xl hover:shadow-amber-500/10"
			>
				<div
					class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl
                           bg-amber-500/10 text-amber-400
                           transition group-hover:bg-amber-500 group-hover:text-white"
				>
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<rect x="3" y="7" width="18" height="13" rx="2" />
						<path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						<path d="M3 12h18" />
					</svg>
				</div>

				<h2 class="text-lg font-semibold">Portfolio</h2>
				<p class="mt-1 text-sm text-slate-400">
					Track holdings, allocation, and portfolio performance.
				</p>

				<span
					class="absolute right-6 top-6 text-slate-600 transition
                           group-hover:translate-x-1 group-hover:text-amber-400"
				>
					→
				</span>
			</a>

			<!-- Docs -->
			<a
				href="/docs"
				class="group relative overflow-hidden rounded-2xl border border-slate-800
                       bg-slate-900/70 p-6 transition-all duration-300
                       hover:-translate-y-1 hover:border-cyan-500/50
                       hover:bg-slate-900 hover:shadow-xl hover:shadow-cyan-500/10"
			>
				<div
					class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl
                           bg-cyan-500/10 text-cyan-400
                           transition group-hover:bg-cyan-500 group-hover:text-white"
				>
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M6 3h9l3 3v15H6z" />
						<path d="M14 3v4h4" />
						<path d="M9 12h6M9 16h6" />
					</svg>
				</div>

				<h2 class="text-lg font-semibold">Docs</h2>
				<p class="mt-1 text-sm text-slate-400">
					Reference data sources, schemas, and pipeline documentation.
				</p>

				<span
					class="absolute right-6 top-6 text-slate-600 transition
                           group-hover:translate-x-1 group-hover:text-cyan-400"
				>
					→
				</span>
			</a>

			<!-- Price Action -->
			<a
				href="/priceaction"
				class="group relative overflow-hidden rounded-2xl border border-slate-800
                       bg-slate-900/70 p-6 transition-all duration-300
                       hover:-translate-y-1 hover:border-rose-500/50
                       hover:bg-slate-900 hover:shadow-xl hover:shadow-rose-500/10
                       sm:col-span-2"
			>
				<div class="flex items-center gap-5">
					<div
						class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                               bg-rose-500/10 text-rose-400
                               transition group-hover:bg-rose-500 group-hover:text-white"
					>
						<svg
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M4 17 9 12l4 4 7-9" />
							<path d="M20 7v5h-5" />
						</svg>
					</div>

					<div>
						<h2 class="text-lg font-semibold">Price Action</h2>
						<p class="mt-1 text-sm text-slate-400">
							Identify trends, momentum, breakouts, and price action setups.
						</p>
					</div>

					<span
						class="ml-auto text-xl text-slate-600 transition
                               group-hover:translate-x-1 group-hover:text-rose-400"
					>
						→
					</span>
				</div>
			</a>
		</nav>

		<!-- Footer -->
		<div class="mt-10 text-center">
			<p class="text-xs text-slate-600">Stock Analytics Dashboard</p>
		</div>
	</div>
</div>
