import dayjs from "dayjs";
import { XMLParser } from "fast-xml-parser";

class NSeScraper{
    constructor(){
        
    }

    /**
     * New way of filling corporate results following SEBI orders in 2024
     * @param {*} symbol 
     * @returns 
     */
    async _getIntegratedFiling(symbol){
        const response = await fetch(`/proxy?url=${encodeURIComponent(`https://www.nseindia.com/api/integrated-filing-results?&symbol=${symbol}&type=Integrated%20Filing-%20Financials&page=1&size=20`)}`);
        const array = (await response.json()).data;
        // console.log(array)
        //group entry by quarter date
        const grouped = {};
        array.forEach(element => {
            const key = element['qe_Date'];
            if(!grouped[key]){
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
                filteredEntries[key] = value.find(x => x.consolidated === 'Standalone' && x.type_Sub ==='Original');
            }
        });
        // console.log(filteredEntries)

        const filteredEntriesArray = Object.values(filteredEntries);
        const parser = new IntegratedFillingXMLParser();
        const parsedData = [];
        for(let i=0; i<filteredEntriesArray.length; i++){
            const item = filteredEntriesArray[i];
            //Fetch xbrl xml from the filtered array
            const response = await fetch(`/proxy?url=${item.xbrl}`);
            //extract xml text from response
            const xml = await response.text();

            //Parse XML            
            let data = parser.parse(xml).extract(['revenue', 'netProfit']);
            parsedData.push({broadcast_Date: item['broadcast_Date'], ...data});
        }
        return parsedData;
    }

    /**
     * Old way of filling corporate results before 2024
     * @param {*} symbol 
     */
    async _getOldFinancialResult(symbol){
        let response = await fetch(`/proxy?url=${encodeURIComponent(`https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol=${symbol}&period=Quarterly`)}`);
        let array = (await response.json());

        if(array.length===0){
            response = await fetch(`/proxy?url=${encodeURIComponent(`https://www.nseindia.com/api/corporates-financial-results?index=insurance&symbol=${symbol}&period=Quarterly`)}`);
            array = (await response.json());
        }
        console.log(array)

        //group entry by quarter date
        const grouped = {};
        array.forEach(element => {
            const key = element?.['toDate'] || element?.['periodEnd'];
            if(!grouped[key]){
                grouped[key] = [];
            }
            grouped[key].push(element);
        });
        console.log(grouped)

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
        console.log(filteredEntries)

        const filteredEntriesArray = Object.values(filteredEntries);
        const parser = new OldFillingXMLParser();
        const parsedData = [];
        for(let i=0; i<filteredEntriesArray.length; i++){
            const item = filteredEntriesArray[i];

            if(item.xbrl.endsWith('.xml')){
                //Fetch xbrl xml from the filtered array
                const response = await fetch(`/proxy?url=${item.xbrl}`);
                //extract xml text from response
                const xml = await response.text();

                //Parse XML            
                let data = parser.parse(xml).extract(['revenue', 'netProfit']);
                parsedData.push({broadcast_Date: item['broadCastDate'], ...data});
            }
            
        }
        return parsedData;
    }

    get(symbol){
        return this._getOldFinancialResult(symbol)
    }
}

export default NSeScraper

class IntegratedFillingXMLParser{
    /**
     *  xmls = Array of xml
     */
    constructor(){
        this.parser = new XMLParser();
    }

    parse(xml){
        this.jsonObj = this.parser.parse(xml)?.['xbrli:xbrl'];
        console.log(this.jsonObj)
        return this;
    }

    /** 
     *  params = ['revenue', 'netProfit'] any of these
     */
    extract(params){
        const obj = {}          

        const EndOfReportingPeriod = this.jsonObj['in-capmkt:DateOfEndOfReportingPeriod'];
        const StartOfReportingPeriod = this.jsonObj['in-capmkt:DateOfStartOfReportingPeriod'];

        //if reporting periods is an array, results include quarterly and ytd components. filterout ytd components
        if(Array.isArray(EndOfReportingPeriod)){                
            let INDEX;
            const diff0 = dayjs(EndOfReportingPeriod[0]).diff(StartOfReportingPeriod[0], 'days');
            if(diff0>80 && diff0<100){
                INDEX = 0;
            }else{
                INDEX =1;
            }
            // console.log(INDEX)

            obj['EndOfReportingPeriod'] = EndOfReportingPeriod[INDEX];
            obj['StartOfReportingPeriod'] = StartOfReportingPeriod[INDEX];

            if(params.includes('revenue')){
                    obj['RevenueFromOperations'] = this.jsonObj?.['in-capmkt:RevenueFromOperations']?.[INDEX] //normal
                    || this.jsonObj?.['in-capmkt:InterestEarned']?.[INDEX]  //banks
                    || this.jsonObj?.['in-capmkt:Income']?.[INDEX]  //insurance
                    || null;
                }

            if(params.includes('netProfit')){
                obj['NetProfit'] = this.jsonObj?.['in-capmkt:ProfitLossForPeriod']?.[INDEX]  //normal
                || this.jsonObj?.['in-capmkt:ProfitLossForThePeriod']?.[INDEX]  //banks
                || this.jsonObj?.['in-capmkt:ProfitLossAfterTaxBeforeExtraordinaryItems']?.[INDEX]  //insurance
                || null;
            }
        }
        else{
            obj['EndOfReportingPeriod'] = EndOfReportingPeriod;
            obj['StartOfReportingPeriod'] = StartOfReportingPeriod;

            if(params.includes('revenue')){
                obj['RevenueFromOperations'] = this.jsonObj?.['in-capmkt:RevenueFromOperations']  //normal
                || this.jsonObj?.['in-capmkt:InterestEarned']  //banks
                || this.jsonObj?.['in-capmkt:Income']  //insurance
                || null;
            }

            if(params.includes('netProfit')){
                obj['NetProfit'] = this.jsonObj?.['in-capmkt:ProfitLossForPeriod'] //normal
                || this.jsonObj?.['in-capmkt:ProfitLossForThePeriod'] //banks
                || this.jsonObj?.['in-capmkt:ProfitLossAfterTaxBeforeExtraordinaryItems'] //insurance
                || null;
            }
        }

        return obj;
    }
}


class OldFillingXMLParser{
    /**
     *  xmls = Array of xml
     */
    constructor(){
        this.parser = new XMLParser();
    }

    parse(xml){
        this.jsonObj = this.parser.parse(xml)?.['xbrli:xbrl'];
        console.log(this.jsonObj)
        return this;
    }

    /** 
     *  params = ['revenue', 'netProfit'] any of these
     */
    extract(params){
        const obj = {}          

        const EndOfReportingPeriod = this.jsonObj?.['in-bse-fin:DateOfEndOfReportingPeriod'] || this.jsonObj?.['in-capmkt:DateOfEndOfReportingPeriod'];
        const StartOfReportingPeriod = this.jsonObj?.['in-bse-fin:DateOfStartOfReportingPeriod'] || this.jsonObj?.['in-capmkt:DateOfStartOfReportingPeriod'];
        // console.log(EndOfReportingPeriod, StartOfReportingPeriod)

        //if reporting periods is an array, results include quarterly and ytd components. filterout ytd components
        if(Array.isArray(EndOfReportingPeriod)){                
            let INDEX;
            //If start of reporting period exists
            if(StartOfReportingPeriod){
                const diff0 = dayjs(EndOfReportingPeriod[0]).diff(StartOfReportingPeriod[0], 'days');
                if(diff0>80 && diff0<100){
                    INDEX = 0;
                }else{
                    INDEX =1;
                }
            } //else take the index of smaller Income values
            else{
                const income = this.jsonObj['in-bse-fin:Income'];
                if(income[0]<income[1]){
                    INDEX=0;
                }else INDEX=1;
            }
            // console.log(INDEX)

            obj['EndOfReportingPeriod'] = EndOfReportingPeriod?.[INDEX];
            obj['StartOfReportingPeriod'] = StartOfReportingPeriod?.[INDEX] || null;

            if(params.includes('revenue')){
                    obj['RevenueFromOperations'] = this.jsonObj?.['in-bse-fin:RevenueFromOperations']?.[INDEX] //normal
                    || this.jsonObj?.['in-bse-fin:InterestEarned']?.[INDEX]  //banks
                    || this.jsonObj?.['in-bse-fin:Income']?.[INDEX]  //insurance
                    || null;
                }

            if(params.includes('netProfit')){
                obj['NetProfit'] = this.jsonObj?.['in-bse-fin:ProfitLossForPeriod']?.[INDEX]  //normal
                || this.jsonObj?.['in-bse-fin:ProfitLossForThePeriod']?.[INDEX]  //banks
                || this.jsonObj?.['in-bse-fin:ProfitLossAfterTaxBeforeExtraordinaryItems']?.[INDEX]  //insurance
                || null;
            }
        }
        else{
            obj['EndOfReportingPeriod'] = EndOfReportingPeriod;
            obj['StartOfReportingPeriod'] = StartOfReportingPeriod;

            if(params.includes('revenue')){
                obj['RevenueFromOperations'] = this.jsonObj?.['in-bse-fin:RevenueFromOperations']  //normal
                || this.jsonObj?.['in-bse-fin:InterestEarned']  //banks
                || this.jsonObj?.['in-bse-fin:Income']  //insurance
                || null;
            }

            if(params.includes('netProfit')){
                obj['NetProfit'] = this.jsonObj?.['in-bse-fin:ProfitLossForPeriod'] //normal
                || this.jsonObj?.['in-bse-fin:ProfitLossForThePeriod'] //banks
                || this.jsonObj?.['in-bse-fin:ProfitLossAfterTaxBeforeExtraordinaryItems'] //insurance
                || null;
            }
        }

        return obj;
    }
}