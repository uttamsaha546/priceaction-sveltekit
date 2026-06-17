import { ensureDefined } from './helpers/assertions';

//* PluginBase is a useful base to build a plugin upon which
//* already handles creating getters for the chart and series,
//* and provides a requestUpdate method.
export class PluginBase {
	attached({
		chart,
		series,
		requestUpdate,
	}) {
		this._chart = chart;
		this._series = series;
		this._series.subscribeDataChanged(this._fireDataUpdated);
		this._requestUpdate = requestUpdate;
		this._requestUpdate();
	}

	detached() {
		this._chart = undefined;
		this._series = undefined;
		this._requestUpdate = undefined;
	}

	get chart() {
		return ensureDefined(this._chart);
	}

	get series() {
		return ensureDefined(this._series);
	}

	_fireDataUpdated(scope) {
		if (this.dataUpdated) {
			this.dataUpdated(scope);
		}
	}
}
