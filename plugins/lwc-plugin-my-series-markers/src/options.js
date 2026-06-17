
export const defaultOptions = {
	//* Define the default values for all the primitive options.
	fillColor: 'rgba(200, 50, 100, 0.75)',
	labelColor: 'rgba(200, 50, 100, 1)',
	labelTextColor: 'white',
	showLabels: true,
	priceLabelFormatter: (price) => price.toFixed(2),
	timeLabelFormatter: (time) => {
		if (typeof time == 'string') return time;
		const date = isBusinessDay(time)
			? new Date(time.year, time.month, time.day)
			: new Date(time * 1000);
		return date.toLocaleDateString();
	},
};
