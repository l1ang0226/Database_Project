const API = 'http://localhost:8000/api';

// ========== 股票資料（備用靜態資料，API 無法連線時使用） ==========
const STOCKS = [
    { stock_id: "2330", name: "台積電",    sector: "半導體",     price: 800  },
    { stock_id: "2454", name: "聯發科",    sector: "半導體",     price: 1000 },
    { stock_id: "2303", name: "聯電",      sector: "半導體",     price: 52   },
    { stock_id: "3711", name: "日月光投控", sector: "半導體",    price: 155  },
    { stock_id: "2379", name: "瑞昱",      sector: "半導體",     price: 540  },
    { stock_id: "2408", name: "南亞科",    sector: "半導體",     price: 65   },
    { stock_id: "2337", name: "旺宏",      sector: "半導體",     price: 30   },
    { stock_id: "2317", name: "鴻海",      sector: "電子代工",   price: 150  },
    { stock_id: "2382", name: "廣達",      sector: "電子代工",   price: 250  },
    { stock_id: "2357", name: "華碩",      sector: "消費電子",   price: 460  },
    { stock_id: "2376", name: "技嘉",      sector: "消費電子",   price: 310  },
    { stock_id: "2354", name: "鴻準",      sector: "電子代工",   price: 62   },
    { stock_id: "2395", name: "研華",      sector: "工業自動化", price: 360  },
    { stock_id: "2308", name: "台達電",    sector: "工業自動化", price: 330  },
    { stock_id: "6669", name: "緯穎",      sector: "工業自動化", price: 2100 },
    { stock_id: "2881", name: "富邦金",    sector: "金融",       price: 75   },
    { stock_id: "2882", name: "國泰金",    sector: "金融",       price: 60   },
    { stock_id: "2886", name: "兆豐金",    sector: "金融",       price: 40   },
    { stock_id: "2891", name: "中信金",    sector: "金融",       price: 35   },
    { stock_id: "2884", name: "玉山金",    sector: "金融",       price: 28   },
    { stock_id: "2412", name: "中華電",    sector: "電信",       price: 125  },
    { stock_id: "3045", name: "台灣大",    sector: "電信",       price: 105  },
    { stock_id: "4904", name: "遠傳",      sector: "電信",       price: 85   },
    { stock_id: "1301", name: "台塑",      sector: "石化傳產",   price: 70   },
    { stock_id: "1303", name: "南亞",      sector: "石化傳產",   price: 60   },
    { stock_id: "6505", name: "台塑化",    sector: "石化傳產",   price: 82   },
    { stock_id: "1326", name: "台化",      sector: "石化傳產",   price: 58   },
    { stock_id: "2603", name: "長榮",      sector: "航運",       price: 175  },
    { stock_id: "2609", name: "陽明",      sector: "航運",       price: 62   },
    { stock_id: "2615", name: "萬海",      sector: "航運",       price: 70   }
];

// 從 API 取得的即時股票清單（各頁共用）
let _stocks = [];

// 從 _stocks 取現價，若 API 尚未載入則從靜態 STOCKS 取備用價
function getStockPrice(stock_id) {
    const fromApi = _stocks.find(s => s.stock_id === stock_id);
    if (fromApi && fromApi.current_price != null) return fromApi.current_price;
    const fallback = STOCKS.find(s => s.stock_id === stock_id);
    return fallback ? fallback.price : 0;
}

function getStockName(stock_id) {
    const fromApi = _stocks.find(s => s.stock_id === stock_id);
    if (fromApi) return fromApi.name;
    const fallback = STOCKS.find(s => s.stock_id === stock_id);
    return fallback ? fallback.name : stock_id;
}

// ========== 共用元件（動態注入，各頁共用） ==========
const TRADE_MODAL_HTML = `
<div class="modal fade" id="tradeModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered" style="max-width:420px">
        <div class="modal-content shadow-lg">
            <div class="modal-header" id="tradeModalHeader">
                <h5 class="modal-title" id="tradeModalTitle">交易</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="d-flex justify-content-between text-muted small mb-3 px-1">
                    <span id="tradeModalInfo1"></span>
                    <span id="tradeModalInfo2"></span>
                </div>
                <div class="mb-3">
                    <label class="form-label fw-semibold">張數（1 張 = 1000 股）</label>
                    <input type="number" id="tradeModalLots" class="form-control form-control-lg text-center"
                           min="1" value="1" oninput="updateTradeSummary()">
                </div>
                <div id="tradeModalSummary" class="alert mb-0 py-2 small"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn" id="tradeModalConfirm" onclick="confirmTradeModal()">確定</button>
            </div>
        </div>
    </div>
</div>`;

