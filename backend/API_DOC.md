# 📡 API 文件

> Base URL：`http://127.0.0.1:8000`
> 所有 Request / Response 格式均為 `application/json`

---

## 目錄

1. [POST /api/register　註冊帳號](#1-post-apiregister--註冊帳號)
2. [POST /api/login　登入帳號](#2-post-apilogin--登入帳號)
3. [GET /api/stocks　取得全部股票清單](#3-get-apistocks--取得全部股票清單)
4. [GET /api/stock/{stock_id}　取得單檔股票詳情](#4-get-apistockstock_id--取得單檔股票詳情)
5. [POST /api/analyze　股票 AI 分析](#5-post-apianalyze--股票-ai-分析)
6. [POST /api/trade　買賣股票](#6-post-apitrade--買賣股票)

---

## 1. POST /api/register — 註冊帳號

**說明：** 建立新使用者帳號，密碼以 bcrypt 加密後寫入 `users` 資料表。

### Request Body

```json
{
  "username": "alice",
  "password": "pass1234"
}
```

| 欄位 | 型別 | 必填 | 限制 |
|------|------|:----:|------|
| `username` | string | ✅ | 2–30 字元，不可重複 |
| `password` | string | ✅ | 最少 4 字元 |

### Response

**`201 Created`**
```json
{
  "message": "✅ 帳號 alice 註冊成功"
}
```

**錯誤**

| 狀態碼 | 說明 |
|--------|------|
| `409 Conflict` | 帳號已存在 |

---

## 2. POST /api/login — 登入帳號

**說明：** 驗證帳號密碼，成功後回傳 `user_id`，前端需將其儲存以供後續 API 使用。

### Request Body

```json
{
  "username": "alice",
  "password": "pass1234"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `username` | string | ✅ | 登入帳號 |
| `password` | string | ✅ | 登入密碼 |

### Response

**`200 OK`**
```json
{
  "user_id": 1,
  "username": "alice",
  "balance": 1000000.0
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `user_id` | int | 後續 API 所需的使用者識別碼 |
| `username` | string | 帳號名稱 |
| `balance` | float | 目前可用餘額（元） |

**錯誤**

| 狀態碼 | 說明 |
|--------|------|
| `401 Unauthorized` | 帳號或密碼錯誤 |

---

## 3. GET /api/stocks — 取得全部股票清單

**說明：** 回傳系統內全部 30 檔台股的名稱、產業與最新收盤價（取 `stock_history` 最後一筆）。

### Request

無需任何參數。

```
GET /api/stocks
```

### Response

**`200 OK`**
```json
[
  {
    "stock_id": "2330",
    "name": "台積電",
    "sector": "半導體",
    "current_price": 1070.0
  },
  {
    "stock_id": "2603",
    "name": "長榮",
    "sector": "航運",
    "current_price": 185.5
  }
]
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `stock_id` | string | 股票代碼（不含 .TW） |
| `name` | string | 中文名稱 |
| `sector` | string | 產業別 |
| `current_price` | float | 最新收盤價（`stock_history` 最後一筆 `close`） |

---

## 4. GET /api/stock/{stock_id} — 取得單檔股票詳情

**說明：** 取得指定股票的基本資訊與最新價格相關數據。

### Path Parameter

| 參數 | 型別 | 說明 |
|------|------|------|
| `stock_id` | string | 股票代碼，如 `2330` |

```
GET /api/stock/2330
```

### Response

**`200 OK`**
```json
{
  "stock_id": "2330",
  "name": "台積電",
  "sector": "半導體",
  "current_price": 1070.0,
  "open": 1050.0,
  "high": 1080.0,
  "low": 1045.0,
  "volume": 32150,
  "change": 20.0,
  "change_pct": 1.90
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `current_price` | float | 最新收盤價（最後一筆 `close`） |
| `open` | float | 當日開盤價 |
| `high` | float | 當日最高價 |
| `low` | float | 當日最低價 |
| `volume` | int | 成交量 |
| `change` | float | 漲跌（元）= `close − prev_close` |
| `change_pct` | float | 漲跌幅（%） |

**錯誤**

| 狀態碼 | 說明 |
|--------|------|
| `404 Not Found` | 查無此股票代碼 |

---

## 5. POST /api/analyze — 股票 AI 分析

**說明：** 傳入股票代碼，後端自動從 `stock_history` 撈取近期資料，組裝 Prompt 後傳給本地 Ollama（Qwen2.5-7B），回傳 AI 評估報告。

> ⚠️ 需先在本機啟動 Ollama：`ollama serve`

### Request Body

```json
{
  "stock_id": "2330"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `stock_id` | string | ✅ | 股票代碼 |

### 後端處理流程

```
1. 從 stock_history 撈近 30 天 OHLCV 資料
2. 計算 MA5、MA20 等簡易技術指標
3. 組裝繁體中文 Prompt
4. POST → http://localhost:11434/api/generate
5. 回傳 Qwen 分析結果
```

### Response

**`200 OK`**
```json
{
  "stock_id": "2330",
  "name": "台積電",
  "report": "台積電近期走勢偏多，收盤價持續站穩月線上方，資金動能充足。近10日成交量溫和放大，顯示買盤積極。建議短線可於回測 1050 元附近布局，壓力位關注 1090 元。整體評估：股價具支撐，基本面強勁，適合中長期持有，惟需留意全球半導體景氣變化。"
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `stock_id` | string | 股票代碼 |
| `name` | string | 股票中文名稱 |
| `report` | string | LLM 回傳的評估報告（約 200 字） |

**錯誤**

| 狀態碼 | 說明 |
|--------|------|
| `404 Not Found` | 查無此股票或歷史資料 |

---

## 6. POST /api/trade — 買賣股票

**說明：** 執行買入或賣出。**成交價格由後端自動從 `stock_history` 取最後一筆（最新日期）的 `close`，前端不需傳入 price。**
後端使用 **Transaction** 確保原子性：扣款與建立訂單同時成功或同時復原。

### Request Body

```json
{
  "user_id": 1,
  "stock_id": "2330",
  "order_type": "buy",
  "shares": 1000
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|:----:|------|
| `user_id` | int | ✅ | 使用者 ID（登入後取得） |
| `stock_id` | string | ✅ | 股票代碼 |
| `order_type` | string | ✅ | `"buy"` 買入 / `"sell"` 賣出 |
| `shares` | int | ✅ | 交易股數，須 > 0 |

### 後端處理流程

```
取得成交價：price = 該股票 stock_history 最新日期的 close
total_amount = shares × price

買入：
  ① 確認 balance >= total_amount（餘額不足 → 400）
  ② BEGIN TRANSACTION
       UPDATE users  SET balance = balance - total_amount
       INSERT INTO orders (...)
       UPSERT portfolio（更新平均成本與股數）
  ③ COMMIT（任一失敗 → ROLLBACK）

賣出：
  ① 確認 portfolio.shares >= req.shares（持股不足 → 400）
  ② BEGIN TRANSACTION
       UPDATE users  SET balance = balance + total_amount
       INSERT INTO orders (...)
       UPDATE portfolio SET shares = shares - req.shares
  ③ COMMIT（任一失敗 → ROLLBACK）
```

### Response

**`200 OK`**
```json
{
  "order_id": 5,
  "user_id": 1,
  "stock_id": "2330",
  "order_type": "buy",
  "shares": 1000,
  "price": 1070.0,
  "total_amount": 1070000.0,
  "balance_after": 930000.0
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `order_id` | int | 新建立的訂單 ID |
| `price` | float | 成交價（DB 最後一筆收盤價） |
| `total_amount` | float | 成交總金額 = `shares × price` |
| `balance_after` | float | 交易後剩餘餘額 |

**錯誤**

| 狀態碼 | 說明 |
|--------|------|
| `400 Bad Request` | 餘額不足（買入）/ 持股不足（賣出） |
| `404 Not Found` | 使用者或股票不存在 |
