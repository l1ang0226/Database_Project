"""
init_db.py
==========
功能：
  1. 建立 SQLite 資料庫與所有資料表（Schema 初始化）
  2. 寫入 30 檔台股基本資訊（stocks 表）
  3. 透過 yfinance 批次下載 2023-01-01 ~ 2025-01-01 歷史資料
  4. 將 OHLCV 資料存入 stock_history 表

執行方式：
  pip install yfinance pandas
  python init_db.py
"""

import sqlite3
import yfinance as yf
import pandas as pd
from datetime import datetime

# ── 設定區 ────────────────────────────────────────────────
DB_PATH    = "stock_market.db"
START_DATE = "2023-01-01"
END_DATE   = "2026-01-01"

# 30 檔精選台股：(代碼, 中文名稱, 產業)
STOCKS = [
    # 半導體
    ("2330", "台積電",   "半導體"),
    ("2454", "聯發科",   "半導體"),
    ("2303", "聯電",     "半導體"),
    ("3711", "日月光投控","半導體"),
    ("2379", "瑞昱",     "半導體"),
    ("2408", "南亞科",   "半導體"),
    ("2337", "旺宏",     "半導體"),
    # 電子代工・消費電子
    ("2317", "鴻海",     "電子代工"),
    ("2382", "廣達",     "電子代工"),
    ("2357", "華碩",     "消費電子"),
    ("2376", "技嘉",     "消費電子"),
    ("2354", "鴻準",     "電子代工"),
    # 工業・自動化・綠能
    ("2395", "研華",     "工業自動化"),
    ("2308", "台達電",   "工業自動化"),
    ("6669", "緯穎",     "工業自動化"),
    # 金融
    ("2881", "富邦金",   "金融"),
    ("2882", "國泰金",   "金融"),
    ("2886", "兆豐金",   "金融"),
    ("2891", "中信金",   "金融"),
    ("2884", "玉山金",   "金融"),
    # 電信
    ("2412", "中華電",   "電信"),
    ("3045", "台灣大",   "電信"),
    ("4904", "遠傳",     "電信"),
    # 石化・傳產
    ("1301", "台塑",     "石化傳產"),
    ("1303", "南亞",     "石化傳產"),
    ("6505", "台塑化",   "石化傳產"),
    ("1326", "台化",     "石化傳產"),
    # 航運
    ("2603", "長榮",     "航運"),
    ("2609", "陽明",     "航運"),
    ("2615", "萬海",     "航運"),
]

# ── Step 1：建立資料庫與資料表 ────────────────────────────
def init_schema(conn: sqlite3.Connection):
    cursor = conn.cursor()

    cursor.executescript("""
        -- 使用者帳號
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            username        TEXT    NOT NULL UNIQUE,
            password_hash   TEXT    NOT NULL,
            balance         REAL    NOT NULL DEFAULT 0,
            initial_balance REAL    NOT NULL DEFAULT 0,
            created_at      DATETIME DEFAULT (datetime('now','localtime'))
        );

        -- 股票基本資訊
        CREATE TABLE IF NOT EXISTS stocks (
            stock_id TEXT PRIMARY KEY,   -- e.g. '2330'
            name     TEXT NOT NULL,
            sector   TEXT NOT NULL
        );

        -- 歷史 OHLCV（yfinance 來源）
        CREATE TABLE IF NOT EXISTS stock_history (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            stock_id  TEXT NOT NULL,
            date      DATE NOT NULL,
            open      REAL,
            high      REAL,
            low       REAL,
            close     REAL,
            adj_close REAL,
            volume    INTEGER,
            FOREIGN KEY (stock_id) REFERENCES stocks(stock_id),
            UNIQUE (stock_id, date)      -- 防止重複寫入
        );

        -- 交易訂單
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

        -- 持倉（目前持股）
        CREATE TABLE IF NOT EXISTS portfolio (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            stock_id   TEXT    NOT NULL,
            shares     INTEGER NOT NULL DEFAULT 0,
            avg_cost   REAL    NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (user_id)  REFERENCES users(id),
            FOREIGN KEY (stock_id) REFERENCES stocks(stock_id),
            UNIQUE (user_id, stock_id)
        );
    """)
    conn.commit()
    print("✅ Schema 建立完成")


