import { json } from "@sveltejs/kit";

import { APPDB } from '$lib/server/appdb';

export async function GET() {
    let date = (
        (() => {
            const d = new Date();
            const day = d.getDay();

            if (day === 0) d.setDate(d.getDate() - 2); // Sunday → Friday
            if (day === 6) d.setDate(d.getDate() - 1); // Saturday → Friday

            return d.toLocaleDateString('en-CA');
        })()
    );


    let dateHeaders =
        Array.from({ length: 12 }, (_, i) => {
            const d = new Date(date);
            let count = 0;

            while (count < i) {
                d.setDate(d.getDate() - 1);

                // Skip Saturdays (6) and Sundays (0)
                if (d.getDay() !== 0 && d.getDay() !== 6) {
                    count++;
                }
            }

            return d.toLocaleDateString('en-CA');
        });

    const from = dateHeaders[dateHeaders.length - 1];
    const to = dateHeaders[0];


    const result = APPDB.Bhavcopy.Between({ from, to });
    const stockUniverseWithRsiIndustry = APPDB.StockUniverseWithRsiIndustry.symbolMap();

    const transformedData = {};

    for (const element of result) {
        if (!transformedData[element.symbol]) {
            transformedData[element.symbol] = {
                symbol: element.symbol,
                ...stockUniverseWithRsiIndustry.get(element.symbol),
                data: {},
                count: 0
            };
        }

        transformedData[element.symbol].count++;
        transformedData[element.symbol].data[element.date] = element.change;
    }

    const shapedData = Object.values(transformedData).sort((a, b) => b.count - a.count);


    return json(shapedData)
}