const TOAST_HTML = `
<div class="position-fixed top-0 end-0 p-3" style="z-index:1100">
    <div id="liveToast" class="toast align-items-center border-0 shadow-sm" role="alert" aria-live="assertive" data-bs-delay="3000">
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center gap-2 fw-semibold">
                <i id="toastIcon" class="bi fs-5"></i>
                <span id="toastMsg"></span>
            </div>
            <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    </div>
</div>`;

function initSharedComponents() {
    if (!document.getElementById('tradeModal')) {
        document.body.insertAdjacentHTML('beforeend', TRADE_MODAL_HTML);
    }
    if (!document.getElementById('liveToast')) {
        document.body.insertAdjacentHTML('beforeend', TOAST_HTML);
    }
}

// ========== Toast 通知 ==========
function showToast(message, type = 'success') {
    const styles = {
        success: { icon: 'bi-check-circle-fill', bg: 'bg-success text-white' },
        danger:  { icon: 'bi-x-circle-fill',           bg: 'bg-danger text-white'  },
        warning: { icon: 'bi-exclamation-triangle-fill', bg: 'bg-warning text-dark'  },
        info:    { icon: 'bi-info-circle-fill',         bg: 'bg-info text-dark'     }
    };
    const s = styles[type] || styles.success;
    const toastEl = document.getElementById('liveToast');
    toastEl.className = `toast align-items-center border-0 shadow-sm ${s.bg}`;
    document.getElementById('toastIcon').className = `bi ${s.icon} fs-5`;
    document.getElementById('toastMsg').innerText = message;
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

// ========== 交易彈窗 ==========
let _tradeConfig = null;
let _tradeCallback = null;

function openTradeModal(config) {
    _tradeConfig = config;
    _tradeCallback = config.onConfirm;

    document.getElementById('tradeModalHeader').className = `modal-header ${config.headerClass}`;
    document.getElementById('tradeModalTitle').innerText = config.title;
    document.getElementById('tradeModalInfo1').innerText = config.info1;
    document.getElementById('tradeModalInfo2').innerText = config.info2;
    document.getElementById('tradeModalLots').max = config.maxLots;
    document.getElementById('tradeModalLots').value = 1;
    document.getElementById('tradeModalConfirm').className = `btn ${config.confirmBtnClass}`;
    document.getElementById('tradeModalConfirm').innerText = config.confirmText;

    updateTradeSummary();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('tradeModal')).show();
    document.getElementById('tradeModal').addEventListener('shown.bs.modal', () => {
        document.getElementById('tradeModalLots').focus();
    }, { once: true });
}

function updateTradeSummary() {
    const config = _tradeConfig;
    if (!config) return;

    const lots = parseInt(document.getElementById('tradeModalLots').value) || 0;
    const amount = lots * 1000 * config.pricePerLot;
    const el = document.getElementById('tradeModalSummary');

    if (config.type === 'buy') {
        const remaining = config.balanceAvail - amount;
        const ok = lots > 0 && remaining >= 0;
        el.className = `alert mb-0 py-2 small ${ok ? 'alert-success' : 'alert-danger'}`;
        el.innerHTML = ok
            ? `預計花費 <strong>$${amount.toLocaleString()}</strong>，交易後餘額 $${remaining.toLocaleString()}`
            : lots <= 0 ? '請輸入有效張數'
            : `餘額不足！需要 $${amount.toLocaleString()}，目前僅有 $${config.balanceAvail.toLocaleString()}`;
    } else {
        const ok = lots > 0 && lots <= config.maxLots;
        el.className = `alert mb-0 py-2 small ${ok ? 'alert-info' : 'alert-danger'}`;
        el.innerHTML = ok
            ? `預計獲得 <strong>$${amount.toLocaleString()}</strong>`
            : lots <= 0 ? '請輸入有效張數'
            : `持股不足！最多可賣 ${config.maxLots} 張`;
    }
}

