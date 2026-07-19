<script>
import {deserialize} from '$app/forms';
 let watchlistName = $state();
 let watchlistStocks = $state();
 
async function saveData(){
    if(!watchlistName) return;
    let symArr = [];
    if(watchlistStocks) {
      symArr = watchlistStocks.replaceAll('NSE:','').split(",");
    }
    const formData = new FormData();
    formData.append('name', watchlistName);
    formData.append('entries', symArr);
    
    const res = await fetch('?/createWatchlist', {
      method: 'POST',
      body: formData
    });
    
    const data = deserialize(await res.text());
    
    console.log(data);
 }
</script>
<div class="flex flex-col gap-2">
<input bind:value ={watchlistName} class="border border-gray-400 rounded px-2 py-1"
placeholder="watchlistName" />

<textarea bind:value={watchlistStocks} class="border border-gray-400 rounded px-2 py-1"
placeholder="watchlistStock Symbols" rows="5"/>

<button class="bg-indigo-700 text-white px-2 py-1 rounded"
  onclick={saveData}
>Save</button>
</div>