import {
	Coordinate,
	IPrimitivePaneView,
	PrimitivePaneViewZOrder,
} from 'lightweight-charts';
import { MySeriesMarkersAxisPaneRenderer } from './axis-pane-renderer';
import { MySeriesMarkersDataSource } from './data-source';

abstract class MySeriesMarkersAxisPaneView implements IPrimitivePaneView {
	_source: MySeriesMarkersDataSource;
	_p1: number | null = null;
	_p2: number | null = null;
	_vertical: boolean = false;

	constructor(source: MySeriesMarkersDataSource, vertical: boolean) {
		this._source = source;
		this._vertical = vertical;
	}

	abstract getPoints(): [Coordinate | null, Coordinate | null];

	update() {
		[this._p1, this._p2] = this.getPoints();
	}

	renderer() {
		return new MySeriesMarkersAxisPaneRenderer(
			this._p1,
			this._p2,
			this._source.options.fillColor,
			this._vertical
		);
	}
	zOrder(): PrimitivePaneViewZOrder {
		return 'bottom';
	}
}

export class MySeriesMarkersPriceAxisPaneView extends MySeriesMarkersAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const series = this._source.series;
		const y1 = series.priceToCoordinate(this._source.p1.price);
		const y2 = series.priceToCoordinate(this._source.p2.price);
		return [y1, y2];
	}
}

export class MySeriesMarkersTimeAxisPaneView extends MySeriesMarkersAxisPaneView {
	getPoints(): [Coordinate | null, Coordinate | null] {
		const timeScale = this._source.chart.timeScale();
		const x1 = timeScale.timeToCoordinate(this._source.p1.time);
		const x2 = timeScale.timeToCoordinate(this._source.p2.time);
		return [x1, x2];
	}
}
