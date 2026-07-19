import dayjs from "dayjs";
import { XMLParser } from "fast-xml-parser";
import { parse } from 'node-html-parser';
import { zstdCompressSync, zstdDecompressSync } from "node:zlib";

class NseScraper {
    constructor(db) {
        this.db = db;
        this.cacheTable = 'quarterly_results_cache';

        this._createSchema();

        this.getCacheStmt = this.db.prepare(`SELECT compressed_response FROM ${this.cacheTable} WHERE url=?`);
        this.setCacheStmt = this.db.prepare(`INSERT OR REPLACE INTO ${this.cacheTable} (url, compressed_response) VALUES (?, ?)`);
    }

    _createSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS ${this.cacheTable} (
                url TEXT PRIMARY KEY,
                compressed_response BLOB,
                type TEXT
            ) WITHOUT ROWID;
        `);
    }

    /**
     * Set cache to the database
     * @param {string} key url
     * @param {string} value xml or html text
     * @returns 
     */
    _setCache(key, value) {
        const compressedZstd = zstdCompressSync(Buffer.from(value));
        const result = this.setCacheStmt.run(key, compressedZstd);
    }

    /**
     * Retrive cache from database using url as key
     * @param {string} key url
     * @returns {string} xml or html text
     */
    _getCache(key) {
        const result = this.getCacheStmt.get(key);
        if (result) return zstdDecompressSync(result.compressed_response).toString('utf-8');
        return null;
    }

    /**
     * New way of filling corporate results following SEBI orders in 2024
     * @param {*} symbol 
     * @returns 
     */
    async _getIntegratedFiling(symbol) {
        const response = await fetch(`https://www.nseindia.com/api/integrated-filing-results?&symbol=${symbol}&type=Integrated%20Filing-%20Financials&page=1&size=20`);
        const array = (await response.json()).data;
        // console.log(array)

        //group entry by quarter date
        const grouped = {};
        array.forEach(element => {
            const key = element['qe_Date'];
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(element);
        });
        // console.log(grouped)

        //Filter consolidated entry, if consolidated not available for a quarter take standalone into consideration
        const filteredEntries = {};
        Object.entries(grouped).forEach(([key, value]) => {
            // 1. Try to find the ideal row: Consolidated and Original
            const consolidatedOriginal = value.find(x => x.consolidated === 'Consolidated' && x.type_Sub === 'Original');

            if (consolidatedOriginal) {
                // Insert the exact matched row
                filteredEntries[key] = consolidatedOriginal;
            } else {
                // 2. Fallback: Find the Standalone row if the ideal combination isn't there
                // (Optional: You can add '&& x.type_Sub === "Original"' here too if required)
                filteredEntries[key] = value.find(x => x.consolidated === 'Standalone' && x.type_Sub === 'Original');
            }
        });
        // console.log(filteredEntries)

        const filteredEntriesArray = Object.values(filteredEntries);
        const parser = new IntegratedFillingXMLParser();
        const parsedData = [];

        // --- CONCURRENCY CONFIGURATION FOR TERMUX ---
        const CHUNK_SIZE = 15;   // Concurrently handle chunks of 15 documents 
        const TIMEOUT_MS = 5000;  // 5-second timeout safeguard per connection

        for (let i = 0; i < filteredEntriesArray.length; i += CHUNK_SIZE) {
            const chunk = filteredEntriesArray.slice(i, i + CHUNK_SIZE);
            //Fetch xbrl xml from the filtered array
            const chunkPromises = chunk.map(async (item) => {
                if (item?.['xbrl']?.endsWith('.xml')) {
                    const xmlUrl = item.xbrl;
                    let xmlContent = this._getCache(xmlUrl);

                    if (!xmlContent) {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                        try {
                            const res = await fetch(xmlUrl, {
                                signal: controller.signal,
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
                                    'Accept-Encoding': 'gzip, deflate'
                                }
                            });
                            clearTimeout(timeoutId);
                            if (!res.ok) return null;
                            xmlContent = await res.text();
                            if (!xmlContent) return null;

                            this._setCache(xmlUrl, xmlContent);
                        } catch (e) {
                            clearTimeout(timeoutId);
                            return null;
                        }
                    }

                    //Parse XML            
                    const data = parser.parse(xmlContent).extract(['revenue', 'netProfit']);
                    return { ...data, broadcast_Date: item['broadcast_Date'] };
                }
                return null;
            });

