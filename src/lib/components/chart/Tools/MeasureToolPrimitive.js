class MeasureRenderer {
    constructor() {
        this._data = null;
    }

    update(data) {
        this._data = data;
    }

    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const ctx = scope.context;

            if (!this._data || !this._data.visible) return;

            const { p1, p2, textLines } = this._data;

            const midX = Math.round((p1.x + p2.x) / 2) + 0.5;
            let midY = Math.round((p1.y + p2.y) / 2) + 0.5;

            ctx.save();

            //Draw the measurement shaded background area
            ctx.fillStyle = -p2.y > -p1.y ? 'rgba(41, 98, 255, 0.15)' : 'rgba(242, 54, 69,0.15)';
            ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);

            //Draw vertical and horizontal arrow at the middle of the rectangle
            ctx.strokeStyle = -p2.y > -p1.y ? 'rgb(41, 98, 255)' : 'rgb(242, 54, 69)';
            ctx.lineWidth = 1;
            //Horizontal arrow
            const shiftX = p2.x > p1.x ? -5 : 5;
            const shiftY = p2.y > p1.y ? -5 : 5;

            ctx.moveTo(p1.x, midY)
            ctx.lineTo(p2.x, midY);
            ctx.lineTo(p2.x + shiftX, midY - 5);
            ctx.lineTo(p2.x, midY);
            ctx.lineTo(p2.x + shiftX, midY + 5);
            ctx.stroke();
            //Vertical arrow
            ctx.moveTo(midX, p1.y)
            ctx.lineTo(midX, p2.y);
            ctx.lineTo(midX - 5, p2.y + shiftY);
            ctx.lineTo(midX, p2.y);
            ctx.lineTo(midX + 5, p2.y + shiftY);
            ctx.stroke();

            //Draw info text tooltip at the top of the box
            ctx.fillStyle = '#2196F3';
            ctx.font = '12px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';

            const sign = p2.y > p1.y ? +1 : -1;

            textLines.forEach((line, index) => {
                ctx.fillText(line, midX, p2.y + sign * (index * 16) + sign * ((textLines.length - 1) * 8));
            });

            ctx.restore();
        })
    }

}

export class MeasureToolPrimitive {
    constructor() {
        this._renderer = new MeasureRenderer();
        this._paneView = new MeasureToolPaneView(this);
        this._p1 = null // {time, price}
        this._p2 = null // {time, price}
        this._visible = false;
        this._requestUpdate = () => { };
        this._chart = null;
        this._series = null;
    }

    attached(param) {
        this._chart = param.chart;
        this._series = param.series;
        this._requestUpdate = param.requestUpdate;
    }

    updatePoints(p1, p2, visible = true) {
        this._p1 = p1;
        this._p2 = p2;
        this._visible = visible;
        this._requestUpdate();
    }

    updateAllViews() {
        const timeScale = this._chart.timeScale();
        if (!this._visible || !this._p1 || !this._p2 || !this._series || !timeScale) {
            this._renderer.update({ visible: false });
            return;
        }

        //Convert data values back into chart pixels
        const x1 = timeScale.timeToCoordinate(this._p1.time);
        const x2 = timeScale.timeToCoordinate(this._p2.time);
        const y1 = this._series.priceToCoordinate(this._p1.price);
        const y2 = this._series.priceToCoordinate(this._p2.price);

        if (x1 === null || x2 === null || y1 === null || y2 === null) return;

        //Calculate metrics
        const priceDiff = this._p2.price - this._p1.price;
        const pctChange = ((priceDiff / this._p1.price) * 100).toFixed(2);

        //Format text readout
        const textLines = [
            `${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pctChange}%)`,
            `${Math.abs(timeScale.coordinateToLogical(x1) - timeScale.coordinateToLogical(x2))} bars`
        ];

        this._renderer.update({
            visible: true,
            p1: { x: x1, y: y1 },
            p2: { x: x2, y: y2 },
            textLines
        });
    }

    //Attach the renderer to the main chart pan view layer
    paneViews() {
        return [this._paneView];
    }
}

class MeasureToolPaneView {
    constructor(primitive) {
        this._primitive = primitive;
    }

    renderer() {
        return this._primitive._renderer;
    }
}
