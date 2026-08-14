import {
    getGrowwMfScreenerData,
    getMfHoldingsDataFromGroww
} from "$lib/server/functions";

export async function load(params) {
    const growwMfScreenerData = await getGrowwMfScreenerData();

    // const mergedData = await Promise.all(
    //     growwMfScreenerData.map(async (x) => {
    //         const mfHoldingsDataFromGroww =
    //             await getMfHoldingsDataFromGroww(x.search_id);

    //         return {
    //             ...x,
    //             ...mfHoldingsDataFromGroww
    //         };
    //     })
    // );

    return {growwMfScreenerData};
}