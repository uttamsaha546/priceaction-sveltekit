import { isUTCTimestamp, isBusinessDay } from 'lightweight-charts';
/**
 * Converts various time formats (UTC timestamp, BusinessDay object, or ISO string) 
 * into a millisecond timestamp.
 * * @param {number | string | {year: number, month: number, day: number}} t - The time value to convert.
 * @returns {number} The time represented as milliseconds since the Unix epoch.
 * * @example
 * const timestamp = 1529899200; // 2018-06-25T04:00:00.000Z
 * convertTime(timestamp);
 * * @example
 * const businessDay = { year: 2019, month: 6, day: 1 }; // June 1, 2019
 * convertTime(businessDay);
 * * @example
 * const businessDayString = '2021-02-03'; // February 3, 2021
 * convertTime(businessDayString);
 */
export function convertTime(t) {
	if (isUTCTimestamp(t)) return t * 1000;
	if (isBusinessDay(t)) return new Date(t.year, t.month, t.day).valueOf();
	const [year, month, day] = t.split('-').map(parseInt);
	return new Date(year, month, day).valueOf();
}

export function displayTime(time) {
	if (typeof time == 'string') return time;
	const date = isBusinessDay(time)
		? new Date(time.year, time.month, time.day)
		: new Date(time * 1000);
	return date.toLocaleDateString();
}

export function formattedDateAndTime(timestamp) {
	if (!timestamp) return ['', ''];
	const dateObj = new Date(timestamp);

	// Format date string
	const year = dateObj.getFullYear();
	const month = dateObj.toLocaleString('default', { month: 'short' });
	const date = dateObj.getDate().toString().padStart(2, '0');
	const formattedDate = `${date} ${month} ${year}`;

	// Format time string
	const hours = dateObj.getHours().toString().padStart(2, '0');
	const minutes = dateObj.getMinutes().toString().padStart(2, '0');
	const formattedTime = `${hours}:${minutes}`;

	return [formattedDate, formattedTime];
}
