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
    let container = document.getElementById("cryptoContainer");

    // Create a new asset container
    let assetContainer = document.createElement("div");
    assetContainer.className = "assetContainer";

    // Generate a unique ID for the "Still Holding" checkbox and label
    const uniqueId = `stillHolding-${Date.now()}`;

    // Add the new row content
    assetContainer.innerHTML = `
        <div class="cryptoRow row mb-2">
            <div class="col-12 col-md-2">
                <label for="cryptoSelect">Asset</label>
                <select id="cryptoSelect" class="crypto-select form-control" onclick="populateCryptoSelect(this)">
                    <option value="" disabled selected>Select Cryptocurrency</option>
                    <!-- Options will be populated dynamically -->
                </select>
            </div>
            <div class="col-12 col-md-2">
                <label for="investment">Investment ($)</label>
                <input type="number" id="investment" class="investment form-control" placeholder="Amount in USD">
            </div>
            <div class="col-12 col-md-2">
                <label for="buyPrice">Buy Price ($)</label>
                <input type="number" id="buyPrice" class="buyPrice form-control" placeholder="Buy Price in USD">
            </div>
            <div class="col-12 col-md-2">
                <label for="sellPrice">Sell Price ($)</label>
                <input type="number" id="sellPrice" class="sellPrice form-control" placeholder="Sell Price in USD">
            </div>
            <div id="holding-box" class="col-12 col-md-1">
                <label for="${uniqueId}">Still Holding</label>
                <input type="checkbox" id="${uniqueId}" class="stillHolding form-control" onchange="toggleSellFields(this)">
            </div>
            <div class="col-12 col-md-2">
                <label for="profitLoss">Profit/Loss</label>
                <div id="profitLoss" class="profitLoss text-muted">-</div>
            </div>
            <button class="xbutton btn btn-danger" onclick="removeRow(this)">X</button>
        </div>
        <button id="toggleButton" class="btn btn-outline-info">Add Fees</button>
        <div class="cryptoRow row mb-2" id="cryptoRowWrapper">
            <div class="col-12 col-md-2 offset-md-2">
                <label for="investmentFee">Investment Fee (%)</label>
                <input type="number" id="investmentFee" class="investmentFee form-control" placeholder="Investment Fee in %" value="0">
            </div>
            <div class="col-12 col-md-2">
                <label for="exitFee">Exit Fee (%)</label>
                <input type="number" id="exitFee" class="exitFee form-control" placeholder="Exit Fee in %" value="0">
            </div>
        </div>
    `;

    // Append the new asset container to the main container
    container.appendChild(assetContainer);

    // Attach event listener to the new dropdown
    let newSelect = assetContainer.querySelector(".crypto-select");
    newSelect.addEventListener("click", () => populateCryptoSelect(newSelect));
    newSelect.addEventListener("input", filterCryptoOptions);

    // Populate the new dropdown with coins
    populateCryptoSelect(newSelect);
}

// Function to remove a row
function removeRow(button) {
    const assetContainer = button.closest(".assetContainer");
    assetContainer.remove();
}

// Function to get the latest price of an asset from local data
function getCurrentPriceFromLocalData(asset) {
    return localData[asset]?.currentPrice || 0;
}

