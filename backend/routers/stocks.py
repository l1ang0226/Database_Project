"""
routers/stocks.py
─────────────────
GET /api/stocks             →  取得全部 30 檔股票清單（含最新收盤價）
GET /api/stock/{stock_id}   →  取得單檔股票詳情（含漲跌、幅度）
"""

import sqlite3
from typing import List
from fastapi import APIRouter, Depends, HTTPException

from database.database import get_db
from database.models   import StockListItem, StockDetail

router = APIRouter()


@router.get(
    "/stocks",
    response_model=List[StockListItem],
    summary="取得全部股票清單",
    description="回傳所有 30 檔股票的代碼、名稱、產業與最新收盤價。",
)
def list_stocks(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        """
        SELECT
            s.stock_id,
            s.name,
            s.sector,
            h.close AS current_price
        FROM stocks s
        LEFT JOIN stock_history h
            ON s.stock_id = h.stock_id
            AND h.date = (
                SELECT MAX(date)
                FROM stock_history
                WHERE stock_id = s.stock_id
            )
        ORDER BY s.stock_id
        """
    ).fetchall()

    return [
        StockListItem(
            stock_id=r["stock_id"],
            name=r["name"],
            sector=r["sector"],
            current_price=r["current_price"],
        )
        for r in rows
    ]


@router.get(
    "/stock/{stock_id}",
    response_model=StockDetail,
    summary="取得單檔股票詳情",
    description="回傳指定股票最新一日的 OHLC、成交量、漲跌與漲跌幅。",
)
def get_stock(
    stock_id: str,
    db: sqlite3.Connection = Depends(get_db),
):
    # 確認股票存在
    stock = db.execute(
        "SELECT name, sector FROM stocks WHERE stock_id = ?", (stock_id,)
    ).fetchone()
    if not stock:
        raise HTTPException(status_code=404, detail=f"查無股票代碼 {stock_id}")

    # 取最新兩日（今日 + 前一日，用來計算漲跌）
    rows = db.execute(
        """
        SELECT date, open, high, low, close, volume
        FROM stock_history
        WHERE stock_id = ?
        ORDER BY date DESC
        LIMIT 2
        """,
        (stock_id,),
    ).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail=f"股票 {stock_id} 尚無歷史資料")

    today      = rows[0]
    prev_close = rows[1]["close"] if len(rows) > 1 else None

    change     = round(today["close"] - prev_close, 2)            if prev_close else None
    change_pct = round(change / prev_close * 100, 2)               if prev_close else None

    return StockDetail(
        stock_id=stock_id,
        name=stock["name"],
        sector=stock["sector"],
        current_price=round(today["close"], 1),
        open=round(today["open"], 1),
        high=round(today["high"], 1),
        low=round(today["low"], 1),
        volume=today["volume"],
        change=change,
        change_pct=change_pct,
    )
