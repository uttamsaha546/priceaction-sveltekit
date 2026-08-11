import { json } from "@sveltejs/kit";

export async function GET({url}) {
    const sub_category = url.searchParams.get('sub_category');

    const uri = `https://groww.in/v1/api/search/v3/query/filter_derived_data/st_filter?available_for_investment=true&cat=Equity&doc_type=scheme&index=false&page=0&plan_type=Direct&scheme_type=Growth&size=200&sort_by=4&sub_cat=${sub_category}&sub_sub_cat=null&tags=null`;
    
    const cache = hotCache.get(uri);
    if(cache!==undefined){
        return json(cache)
    }
    const res = await fetch(uri);
    const data = await res.json();
    hotCache.set(uri, data);

	return json(data);	
}