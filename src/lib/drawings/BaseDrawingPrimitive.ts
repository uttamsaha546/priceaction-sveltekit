import { type ISeriesPrimitive, type Time, type ISeriesApi, type IChartApi, type SeriesAttachedParameter, type SeriesOptionsMap } from "lightweight-charts";

export abstract class BaseDrawingPrimitive implements ISeriesPrimitive<Time> {
    public chart: IChartApi | null = null;
    public series: ISeriesApi<any> | null = null;
    public id: string = Math.random().toString(36).substring(2, 9);
    private _requestUpdate?: () => void;

    // attached({ chart, series }: { chart: IChartApi; series: ISeriesApi<any> }) {
    //     this.chart = chart;
    //     this.series = series;
    // }

    public attached(param: SeriesAttachedParameter<Time, keyof SeriesOptionsMap>): void {
        this.chart = param.chart;
        this.series = param.series;
        this._requestUpdate = param.requestUpdate;
    }

    public detached() {
        this.chart = null;
        this.series = null;
    }

    abstract paneViews(): any[];
    abstract updatePoints(points: Array<{ time: Time; price: number }>): void;

    public requestUpdate(): void {
        if (this._requestUpdate) {
            this._requestUpdate();
        }
    }
}