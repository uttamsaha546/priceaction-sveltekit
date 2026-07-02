class SafeEntryZoneRenderer {
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

            const { p1, p2 } = this._data;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();
        })
    }
}

export class SafeEntryZonePrimitive {
    constructor() {
        this._renderer = new SafeEntryZoneRenderer();
        this._paneView = new SafeEntryZonePaneView(this);
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

        this._renderer.update({
            visible: true,
            p1: { x: x1, y: y1 },
            p2: { x: x2, y: y2 }
        });
    }

    //Attach the renderer to the main chart pan view layer
    paneViews() {
        return [this._paneView];
    }
}

class SafeEntryZonePaneView {
    constructor(primitive) {
        this._primitive = primitive;
    }

    renderer() {
        return this._primitive._renderer;
    }
}
