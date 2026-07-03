import jsonData from '$lib/files/mf.json' with { type: 'json' };

export const load = async ({ params }) => {

    const category = params.slug;

    const funds = jsonData.filter(row=>row.category.toLowerCase()===category.toLowerCase());
    return {
        category,
        funds
    }
}