// Function to calculate profit/loss
async function calculateProfit() {
    let rows = document.querySelectorAll(".cryptoRow");
    let totalProfitLoss = 0;
    let totalInvestment = 0;
    let totalFees = 0;
    let totalHoldings = 0;

    for (let i = 0; i < rows.length; i += 2) {
        let row = rows[i];
        let feeRow = rows[i + 1];
        let asset = row.querySelector(".crypto-select").value;
        let investment = parseFloat(row.querySelector(".investment").value);
        let buyPrice = parseFloat(row.querySelector(".buyPrice").value);
        let sellPrice = parseFloat(row.querySelector(".sellPrice").value);
        let investmentFeePercent = parseFloat(feeRow.querySelector(".investmentFee").value) || 0;
        let exitFeePercent = parseFloat(feeRow.querySelector(".exitFee").value) || 0;
        let stillHolding = row.querySelector(".stillHolding").checked;
        
        if (isNaN(investment) || investment <= 0) continue;

        if (stillHolding) {
            sellPrice = getCurrentPriceFromLocalData(asset);
        }

        if (buyPrice <= 0 || sellPrice <= 0) {
            row.querySelector(".profitLoss").innerText = "Invalid price data";
            row.querySelector(".profitLoss").classList.remove("text-success", "text-danger");
            row.querySelector(".profitLoss").classList.add("text-muted");
            continue;
        }

        let quantity = investment / buyPrice;
        let investmentFee = (investment * investmentFeePercent) / 100;
        let exitFee = (sellPrice * quantity * exitFeePercent) / 100;
        let profitLoss = (sellPrice - buyPrice) * quantity - investmentFee - exitFee;
        
        totalProfitLoss += profitLoss;
        totalInvestment += investment;
        totalFees += investmentFee + exitFee;
        totalHoldings += sellPrice * quantity;

        row.querySelector(".profitLoss").innerText = `$${profitLoss.toFixed(2)}`;
        row.querySelector(".profitLoss").classList.remove("text-muted");
        if (profitLoss >= 0) {
            row.querySelector(".profitLoss").classList.add("text-success");
            row.querySelector(".profitLoss").classList.remove("text-danger");
        } else {
            row.querySelector(".profitLoss").classList.add("text-danger");
            row.querySelector(".profitLoss").classList.remove("text-success");
        }
    }

    let totalProfitLossElement = document.getElementById("totalProfitLoss");
    totalProfitLossElement.innerText = `$${totalProfitLoss.toFixed(2)}`;
    totalProfitLossElement.classList.remove("text-muted");
    if (totalProfitLoss >= 0) {
        totalProfitLossElement.classList.add("text-success");
        totalProfitLossElement.classList.remove("text-danger");
    } else {
        totalProfitLossElement.classList.add("text-danger");
        totalProfitLossElement.classList.remove("text-success");
    }

    let totalInvestmentElement = document.getElementById("totalInvestment");
    totalInvestmentElement.innerText = `$${totalInvestment.toFixed(2)}`;

    let totalFeesElement = document.getElementById("totalFees");
    totalFeesElement.innerText = `$${totalFees.toFixed(2)}`;

    let totalHoldingsElement = document.getElementById("totalHoldings");
    totalHoldingsElement.innerText = `$${totalHoldings.toFixed(2)}`;

    updateLamboMeter(totalProfitLoss);
    
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
    const row = checkbox.closest(".cryptoRow");
    const sellPrice = row.querySelector(".sellPrice");

    if (checkbox.checked) {
        sellPrice.disabled = true;
        sellPrice.value = "";
    } else {
        sellPrice.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('cryptoContainer');

    // Use event delegation to handle clicks on dynamically created buttons
    container.addEventListener('click', (event) => {
        if (event.target && event.target.id === 'toggleButton') {
            const card = event.target.closest('.assetContainer');
            const cryptoRow = card.querySelector('#cryptoRowWrapper');

            // Toggle the visibility of the fee row
            cryptoRow.classList.toggle('show');
        }
    });
});


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

// Add function to calculate Lambo

function updateLamboMeter(profitLoss) {
    const minValue = -250000;
    const maxValue = 250000;

    // Clamp value to avoid breaking the UI
    profitLoss = Math.max(minValue, Math.min(maxValue, profitLoss));
    console.log("Profit/Loss:", profitLoss);

    // Map value to angle (-90 to 90 degrees)
    const minAngle = -90;
    const maxAngle = 90;
    const angle = minAngle + ((profitLoss - minValue) * (maxAngle - minAngle) / (maxValue - minValue));
    console.log(`Rotating needle to ${angle} degrees`);

    // Update needle position
    const needle = document.getElementById('needle');
    if (needle) {
        // Force the rotation using setProperty and !important to ensure it's applied
        needle.style.setProperty("transform", `rotate(${angle}deg)`, "important");
    } else {
        console.error("Needle element not found");
    }

    // Update "D" or "R" state (Drive or Reverse)
    const meterLabel = document.querySelector('.meter-label');
    if (meterLabel) {
        if (profitLoss >= maxValue) {
            meterLabel.innerText = '🚀 LAMBO ACHIEVED! 🚀';
            meterLabel.style.color = 'gold';
        } else if (profitLoss >= 0) {
            meterLabel.innerText = 'D'; // Drive state
            meterLabel.style.color = 'green';
        } else {
            meterLabel.innerText = 'R'; // Reverse state
            meterLabel.style.color = 'red';
        }
    }
}

