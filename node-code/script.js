/**
 * Calculate linar regression slope
 *
 * @param {number[]} values - Y values
 * @returns {number} slope
 */
export function linearRegressionSlope(values) {
	if (values.length < 2) return null;

	const n = values.length;

	let sumX = 0;
	let sumY = 0;
	let sumXY = 0;
	let sumX2 = 0;

	for (let i = 0; i < n; i++) {
		const x = i;
		const y = values[i];

		sumX += x;
		sumY += y;
		sumXY += x * y;
		sumX2 += x * x;
	}

	const denominator = n * sumX2 - sumX * sumX;

	if (denominator === 0) return null;

	return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Calculate normalized slope of a 252-day MA.
 *
 * @param {number[]} closes - Daily closing prices, oldest->newest
 * @param {number} maPeriod - 252 for 52-week MA
 * @param {number} regressionPeriod - Number of MA values used for regression
 * @returns {object|null}
 */
export function calculate52WeekMASlope(closes, maPeriod = 252, regressionPeriod = 40) {
	if (closes.length < maPeriod + regressionPeriod - 1) {
		return null;
	}

	// Calculate the 252-day moving averages
	const ma = [];

	for (let i = maPeriod - 1; i < closes.length; i++) {
		let sum = 0;

		for (let j = i - maPeriod + 1; j <= i; j++) {
			sum += closes[j];
		}

		ma.push(sum / maPeriod);
	}

	// Last 40 values of the 52W MA
	const recentMA = ma.slice(-regressionPeriod);

	// Regression slope in ₹ per trading day
	const slope = linearRegressionSlope(recentMA);

	// Normalize by average MA
	const averageMA = recentMA.reduce((sum, value) => sum + value, 0) / recentMA.length;

	// Percent change in MA per trading day
	const normalizedSlope = (slope / averageMA) * 100;

	return {
		slope,
		normalizedSlope,
		currentMA: recentMA.at(-1)
	};
}



export function main(){
    const closes = [];
    const shortTerm = calculate52WeekMASlope(closes, 252, 40);
    const longTerm = calculate52WeekMASlope(closes, 252, 120);

    const slopeAcceleration = shortTerm.normalizedSlope - longTerm.normalizedSlope;

    return slopeAcceleration;
}

/**
 * Filter out illiquid stocks, traded_value<50 lakhs in any day of 60 day period
 * @param {Array<{instrument_id:number, symbol:string, adv20: number, adv60:number, adv120:number, median_value60:number, trade_date:string}>} allUniverse - All Stocks from stock_liquidity
 * @returns 
 */
export function eligibleUniverse(allUniverse){
    return allUniverse.filter(x=>x.liquid_days60===60);
}