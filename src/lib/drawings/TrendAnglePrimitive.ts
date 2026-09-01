import type { IPrimitivePaneRenderer } from 'lightweight-charts';
import type { Point } from './RangeBoxPrimitive';
import { type BitmapCoordinatesRenderingScope, CanvasRenderingTarget2D } from 'fancy-canvas';

class TrendAnglePaneRenderer implements IPrimitivePaneRenderer {
	constructor(
		private _data: {
			p1: Point;
			p2: Point;
			isLogScale?: boolean;
			lineColor?: string;
			hoverLineColor?: string;
			isHovered?: boolean;
			isSelected?: boolean;
		} | null,
		private _positions: { x1: number; y1: number; x2: number; y2: number } | null
	) {}

	draw(target: CanvasRenderingTarget2D) {
		if (!this._data || !this._positions) return;

		target.useBitmapCoordinateSpace((scope: BitmapCoordinatesRenderingScope) => {
			const ctx = scope.context;
			const hRatio = scope.horizontalPixelRatio;
			const vRatio = scope.verticalPixelRatio;

			const { x1, y1, x2, y2 } = this._positions;

			const isHovered = this._data!.isHovered;
			const isSelected = this._data!.isSelected;

			// Determine colors based on hover state

			const lineColor = isHovered
				? this._data!.hoverLineColor || '#1d4ed8'
				: this._data!.lineColor || '#2563eb';

			ctx.save();
		});
	}
}
