export const ToolState = (() => {
    let activeTool = $state('cross') // cross, trendAngle, measure

    return {
        get activeTool() { return activeTool },
        set activeTool(val) { activeTool = val }
    }
})()