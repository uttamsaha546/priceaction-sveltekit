import { type Time } from 'lightweight-charts';

export function timeToUnixTimestamp(time: Time): number {
    if (typeof time === 'number') return time;
    if (typeof time === 'string') return new Date(time).getTime() / 1000;
    if (typeof time === 'object' && 'year' in time) {
        return new Date(Date.UTC(time.year, time.month - 1, time.day)).getTime() / 1000;
    }
    return 0;
}