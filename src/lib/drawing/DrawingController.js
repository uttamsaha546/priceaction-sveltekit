export class DrawingController {

    constructor(chart, series, manager) {

        this._chart = chart;
        this._series = series;
        this._manager = manager;

        this._state = "idle";

        this._startPoint = null;
        this._currentPoint = null;
    }

    move(point) {

        const tool =
            this._manager.activeTool();

        if (!tool)
            return;

        this._currentPoint = point;

        this._chart.setCrosshairPosition(
            point.price,
            point.time,
            this._series
        );

        if (this._state === "started") {

            tool.onMove(point);

        }

    }

    tap(point) {

        const tool =
            this._manager.activeTool();

        if (!tool)
            return;

        if (this._state === "idle") {

            this._startPoint = point;

            tool.onStart(point);

            this._state = "started";

            return;

        }

        if (this._state === "started") {

            tool.onFinish(point);

            this._manager.addDrawing(tool);

            this._state = "idle";

            this._chart.clearCrosshairPosition();

        }

    }

}