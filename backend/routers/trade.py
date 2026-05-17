"""
routers/trade.py
────────────────
POST /api/trade  →  買入 / 賣出股票

成交價：由後端從 stock_history 取最新日期的 close，前端不傳 price。
原子性：使用 SQLite Transaction，扣款與建單同時成功或同時復原。
"""

import sqlite3
from fastapi import APIRouter, Depends, HTTPException

from database.database import get_db
from database.models   import TradeRequest, TradeResponse

router = APIRouter()


def _get_latest_price(db: sqlite3.Connection, stock_id: str) -> float:
    """從 stock_history 取該股票最新日期的收盤價。"""
    row = db.execute(
        """
        SELECT close FROM stock_history
        WHERE stock_id = ?
        ORDER BY date DESC
        LIMIT 1
        """,
        (stock_id,),
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"查無股票 {stock_id} 的歷史資料")
    return row["close"]


def _upsert_portfolio(
    cursor: sqlite3.Cursor,
    user_id: int,
    stock_id: str,
    shares_delta: int,   # 正數=買入, 負數=賣出
    price: float,
):
    """
    更新或新增持倉：
      買入 → 重新計算加權平均成本
      賣出 → 扣除股數（均價不變）
    """
    row = cursor.execute(
        "SELECT shares, avg_cost FROM portfolio WHERE user_id = ? AND stock_id = ?",
        (user_id, stock_id),
    ).fetchone()

    if row is None:
        # 第一次買入，直接新增
        cursor.execute(
            """
            INSERT INTO portfolio (user_id, stock_id, shares, avg_cost)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, stock_id, shares_delta, price),
        )
    else:
        old_shares = row["shares"]
        old_cost   = row["avg_cost"]
        new_shares = old_shares + shares_delta

        if new_shares < 0:
            raise HTTPException(status_code=400, detail="持股數量不足")

        if shares_delta > 0:
            # 買入：重新計算加權平均成本
            new_cost = (old_cost * old_shares + price * shares_delta) / new_shares
        else:
            # 賣出：均價不變
            new_cost = old_cost

        cursor.execute(
            """
            UPDATE portfolio
            SET shares = ?, avg_cost = ?, updated_at = datetime('now','localtime')
            WHERE user_id = ? AND stock_id = ?
            """,
            (new_shares, round(new_cost, 4), user_id, stock_id),
        )


@router.post(
    "/trade",
    response_model=TradeResponse,
    summary="買入 / 賣出股票",
    description="""
執行股票交易，成交價由後端取 stock_history 最新收盤價。

- **buy**：確認餘額充足 → Transaction（扣款 + 建立訂單 + 更新持倉）
- **sell**：確認持股充足 → Transaction（加款 + 建立訂單 + 更新持倉）
    """,
)
def trade(
    req: TradeRequest,
    db: sqlite3.Connection = Depends(get_db),
):
    # ── 1. 確認使用者存在 ──────────────────────────────────────────
    user = db.execute(
        "SELECT id, balance FROM users WHERE id = ?", (req.user_id,)
    ).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")

    # ── 2. 確認股票存在 ────────────────────────────────────────────
    stock = db.execute(
        "SELECT stock_id FROM stocks WHERE stock_id = ?", (req.stock_id,)
    ).fetchone()
    if not stock:
        raise HTTPException(status_code=404, detail=f"查無股票代碼 {req.stock_id}")

    # ── 3. 取得最新收盤價（前端不傳 price）────────────────────────
    price        = _get_latest_price(db, req.stock_id)
    total_amount = round(price * req.shares, 2)
    balance      = user["balance"]

    # ── 4. 前置檢查 ────────────────────────────────────────────────
    if req.order_type == "buy":
        if balance < total_amount:
            raise HTTPException(
                status_code=400,
                detail=f"餘額不足（需要 {total_amount:,.0f} 元，目前 {balance:,.0f} 元）",
            )
    else:  # sell
        holding = db.execute(
            "SELECT shares FROM portfolio WHERE user_id = ? AND stock_id = ?",
            (req.user_id, req.stock_id),
        ).fetchone()
        if not holding or holding["shares"] < req.shares:
            have = holding["shares"] if holding else 0
            raise HTTPException(
                status_code=400,
                detail=f"持股不足（欲賣 {req.shares} 股，目前持有 {have} 股）",
            )

    # ── 5. Transaction ─────────────────────────────────────────────
    cursor = db.cursor()
    try:
        cursor.execute("BEGIN")

        # (a) 更新使用者餘額
        if req.order_type == "buy":
            cursor.execute(
                "UPDATE users SET balance = balance - ? WHERE id = ?",
                (total_amount, req.user_id),
            )
        else:
            cursor.execute(
                "UPDATE users SET balance = balance + ? WHERE id = ?",
                (total_amount, req.user_id),
            )

        # (b) 新增交易訂單
        cursor.execute(
            """
            INSERT INTO orders
                (user_id, stock_id, order_type, shares, price, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, 'completed')
            """,
            (req.user_id, req.stock_id, req.order_type, req.shares, price, total_amount),
        )
        order_id = cursor.lastrowid

        # (c) 更新持倉
        shares_delta = req.shares if req.order_type == "buy" else -req.shares
        _upsert_portfolio(cursor, req.user_id, req.stock_id, shares_delta, price)

        db.commit()

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"交易失敗，已復原：{e}")

    # ── 6. 取得更新後餘額並回傳 ────────────────────────────────────
    balance_after = db.execute(
        "SELECT balance FROM users WHERE id = ?", (req.user_id,)
    ).fetchone()["balance"]

    return TradeResponse(
        order_id=order_id,
        user_id=req.user_id,
        stock_id=req.stock_id,
        order_type=req.order_type,
        shares=req.shares,
        price=price,
        total_amount=total_amount,
        balance_after=balance_after,
    )