# ── Step 2：寫入股票基本資訊 ──────────────────────────────
def insert_stocks(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.executemany(
        "INSERT OR IGNORE INTO stocks (stock_id, name, sector) VALUES (?, ?, ?)",
        STOCKS
    )
    conn.commit()
    print(f"✅ stocks 表寫入完成（共 {len(STOCKS)} 檔）")


# ── Step 3：下載並寫入歷史資料 ────────────────────────────
def fetch_and_store(conn: sqlite3.Connection):
    tickers_tw = [f"{sid}.TW" for sid, _, _ in STOCKS]
    
    print(f"\n📡 開始批次下載 {len(tickers_tw)} 檔股票資料（{START_DATE} ~ {END_DATE}）...")
    
    # yfinance 一次下載全部，auto_adjust=True 讓 Close 已含除權息調整
    raw = yf.download(
        tickers  = tickers_tw,
        start    = START_DATE,
        end      = END_DATE,
        group_by = "ticker",
        auto_adjust = True,
        progress = True
    )
    
    cursor = conn.cursor()
    total_rows = 0

    for stock_id, _, _ in STOCKS:
        ticker = f"{stock_id}.TW"
        
        try:
            df = raw[ticker].copy()
        except KeyError:
            print(f"  ⚠️  {ticker} 無資料，跳過")
            continue

        df = df.dropna(subset=["Close"])
        df = df.reset_index()  # Date 從 index 變成欄位

        # 統一欄位名稱（auto_adjust=True 時無 Adj Close 欄，Close 即調整後價格）
        df = df.rename(columns={
            "Date":   "date",
            "Open":   "open",
            "High":   "high",
            "Low":    "low",
            "Close":  "close",
            "Volume": "volume",
        })
        df["adj_close"] = df["close"]   # auto_adjust 已調整，兩者相同
        df["stock_id"]  = stock_id
        df["date"]      = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

        rows = df[["stock_id","date","open","high","low","close","adj_close","volume"]].values.tolist()

        # INSERT OR IGNORE：若 (stock_id, date) 已存在則跳過，不重複寫入
        cursor.executemany("""
            INSERT OR IGNORE INTO stock_history
                (stock_id, date, open, high, low, close, adj_close, volume)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, rows)

        conn.commit()
        total_rows += len(rows)
        print(f"  ✅ {stock_id} {df['date'].iloc[0]} ~ {df['date'].iloc[-1]}  ({len(rows)} 筆)")

    print(f"\n🎉 全部完成！共寫入 {total_rows} 筆歷史資料")


# ── Step 4：簡易驗證 ──────────────────────────────────────
def verify(conn: sqlite3.Connection):
    cur = conn.cursor()

    count = cur.execute("SELECT COUNT(*) FROM stock_history").fetchone()[0]
    print(f"\n📊 stock_history 總筆數：{count}")

    print("\n各股資料筆數（前5）：")
    rows = cur.execute("""
        SELECT s.stock_id, s.name, COUNT(h.id) AS cnt,
               MIN(h.date) AS first_date, MAX(h.date) AS last_date
        FROM stocks s
        JOIN stock_history h ON s.stock_id = h.stock_id
        GROUP BY s.stock_id
        LIMIT 5
    """).fetchall()

    for r in rows:
        print(f"  {r[0]} {r[1]:<6}  {r[2]} 筆  {r[3]} ~ {r[4]}")


# ── 主程式 ────────────────────────────────────────────────
if __name__ == "__main__":
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)

    init_schema(conn)
    insert_stocks(conn)
    fetch_and_store(conn)
    verify(conn)

    conn.close()
    print(f"\n🗄️  資料庫位置：{DB_PATH}")