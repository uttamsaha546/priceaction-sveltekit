export class MySeriesMarkersPaneRenderer {

	constructor(data, fillColor = '') {
		this._data = data;
		this._fillColor = fillColor;
	}

	draw(target) {
		target.useBitmapCoordinateSpace(scope => {
			if (
				this._data.length === 0
			)
				return;
			const ctx = scope.context;


			this._data.forEach(item => {
				ctx.save();
				ctx.translate(item.x, item.y);
				ctx.fillText(item.text, 0, 0);
				ctx.restore();
			});


		});
	}
}
