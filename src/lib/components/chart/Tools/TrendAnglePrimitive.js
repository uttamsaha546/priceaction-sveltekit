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

            const { p1, p2, angleText } = this._data;

            const x1 = p1.x;
            const y1 = p1.y;
            const x2 = p2.x;
            const y2 = p2.y;

            // 1. Calculate the Visual Geometric Angle
            const dx = x2 - x1;
            const dy = y2 - y1;
            let angle = Math.atan2(dy, dx);

            ctx.save();

            // 2. Draw the Main Trend Line
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'purple';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            //Draw dotted horizontal line
            // Set dash pattern: 5px dash, 5px gap
            ctx.setLineDash([2, 1]);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + 50, y1);
            ctx.stroke();
            //draw arc
            ctx.beginPath();
            ctx.arc(x1, y1, 50, 0, angle, true);
            ctx.stroke();

            // 3. Draw Anchor Points (small circles at ends)
            //reset dash
            ctx.setLineDash([0, 0]);
            ctx.fillStyle = '#ffffff';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(x1, y1, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x2, y2, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            // 4. Draw the Text Badge adjacent to the end pointer
            ctx.fillStyle = '#2196F3';
            ctx.font = '12px sans-serif';
            ctx.textBaseline = 'middle';

            // Add a small background capsule for readability
            const textWidth = ctx.measureText(angleText).width;
            ctx.fillStyle = 'purple';
            // Offset the badge slightly to the right of the cursor point
            ctx.fillRect(x2 + 10, y2 - 10, textWidth + 10, 20);

            // // Draw Text inside capsule
            ctx.fillStyle = '#ffffff';
            ctx.fillText(angleText, x2 + 15, y2);

            ctx.restore();
        })
    }

}

export class TrendAnglePrimitive {
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

        this._renderer.update({
            visible: true,
            p1: { x: x1, y: y1 },
            p2: { x: x2, y: y2 },
            angleText:
                `${Math.round(((this._p2.price / this._p1.price - 1) * 100) * 31536000 / (this._p2.time - this._p1.time))}% pa`

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

    zOrder() {
        return 'top';
    }
}
