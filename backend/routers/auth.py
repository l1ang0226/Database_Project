"""
routers/auth.py
───────────────
POST /api/register  →  註冊帳號
POST /api/login     →  登入帳號
"""

import sqlite3
import bcrypt
from fastapi import APIRouter, Depends, HTTPException

from database.database import get_db
from database.models   import RegisterRequest, LoginRequest, LoginResponse

router = APIRouter()

# 預設初始資金（模擬交易用）
DEFAULT_BALANCE = 100_000_000.0


@router.post(
    "/register",
    status_code=201,
    summary="註冊帳號",
    description="建立新使用者，密碼以 bcrypt 加密，初始資金預設 100 萬元。",
)
def register(
    req: RegisterRequest,
    db: sqlite3.Connection = Depends(get_db),
):
    # bcrypt 加密密碼
    hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()

    try:
        db.execute(
            """
            INSERT INTO users (username, password_hash, balance, initial_balance)
            VALUES (?, ?, ?, ?)
            """,
            (req.username, hashed, DEFAULT_BALANCE, DEFAULT_BALANCE),
        )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="帳號已存在，請換一個名稱")

    return {"message": f"✅ 帳號 {req.username} 註冊成功，初始資金 {DEFAULT_BALANCE:,.0f} 元"}


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="登入帳號",
    description="驗證帳號密碼，成功後回傳 user_id 供後續 API 使用。",
)
def login(
    req: LoginRequest,
    db: sqlite3.Connection = Depends(get_db),
):
    row = db.execute(
        "SELECT * FROM users WHERE username = ?", (req.username,)
    ).fetchone()

    # 帳號不存在 or 密碼錯誤，統一回 401（不洩漏帳號是否存在）
    if not row or not bcrypt.checkpw(req.password.encode(), row["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤")

    return LoginResponse(
        user_id=row["id"],
        username=row["username"],
        balance=row["balance"],
    )
