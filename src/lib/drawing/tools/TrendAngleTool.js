export class TrendAngleTool extends BaseDrawingTool {

    constructor(primitive) {
        super();

        this.primitive = primitive;

        this.p1 = null;
        this.p2 = null;
    }

    onStart(point) {

        this.p1 = point;
        this.p2 = point;

        this.primitive.updatePoints(this.p1, this.p2);
    }

    onMove(point) {

        this.p2 = point;

        this.primitive.updatePoints(this.p1, this.p2);
    }

    onFinish(point) {

        this.p2 = point;

        this.primitive.updatePoints(this.p1, this.p2);
    }

    onCancel() {

        this.primitive.updatePoints(null, null);

    }

}