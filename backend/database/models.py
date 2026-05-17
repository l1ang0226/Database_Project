"""
database/models.py ── Pydantic Request / Response Schema
對應 API_DOC.md 的所有端點
"""

from pydantic import BaseModel, Field
from typing import Optional, List


# ════════════════════════════════
#  Auth
# ════════════════════════════════
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=30, examples=["alice"])
    password: str = Field(..., min_length=4,                examples=["pass1234"])


class LoginRequest(BaseModel):
    username: str = Field(..., examples=["alice"])
    password: str = Field(..., examples=["pass1234"])


class LoginResponse(BaseModel):
    user_id:  int
    username: str
    balance:  float


# ════════════════════════════════
#  Stocks
# ════════════════════════════════
class StockListItem(BaseModel):
    """GET /api/stocks 清單用"""
    stock_id:      str
    name:          str
    sector:        str
    current_price: Optional[float] = None


class StockDetail(BaseModel):
    """GET /api/stock/{stock_id} 單檔詳情"""
    stock_id:      str
    name:          str
    sector:        str
    current_price: float
    open:          float
    high:          float
    low:           float
    volume:        int
    change:        Optional[float] = None       # 漲跌（元）
    change_pct:    Optional[float] = None       # 漲跌幅（%）


# ════════════════════════════════
#  AI 分析
# ════════════════════════════════
class AnalyzeRequest(BaseModel):
    stock_id: str = Field(..., examples=["2330"])


class AnalyzeResponse(BaseModel):
    stock_id: str
    name:     str
    report:   str


# ════════════════════════════════
#  Trade
# ════════════════════════════════
class TradeRequest(BaseModel):
    user_id:    int   = Field(..., examples=[1])
    stock_id:   str   = Field(..., examples=["2330"])
    order_type: str   = Field(..., pattern="^(buy|sell)$", examples=["buy"])
    shares:     int   = Field(..., gt=0,                   examples=[1000])


class TradeResponse(BaseModel):
    order_id:      int
    user_id:       int
    stock_id:      str
    order_type:    str
    shares:        int
    price:         float        # 後端從 DB 取得，非前端傳入
    total_amount:  float
    balance_after: float
