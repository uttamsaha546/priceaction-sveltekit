import {
	IChartApi,
	ISeriesApi,
	SeriesOptionsMap,
	Time,
} from 'lightweight-charts';
import { MySeriesMarkersOptions } from './options';

export interface Point {
	time: Time;
	price: number;
}

export interface MySeriesMarkersDataSource {
	chart: IChartApi;
	series: ISeriesApi<keyof SeriesOptionsMap>;
	options: MySeriesMarkersOptions;
	p1: Point;
	p2: Point;
}
