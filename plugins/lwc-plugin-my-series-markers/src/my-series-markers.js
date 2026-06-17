import { defaultOptions } from './options';
import { MySeriesMarkersPaneView } from './pane-view';
import { PluginBase } from './plugin-base';

export class MySeriesMarkers
	extends PluginBase {

	constructor(
		dataPoints,
		options
	) {
		super();
		this._dataPoints = dataPoints;
		// this._options = {
		// 	...defaultOptions,
		// 	...options,
		// };
		this._paneViews = [new MySeriesMarkersPaneView(this)];
		// this._timeAxisViews = [
		// 	new MySeriesMarkersTimeAxisView(this, p1),
		// 	new MySeriesMarkersTimeAxisView(this, p2),
		// ];
		// this._priceAxisViews = [
		// 	new MySeriesMarkersPriceAxisView(this, p1),
		// 	new MySeriesMarkersPriceAxisView(this, p2),
		// ];
		// this._priceAxisPaneViews = [new MySeriesMarkersPriceAxisPaneView(this, true)];
		// this._timeAxisPaneViews = [new MySeriesMarkersTimeAxisPaneView(this, false)];
	}

	updateAllViews() {
		//* Use this method to update any data required by the
		//* views to draw.
		this._paneViews.forEach(pw => pw.update());
		// this._timeAxisViews.forEach(pw => pw.update());
		// this._priceAxisViews.forEach(pw => pw.update());
		// this._priceAxisPaneViews.forEach(pw => pw.update());
		// this._timeAxisPaneViews.forEach(pw => pw.update());
	}

	// priceAxisViews() {
	// 	//* Labels rendered on the price scale
	// 	return this._priceAxisViews;
	// }

	// timeAxisViews() {
	// 	//* labels rendered on the time scale
	// 	return this._timeAxisViews;
	// }

	paneViews() {
		//* rendering on the main chart pane
		return this._paneViews;
	}

	// priceAxisPaneViews() {
	// 	//* rendering on the price scale
	// 	return this._priceAxisPaneViews;
	// }

	// timeAxisPaneViews() {
	// 	//* rendering on the time scale
	// 	return this._timeAxisPaneViews;
	// }

	autoscaleInfo(
		startTimePoint,
		endTimePoint
	) {
		//* Use this method to provide autoscale information if your primitive
		//* should have the ability to remain in view automatically.

	}

	dataUpdated(_scope) {
		//* This method will be called by PluginBase when the data on the
		//* series has changed.
	}

	// _timeCurrentlyVisible(
	// 	time,
	// 	startTimePoint,
	// 	endTimePoint
	// ) {
	// 	const ts = this.chart.timeScale();
	// 	const coordinate = ts.timeToCoordinate(time);
	// 	if (coordinate === null) return false;
	// 	const logical = ts.coordinateToLogical(coordinate);
	// 	if (logical === null) return false;
	// 	return logical <= endTimePoint && logical >= startTimePoint;
	// }

	get options() {
		return this._options;
	}

	applyOptions(options) {
		this._options = { ...this._options, ...options };
		this.requestUpdate();
	}

	get data() {
		return this._dataPoints;
	}
}
