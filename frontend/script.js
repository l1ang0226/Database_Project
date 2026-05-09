// script.js 擴充部分

// 狀態管理：儲存目前登入的使用者資訊
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // 綁定註冊按鈕 (原有邏輯)
    const regBtn = document.getElementById('reg-btn');
    regBtn.addEventListener('click', handleRegister);

    // 綁定登入按鈕 (新增邏輯)
    const loginBtn = document.getElementById('login-btn');
    loginBtn.addEventListener('click', handleLogin);
});

// --- 登入處理函式 ---
function handleLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    if (user && pass) {
        // 模擬後端驗證邏輯 (未來會串接 FastAPI 的 /login 接口)
        // 假設驗證成功，後端會回傳使用者在 users 表中的資料
        currentUser = {
            username: user,
            balance: 5000000,
            initial_balance: 5000000
        };

        // 1. 更新 UI：隱藏登入註冊區，顯示歡迎資訊
        document.getElementById('auth-container').classList.add('d-none');
        document.getElementById('user-info-section').classList.remove('d-none');
        
        // 2. 顯示資料庫欄位資訊
        document.getElementById('display-username').innerText = currentUser.username;
        document.getElementById('display-initial-balance').innerText = currentUser.initial_balance.toLocaleString();
        document.getElementById('user-balance').innerText = currentUser.balance.toLocaleString();

        alert(`登入成功！歡迎 ${user}`);
    } else {
        alert("請輸入帳號密碼");
    }
}

// --- 註冊處理函式 (配合資料庫欄位) ---
function handleRegister() {
    const user = document.getElementById('reg-user').value;
    const pass = document.getElementById('reg-pass').value;

    if (user && pass) {
        alert(`註冊請求已送出！\n帳號：${user}\n密碼將進行 bcrypt 雜湊處理後存入資料庫。`);
        // 註冊完後通常會清空輸入框，方便使用者去旁邊登入
        document.getElementById('reg-user').value = "";
        document.getElementById('reg-pass').value = "";
    } else {
        alert("請完整填寫註冊資訊");
    }
}

// script.js

// 1. 配合 init_db.py 的股票清單 (列出部分代表，其餘可類推)
// 30 檔精選台股資料 (對應 init_db.py 結構)
const stocks = [
    // 半導體
    { stock_id: "2330", name: "台積電", sector: "半導體", price: 800 },
    { stock_id: "2454", name: "聯發科", sector: "半導體", price: 1000 },
    { stock_id: "2303", name: "聯電", sector: "半導體", price: 52 },
    { stock_id: "3711", name: "日月光投控", sector: "半導體", price: 155 },
    { stock_id: "2379", name: "瑞昱", sector: "半導體", price: 540 },
    { stock_id: "2408", name: "南亞科", sector: "半導體", price: 65 },
    { stock_id: "2337", name: "旺宏", sector: "半導體", price: 30 },

    // 電子代工・消費電子
    { stock_id: "2317", name: "鴻海", sector: "電子代工", price: 150 },
    { stock_id: "2382", name: "廣達", sector: "電子代工", price: 250 },
    { stock_id: "2357", name: "華碩", sector: "消費電子", price: 460 },
    { stock_id: "2376", name: "技嘉", sector: "消費電子", price: 310 },
    { stock_id: "2354", name: "鴻準", sector: "電子代工", price: 62 },

    // 工業・自動化・綠能
    { stock_id: "2395", name: "研華", sector: "工業自動化", price: 360 },
    { stock_id: "2308", name: "台達電", sector: "工業自動化", price: 330 },
    { stock_id: "6669", name: "緯穎", sector: "工業自動化", price: 2100 },

    // 金融
    { stock_id: "2881", "name": "富邦金", sector: "金融", price: 75 },
    { stock_id: "2882", "name": "國泰金", sector: "金融", price: 60 },
    { stock_id: "2886", "name": "兆豐金", sector: "金融", price: 40 },
    { stock_id: "2891", "name": "中信金", sector: "金融", price: 35 },
    { stock_id: "2884", "name": "玉山金", sector: "金融", price: 28 },

    // 電信
    { stock_id: "2412", "name": "中華電", sector: "電信", price: 125 },
    { stock_id: "3045", "name": "台灣大", sector: "電信", price: 105 },
    { stock_id: "4904", "name": "遠傳", sector: "電信", price: 85 },

    // 石化・傳產
    { stock_id: "1301", "name": "台塑", sector: "石化傳產", price: 70 },
    { stock_id: "1303", "name": "南亞", sector: "石化傳產", price: 60 },
    { stock_id: "6505", "name": "台塑化", sector: "石化傳產", price: 82 },
    { stock_id: "1326", "name": "台化", sector: "石化傳產", price: 58 },

    // 航運
    { stock_id: "2603", "name": "長榮", sector: "航運", price: 175 },
    { stock_id: "2609", "name": "陽明", sector: "航運", price: 62 },
    { stock_id: "2615", "name": "萬海", sector: "航運", price: 70 }
];

