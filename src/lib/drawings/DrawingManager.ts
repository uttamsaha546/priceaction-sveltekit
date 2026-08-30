// DrawingManager.ts
import type { IChartApi, ISeriesApi, MouseEventParams } from "lightweight-charts";
import { BaseDrawingPrimitive } from './BaseDrawingPrimitive';
import { RangeBoxPrimitive, type Point, type SerializedRangeBox } from './RangeBoxPrimitive';

export type ToolType = 'range-box' | 'trendline' | 'ray' | 'none';
export type SerializedDrawing = SerializedRangeBox;

export class DrawingManager {
    private _chart: IChartApi;
    private _series: ISeriesApi<any>;
    private _activeTool: ToolType = 'none';
    private _activePoints: Point[] = [];
    private _previewPrimitive: BaseDrawingPrimitive | null = null;
    private _currentSymbol: string = '';
    private _drawings: BaseDrawingPrimitive[] = [];

    private _dragState: {
        drawing: RangeBoxPrimitive;
        pointIndex: number;
    } | null = null;

    // Callback to notify app when drawings change (for SQLite persistence)
    private _onChangeCallback?: (symbol: string, drawings: SerializedDrawing[]) => void;

    constructor(
        chart: IChartApi,
        series: ISeriesApi<any>,
        initialSymbol = 'DEFAULT',
        onChange?: (symbol: string, drawings: SerializedDrawing[]) => void
    ) {
        this._chart = chart;
        this._series = series;
        this._currentSymbol = initialSymbol || 'DEFAULT';
        this._onChangeCallback = onChange;

        this._chart.subscribeClick(this._handleClick.bind(this));
        this._chart.subscribeCrosshairMove(this._handleMouseMove.bind(this));

        // Bind native mouseup event to stop dragging and save to DB
        const chartContainer = this._chart.chartElement();
        chartContainer.addEventListener('pointerup', this._handlePointerUp.bind(this));
    }

    // Load existing drawings retrieved from SQLite DB
    public loadDrawings(serializedDrawings: SerializedDrawing[]) {
        console.log('first')
        this.clearAllDrawings(false); // Clear chart without triggering database save

        serializedDrawings.forEach((data) => {
            let primitive: BaseDrawingPrimitive | null = null;
            if (data.type === 'range-box') {
                primitive = RangeBoxPrimitive.fromJSON(data);
            }

            if (primitive) {
                this._series.attachPrimitive(primitive);
                this._drawings.push(primitive);
            }
        });
    }

    public setSymbol(newSymbol: string) {
        if (this._currentSymbol === newSymbol) return;
        this.clearAllDrawings(false);
        this._currentSymbol = newSymbol;
    }

    public clearAllDrawings(notify = true) {
        this._drawings.forEach((d) => this._series.detachPrimitive(d));
        this._drawings = [];
        if (notify) this._notifyChange();
    }

    private _notifyChange() {
        if (this._onChangeCallback) {
            this._onChangeCallback(this._currentSymbol, this.getSerializedDrawings());
        }
    }

    // Exports active drawings to JSON format
    public getSerializedDrawings(): SerializedDrawing[] {
        return this._drawings
            .filter((d): d is RangeBoxPrimitive => d instanceof RangeBoxPrimitive)
            .map((d) => d.toJSON());
    }





    public setTool(tool: ToolType) {
        this._activeTool = tool;
        this._activePoints = [];
        if (this._previewPrimitive) {
            this._series.detachPrimitive(this._previewPrimitive);
            this._previewPrimitive = null;
        }
    }

