"""
database/init_db.py  ── 建立 Schema + 爬取 yfinance 歷史資料寫入 SQLite
執行方式：
  pip install yfinance pandas
  python init_db.py
"""

import sqlite3
import os
import yfinance as yf
import pandas as pd

_BASE      = os.path.dirname(os.path.abspath(__file__))
DB_PATH    = os.path.join(_BASE, "stock_market.db")
START_DATE = "2023-01-01"
END_DATE   = "2025-01-01"

STOCKS = [
    ("2330","台積電","半導體"),   ("2454","聯發科","半導體"),
    ("2303","聯電","半導體"),     ("3711","日月光投控","半導體"),
    ("2379","瑞昱","半導體"),     ("2408","南亞科","半導體"),
    ("2337","旺宏","半導體"),
    ("2317","鴻海","電子代工"),   ("2382","廣達","電子代工"),
    ("2357","華碩","消費電子"),   ("2376","技嘉","消費電子"),
    ("2354","鴻準","電子代工"),
    ("2395","研華","工業自動化"), ("2308","台達電","工業自動化"),
    ("6669","緯穎","工業自動化"),
    ("2881","富邦金","金融"),     ("2882","國泰金","金融"),
    ("2886","兆豐金","金融"),     ("2891","中信金","金融"),
    ("2884","玉山金","金融"),
    ("2412","中華電","電信"),     ("3045","台灣大","電信"),
    ("4904","遠傳","電信"),
    ("1301","台塑","石化傳產"),   ("1303","南亞","石化傳產"),
    ("6505","台塑化","石化傳產"), ("1326","台化","石化傳產"),
    ("2603","長榮","航運"),       ("2609","陽明","航運"),
    ("2615","萬海","航運"),
]


def init_schema(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER  PRIMARY KEY AUTOINCREMENT,
            username        TEXT     NOT NULL UNIQUE,
            password_hash   TEXT     NOT NULL,
            balance         REAL     NOT NULL DEFAULT 0,
            initial_balance REAL     NOT NULL DEFAULT 0,
            created_at      DATETIME DEFAULT (datetime('now','localtime'))
        );
        CREATE TABLE IF NOT EXISTS stocks (
            stock_id TEXT PRIMARY KEY,
            name     TEXT NOT NULL,
            sector   TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS stock_history (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            stock_id  TEXT NOT NULL,
            date      DATE NOT NULL,
            open      REAL, high REAL, low REAL, close REAL, adj_close REAL,
            volume    INTEGER,
            FOREIGN KEY (stock_id) REFERENCES stocks(stock_id),
            UNIQUE (stock_id, date)
        );
        CREATE TABLE IF NOT EXISTS orders (
            id           INTEGER  PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER  NOT NULL,
            stock_id     TEXT     NOT NULL,
            order_type   TEXT     NOT NULL CHECK(order_type IN ('buy','sell')),
            shares       INTEGER  NOT NULL CHECK(shares > 0),
            price        REAL     NOT NULL,
            total_amount REAL     NOT NULL,
            status       TEXT     NOT NULL DEFAULT 'completed',
            created_at   DATETIME DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (user_id)  REFERENCES users(id),
            FOREIGN KEY (stock_id) REFERENCES stocks(stock_id)
        );
        CREATE TABLE IF NOT EXISTS portfolio (
            id         INTEGER  PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER  NOT NULL,
            stock_id   TEXT     NOT NULL,
            shares     INTEGER  NOT NULL DEFAULT 0,
            avg_cost   REAL     NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (user_id)  REFERENCES users(id),
            FOREIGN KEY (stock_id) REFERENCES stocks(stock_id),
            UNIQUE (user_id, stock_id)
        );
    """)
    conn.commit()
    print("✅ Schema 建立完成")


def insert_stocks(conn):
    conn.executemany(
        "INSERT OR IGNORE INTO stocks (stock_id, name, sector) VALUES (?,?,?)", STOCKS
    )
    conn.commit()
    print(f"✅ stocks 表寫入完成（共 {len(STOCKS)} 檔）")


def fetch_and_store(conn):
    tickers_tw = [f"{s[0]}.TW" for s in STOCKS]
    print(f"\n📡 開始批次下載 {len(tickers_tw)} 檔股票資料（{START_DATE} ~ {END_DATE}）...")

    raw = yf.download(
        tickers=tickers_tw, start=START_DATE, end=END_DATE,
        group_by="ticker", auto_adjust=True, progress=True,
    )

    cur = conn.cursor()
    total = 0
    for stock_id, _, _ in STOCKS:
        ticker = f"{stock_id}.TW"
        try:
            df = raw[ticker].copy().dropna(subset=["Close"]).reset_index()
            df = df.rename(columns={"Date":"date","Open":"open","High":"high",
                                    "Low":"low","Close":"close","Volume":"volume"})
            df["adj_close"] = df["close"]
            df["stock_id"]  = stock_id
            df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
            rows = df[["stock_id","date","open","high","low",
                        "close","adj_close","volume"]].values.tolist()
            cur.executemany("""
                INSERT OR IGNORE INTO stock_history
                    (stock_id,date,open,high,low,close,adj_close,volume)
                VALUES (?,?,?,?,?,?,?,?)
            """, rows)
            conn.commit()
            total += len(rows)
            print(f"  ✅ {stock_id} ({len(rows)} 筆)")
        except Exception as e:
            print(f"  ⚠️  {ticker}: {e}")

    print(f"\n🎉 共寫入 {total} 筆歷史資料")


if __name__ == "__main__":
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    init_schema(conn)
    insert_stocks(conn)
    fetch_and_store(conn)
    conn.close()
    print(f"\n🗄️  資料庫位置：{DB_PATH}")