function confirmTradeModal() {
    const lots = parseInt(document.getElementById('tradeModalLots').value);
    if (!lots || lots <= 0) {
        showToast('請輸入有效張數', 'warning');
        return;
    }
    bootstrap.Modal.getInstance(document.getElementById('tradeModal')).hide();
    if (_tradeCallback) _tradeCallback(lots);
}

// ========== 狀態管理（localStorage） ==========
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

function saveCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}


function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function getPortfolio() {
    const user = getCurrentUser();
    const key = user ? `portfolio_${user.username}` : 'myPortfolio';
    return JSON.parse(localStorage.getItem(key) || '[]');
}

function savePortfolio(portfolio) {
    const user = getCurrentUser();
    const key = user ? `portfolio_${user.username}` : 'myPortfolio';
    localStorage.setItem(key, JSON.stringify(portfolio));
}

// ========== 登入頁 ==========
function initLoginPage() {
    initSharedComponents();
    if (getCurrentUser()) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('reg-btn').addEventListener('click', handleRegister);
}

async function handleLogin() {
    const username = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    if (!username || !pass) {
        showToast('請輸入帳號密碼', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: pass })
        });

        if (!res.ok) {
            const err = await res.json();
            const msg = Array.isArray(err.detail) ? err.detail[0]?.msg : (err.detail || '帳號或密碼錯誤');
            showToast(msg, 'danger');
            return;
        }

        const data = await res.json();
        saveCurrentUser({ user_id: data.user_id, username: data.username, balance: data.balance });
        window.location.href = 'index.html';
    } catch {
        showToast('無法連線至伺服器，請確認後端是否啟動', 'danger');
    }
}

async function handleRegister() {
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();

    if (!user || !pass) {
        showToast('請完整填寫註冊資訊', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        if (!res.ok) {
            const err = await res.json();
            const msg = Array.isArray(err.detail) ? err.detail[0]?.msg : (err.detail || '註冊失敗');
            showToast(msg, 'danger');
            return;
        }

        showToast(`帳號 ${user} 註冊成功！`, 'success');
        document.getElementById('reg-user').value = '';
        document.getElementById('reg-pass').value = '';
    } catch {
        showToast('無法連線至伺服器，請確認後端是否啟動', 'danger');
    }
}

// ========== Navbar 共用 ==========
function updateNavbar() {
    const user = getCurrentUser();
    if (!user) return;

    const usernameEl = document.getElementById('display-username');
    if (usernameEl) usernameEl.innerText = user.username;

    const balanceEl = document.getElementById('user-balance');
    if (balanceEl) balanceEl.innerText = user.balance.toLocaleString();
}

// ========== 今日股市頁 ==========
async function initMarketPage() {
    initSharedComponents();
    if (!getCurrentUser()) { window.location.href = 'login.html'; return; }
    updateNavbar();

    try {
        const res = await fetch(`${API}/stocks`);
        if (res.ok) {
            _stocks = await res.json();
            renderStocks(_stocks);
            return;
        }
    } catch {}

    // API 失敗時使用靜態備用資料
    showToast('無法取得即時股價，顯示靜態備用資料', 'warning');
    renderStocks(STOCKS.map(s => ({ ...s, current_price: s.price })));
}

function renderStocks(data) {
    const tableBody = document.getElementById('stock-list');
    if (!tableBody) return;
    tableBody.innerHTML = data.map(stock => `
        <tr>
            <td>${stock.name} (${stock.stock_id})</td>
            <td><span class="badge bg-secondary">${stock.sector}</span></td>
            <td>$${(stock.current_price ?? stock.price ?? 0).toLocaleString()}</td>
            <td>
                <div class="btn-group" role="group">
                    <button class="btn btn-success btn-sm" onclick="buyStock('${stock.stock_id}', ${stock.current_price ?? stock.price ?? 0})">買入</button>
                    <button class="btn btn-info btn-sm text-white" onclick="showAIAnalysis('${stock.stock_id}', '${stock.name}')">AI分析</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function buyStock(stock_id, price) {
    if (!price || price <= 0) {
        showToast('此股票目前無報價資料', 'warning');
        return;
    }
    const user = getCurrentUser();
    const name = getStockName(stock_id);

    openTradeModal({
        type: 'buy',
        title: `買入 ${name} (${stock_id})`,
        headerClass: 'bg-success text-white',
        confirmBtnClass: 'btn-success',
        confirmText: '確認買入',
        info1: `現價：$${price.toLocaleString()} ／ 股`,
        info2: `可用餘額：$${user.balance.toLocaleString()}`,
        maxLots: Math.max(1, Math.floor(user.balance / (price * 1000))),
        pricePerLot: price,
        balanceAvail: user.balance,
        onConfirm: (numLots) => executeBuy(stock_id, price, numLots)
    });
}

async function executeBuy(stock_id, price, numLots) {
    const user = getCurrentUser();
    const shares = numLots * 1000;

    try {
        const res = await fetch(`${API}/trade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.user_id, stock_id, order_type: 'buy', shares })
        });

        if (!res.ok) {
            const err = await res.json();
            showToast(err.detail || '交易失敗', 'danger');
            return;
        }

        const data = await res.json();

        // 更新餘額（以後端回傳為準）
        user.balance = data.balance_after;
        saveCurrentUser(user);
        updateNavbar();

        // 同步更新 localStorage 持倉（供 portfolio 頁顯示）
        const portfolio = getPortfolio();
        const item = portfolio.find(p => p.stock_id === stock_id);
        if (item) {
            const oldTotal = item.shares * item.avg_cost;
            item.shares += shares;
            item.avg_cost = (oldTotal + data.total_amount) / item.shares;
        } else {
            portfolio.push({ stock_id, name: getStockName(stock_id), shares, avg_cost: data.price });
        }
        savePortfolio(portfolio);

        showToast(`買入 ${stock_id} ${numLots} 張，花費 $${data.total_amount.toLocaleString()}`, 'success');
    } catch {
        showToast('無法連線至伺服器', 'danger');
    }
}

