export class DrawingManager {

    constructor(chart, series) {

        this._chart = chart;
        this._series = series;

        this._activeTool = null;

        this._drawings = [];

    }

    setActiveTool(tool) {

        this._activeTool = tool;

    }

    activeTool() {

        return this._activeTool;

    }

    addDrawing(tool) {

        this._drawings.push(tool);

    }

    drawings() {

        return this._drawings;

    }

    removeDrawing(tool) {

        this._drawings =
            this._drawings.filter(d => d !== tool);

    }

    clear() {

        this._drawings.length = 0;

    }

}