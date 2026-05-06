// script.js

// 1. 全域資料定義
const stocks = [
    { id: "2330", name: "台積電", price: 800 },
    { id: "2317", name: "鴻海", price: 150 },
    { id: "2454", name: "聯發科", price: 1000 },
    { id: "2882", name: "國泰金", price: 60 },
    { id: "2603", name: "長榮", price: 170 }
];

let myPortfolio = []; // 存放庫存資料

// 當網頁載入完成後執行
document.addEventListener('DOMContentLoaded', () => {
    // 渲染初始股票列表
    renderStocks(stocks);
    // 初始化庫存清單
    renderPortfolio();

    // 處理註冊按鈕邏輯
    const regBtn = document.getElementById('reg-btn');
    if (regBtn) {
        regBtn.addEventListener('click', () => {
            const user = document.getElementById('reg-user').value;
            const pass = document.getElementById('reg-pass').value;
            
            if (user && pass) {
                alert(`使用者 ${user} 註冊成功！\n(此資訊未來將透過 FastAPI 存入 stock_market.db)`);
            } else {
                alert("請輸入完整的帳號與密碼");
            }
        });
    }
});

// --- 介面渲染函式 ---

// 渲染「今日股市」表格
function renderStocks(stockData) {
    const tableBody = document.getElementById('stock-list');
    if (!tableBody) return;
    
    tableBody.innerHTML = ""; 
    stockData.forEach(stock => {
        const row = `
            <tr>
                <td>${stock.name} (${stock.id})</td>
                <td>$${stock.price.toLocaleString()}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="buyStock('${stock.id}', ${stock.price})">
                        整股買入
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// 渲染「我的庫存」表格
function renderPortfolio() {
    const portfolioBody = document.getElementById('portfolio-list');
    if (!portfolioBody) return;

    portfolioBody.innerHTML = ""; 
    myPortfolio.forEach(item => {
        const totalShares = item.lots * 1000;
        const currentValue = totalShares * item.avgCost; 
        const row = `
            <tr>
                <td>${item.name} (${item.id})</td>
                <td>${item.lots} 張</td>
                <td>$${item.avgCost.toLocaleString()}</td>
                <td>$${currentValue.toLocaleString()}</td>
                <td>
                    <!-- 這裡直接呼叫現有的 buyStock，以及新寫的 sellStock -->
                    <button class="btn btn-outline-primary btn-sm me-1" onclick="buyStock('${item.id}', ${item.avgCost})">買進</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="sellStock('${item.id}', ${item.avgCost})">賣出</button>
                </td>
            </tr>
        `;
        portfolioBody.innerHTML += row;
    });
    
    // 更新總資產估值
    calculateTotalAssets();
}

// 2. 新增賣出股票的處理函式
function sellStock(stockId, currentPrice) {
    const stockIndex = myPortfolio.findIndex(s => s.id === stockId);
    if (stockIndex === -1) return;

    const stock = myPortfolio[stockIndex];
    const sellLots = prompt(`您目前持有 ${stock.name} ${stock.lots} 張\n請輸入欲「賣出」張數：`, "1");

    if (sellLots !== null && sellLots > 0) {
        const numSellLots = parseInt(sellLots);

        // 檢查持股是否足夠
        if (numSellLots > stock.lots) {
            alert(`賣出失敗！您目前僅持有 ${stock.lots} 張，無法賣出 ${numSellLots} 張。`);
            return;
        }

        const totalShares = numSellLots * 1000;
        const totalGet = currentPrice * totalShares; // 賣出獲得的金額

        // 更新庫存數據
        stock.lots -= numSellLots;

        // 如果張數變 0，就從庫存中移除
        if (stock.lots === 0) {
            myPortfolio.splice(stockIndex, 1);
        }

        alert(`賣出成功！\n賣出數量：${numSellLots} 張\n獲得金額：$${totalGet.toLocaleString()}`);

        // 更新 UI：加錢回餘額並重新渲染庫存
        updateBalance(-totalGet); // 傳入負值代表負負得正（加錢）
        renderPortfolio();
    }
}

// 3. 計算總資產估值的簡單函式
function calculateTotalAssets() {
    const totalAssetsEl = document.getElementById('total-assets');
    if (!totalAssetsEl) return;

    const total = myPortfolio.reduce((sum, item) => sum + (item.lots * 1000 * item.avgCost), 0);
    totalAssetsEl.innerText = total.toLocaleString();
}

// --- 交易邏輯函式 ---

// 處理買入動作 (整股交易邏輯)
function buyStock(stockId, price) {
    const lots = prompt(`您選擇「整股買入」 ${stockId}\n目前股價為: $${price} (每股)\n請輸入欲購買張數 (1張 = 1000股)：`, "1");
    
    if (lots !== null && lots > 0) {
        const numLots = parseInt(lots);
        const totalShares = numLots * 1000; 
        const totalCost = price * totalShares;

        // 檢查餘額
        const balanceEl = document.getElementById('user-balance');
        let currentBalance = parseInt(balanceEl.innerText.replace(/,/g, ''));

        if (currentBalance < totalCost) {
            alert(`餘額不足！\n本次交易需：$${totalCost.toLocaleString()}\n您的餘額：$${currentBalance.toLocaleString()}`);
            return;
        }

        // 更新或新增庫存
        const existingStock = myPortfolio.find(s => s.id === stockId);
        if (existingStock) {
            existingStock.lots += numLots;
        } else {
            // 找到該股票名稱
            const stockInfo = stocks.find(s => s.id === stockId);
            myPortfolio.push({
                id: stockId,
                name: stockInfo ? stockInfo.name : "未知股票", 
                lots: numLots,
                avgCost: price
            });
        }

        alert(`買入成功！\n購買數量：${numLots} 張 (${totalShares} 股)\n總計扣除：$${totalCost.toLocaleString()}`);
        
        // 更新 UI
        updateBalance(totalCost);
        renderPortfolio();
    }
}

// 更新導航欄餘額
function updateBalance(cost) {
    const balanceEl = document.getElementById('user-balance');
    if (balanceEl) {
        let currentBalance = parseInt(balanceEl.innerText.replace(/,/g, ''));
        const newBalance = currentBalance - cost;
        balanceEl.innerText = newBalance.toLocaleString();
    }
}