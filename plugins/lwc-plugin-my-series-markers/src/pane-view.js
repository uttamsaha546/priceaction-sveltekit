import { MySeriesMarkersPaneRenderer } from './pane-renderer.js';

export class MySeriesMarkersPaneView {

	constructor({series, chart, options}) {
		this._private__series = series;
        this._private__chart = chart;
		this._private__options = options;
		this._private__renderer = new MySeriesMarkersPaneRenderer();

		this._private__data = { //populated after coordinate transformation of markers data
            _internal_items: [],
            _internal_visibleRange: null,
        };

		this._private__markers = []; //markers data
	}

	renderer() {
		// Do not render if series is hidden
		if (!this._private__series.options().visible) {
            return null;
        }
		
		this._internal__makeValid(); //populates the data

		const layout = this._private__chart.options()['layout'];
        this._private__renderer._internal_setParams(layout.fontSize, layout.fontFamily, this._private__options.zOrder);
        this._private__renderer._internal_setData(this._private__data);

		return this._private__renderer;
	}	


	_internal_setMarkers(markers) {
        this._private__markers = markers;
    }

	_internal__makeValid(){
		const timeScale = this._private__chart.timeScale();
	}
}