            // Execute the current chunk in parallel
            const chunkResults = await Promise.all(chunkPromises);

            // Clean out null entries caused by timeouts or skipped extensions
            parsedData.push(...chunkResults.filter(Boolean));
        }

        return parsedData;
    }

    /**
     * Old way of filling corporate results before 2024
     * @param {*} symbol 
     */
    async _getOldFinancialResult(symbol) {
        let response = await fetch(`https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol=${symbol}&period=Quarterly`);
        let array = await response.json();

        if (array.length === 0) {
            response = await fetch(`https://www.nseindia.com/api/corporates-financial-results?index=insurance&symbol=${symbol}&period=Quarterly`);
            array = (await response.json());
        }
        // console.log(array)

        //group entry by quarter date
        const grouped = {};
        array.forEach(element => {
            const key = element?.['toDate'] || element?.['periodEnd'];
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(element);
        });
        // console.log(grouped)

        //Filter consolidated entry, if consolidated not available for a quarter take standalone into consideration
        const filteredEntries = {};
        Object.entries(grouped).forEach(([key, value]) => {
            // 1. Try to find the ideal row: Consolidated
            const consolidatedOriginal = value.find(x => x.consolidated === 'Consolidated');

            if (consolidatedOriginal) {
                // Insert the exact matched row
                filteredEntries[key] = consolidatedOriginal;
            } else {
                // 2. Fallback: Find the Standalone row if the ideal combination isn't there
                // (Optional: You can add '&& x.type_Sub === "Original"' here too if required)
                filteredEntries[key] = value.find(x => x.consolidated === 'Non-Consolidated');
            }
        });
        // console.log(filteredEntries)        

        const filteredEntriesArray = Object.values(filteredEntries);

        // return filteredEntriesArray;

        const parser = new OldFillingXMLParser();
        const parsedData = [];

        // --- CONCURRENCY CONFIGURATION FOR TERMUX ---
        const CHUNK_SIZE = 15;   // Concurrently handle chunks of 15 documents 
        const TIMEOUT_MS = 5000;  // 5-second timeout safeguard per connection

        for (let i = 0; i < filteredEntriesArray.length; i += CHUNK_SIZE) {
            const chunk = filteredEntriesArray.slice(i, i + CHUNK_SIZE);

            const chunkPromises = chunk.map(async (item) => {
                // BRANCH A: Handle XBRL XML files
                if (item?.['xbrl']?.endsWith('.xml')) {
                    const xmlUrl = item.xbrl;
                    let xmlContent = this._getCache(xmlUrl);

                    if (!xmlContent) {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                        try {
                            const res = await fetch(xmlUrl, {
                                signal: controller.signal,
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
                                    'Accept-Encoding': 'gzip, deflate'
                                }
                            });
                            clearTimeout(timeoutId);
                            if (!res.ok) return null;
                            xmlContent = await res.text();
                            if (!xmlContent) return null;

                            this._setCache(xmlUrl, xmlContent);
                        } catch (e) {
                            clearTimeout(timeoutId);
                            return null;
                        }
                    }

                    //Parse XML            
                    const data = parser.parse(xmlContent).extract(['revenue', 'netProfit']);
                    return { ...data, broadcast_Date: item['broadCastDate'] };
                }

                // BRANCH B: Handle detailed reporting HTML files
                if (item?.['resultDetailedDataLink']?.endsWith('.html')) {
                    const htmlUrl = item['resultDetailedDataLink'];
                    let htmlContent = this._getCache(htmlUrl);

                    if (!htmlContent) {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                        try {
                            const res = await fetch(htmlUrl, {
                                signal: controller.signal,
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
                                    'Accept-Encoding': 'gzip, deflate'
                                }
                            });
                            clearTimeout(timeoutId);
                            if (!res.ok) return null;
                            htmlContent = await res.text();
                            if (!htmlContent) return null;

                            this._setCache(htmlUrl, htmlContent);
                        } catch (e) {
                            clearTimeout(timeoutId);
                            return null;
                        }
                    }

                    return { ...this._parseFinancialHtml(htmlContent, htmlUrl), broadcast_Date: item['broadCastDate'] };

                }

                return null;

            });

            // Execute the current chunk in parallel
            const chunkResults = await Promise.all(chunkPromises);

            // Clean out null entries caused by timeouts or skipped extensions
            parsedData.push(...chunkResults.filter(Boolean));

            // Prevent hitting rate limits (400ms buffer window)
            // if (i + CHUNK_SIZE < filteredEntriesArray.length) {
            //     await new Promise(resolve => setTimeout(resolve, 400));
            // }
        }

        return parsedData;
    }


    _parseFinancialHtml_(htmlContent, url) {
        ;
        const doc = parse(htmlContent);
        const data = {};

        // 1. Parse Metadata Table (Symbol, Period Ended, etc.)
        const tableHeads = doc.querySelectorAll('td.tablehead');
        tableHeads.forEach(head => {
            const key = head.textContent.trim();
            // The browser easily lets us grab the next element sibling directly
            const valCell = head.nextElementSibling;

            if (key.includes("Period Ended") && valCell && valCell.classList.contains('t1')) {
                data['EndOfReportingPeriod'] = valCell.textContent.trim();
            }
        });

        // 2. Parse Financials (Income, Operations, Net Profit)Bypassing the broken TR tags entirely)
        // We grab all label cells (t1) inside the main container table
        const labelCells = doc.querySelectorAll('td.t1');

        labelCells.forEach(cell => {
            // Flatten spaces and clean the text label
            const label = cell.textContent.replace(/\s+/g, ' ').trim();

            // Get the value cell which is the immediate next sibling element (t0)
            const valCell = cell.nextElementSibling;

            if (valCell && (valCell.classList.contains('t0') || valCell.getAttribute('nowrap') !== null)) {
                const value = valCell.textContent.trim();

                if (label.includes("Total income from operations") || label.includes("Net Sales/Income from Operation")) {
                    data['RevenueFromOperations'] = value;
                } else if (label === "Total Income") {
                    if (!data['RevenueFromOperations']) data['RevenueFromOperations'] = value;
                } else if (label === "Net Profit (+) / Loss (-) for the period" || label === "Net Profit / (Loss) for the period") {
                    data['NetProfit'] = value;
                }
            }
        });

        // data['url'] = url;

        return data
    }

    _parseFinancialHtml(htmlContent, url) {
        const data = {};
        // data['url'] = url;

        // 1. Extract Period Ended using simple string boundaries
        if (htmlContent.includes("Period Ended")) {
            const periodChunk = htmlContent.split(/Period Ended/i)[1];
            const match = periodChunk ? periodChunk.match(/class=["']?t1["']?>([^<]+)</i) : null;
            if (match) data['EndOfReportingPeriod'] = dayjs(match[1].trim()).format('YYYY-MM-DD');
        }

        // 2. Isolate the main financial data section to avoid segment table contamination
        let targetHtml = htmlContent;
        if (htmlContent.includes("Description")) {
            targetHtml = htmlContent.split("Description")[1];
            if (targetHtml.includes("Segment Reporting")) {
                targetHtml = targetHtml.split("Segment Reporting")[0];
            }
        }

        // 3. Split by raw row tags (<TR>) to inspect each row line-by-line 
        const rows = targetHtml.split(/<TR>/i);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Match the two sequential cells within this row: 
            // Cell 1: Label (can have class t1, t0, or no class at all)
            // Cell 2: Value (usually t0 or nowrap)
            const cellsMatch = [...row.matchAll(/<TD[^>]*>([\s\S]*?)<\/TD>/ig)];

            if (cellsMatch.length >= 2) {
                // Strip any nested HTML tags (like <b> or <center>) inside the label cell text
                const label = cellsMatch[0][1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
                const value = cellsMatch[1][1].replace(/<[^>]*>/g, '').trim();

                // Match Revenue fields
                if (label.includes("total income from operations") || label.includes("net sales/income from operation")) {
                    data['RevenueFromOperations'] = parseInt(value) * 100000;
                }
                else if (label === "total income") {
                    if (!data['RevenueFromOperations']) {
                        data['RevenueFromOperations'] = parseInt(value) * 100000;
                    }
                }
                // Match Net Profit fields (stripping slashes to simplify normalization)
                else if (
                    label.includes("net profit / (loss) for the period") ||
                    label.includes("net profit (+) / loss (-) for the period") ||
                    label.includes("net profit/loss for the period") ||
                    label.includes("net profit for the period")
                ) {
                    if (!data['NetProfit']) data['NetProfit'] = parseInt(value) * 100000; //converted from lakhs string to full number
                }
            }
        }

        return data;
    }

    async getFinancialResults(symbol) {
        const [dataA, dataB] = await Promise.all([this._getIntegratedFiling(symbol), this._getOldFinancialResult(symbol)]);
        const finalData = [...dataA, ...dataB].sort((a, b) => dayjs(a.EndOfReportingPeriod) - dayjs(b.EndOfReportingPeriod));

        return finalData;
    }


}

export default NseScraper

class IntegratedFillingXMLParser {
    /**
     *  xmls = Array of xml
     */
    constructor() {
        this.parser = new XMLParser();
    }

    parse(xml) {
        this.jsonObj = this.parser.parse(xml)?.['xbrli:xbrl'];
        // console.log(this.jsonObj)
        return this;
    }

    /** 
     *  params = ['revenue', 'netProfit'] any of these
     */
    extract(params) {
        const obj = {}

        const EndOfReportingPeriod = this.jsonObj['in-capmkt:DateOfEndOfReportingPeriod'];
        const StartOfReportingPeriod = this.jsonObj['in-capmkt:DateOfStartOfReportingPeriod'];

        //if reporting periods is an array, results include quarterly and ytd components. filterout ytd components
        if (Array.isArray(EndOfReportingPeriod)) {
            let INDEX;
            const diff0 = dayjs(EndOfReportingPeriod[0]).diff(StartOfReportingPeriod[0], 'days');
            if (diff0 > 80 && diff0 < 100) {
                INDEX = 0;
            } else {
                INDEX = 1;
            }
            // console.log(INDEX)

            obj['EndOfReportingPeriod'] = dayjs(EndOfReportingPeriod[INDEX]).format("YYYY-MM-DD");
            // obj['StartOfReportingPeriod'] = StartOfReportingPeriod[INDEX];
            // console.log(EndOfReportingPeriod?.[INDEX])
            if (params.includes('revenue')) {
                obj['RevenueFromOperations'] = this.jsonObj?.['in-capmkt:RevenueFromOperations']?.[INDEX] //normal
                    || this.jsonObj?.['in-capmkt:InterestEarned']?.[INDEX]  //banks
                    || this.jsonObj?.['in-capmkt:Income']?.[INDEX]  //insurance
                    || null;
            }

            if (params.includes('netProfit')) {
                obj['NetProfit'] = this.jsonObj?.['in-capmkt:ProfitLossForPeriod']?.[INDEX]  //normal
                    || this.jsonObj?.['in-capmkt:ProfitLossForThePeriod']?.[INDEX]  //banks
                    || this.jsonObj?.['in-capmkt:ProfitLossAfterTaxBeforeExtraordinaryItems']?.[INDEX]  //insurance
                    || null;
            }
        }
        else {
            obj['EndOfReportingPeriod'] = dayjs(EndOfReportingPeriod).format("YYYY-MM-DD");
            // obj['StartOfReportingPeriod'] = StartOfReportingPeriod;

            if (params.includes('revenue')) {
                obj['RevenueFromOperations'] = this.jsonObj?.['in-capmkt:RevenueFromOperations']  //normal
                    || this.jsonObj?.['in-capmkt:InterestEarned']  //banks
                    || this.jsonObj?.['in-capmkt:Income']  //insurance
                    || null;
            }

            if (params.includes('netProfit')) {
                obj['NetProfit'] = this.jsonObj?.['in-capmkt:ProfitLossForPeriod'] //normal
                    || this.jsonObj?.['in-capmkt:ProfitLossForThePeriod'] //banks
                    || this.jsonObj?.['in-capmkt:ProfitLossAfterTaxBeforeExtraordinaryItems'] //insurance
                    || null;
            }
        }

        return obj;
    }
}


class OldFillingXMLParser {
    /**
     *  xmls = Array of xml
     */
    constructor() {
        this.parser = new XMLParser();
    }

    parse(xml) {
        this.jsonObj = this.parser.parse(xml)?.['xbrli:xbrl'];
        // console.log(this.jsonObj)
        return this;
    }

    /** 
     *  params = ['revenue', 'netProfit'] any of these
     */
    extract(params) {
        const obj = {}

        const EndOfReportingPeriod = this.jsonObj?.['in-bse-fin:DateOfEndOfReportingPeriod'] || this.jsonObj?.['in-capmkt:DateOfEndOfReportingPeriod'];
        const StartOfReportingPeriod = this.jsonObj?.['in-bse-fin:DateOfStartOfReportingPeriod'] || this.jsonObj?.['in-capmkt:DateOfStartOfReportingPeriod'];
        // console.log(EndOfReportingPeriod, StartOfReportingPeriod)

        //if reporting periods is an array, results include quarterly and ytd components. filterout ytd components
        if (Array.isArray(EndOfReportingPeriod)) {
            let INDEX;
            //If start of reporting period exists
            if (StartOfReportingPeriod) {
                const diff0 = dayjs(EndOfReportingPeriod[0]).diff(StartOfReportingPeriod[0], 'days');
                if (diff0 > 80 && diff0 < 100) {
                    INDEX = 0;
                } else {
                    INDEX = 1;
                }
            } //else take the index of smaller Income values
            else {
                const income = this.jsonObj['in-bse-fin:Income'];
                if (income[0] < income[1]) {
                    INDEX = 0;
                } else INDEX = 1;
            }
            // console.log(INDEX)

            obj['EndOfReportingPeriod'] = dayjs(EndOfReportingPeriod?.[INDEX]).format("YYYY-MM-DD");
            // obj['StartOfReportingPeriod'] = StartOfReportingPeriod?.[INDEX] || null;

            if (params.includes('revenue')) {
                obj['RevenueFromOperations'] = this.jsonObj?.['in-bse-fin:RevenueFromOperations']?.[INDEX] //normal
                    || this.jsonObj?.['in-bse-fin:InterestEarned']?.[INDEX]  //banks
                    || this.jsonObj?.['in-bse-fin:Income']?.[INDEX]  //insurance
                    || this.jsonObj?.['in-capmkt:Income']?.[INDEX] //insurance
                    || null;
            }

            if (params.includes('netProfit')) {
                obj['NetProfit'] = this.jsonObj?.['in-bse-fin:ProfitLossForPeriod']?.[INDEX]  //normal
                    || this.jsonObj?.['in-bse-fin:ProfitLossForThePeriod']?.[INDEX]  //banks
                    || this.jsonObj?.['in-bse-fin:ProfitLossAfterTaxBeforeExtraordinaryItems']?.[INDEX]  //insurance
                    || this.jsonObj?.['in-capmkt:ProfitLossAfterTaxBeforeExtraordinaryItems']?.[INDEX] //insurance
                    || null;
            }
        }
        else {
            obj['EndOfReportingPeriod'] = dayjs(EndOfReportingPeriod).format("YYYY-MM-DD");
            // obj['StartOfReportingPeriod'] = StartOfReportingPeriod;

            if (params.includes('revenue')) {
                obj['RevenueFromOperations'] = this.jsonObj?.['in-bse-fin:RevenueFromOperations']  //normal
                    || this.jsonObj?.['in-bse-fin:InterestEarned']  //banks
                    || this.jsonObj?.['in-bse-fin:Income']  //insurance
                    || this.jsonObj?.['in-capmkt:Income']
                    || null;
            }

            if (params.includes('netProfit')) {
                obj['NetProfit'] = this.jsonObj?.['in-bse-fin:ProfitLossForPeriod'] //normal
                    || this.jsonObj?.['in-bse-fin:ProfitLossForThePeriod'] //banks
                    || this.jsonObj?.['in-bse-fin:ProfitLossAfterTaxBeforeExtraordinaryItems'] //insurance
                    || this.jsonObj?.['in-capmkt:ProfitLossAfterTaxBeforeExtraordinaryItems']
                    || null;
            }
        }

        return obj;
    }
}