// ========== 我的庫存頁 ==========
async function initPortfolioPage() {
    initSharedComponents();
    if (!getCurrentUser()) { window.location.href = 'login.html'; return; }
    updateNavbar();

    // 取得最新股價供損益計算
    try {
        const res = await fetch(`${API}/stocks`);
        if (res.ok) _stocks = await res.json();
    } catch {}

    renderPortfolio();
    updateTotalAssets();
}

function renderPortfolio() {
    const tableBody = document.getElementById('portfolio-list');
    if (!tableBody) return;

    const portfolio = getPortfolio();
    if (portfolio.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">尚無持股，前往 <a href="index.html">今日股市</a> 買入</td></tr>';
        return;
    }

    tableBody.innerHTML = portfolio.map(item => {
        const lots = item.shares / 1000;
        const currentPrice = getStockPrice(item.stock_id);
        const marketValue = item.shares * currentPrice;
        const profitLoss = marketValue - item.shares * item.avg_cost;
        const profitClass = profitLoss >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';
        const profitSign = profitLoss >= 0 ? '+' : '-';
        return `
            <tr>
                <td>${item.name} (${item.stock_id})</td>
                <td>${lots} 張</td>
                <td>$${item.avg_cost.toFixed(2)}</td>
                <td>$${Math.round(marketValue).toLocaleString()}</td>
                <td class="${profitClass}">${profitSign}$${Math.round(Math.abs(profitLoss)).toLocaleString()}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm" onclick="sellStock('${item.stock_id}')">賣出</button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateTotalAssets() {
    const portfolio = getPortfolio();
    const user = getCurrentUser();

    let stockValue = 0;
    portfolio.forEach(item => {
        stockValue += item.shares * getStockPrice(item.stock_id);
    });

    const el = document.getElementById('total-assets');
    if (el) el.innerText = ((user ? user.balance : 0) + stockValue).toLocaleString();
}

function sellStock(stock_id) {
    const portfolio = getPortfolio();
    const item = portfolio.find(p => p.stock_id === stock_id);
    if (!item) return;

    const currentPrice = getStockPrice(stock_id);
    const maxLots = item.shares / 1000;

    openTradeModal({
        type: 'sell',
        title: `賣出 ${item.name} (${stock_id})`,
        headerClass: 'bg-danger text-white',
        confirmBtnClass: 'btn-danger',
        confirmText: '確認賣出',
        info1: `現價：$${currentPrice.toLocaleString()} ／ 股`,
        info2: `持有：${maxLots} 張`,
        maxLots,
        pricePerLot: currentPrice,
        balanceAvail: null,
        onConfirm: (numLots) => executeSell(stock_id, numLots)
    });
}

async function executeSell(stock_id, numLots) {
    const portfolio = getPortfolio();
    const item = portfolio.find(p => p.stock_id === stock_id);
    if (!item) return;

    const user = getCurrentUser();
    const shares = numLots * 1000;
    const maxLots = item.shares / 1000;

    if (numLots > maxLots) {
        showToast(`持股不足！最多可賣 ${maxLots} 張`, 'danger');
        return;
    }

    try {
        const res = await fetch(`${API}/trade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.user_id, stock_id, order_type: 'sell', shares })
        });

        if (!res.ok) {
            const err = await res.json();
            showToast(err.detail || '交易失敗', 'danger');
            return;
        }

        const data = await res.json();

        // 更新餘額（以後端回傳為準）
        user.balance = data.balance_after;
        saveCurrentUser(user);

        // 同步更新 localStorage 持倉
        item.shares -= shares;
        const updatedPortfolio = item.shares === 0
            ? portfolio.filter(p => p.stock_id !== stock_id)
            : portfolio;
        savePortfolio(updatedPortfolio);

        showToast(`賣出 ${item.name} ${numLots} 張，獲得 $${data.total_amount.toLocaleString()}`, 'success');

        updateNavbar();
        renderPortfolio();
        updateTotalAssets();
    } catch {
        showToast('無法連線至伺服器', 'danger');
    }
}

