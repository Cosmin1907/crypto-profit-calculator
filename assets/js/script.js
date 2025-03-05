const API_BASE = "https://api.coingecko.com/api/v3";

// Function to add more rows for multiple assets
function addRow() {
    let table = document.getElementById("cryptoTable");
    let row = table.insertRow(-1);
    row.innerHTML = table.rows[1].innerHTML;
}

// Function to get average buy price from historical data
async function getAvgBuyPrice(asset, daysAgo) {
    let url = `${API_BASE}/coins/${asset}/market_chart?vs_currency=usd&days=${daysAgo}`;
    let response = await fetch(url);
    let data = await response.json();
    
    let prices = data.prices.map(p => p[1]);
    return prices.reduce((sum, p) => sum + p, 0) / prices.length; // Average price
}

// Function to get the latest price of an asset
async function getCurrentPrice(asset) {
    let url = `${API_BASE}/simple/price?ids=${asset}&vs_currencies=usd`;
    let response = await fetch(url);
    let data = await response.json();
    return data[asset].usd;
}

// Function to calculate profit/loss
async function calculateProfit() {
    let rows = document.querySelectorAll(".cryptoRow");
    let totalProfitLoss = 0;

    for (let row of rows) {
        let asset = row.querySelector(".crypto").value;
        let investment = parseFloat(row.querySelector(".investment").value);
        let buyTime = parseInt(row.querySelector(".buyTime").value);
        let sellTime = parseInt(row.querySelector(".sellTime").value);
        
        if (isNaN(investment) || investment <= 0) continue;

        let buyPrice = await getAvgBuyPrice(asset, buyTime);
        let sellPrice = sellTime === 0 ? await getCurrentPrice(asset) : await getAvgBuyPrice(asset, sellTime);

        let quantity = investment / buyPrice;
        let profitLoss = (sellPrice - buyPrice) * quantity;
        
        totalProfitLoss += profitLoss;
        row.querySelector(".profitLoss").innerText = `$${profitLoss.toFixed(2)}`;
    }

    document.getElementById("totalProfitLoss").innerText = `$${totalProfitLoss.toFixed(2)}`;
}
