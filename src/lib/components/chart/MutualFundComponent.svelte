<script>
	import { ChartState } from "$lib/state/ChartState.svelte";

let selectedFundType = $state('Large Cap');
let data = $state([]);


$effect(async() => {
    const a = await fetch(`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/search/v1/derived/scheme?available_for_investment=true&doc_type=scheme&page=0&plan_type=Direct&q=&size=15&sort_by=1&sub_category=${selectedFundType}`)}`);
    data = (await a.json()).content;
});

</script>

<div>
    <div class="Filters">
        <select bind:value={selectedFundType}>
            <option value="Large Cap">Large Cap</option>
            <option value="Mid Cap">Mid Cap</option>
            <option value="Small Cap">Small Cap</option>
        </select>
    </div>
    <div class="Content">
        {#each data as fund}
            <div class="FundCard border-b text-sm p-1" onclick={async() => {
                const a = await fetch(`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/data/mf/web/v1/scheme/${fund.scheme_code}/graph?benchmark=false&months=1000`)}`);
                const data = (await a.json()).folio;
                ChartState.lineData = data.data;
                ChartState.currentScrip = data.name;
            }} role>
                <h3 class="truncate">{fund.fund_name}</h3>
                <div class="flex flex-row justify-between">
                    <p>{fund.groww_rating} Star</p>
                    <p>{Math.round(fund.aum).toLocaleString('en-IN')} Cr</p>
                </div>
            </div>
        {/each}
    </div>
</div>