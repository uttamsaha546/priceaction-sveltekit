<script>
	import dayjs from 'dayjs';
	import { ChartState } from '$lib/state/ChartState.svelte';

	const sectors = [
		{
			name: 'Capital Goods',
			scripName: 'BSE Capital Goods Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SI0200&period=D&todt=' +
				dayjs().format('DD/MM/YYYY'),
			industries: [
				{
					name: 'Aerospace & Defence',
					scripName: 'BSE India Defence Index',
					url:
						'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=INDDEF&period=D&todt=' +
						dayjs().format('DD/MM/YYYY')
				},
				{ name: 'Industrial Products' },
				{ name: 'Electrical Equipment' },
				{ name: 'Industrial Manufacturing' },
				{ name: 'Agricultural Commercial & Construction Vehicle' }
			]
		},
		{
			name: 'Financial Services',
			scripName: 'BSE Financial Services Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SPBSFIIP&period=D&todt=' +
				dayjs().format('DD/MM/YYYY'),
			industries: [
				{
					name: 'Banks',
					scripName: 'BSE BANKEX Index',
					url:
						'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SIBANK&period=D&todt=' +
						dayjs().format('DD/MM/YYYY'),
					subIndustries: [
						{
							name: 'Private Bank',
							scripName: 'BSE Private Banks Index',
							url:
								'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SPBSPBIP&period=D&todt=' +
								dayjs().format('DD/MM/YYYY')
						},
						{
							name: 'PSU Bank',
							scripName: 'BSE PSU Bank Index',
							url:
								'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=PSUBNK&period=D&todt=' +
								dayjs().format('DD/MM/YYYY')
						}
					]
				},
				{
					name: 'Finance',
					subIndustries: [
						{ name: 'NBFC' },
						{
							name: 'Housing Finance',
							scripName: 'BSE Housing Finance Index',
							url:
								'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=BSHFIN&period=D&todt=' +
								dayjs().format('DD/MM/YYYY')
						}
					]
				},
				{
					name: 'Insurance',
					scripName: 'BSE Insurance Index',
					url:
						'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=INSURE&period=D&todt=' +
						dayjs().format('DD/MM/YYYY')
				},
				{
					name: 'Capital Market',
					scripName: 'BSE Capital Market Index',
					url:
						'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=CAPMKT&period=D&todt=' +
						dayjs().format('DD/MM/YYYY')
				},
				{
					name: 'Financial Technology (Fintech)'
				}
			]
		},
		{
			name: 'Healthcare',
			scripName: 'BSE Healthcare Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SI0800&period=D&todt=' +
				dayjs().format('DD/MM/YYYY'),
			industries: [
				{ name: 'Pharma & Biotechnology' },
				{
					name: 'Healthcare Services',
					scripName: 'BSE Hospitals Index',
					url:
						'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=BSHOSP&period=D&todt=' +
						dayjs().format('DD/MM/YYYY')
				},
				{ name: 'Healthcare Equipment & Supplies' }
			]
		},
		{
			name: 'Chemicals',
			industries: [
				{
					name: 'Chemicals & Petrochemicals'
				},
				{ name: 'Fertilizers & Agrochemicals' }
			]
		},
		{
			name: 'Automobile & Auto Components',
			scripName: 'BSE Auto Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SI1900&period=D&todt=' +
				dayjs().format('DD/MM/YYYY'),
			industries: [{ name: 'Automobiles' }, { name: 'Auto Components' }]
		},
		{
			name: 'FMCG',
			scripName: 'BSE Fast Moving Consumer Goods Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SI0600&period=D&todt=' +
				dayjs().format('DD/MM/YYYY'),
			industries: [{ name: 'Sugar & Ethanol' }, { name: '...' }]
		},
		{
			name: 'Consumer Durables',
			scripName: 'BSE Consumer Durables Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SI0400&period=D&todt=' +
				dayjs().format('DD/MM/YYYY')
		},
		{
			name: 'Information Technology',
			scripName: 'BSE Information Technology Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SI1000&period=D&todt=' +
				dayjs().format('DD/MM/YYYY')
		},
		{
			name: 'Consumer Services',
			industries: [{ name: 'Retailing' }, { name: 'Leisure Service (Tourism 63%)' }]
		},
		{
			name: 'Services',
			scripName: 'BSE Services Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SPBSSEIP&period=D&todt=' +
				dayjs().format('DD/MM/YYYY')
		},
		{ name: 'Construction' },
		{
			name: 'Oil & Gas',
			scripName: 'BSE Oil & Gas Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SI1400&period=D&todt=' +
				dayjs().format('DD/MM/YYYY')
		},
		{ name: 'Textiles' },
		{
			name: 'Metal',
			scripName: 'BSE Metal Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SI1200&period=D&todt=' +
				dayjs().format('DD/MM/YYYY')
		},
		{
			name: 'Realty',
			scripName: 'BSE Realty Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SIREAL&period=D&todt=' +
				dayjs().format('DD/MM/YYYY')
		},
		{
			name: 'Power',
			scripName: 'BSE Power Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SIPOWE&period=D&todt=' +
				dayjs().format('DD/MM/YYYY')
		},
		{ name: 'Cement' },
		{
			name: 'Telecommunication',
			scripName: 'BSE Telecommunication Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SPBSTLIP&period=D&todt=' +
				dayjs().format('DD/MM/YYYY')
		},
		{ name: 'Media/Waves' },
		{
			name: 'Utilities',
			scripName: 'BSE Utilities Index',
			url:
				'https://api.bseindia.com/BseIndiaAPI/api/IndexArchDailyPAR/w?fmdt=01/01/1996&index=SPBSUTIP&period=D&todt=' +
				dayjs().format('DD/MM/YYYY')
		}
	];
