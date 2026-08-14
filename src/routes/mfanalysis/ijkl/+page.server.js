import {
	getGrowwMfScreenerData,
	getMfHoldingsDataFromGroww,
	getFormattedMfHoldings
} from '$lib/server/functions';

export async function load(params) {
	const growwMfScreenerData = await getGrowwMfScreenerData();

	const formattedMfHolding = getFormattedMfHoldings();

	const formattedMfHoldingMap = new Map(formattedMfHolding.map((x) => [x.search_id, x]));

	const mergedData = growwMfScreenerData.map((x) => {
		return {
			...x,
			...formattedMfHoldingMap.get(x.search_id)
		};
	});

	return {data:mergedData};
}