let myPortfolio = []; // 對應資料庫的 portfolio 表

document.addEventListener('DOMContentLoaded', () => {
    renderStocks(stocks);
    renderPortfolio();

    // 註冊邏輯：對應 users 表的 username, password_hash
    const regBtn = document.getElementById('reg-btn');
    regBtn.addEventListener('click', () => {
        const username = document.getElementById('reg-user').value;
        const password = document.getElementById('reg-pass').value;
        if (username && password) {
            alert(`註冊成功！使用者：${username}\n後端將會把 password 進行 hash 後存入 users 表。`);
        }
    });
});

// 渲染市場清單
function renderStocks(data) {
    const tableBody = document.getElementById('stock-list');
    tableBody.innerHTML = data.map(stock => `
        <tr>
            <td>${stock.name} (${stock.stock_id})</td>
            <td><span class="badge bg-secondary">${stock.sector}</span></td>
            <td>$${stock.price.toLocaleString()}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick="buyStock('${stock.stock_id}', ${stock.price})">買入</button>
            </td>
        </tr>
    `).join('');
}

// 買入邏輯：對應 orders 表 (order_type='buy', shares, price)
function buyStock(stock_id, price) {
    const lots = prompt(`整股買入 ${stock_id}\n請輸入張數 (1張=1000股)：`, "1");
    if (!lots || lots <= 0) return;

    const numLots = parseInt(lots);
    const shares = numLots * 1000; // 資料庫存的是股數
    const total_amount = price * shares;

    // 檢查餘額 (對應 users.balance)
    const balanceEl = document.getElementById('user-balance');
    let currentBalance = parseFloat(balanceEl.innerText.replace(/,/g, ''));

    if (currentBalance < total_amount) {
        alert("餘額不足！");
        return;
    }

    // 更新庫存邏輯 (對應 portfolio 表)
    const item = myPortfolio.find(p => p.stock_id === stock_id);
    if (item) {
        // 更新平均成本：(舊總價 + 新總價) / 總股數
        const oldTotal = item.shares * item.avg_cost;
        item.shares += shares;
        item.avg_cost = (oldTotal + total_amount) / item.shares;
    } else {
        const stockInfo = stocks.find(s => s.stock_id === stock_id);
        myPortfolio.push({
            stock_id: stock_id,
            name: stockInfo.name,
            shares: shares,
            avg_cost: price
        });
    }

    alert(`交易完成！\n後端將在 orders 表新增一筆 'buy' 紀錄\n並在 portfolio 表更新 ${stock_id} 的 shares 與 avg_cost。`);
    
    updateBalance(total_amount);
    renderPortfolio();
}

// 渲染庫存清單 (對應 portfolio 表)
function renderPortfolio() {
    const tableBody = document.getElementById('portfolio-list');
    tableBody.innerHTML = myPortfolio.map(item => {
        const lots = item.shares / 1000;
        const marketValue = item.shares * item.avg_cost;
        return `
            <tr>
                <td>${item.name} (${item.stock_id})</td>
                <td>${lots} 張</td>
                <td>${item.shares.toLocaleString()} 股</td>
                <td>$${item.avg_cost.toFixed(2)}</td>
                <td>$${marketValue.toLocaleString()}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm" onclick="sellStock('${item.stock_id}', ${item.avg_cost})">賣出</button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateBalance(amount) {
    const balanceEl = document.getElementById('user-balance');
    let current = parseFloat(balanceEl.innerText.replace(/,/g, ''));
    balanceEl.innerText = (current - amount).toLocaleString();
}