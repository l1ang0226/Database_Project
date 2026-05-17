"""
routers/ai.py
─────────────
POST /api/analyze  →  股票 AI 分析

後端自動從 stock_history 撈近 30 天資料，組裝 Prompt，打 Ollama，回傳報告。
"""

import sqlite3
from fastapi import APIRouter, Depends, HTTPException

from database.database import get_db
from database.models   import AnalyzeRequest, AnalyzeResponse
from services.ai_service import analyze_stock

router = APIRouter()


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="股票 AI 分析",
    description="""
傳入股票代碼，後端自動撈取近 30 天歷史資料，
組裝 Prompt 後交給本地 Ollama（Qwen2.5-7B）分析，
回傳繁體中文評估報告。

> ⚠️ 需先在本機執行：`ollama serve`
    """,
)
def analyze(
    req: AnalyzeRequest,
    db: sqlite3.Connection = Depends(get_db),
):
    # ── 確認股票存在 ──────────────────────────────────────
    stock = db.execute(
        "SELECT name FROM stocks WHERE stock_id = ?", (req.stock_id,)
    ).fetchone()
    if not stock:
        raise HTTPException(status_code=404, detail=f"查無股票代碼 {req.stock_id}")

    # ── 撈取近 30 天歷史資料 ──────────────────────────────
    rows = db.execute(
        """
        SELECT date, open, high, low, close, volume
        FROM stock_history
        WHERE stock_id = ?
        ORDER BY date DESC
        LIMIT 30
        """,
        (req.stock_id,),
    ).fetchall()

    if not rows:
        raise HTTPException(
            status_code=404, detail="查無歷史資料，請先執行 init_db.py"
        )

    # reversed：從舊到新傳給 ai_service
    report = analyze_stock(
        stock_id=req.stock_id,
        name=stock["name"],
        history=list(reversed(rows)),
    )

    return AnalyzeResponse(
        stock_id=req.stock_id,
        name=stock["name"],
        report=report,
    )
