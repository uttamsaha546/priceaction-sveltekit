import { json } from "@sveltejs/kit";
import { APPDB } from '$lib/server/appdb';
import JSZip from "jszip";
import * as XLSX from 'xlsx';

export async function GET({ url }) {

    const date = url.searchParams.get('date');

    try {
        if (!date) {
            throw new Error("Missing Date");
        }

        const nseBhavcopyUrl = `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${date.replaceAll('-', '')}_F_0000.csv.zip`;
        const response = await fetch(nseBhavcopyUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch Bhavcopy. Status: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        const zip = await JSZip.loadAsync(arrayBuffer);

        const csvFile = Object.values(zip.files).find(file =>
            !file.dir && (file.name.endsWith('.csv'))
        );

        if (!csvFile) {
            throw new Error("No CSV document found inside the bhavcopy zip archive.");
        }

        const csvText = await csvFile.async("string");

        const workbook = XLSX.read(csvText, { type: "string", cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const bhavcopyData = XLSX.utils.sheet_to_json(worksheet);

        const stockUniverseSymbols = APPDB.TradingViewStockUniverse.getAllSymbol();

        const records = bhavcopyData.map(row => {
            const symbol = String(row.TckrSymb).trim();
            const series = String(row.SctySrs).trim();
            const date = (new Date(row.TradDt)).toLocaleDateString('en-CA');
            const change = Math.round((Number(row.ClsPric) / Number(row.PrvsClsgPric) - 1) * 100 * 100) / 100;
            return { symbol, series, date, change };
        }).filter(row => row.change > 4 && (row.series === 'EQ' || row.series === 'BE') && stockUniverseSymbols.includes(row.symbol));

        APPDB.Bhavcopy.insertBatch(records);

        return json(records.flat())
    } catch (error) {
        return json({ message: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
    }
}