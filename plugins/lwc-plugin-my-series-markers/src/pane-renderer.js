export class MySeriesMarkersPaneRenderer {

	constructor() {
		this._private__data = null; //{_internal_items: [{_internal_text: {_internal_content, _internal_x, _internal_y} _internal_color: ,}, {}], _internal_visibleRange: {from:number, to:number}}
        this._private__fontSize = -1;
        this._private__fontFamily = '';
        this._private__font = '';
        this._private__zOrder = 'normal';
	}

	_internal_setData(data) {
        this._private__data = data;
    }

	_internal_setParams(fontSize, fontFamily, zOrder) {
        if (this._private__fontSize !== fontSize || this._private__fontFamily !== fontFamily) {
            this._private__fontSize = fontSize;
            this._private__fontFamily = fontFamily;
            this._private__font = `${fontSize}px ${fontFamily}`;
        }
        this._private__zOrder = zOrder;
    }

	draw(target) {
		target.useBitmapCoordinateSpace((scope) => {
			const { context: ctx, horizontalPixelRatio, verticalPixelRatio } = scope;

			// Do not draw if data is null or visibleRange is null
			if (this._private__data === null || this._private__data._internal_visibleRange === null) {
				return;
			}

			ctx.textBaseline = 'middle';
			ctx.font = this._private__font;

			// Draw only the data within the visible range
			for(let index=this._private__data._internal_visibleRange.from; index<this._private__data._internal_visibleRange.to; index++){
				const item = this._private__data._internal_items[index];


				drawItem(item, ctx, horizontalPixelRatio, verticalPixelRatio);
			}


		});
	}
}

function drawItem(item, ctx, horizontalPixelRatio, verticalPixelRatio) {
    ctx.fillStyle = item._internal_color;
    if (item._internal_text !== undefined) {
        drawText(ctx, item._internal_text._internal_content, item._internal_text._internal_x, item._internal_text._internal_y, horizontalPixelRatio, verticalPixelRatio);
    }
    // drawShape(item, ctx, bitmapShapeItemCoordinates(item, horizontalPixelRatio, verticalPixelRatio));
}
