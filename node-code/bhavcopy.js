import { parseArgs } from 'node:util';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { insertBhavcopyRows } from './database.ts';

// 1. Get today's date in YYYY-MM-DD format (accounting for local timezone)
const today = new Date().toLocaleDateString('en-CA'); // 'en-CA' outputs exactly YYYY-MM-DD

const config = {
	options: {
		from: { type: 'string', short: 'f' },
		to: { type: 'string', short: 't' }
	},
	allowPositionals: true
};

const { values, positionals } = parseArgs(config);

// 2. Determine 'from' date based on priority: Flag -> Positional -> Fallback (Today)
let fromDate = values.from || positionals[0] || today;

// 3. Determine 'to' date based on priority: Flag -> Fallback (same as fromDate)
let toDate = values.to || fromDate;

console.log('--- Configured Dates ---');
console.log('From Date:', fromDate);
console.log('To Date  :', toDate);

// --- UTILITY FUNCTIONS ---
function parseLocalDate(dateStr) {
	if (typeof dateStr === 'object') {
		return new Date(dateStr);
	}
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(year, month - 1, day);
}

function formatURLDate(dateObj) {
	const y = dateObj.getFullYear();
	const m = String(dateObj.getMonth() + 1).padStart(2, '0');
	const d = String(dateObj.getDate()).padStart(2, '0');
	return `${y}${m}${d}`;
}

// --- MAIN DOWNLOAD & PARSE LOOP ---
async function processBhavcopyRange(startStr, endStr) {
	let current = parseLocalDate(startStr);
	const end = parseLocalDate(endStr);

	while (current <= end) {
		const dayOfWeek = current.getDay();

		// 1. Skip Weekends
		if (dayOfWeek === 0 || dayOfWeek === 6) {
			current.setDate(current.getDate() + 1);
			continue;
		}

		const tradeDate = current.toLocaleDateString('en-CA');
		const dateFormatted = formatURLDate(current);
		const url = `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${dateFormatted}_F_0000.csv.zip`;

		console.log(`\n🌐 Fetching: ${url}`);

		try {
			// 2. Fetch the zipped payload as an ArrayBuffer
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
				}
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status} - Not found or market holiday.`);
			}

			const arrayBuffer = await response.arrayBuffer();

			// 3. Load into JSZip and locate the CSV file inside
			const zip = await JSZip.loadAsync(arrayBuffer);
			const csvFile = Object.values(zip.files).find((file) => file.name.endsWith('.csv'));

			if (!csvFile) {
				throw new Error('No .csv file found inside the downloaded zip archive.');
			}

			// Convert the zipped binary data directly into a raw text string
			const csvText = await csvFile.async('string');
			console.log(`⚙️ Unzipped: ${csvFile.name} (${(csvText.length / 1024).toFixed(1)} KB)`);

			// 4. Parse the CSV text using PapaParse
			// Use Papa.parse's 'step' callback to process it row-by-row to save memory
			const rows = [];
			await new Promise((resolve, reject) => {
				Papa.parse(csvText, {
					header: true, // Converts rows into JSON objects mapping columns to keys
					skipEmptyLines: true, // Bypasses tailing blank rows
					step: function (results) {
						const row = results.data;

						// --- FILTER CONDITION ---
						// Example: Select normal equities (EQ) with substantial trading volume
						if (row.SctySrs === 'EQ' || row.SctySrs === 'BE') {
							const stockRecord = {
								instrument_id: Number(row.FinInstrmId),
								symbol: row.TckrSymb,
								open: Number(row.OpnPric),
								high: Number(row.HghPric),
								low: Number(row.LwPric),
								close: Number(row.ClsPric),
								volume: Number(row.TtlTradgVol),
								traded_value: Number(row.TtlTrfVal),
								trade_date: tradeDate
							};

							// 💥 PLACE YOUR DATABASE SAVE HERE 💥
							rows.push(stockRecord);
						}
					},
					complete: resolve,
					error: reject
				});
			});

			console.log(`💾 Saving ${rows.length} rows...`);
			insertBhavcopyRows(rows);
			console.log(`✅ Completed ${dateFormatted}`);
		} catch (error) {
			console.error(`❌ Error on ${dateFormatted}:`, error.message);
		}

		// Advance loop by 1 day
		current.setDate(current.getDate() + 1);
	}
}

// Execute pipeline
await processBhavcopyRange(fromDate, toDate);
