import { MySeriesMarkersPaneView } from './pane-view';

import { ensureDefined, ensureNotNull } from './helpers/assertions';

const seriesMarkerOptionsDefaults = {
    autoScale: true,
    zOrder: 'normal',
};

export class MySeriesMarkers{

	constructor(options={}) {
		this._private__options = {...seriesMarkerOptionsDefaults, ...options};
		this._private__paneView = null;
        this._private__markers = [];
        this._private__indexedMarkers = [];
		this._private__series = null;
        this._private__chart = null;
	}

	attached(param) {
		this._private__recalculateMarkers(); //calculate markers when primitive gets attached if series data available.
		this._private__chart = param.chart;
		this._private__series = param.series;
		this._private__requestUpdate = param.requestUpdate;

		this._private__paneView = new MySeriesMarkersPaneView(this._private__series, ensureNotNull(this._private__chart), this._private__options);
		
		//Subscribe to the data changed event. This event is fired whenever the update or setData method is evoked on the series.
		this._private__series.subscribeDataChanged(this._private__requestUpdate());
		this._private__requestUpdate();
	}

	detached() {		
		this._private__series.unsubscribeDataChanged(this._private__requestUpdate());
		this._private__chart = null;
        this._private__series = null;
        this._private__paneView = null;
		this._private__requestUpdate = null;
	}

	updateAllViews() {
		if (this._private__paneView) {
            this._private__paneView._internal_update();
        }
	}

	paneViews() {
		return this._private__paneView ? [this._private__paneView] : [];
	}

	_private__recalculateMarkers(){

	}
}
