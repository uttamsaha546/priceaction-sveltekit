import { json } from "@sveltejs/kit";
import { db } from "$lib/server/database";
import { GET as fetchMissingIndustryClassification } from "../../industry-classification/+server";
import { GET as getStockUniverse } from "../+server";

export async function POST() {
    try {
        const response = await fetch('https://scanner.tradingview.com/india/scan?label-product=screener-stock', {
            method: "POST",
            body: JSON.stringify(
                {
                    "columns": [
                        "ticker-view",
                        "price_earnings_ttm",
                        "sector.tr",
                        "market",
                        "sector",
                        "RSI|1M",
                        "RSI|1W",
                        "ADX|1M",
                        "ADX|1W",
                        "Value.Traded",
                        "type",
                        "typespecs",
                        "fundamental_currency_code",
                        "market_cap_basic",
                        "SMA250",
                        "pricescale",
                        "minmov",
                        "fractional",
                        "minmove2"
                    ],
                    "filter": [
                        {
                            "left": "Value.Traded",
                            "operation": "greater",
                            "right": 20000000
                        },
                        {
                            "left": "ADX|1M",
                            "operation": "greater",
                            "right": 0
                        },
                        {
                            "left": "RSI|1M",
                            "operation": "greater",
                            "right": 0
                        },
                        {
                            "left": "market_cap_basic",
                            "operation": "egreater",
                            "right": 4000000000
                        },
                        {
                            "left": "exchange",
                            "operation": "in_range",
                            "right": [
                                "NSE"
                            ]
                        },
                        {
                            "left": "is_primary",
                            "operation": "equal",
                            "right": true
                        }
                    ],
                    "ignore_unknown_fields": false,
                    "options": {
                        "lang": "en"
                    },
                    "range": [
                        0,
                        1500
                    ],
                    "sort": {
                        "sortBy": "market_cap_basic",
                        "sortOrder": "desc"
                    },
                    "markets": [
                        "india"
                    ],
                    "filter2": {
                        "operator": "and",
                        "operands": [
                            {
                                "operation": {
                                    "operator": "or",
                                    "operands": [
                                        {
                                            "operation": {
                                                "operator": "and",
                                                "operands": [
                                                    {
                                                        "expression": {
                                                            "left": "type",
                                                            "operation": "equal",
                                                            "right": "stock"
                                                        }
                                                    },
                                                    {
                                                        "expression": {
                                                            "left": "typespecs",
                                                            "operation": "has",
                                                            "right": [
                                                                "common"
                                                            ]
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "operation": {
                                    "operator": "or",
                                    "operands": [
                                        {
                                            "operation": {
                                                "operator": "and",
                                                "operands": [
                                                    {
                                                        "expression": {
                                                            "left": "type",
                                                            "operation": "equal",
                                                            "right": "stock"
                                                        }
                                                    },
                                                    {
                                                        "expression": {
                                                            "left": "typespecs",
                                                            "operation": "has",
                                                            "right": [
                                                                "common"
                                                            ]
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            "operation": {
                                                "operator": "and",
                                                "operands": [
                                                    {
                                                        "expression": {
                                                            "left": "type",
                                                            "operation": "equal",
                                                            "right": "stock"
                                                        }
                                                    },
                                                    {
                                                        "expression": {
                                                            "left": "typespecs",
                                                            "operation": "has",
                                                            "right": [
                                                                "preferred"
                                                            ]
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            "operation": {
                                                "operator": "and",
                                                "operands": [
                                                    {
                                                        "expression": {
                                                            "left": "type",
                                                            "operation": "equal",
                                                            "right": "dr"
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            "operation": {
                                                "operator": "and",
                                                "operands": [
                                                    {
                                                        "expression": {
                                                            "left": "type",
                                                            "operation": "equal",
                                                            "right": "fund"
                                                        }
                                                    },
                                                    {
                                                        "expression": {
                                                            "left": "typespecs",
                                                            "operation": "has_none_of",
                                                            "right": [
                                                                "etf",
                                                                "mutual"
                                                            ]
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                "expression": {
                                    "left": "typespecs",
                                    "operation": "has_none_of",
                                    "right": [
                                        "pre-ipo"
                                    ]
                                }
                            }
                        ]
                    }
                }
            )
        });

        if (!response.ok) {
            throw new Error(`TradingView API responded with status: ${response.status}`);
        }

        const data = await response.json();
        const stocks = data.data;

        const insertstatement = db.prepare(`
            INSERT INTO stock_universe (
                symbol, name, price_to_earning, sector, rsi14_monthly, 
                rsi14_weekly, adx14_monthly, adx14_weekly, turnover_daily, 
                marketcap, sma250
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const upsertMeta = db.prepare(`
            INSERT INTO meta (tablename, data)
            VALUES (:tablename, :data)
            ON CONFLICT(tablename) DO UPDATE SET
                data = excluded.data
        `);

        // Run batch updates within a single ACID transaction for maximum SQLite speed
        db.exec("BEGIN TRANSACTION;");

        try {
            db.exec('DELETE FROM stock_universe');

            for (const row of stocks) {
                const symbol = row.d[0].name.replace("_", "-"); //Tradingview uses BAJAJ_AUTO while NSE uses BAJAJ-AUTO
                if (symbol.endsWith(".RR")) continue; //skip REITs
                const name = row.d[0].description;
                const price_to_earning = Math.round(row.d[1] || 0);
                const sector = row.d[2];
                const rsi14_monthly = Math.round(row.d[5] || 0);
                const rsi14_weekly = Math.round(row.d[6] || 0);
                const adx14_monthly = Math.round(row.d[7] || 0);
                const adx14_weekly = Math.round(row.d[8] || 0);
                const turnover_daily = Math.round(row.d[9] || 0);
                const marketcap = Math.round(row.d[13] || 0);
                const sma250 = row.d[14];

                insertstatement.run(symbol, name, price_to_earning, sector, rsi14_monthly, rsi14_weekly, adx14_monthly, adx14_weekly, turnover_daily, marketcap, sma250);
            }

            upsertMeta.run({
                tablename: "stock_universe",
                data: JSON.stringify({ updatedAt: Date.now() })
            });

            db.exec("COMMIT;");

        } catch (dbError) {
            db.exec("ROLLBACK;");
            throw dbError;
        }

        await fetchMissingIndustryClassification();
        const stock_universe_joined_with_industry_classification = await getStockUniverse();
        return stock_universe_joined_with_industry_classification;
    }
    catch (error) {
        console.error("Pipeline Sync Error:", error);
        return json({ success: false, error: error.message }, { status: 500 });

    }
}

