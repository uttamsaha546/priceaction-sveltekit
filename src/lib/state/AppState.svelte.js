export const AppState = (() => {
    let TradingViewStockUniverse = $state({}) // {data: [], meta: {}}

    return {
        get TradingViewStockUniverse() { return TradingViewStockUniverse },
        set TradingViewStockUniverse(val) { TradingViewStockUniverse = val }
    }
})()