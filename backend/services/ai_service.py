"""
services/ai_service.py ── Ollama / Qwen 整合

流程：
  1. 格式化近 30 天 stock_history → 文字表格
  2. 計算 MA5、MA20
  3. 組裝繁體中文 Prompt
  4. POST http://localhost:11434/api/generate
  5. 回傳分析報告字串
"""

import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL      = "qwen2.5:7b"   # 依 ollama pull 的名稱調整


def analyze_stock(stock_id: str, name: str, history: list) -> str:
    """
    history: sqlite3.Row list，時間正序（舊→新），最多 30 筆。
    回傳: 分析報告字串。
    """
    # ── 格式化近 10 天為文字表格（避免 Prompt 過長）──────────
    recent = history[-10:]
    lines  = [
        "日期            開盤      最高      最低      收盤      成交量",
        "─" * 64,
    ]
    for r in recent:
        lines.append(
            f"{r['date']}  "
            f"{r['open']:>8.1f}  {r['high']:>8.1f}  "
            f"{r['low']:>8.1f}  {r['close']:>8.1f}  "
            f"{r['volume']:>10,}"
        )
    table = "\n".join(lines)

    # ── 計算簡易技術指標 ──────────────────────────────────────
    closes = [r["close"] for r in history]
    ma5    = round(sum(closes[-5:])  / min(5,  len(closes)), 2)
    ma20   = round(sum(closes[-20:]) / min(20, len(closes)), 2)
    latest = closes[-1]

    # ── 組裝 Prompt ───────────────────────────────────────────
    prompt = f"""你是一位專業的台灣股市分析師，請用繁體中文回應，不要使用 Markdown 格式。

以下是 {name}（股票代碼：{stock_id}）最近 10 個交易日的行情資料：

{table}

技術指標：MA5 = {ma5}　MA20 = {ma20}　最新收盤 = {latest}

請根據以上資料，提供：
1. 近期趨勢判斷（多頭 / 空頭 / 盤整，並說明理由）
2. 支撐位與壓力位
3. 量價關係觀察
4. 短線操作建議（買進 / 觀望 / 減碼）與風險提示

請簡潔扼要，約 200 字以內。"""

    # ── 呼叫 Ollama ───────────────────────────────────────────
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={"model": MODEL, "prompt": prompt, "stream": False},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json().get("response", "（Ollama 回傳空白）")

    except requests.exceptions.ConnectionError:
        return (
            "⚠️ 無法連線至 Ollama，請確認本地服務已啟動：\n"
            "  終端機執行 → ollama serve\n"
            f"  確認模型   → ollama pull {MODEL}"
        )
    except requests.exceptions.Timeout:
        return "⚠️ Ollama 推理逾時（60s），請確認模型是否正確載入"
    except Exception as e:
        return f"⚠️ 分析失敗：{e}"
