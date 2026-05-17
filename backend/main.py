"""
main.py ── FastAPI 主程式
啟動：cd backend && uvicorn main:app --reload --port 8000
文件：http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, stocks, trade, ai

app = FastAPI(
    title="台股模擬交易系統",
    version="1.0.0",
)

# ── CORS：允許前端（file:// 或 Live Server）存取 ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 掛載路由 ──
app.include_router(auth.router,   prefix="/api", tags=["Auth"])
app.include_router(stocks.router, prefix="/api", tags=["Stocks"])
app.include_router(trade.router,  prefix="/api", tags=["Trade"])
app.include_router(ai.router,     prefix="/api", tags=["AI"])

@app.get("/")
def root():
    return {"message": "台股模擬交易系統 API 運行中 🚀"}
