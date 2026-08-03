import {cache} from '$lib/utils/cache';

export async function load() {
    const healthcare = await getData({name: 'NIFTY HEALTHCARE', indexName:'NIFTY HEALTHCARE' });
    const pharma = await getData({name: 'NIFTY PHARMA', indexName:'NIFTY PHARMA' });    
    const hospitals = await getData({name: 'NIFTY HOSPITALS', indexName:'NIFTY HOSPITALS' });
    return { hospitals: hospitals, pharma: pharma, healthcare: healthcare };
}


async function getData(obj){
    const url = 'https://www.niftyindices.com/BackPage/getHistoricaldatatabletoString';
    const payload = {
                "cinfo": `{'name':'${obj.name}','startDate':'01-Jan-2000','endDate':'03-Aug-2026','indexName':'${obj.indexName}'}`
            };

    const cacheKey = url + JSON.stringify(payload);

    const fetchFn = async () => {
        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
            'Content-Type': 'application/json'
            }
        });
        const data =  await res.json();
        const formattedData = data.map(item => ({
            time: new Date(item['HistoricalDate']).toLocaleDateString('en-CA'),
            value: parseFloat(item['CLOSE'])
        })).sort((a, b) => new Date(a.time) - new Date(b.time));
        return formattedData;
    }

    const data = await cache.fetch(cacheKey, fetchFn, 24 * 60 * 60 * 1000); // Cache for 24 hours

    return data;
}