</script>

<h1>IndexAnalysisComponent</h1>

<div class="p-1">
	{#each sectors as sector}
		<div class="container">
			<div
				class="sector-row pl-1"
				class:cursor-pointer={sector?.url}
				class:bg-gray-300={!sector?.url}
				class:bg-[rgba(4,180,136)]={sector?.url}
				onclick={async () => {
					ChartState.isLoading = true;
					const p = await fetch(`/proxy?url=${encodeURIComponent(sector.url)}`, {
						headers: {
							'X-Forwarded-Referer': 'https://www.bseindia.com/'
						}
					});

					const data = (await p.json()).Table.map((row) => [
						dayjs(row.tdate).valueOf(),
						row.I_close
					]);

					ChartState.lineData = data;
					ChartState.currentScrip = sector.scripName;
					ChartState.isLoading = false;
				}}
				role
			>
				{sector.name}
			</div>

			{#if sector.industries}
				{#each sector.industries as industry}
					<div
						class="industry-row pl-4"
						class:text-gray-300={!industry?.url}
						onclick={async () => {
							ChartState.isLoading = true;
							const p = await fetch(`/proxy?url=${encodeURIComponent(industry.url)}`, {
								headers: {
									'X-Forwarded-Referer': 'https://www.bseindia.com/'
								}
							});

							const data = (await p.json()).Table.map((row) => [
								dayjs(row.tdate).valueOf(),
								row.I_close
							]);

							ChartState.lineData = data;
							ChartState.currentScrip = industry.scripName;
							ChartState.isLoading = false;
						}}
						role
					>
						{industry.name}
					</div>

					{#if industry.subIndustries}
						{#each industry.subIndustries as sub}
							<div
								class="sub-row pl-7"
								class:text-gray-300={!sub?.url}
								onclick={async () => {
									ChartState.isLoading = true;
									const p = await fetch(`/proxy?url=${encodeURIComponent(sub.url)}`, {
										headers: {
											'X-Forwarded-Referer': 'https://www.bseindia.com/'
										}
									});

									const data = (await p.json()).Table.map((row) => [
										dayjs(row.tdate).valueOf(),
										row.I_close
									]);

									ChartState.lineData = data;
									ChartState.currentScrip = sub.scripName;
									ChartState.isLoading = false;
								}}
								role
							>
								{sub.name}
							</div>
						{/each}
					{/if}
				{/each}
			{/if}
		</div>
	{/each}
</div>

<style>
	.sector-row,
	.industry-row,
	.sub-row {
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.container {
		border: 1px solid rgb(4, 180, 136);
		border-radius: 0.25rem;
		margin-bottom: 0.25rem;
	}

	.sector-row {
		/* background-color: rgb(4, 180, 136); groww green */
		color: white;
		font-weight: 500;
	}
</style>
