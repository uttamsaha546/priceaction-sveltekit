

export default class MoneyControlScraper {

    constructor() {
        this.symbol_ScIdMap = new Map();
    }

    async scrape(symbol) {
        const scId = await this.getScId(symbol);

        const consolidatedUrl = `https://api.moneycontrol.com/mcapi/v1/stock/estimates/earning-forecast?scId=${scId}&ex=N&deviceType=W&frequency=12&financialType=C`;
        const standaloneUrl = `https://api.moneycontrol.com/mcapi/v1/stock/estimates/earning-forecast?scId=${scId}&ex=N&deviceType=W&frequency=12&financialType=S`;

        // Helper function to safely fetch and verify if the dataset has content
        const fetchJsonData = async (url) => {
            try {
                const res = await fetch(url);
                if (res.status === 204) return null; // Fixed: Use strict comparison (===)

                const json = await res.json();
                // Validate structural depth safely using optional chaining (?.)
                const hasData = json?.data?.revenue?.length > 0 && json?.data?.netProfit?.length > 0;
                return hasData ? json : null;
            } catch (e) {
                return null;
            }
        };

        // 1. Try Consolidated first
        let data = await fetchJsonData(consolidatedUrl);

        // 2. If Consolidated failed or was empty, fall back to Standalone
        if (!data) {
            data = await fetchJsonData(standaloneUrl);
        }

        // 3. Absolute crash guard if neither variant yielded data structures
        if (!data?.data) {
            return { revenue: [], netProfit: [] };
        }

        // Filter forecasts and map them safely
        const revEst = data.data.revenue.filter(x => !x.actual && x.date).map(x => ([formatToLastDayOfMonth(x.date), parseInt(x.avg)])).sort((a, b) => new Date(a[0]) - new Date(b[0]));
        const profEst = data.data.netProfit.filter(x => !x.actual && x.date).map(x => ([formatToLastDayOfMonth(x.date), parseInt(x.avg)])).sort((a, b) => new Date(a[0]) - new Date(b[0]));


        return { revenue: revEst, netProfit: profEst }
    }

    async getScId(symbol) {
        if (this.symbol_ScIdMap.has(symbol)) return this.symbol_ScIdMap.get(symbol);

        const res = await fetch(`https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php?classic=true&query=${encodeURIComponent(symbol)}&type=1&format=json`)
        const suggestions = await res.json();

        let index = -1;
        for (let i = 0; i < suggestions.length; i++) {
            const array = suggestions[i].pdt_dis_nm.split(','); // [ '', 'company', 'VBL', 'consolidated', '' ]
            if (array[1] === symbol) {
                index = i;
                break;
            }
        }

        // Fallback safety if the specific symbol variant isn't found exactly in array[2]
        if (index === -1 && suggestions.length > 0) index = 0;
        if (index === -1) throw new Error(`Symbol ${symbol} not found on Screener.`);

        const scId = suggestions[index].sc_id;
        this.symbol_ScIdMap.set(symbol, scId);

        return scId;
    }
}


function formatToLastDayOfMonth(dateStr) {
    // 1. Parse the string (e.g., "Mar 2028")
    const parsedDate = new Date(dateStr);

    // 2. Target the *next* month, and set day to 0. 
    // This automatically drops back to the last day of the target month.
    const year = parsedDate.getFullYear();
    const month = parsedDate.getMonth(); // March is index 2

    const lastDay = new Date(year, month + 1, 0);

    // 3. Extract parts and pad single digits with a leading zero
    const yyyy = lastDay.getFullYear();
    const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
    const dd = String(lastDay.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}