    private _handleClick(param: MouseEventParams) {
        // 1. SELECT / DESELECT MODE (When no drawing tool is active)
        // if (this._activeTool === 'none') {
        //     if (param.hoveredInfo?.objectId) {
        //         this._selectedDrawingId = param.hoveredInfo.objectId as string;
        //         console.log('Selected drawing:', this._selectedDrawingId);
        //     } else {
        //         this._selectedDrawingId = null; // Deselect on clicking empty canvas
        //     }
        //     return;
        // }

        if (this._activeTool === 'none') {
            const hoveredId = param.hoveredObjectId as string | undefined;

            if (hoveredId) {
                // Extract base drawing ID (e.g. "box_123" from "box_123:p0")
                const baseId = hoveredId.split(':')[0];

                // Handle Point Handle Drag Setup
                if (hoveredId.includes(':p')) {
                    const pointIndex = parseInt(hoveredId.split(':p')[1], 10);
                    const drawing = this._drawings.find(d => d.id === baseId) as RangeBoxPrimitive;
                    if (drawing) {
                        this._dragState = { drawing, pointIndex };
                    }
                }

                // Update selection
                this._drawings.forEach(d => {
                    if (d instanceof RangeBoxPrimitive) {
                        d.setSelected(d.id === baseId);
                    }
                });
            } else {
                // Deselect all drawings on empty click
                this._drawings.forEach(d => {
                    if (d instanceof RangeBoxPrimitive) d.setSelected(false);
                });
            }
            return;
        }


        // 2. DRAWING CREATION MODE
        const price = this._series.coordinateToPrice(param.point!.y);
        if (price === null || !param.time) return;

        this._activePoints.push({ time: param.time, price });

        if (this._activePoints.length === 2) {
            const drawing = new RangeBoxPrimitive([...this._activePoints]);
            this._series.attachPrimitive(drawing);
            this._drawings.push(drawing);

            // Cleanup preview
            if (this._previewPrimitive) {
                this._series.detachPrimitive(this._previewPrimitive);
                this._previewPrimitive = null;
            }
            this.setTool('none');

            // Trigger SQLite save callback
            this._notifyChange();
        }
    }

    private _handleMouseMove(param: MouseEventParams) {
        // 1. ACTIVE DRAGGING POINT MODE
        if (this._dragState && param.time && param.point) {
            const currentPrice = this._series.coordinateToPrice(param.point.y);
            if (currentPrice !== null) {
                this._dragState.drawing.updatePoint(this._dragState.pointIndex, {
                    time: param.time,
                    price: currentPrice
                });
            }
            return;
        }

        // 2. HOVER HIGHLIGHT MODE
        if (this._activeTool === 'none') {
            const hoveredId = param.hoveredInfo?.objectId as string | undefined;
            const baseHoverId = hoveredId ? hoveredId.split(':')[0] : null;

            this._drawings.forEach((drawing) => {
                if (drawing instanceof RangeBoxPrimitive) {
                    drawing.setHovered(drawing.id === baseHoverId);
                }
            });
            return;
        }

        // 3. CREATION PREVIEW MODE...
        const currentPrice = this._series.coordinateToPrice(param.point!.y);
        if (currentPrice === null || !param.time) return;

        const previewPoints = [...this._activePoints, { time: param.time, price: currentPrice }];

        if (!this._previewPrimitive) {
            this._previewPrimitive = new RangeBoxPrimitive(previewPoints);
            this._series.attachPrimitive(this._previewPrimitive);
        } else {
            this._previewPrimitive.updatePoints(previewPoints);
        }
    }

    private _handlePointerUp() {
        // Finish point drag movement & sync updated coordinates to SQLite database
        if (this._dragState) {
            this._dragState = null;
            this._notifyChange();
        }
    }

    private _selectedDrawingId: string | null = null;

    public getSelectedDrawingId(): string | null {
        return this._selectedDrawingId;
    }

    // Delete a specific drawing by ID (or delete active selection if no ID provided)
    public deleteDrawing(id?: string) {
        const targetId = id || this._selectedDrawingId;
        if (!targetId) return;

        const index = this._drawings.findIndex((d) => d.id === targetId);
        if (index !== -1) {
            const [drawing] = this._drawings.splice(index, 1);
            this._series.detachPrimitive(drawing);

            if (this._selectedDrawingId === targetId) {
                this._selectedDrawingId = null;
            }

            this._notifyChange(); // Sync deletion to SQLite DB
        }
    }

    // Update options (e.g. colors, log mode) of a specific drawing
    public updateDrawingOptions(id: string, newOptions: Record<string, any>) {
        const drawing = this._drawings.find((d) => d.id === id);
        if (drawing && drawing instanceof RangeBoxPrimitive) {
            drawing.setOptions(newOptions);
            this._notifyChange(); // Sync update to SQLite DB
        }
    }
}