src/lib/drawing/
│
├── DrawingManager.ts        // owns all drawings
├── DrawingController.ts     // pointer/touch state machine
├── DrawingState.ts
├── ToolFactory.ts
│
├── BaseDrawingTool.ts
│
├── tools/
│     ├── MeasureTool.ts
│     ├── TrendAngleTool.ts
│     ├── TrendLineTool.ts
│     ├── HorizontalLineTool.ts
│     ├── VerticalLineTool.ts
│     ├── RayTool.ts
│     └── RectangleTool.ts
│
├── models/
│     ├── Point.ts
│     ├── Drawing.ts
│     └── Tool.ts
│
└── utils/
      ├── Coordinate.ts
      └── HitTest.ts