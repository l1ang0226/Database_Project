"""
database/database.py  ── SQLite 連線管理
"""

import sqlite3
import os

# DB 與此檔案同層：backend/database/stock_market.db
_BASE   = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(_BASE, "stock_market.db")


def get_db():
    """FastAPI Dependency：每個 Request 建立連線，結束後自動關閉。"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
    finally:
        conn.close()
