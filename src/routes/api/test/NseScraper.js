import { XMLParser } from "fast-xml-parser";
import dayjs from "dayjs";

class NseScraper {
    constructor() {
        this.corporates_financial_results_Endpoint = 'https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol=NAVINFLUOR&period=Quarterly';
        this.integrated_filing_results_Endpoint = 'https://www.nseindia.com/api/integrated-filing-results?&symbol=NAVINFLUOR&type=Integrated%20Filing-%20Financials&page=1&size=20';
        this.parser = new XMLParser();

        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
        };
    }

    async _getCorporateFinancialResults() {
        const response = await fetch(this.corporates_financial_results_Endpoint, { headers: this.headers });
        const financialResults = await response.json();
        return financialResults;
    }

    async _getIntegratedFilingResults() {
        const response = await fetch(this.integrated_filing_results_Endpoint);
        const integratedFiling = await response.json();
        return integratedFiling.data;
    }

    async Test() {
        const corporateFinancialResults = await this._getCorporateFinancialResults();

        const consolidatedRecord = this._filterRecord(corporateFinancialResults);

        const dataToReturn = [];

        for (let i = 0; i < consolidatedRecord.length; i++) {
            if (consolidatedRecord[i].xbrl.endsWith('.xml')) {
                const xmlText = await this._fetchXML(consolidatedRecord[i].xbrl);
                const xbrlObj = this._parseXML(xmlText);
                const obj = { quarterEnding: xbrlObj._getQuarterEnding(), revenue: xbrlObj._getRevenue(), netProfit: xbrlObj._getProfit() }
                dataToReturn.push(obj)
            }
        }

        return dataToReturn;
    }

    _filterRecord(allConsolidatedAndStandaloneRecord) {
        // 1. Group records by their shared 'toDate'
        const groupedByDate = {};
        for (const record of allConsolidatedAndStandaloneRecord) {
            const dateKey = record.toDate;
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(record);
        }

        // 2. De-duplicate: Keep only 1 record per unique toDate
        const filteredRecords = [];

        for (const dateKey in groupedByDate) {
            const group = groupedByDate[dateKey]; // Contains both consolidated and non-consolidated rows for the same date

            // Try to find the consolidated row in this date bracket
            const consolidatedRecord = group.find(
                item => item.consolidated && item.consolidated.toLowerCase() === 'consolidated'
            );

            if (consolidatedRecord) {
                // If it exists, push ONLY the consolidated row. The standalone row is dropped.
                filteredRecords.push(consolidatedRecord);
            } else {
                // Fallback: If no consolidated row exists for this date, pick the standalone row
                const standaloneRecord = group.find(
                    item => item.consolidated && (item.consolidated.toLowerCase() === 'standalone' || item.consolidated.toLowerCase() === 'non-consolidated')
                );
                if (standaloneRecord) {
                    filteredRecords.push(standaloneRecord);
                } else if (group.length > 0) {
                    // Failsafe: pick whatever is available if labels don't match
                    filteredRecords.push(group[0]);
                }
            }
        }

        return filteredRecords;
    }

    async _fetchXML(xbrlUrl) {
        const response = await fetch(xbrlUrl);
        const xmlText = await response.text();
        return xmlText;
    }

    _parseXML(xmlText) {
        const jsonObj = this.parser.parse(xmlText);
        return new XbrlObject(jsonObj);
    }
}

const createNseScraper = () => new NseScraper();
export default createNseScraper;


class XbrlObject {
    constructor(jsonObj) {
        this.xbrlData = jsonObj['xbrli:xbrl'];
        this.indexOfQuarterlyData = this._getIndexOfQuarterlyData(this.xbrlData);
    }

    _getIndexOfQuarterlyData(jsonObjectOfXml) {
        const startDates = this.xbrlData['in-bse-fin:DateOfStartOfReportingPeriod'];
        const endDates = this.xbrlData['in-bse-fin:DateOfEndOfReportingPeriod'];

        let index = null;
        if (Array.isArray(startDates)) {
            for (let i = 0; i < startDates.length; i++) {
                const dateDiff = dayjs(endDates[i]).diff(startDates[i], 'days');
                if (dateDiff > 80 && dateDiff < 100) {
                    index = i;
                    break;
                }
            }
        }
        return index;
    }

    _getRevenue() {
        return this.xbrlData['in-bse-fin:RevenueFromOperations'][this.indexOfQuarterlyData];
    }
    _getProfit() {
        return this.xbrlData['in-bse-fin:ProfitLossForPeriod'][this.indexOfQuarterlyData];
    }

    _getQuarterEnding() {
        return this.xbrlData['in-bse-fin:DateOfEndOfReportingPeriod'][this.indexOfQuarterlyData];
    }
}