// ========== AI 分析 ==========
let stockChartInstance = null;
let currentAIStock = null;

async function showAIAnalysis(stockId, stockName) {
    currentAIStock = { stockId, stockName };

    document.getElementById('ai-stock-title').innerText = `${stockName} (${stockId})`;
    document.getElementById('ai-suggestion-box').innerHTML = `
        <div class="placeholder-glow">
            <span class="placeholder col-7"></span>
            <span class="placeholder col-4"></span>
            <span class="placeholder col-12"></span>
        </div>
        <p class="text-center mt-2 small text-muted">AI 正在分析近期資料...</p>
    `;

    bootstrap.Modal.getOrCreateInstance(document.getElementById('aiModal')).show();

    // 先取得現價畫圖
    try {
        const stockRes = await fetch(`${API}/stock/${stockId}`);
        if (stockRes.ok) {
            const stockData = await stockRes.json();
            drawStockChart(stockName, stockData.current_price);
        } else {
            drawStockChart(stockName, getStockPrice(stockId));
        }
    } catch {
        drawStockChart(stockName, getStockPrice(stockId));
    }

    // 呼叫 AI 分析
    try {
        const res = await fetch(`${API}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock_id: stockId })
        });

        if (!res.ok) {
            document.getElementById('ai-suggestion-box').innerHTML =
                '<p class="text-danger text-center mt-3">AI 分析失敗，請確認 Ollama 是否執行中（<code>ollama serve</code>）</p>';
            return;
        }

        const data = await res.json();
        document.getElementById('ai-suggestion-box').innerHTML =
            `<pre class="text-start small mb-0" style="white-space:pre-wrap">${data.report}</pre>`;
    } catch {
        document.getElementById('ai-suggestion-box').innerHTML =
            '<p class="text-danger text-center mt-3">無法連線至伺服器</p>';
    }
}

async function generateAIReport() {
    if (!currentAIStock) return;
    await showAIAnalysis(currentAIStock.stockId, currentAIStock.stockName);
}

function drawStockChart(stockName, currentPrice) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    if (stockChartInstance) stockChartInstance.destroy();

    const labels = [];
    const data = [];
    let tempPrice = currentPrice * 0.7;

    for (let i = 24; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        labels.push(`${d.getFullYear()}/${d.getMonth() + 1}`);
        tempPrice += (Math.random() - 0.45) * (tempPrice * 0.1);
        data.push(tempPrice.toFixed(2));
    }

    stockChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `${stockName} 歷史收盤價 (模擬)`,
                data,
                borderColor: '#0dcaf0',
                backgroundColor: 'rgba(13, 202, 240, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: false } },
            plugins: { legend: { display: false } }
        }
    });
}
