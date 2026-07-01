<script>
	import { ChartState } from "$lib/state/ChartState.svelte";

let selectedFundType = $state(null);
let data = $state([]);

let isHoldingPage = $state(false);
let clickedFund = $state(null);
let clickedFundData = $state(null);


$effect(async() => {
    if(!selectedFundType) return;
    const a = await fetch(`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/search/v1/derived/scheme?available_for_investment=true&doc_type=scheme&page=0&plan_type=Direct&q=&size=15&sort_by=1&sub_category=${selectedFundType}`)}`);
    data = (await a.json()).content;
});

$effect(async() => {
    if(!clickedFund) return;
    const a = await fetch(`/proxy?url=${encodeURIComponent(`https://groww.in/v1/api/data/mf/web/v5/scheme/search/bandhan-small-cap-fund-direct-growth`)}`);
    clickedFundData = (await a.json());
    
});

</script>

<div>
<div class="MutualFundComponentList" class:hidden={isHoldingPage}>
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
                    <div class="hover:bg-gray-200 cursor-pointer" onclick={(e)=>{e.stopPropagation(); isHoldingPage = true; clickedFund = fund;}} role>Open</div>
                    <p>{Math.round(fund.aum).toLocaleString('en-IN')} Cr</p>
                </div>
            </div>
        {/each}
    </div>
</div>


<div class="MutualFundHoldings" class:hidden={!isHoldingPage}>
    <div class="hover:bg-gray-200 cursor-pointer" onclick={()=>isHoldingPage = false} role>Close</div>
    <div>
        <h3 class='truncate'>{clickedFund?.fund_name}</h3>
    </div>

    {#each clickedFundData?.holdings.filter(item=>item.nature_name==='EQUITY') as holding}
        <div class="HoldingCard border-b text-sm p-1">
            <h3 class="truncate">{holding.company_name}</h3>
            <div class="flex flex-row justify-between">
                <p>{holding.corpus_per}%</p>
            </div>
        </div>
    {/each}
</div>
</div>