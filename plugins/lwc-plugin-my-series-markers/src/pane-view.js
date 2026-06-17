import { MySeriesMarkersPaneRenderer } from './pane-renderer.js';

export class MySeriesMarkersPaneView {

	constructor(primitive) {
		this._primitive = primitive;
	}

	update() {
		const series = this._primitive.series;
		const timeScale = this._primitive.chart.timeScale();

		const originalData = this._primitive.data;

		this._data = originalData.map(item => {
			const x = timeScale.timeToCoordinate(item.time);
			const y = series.priceToCoordinate(item.price);

			return { ...item, x, y }
		})
		console.log(this._data)
	}

	renderer() {
		return new MySeriesMarkersPaneRenderer(
			this._data,
			this._primitive.options?.fillColor
		);
	}
}
