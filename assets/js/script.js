const API_BASE = "https://api.coingecko.com/api/v3";
let localData = {}; // Object to store the fetched data
let coinList = []; // List to store the fetched coin list

// Function to fetch data periodically and store it locally
async function fetchDataPeriodically() {
    const url = `${API_BASE}/coins/markets?vs_currency=usd`;
    const response = await fetch(url);
    const coins = await response.json();

    localData = coins.reduce((acc, coin) => {
        acc[coin.id] = {
            currentPrice: coin.current_price,
        };
        return acc;
    }, {});

    console.log("Data fetched and stored locally:", localData);
}

// Fetch data every 10 minutes (600000 milliseconds)
setInterval(fetchDataPeriodically, 600000);
fetchDataPeriodically(); // Initial fetch

// Function to add more rows for multiple assets
function addRow() {
    let table = document.getElementById("cryptoTable");
    let row = table.insertRow(-1);
    row.innerHTML = `
        <td rowspan="2">
            <select class="crypto-select form-control" onclick="populateCryptoSelect(this)">
                <option value="" disabled selected>Select Cryptocurrency</option>
                <!-- Options will be populated dynamically -->
            </select>
        </td>
        <td rowspan="2"><input type="number" class="investment form-control" placeholder="Amount in USD"></td>
        <td><input type="number" class="buyPrice form-control" placeholder="Buy Price in USD"></td>
        <td><input type="number" class="sellPrice form-control" placeholder="Sell Price in USD"></td>
        <td rowspan="2"><input type="checkbox" class="stillHolding form-control" onchange="toggleSellFields(this)"></td>
        <td rowspan="2" class="profitLoss">-</td>
        <td rowspan="2"><button class="btn btn-danger" onclick="removeRow(this)">X</button></td>
    `;
    row.classList.add("cryptoRow"); // Add the cryptoRow class to the new row

    // Add a second row for the fees
    let feeRow = table.insertRow(-1);
    feeRow.classList.add("cryptoRow");
    feeRow.innerHTML = `
        <td><input type="number" class="investmentFee form-control" placeholder="Investment Fee in USD" value="0"></td>
        <td><input type="number" class="exitFee form-control" placeholder="Exit Fee in USD" value="0"></td>
    `;

    // Attach event listener to the new dropdown
    let newSelect = row.querySelector(".crypto-select");
    newSelect.addEventListener("click", () => populateCryptoSelect(newSelect));
    newSelect.addEventListener("input", filterCryptoOptions);

    // Populate the new dropdown with coins
    populateCryptoSelect(newSelect);
}

// Function to remove a row
function removeRow(button) {
    const row = button.closest("tr");
    const nextRow = row.nextElementSibling;
    if (nextRow && nextRow.classList.contains("cryptoRow")) {
        nextRow.remove();
    }
    row.remove();
}

// Function to get the latest price of an asset from local data
function getCurrentPriceFromLocalData(asset) {
    return localData[asset]?.currentPrice || 0;
}

// Function to calculate profit/loss
async function calculateProfit() {
    let rows = document.querySelectorAll(".cryptoRow");
    let totalProfitLoss = 0;

    for (let i = 0; i < rows.length; i += 2) {
        let row = rows[i];
        let feeRow = rows[i + 1];
        let asset = row.querySelector(".crypto-select").value;
        let investment = parseFloat(row.querySelector(".investment").value);
        let buyPrice = parseFloat(row.querySelector(".buyPrice").value);
        let sellPrice = parseFloat(row.querySelector(".sellPrice").value);
        let investmentFee = parseFloat(feeRow.querySelector(".investmentFee").value) || 0;
        let exitFee = parseFloat(feeRow.querySelector(".exitFee").value) || 0;
        let stillHolding = row.querySelector(".stillHolding").checked;
        
        if (isNaN(investment) || investment <= 0) continue;

        if (stillHolding) {
            sellPrice = getCurrentPriceFromLocalData(asset);
        }

        if (buyPrice <= 0 || sellPrice <= 0) {
            row.querySelector(".profitLoss").innerText = "Invalid price data";
            continue;
        }

        let quantity = investment / buyPrice;
        let profitLoss = (sellPrice - buyPrice) * quantity - investmentFee - exitFee;
        
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

    coinList = coins.map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase()
    }));
}

// Function to populate the dropdown with the coin list
function populateCryptoSelect(selectElement = null) {
    if (!selectElement) return; // Ensure selectElement is not null

    const selectedValue = selectElement.value; // Store the current selected value

    // If a specific select element is provided, populate only that one
    selectElement.innerHTML = "<option value='' disabled>Select Cryptocurrency</option>";
    coinList.forEach(coin => {
        const option = document.createElement("option");
        option.value = coin.id;
        option.textContent = `${coin.name} (${coin.symbol})`;
        selectElement.appendChild(option);
    });
    selectElement.value = selectedValue; // Restore the selected value
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

// Function to toggle the sell price field based on the still holding checkbox
function toggleSellFields(checkbox) {
    const row = checkbox.closest("tr");
    const sellPrice = row.querySelector(".sellPrice");

    if (checkbox.checked) {
        sellPrice.disabled = true;
        sellPrice.value = "";
    } else {
        sellPrice.disabled = false;
    }
}

// Wait for the DOM to be fully loaded before running the script
window.onload = async function () {
    await fetchCoinList();         // Fetch the coin list once
    await populateCryptoSelect();  // Populate the dropdown with coins

    // Get all dropdown elements by their class
    const selects = document.querySelectorAll(".crypto-select");

    // Add an event listener to each dropdown for filtering options
    selects.forEach(select => {
        select.addEventListener("click", () => populateCryptoSelect(select));
        select.addEventListener("input", filterCryptoOptions);
    });
};