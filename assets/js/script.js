const API_BASE = "https://api.coingecko.com/api/v3";

// Function to add more rows for multiple assets
function addRow() {
    let table = document.getElementById("cryptoTable");
    let row = table.insertRow(-1);
    row.innerHTML = table.rows[1].innerHTML;

    // Attach event listener to the new dropdown
    let newSelect = row.querySelector(".crypto-select");
    newSelect.addEventListener("input", filterCryptoOptions);

    // Populate the new dropdown with coins
    populateCryptoSelect(newSelect);
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
        let asset = row.querySelector(".crypto-select").value;
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

// Function to fetch all coins from CoinGecko
async function fetchCoinList() {
    const url = `${API_BASE}/coins/markets?vs_currency=usd`;
    const response = await fetch(url);
    const coins = await response.json();

    return coins.map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase()
    }));
}

// Function to populate the dropdown with the coin list
async function populateCryptoSelect(selectElement = null) {
    const coinList = await fetchCoinList();

    // If a specific select element is provided, populate only that one
    if (selectElement) {
        selectElement.innerHTML = "<option value='' disabled selected>Select Cryptocurrency</option>";
        coinList.forEach(coin => {
            const option = document.createElement("option");
            option.value = coin.id;
            option.textContent = `${coin.name} (${coin.symbol})`;
            selectElement.appendChild(option);
        });
    } else {
        // Otherwise, populate all select elements
        const selects = document.querySelectorAll(".crypto-select");
        selects.forEach(select => {
            select.innerHTML = "<option value='' disabled selected>Select Cryptocurrency</option>";
            coinList.forEach(coin => {
                const option = document.createElement("option");
                option.value = coin.id;
                option.textContent = `${coin.name} (${coin.symbol})`;
                select.appendChild(option);
            });
        });
    }
}

// Function to filter the options based on user input
function filterCryptoOptions(event) {
    const query = event.target.value.toUpperCase();
    const options = event.target.querySelectorAll("option");

    options.forEach(option => {
        const text = option.textContent.toUpperCase();
        if (text.includes(query)) {
            option.style.display = "";
        } else {
            option.style.display = "none";
        }
    });
}

// Wait for the DOM to be fully loaded before running the script
window.onload = async function () {
    await populateCryptoSelect();  // Populate the dropdown with coins

    // Get all dropdown elements by their class
    const selects = document.querySelectorAll(".crypto-select");

    // Add an event listener to each dropdown for filtering options
    selects.forEach(select => {
        select.addEventListener("input", filterCryptoOptions);
    });
};