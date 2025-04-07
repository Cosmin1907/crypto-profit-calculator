let localData = {}; // Object to store the fetched data
let coinList = []; // List to store the fetched coin list

// Function to fetch data Firebase and update it if necessary
firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref("coinData");

const API_URL = `${API_BASE}/coins/markets?vs_currency=usd&per_page=250&page=1`;

async function fetchData() {
    try {
        console.log("📥 Checking cached data in Firebase...");
        const snapshot = await dbRef.get();

        const storedData = snapshot.val();

        if (
            !storedData ||
            !storedData.lastUpdated ||
            Date.now() - storedData.lastUpdated > 10 * 60 * 1000
        ) {
            console.log("⚠️ Data is old! Fetching fresh data...");
            return await fetchAndUpdateFirebase(); // Fetch new data and update Firebase
        } else {
            console.log("✅ Using cached data.");
            return storedData.coins;
        }
    } catch (error) {
        console.error("❌ Error fetching data from Firebase:", error);
        return [];
    }
}

async function fetchAndUpdateFirebase() {
    try {
        console.log("🔄 Fetching new data from CoinGecko...");
        const url = `${API_BASE}/coins/markets?vs_currency=usd`;
        const response = await fetch(url);
        const coins = await response.json();

        const newData = {
            lastUpdated: Date.now(),
            coins: coins.map(coin => ({
                id: coin.id,
                currentPrice: coin.current_price
            }))
        };

        await dbRef.set(newData); // Write to Firebase

        console.log("✅ Firebase updated successfully!");
        return newData.coins;
    } catch (error) {
        console.error("❌ Error updating Firebase:", error);
        return [];
    }
}

async function fetchDataPeriodically() {
    const coins = await fetchData(); // Fetch data from Firebase
    localData = coins.reduce((acc, coin) => {
        acc[coin.id] = {
            currentPrice: coin.currentPrice
        };
        return acc;
    }, {});

    console.log("📦 Data fetched and stored locally:", localData);
}

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
                    <option value="" disabled selected>Select Asset</option>
                    <!-- Options will be populated dynamically -->
                </select>
            </div>
            <div class="col-12 col-md-2">
                <label for="investment">Investment ($)</label>
                <input type="number" id="investment" class="investment form-control" placeholder="Amount">
            </div>
            <div class="col-12 col-md-2">
                <label for="buyPrice">Buy Price ($)</label>
                <input type="number" id="buyPrice" class="buyPrice form-control" placeholder="Buy Price">
            </div>
            <div class="col-12 col-md-2">
                <label for="sellPrice">Sell Price ($)</label>
                <input type="number" id="sellPrice" class="sellPrice form-control" placeholder="Sell Price">
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

// Function to fetch all coins from Firebase instead of directly from the API
async function fetchCoinList() {
    try {
        console.log("📥 Fetching coin list from Firebase...");
        const snapshot = await dbRef.get();
        const storedData = snapshot.val();

        if (storedData && storedData.coins) {
            console.log("✅ Coin list fetched from Firebase.");
            coinList = storedData.coins.map(coin => ({
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol.toUpperCase()
            }));
        } else {
            console.log("⚠️ No coin list found in Firebase. Fetching from API...");
            await fetchAndUpdateFirebase(); // Fetch from API and update Firebase
            await fetchCoinList(); // Retry fetching from Firebase
        }
    } catch (error) {
        console.error("❌ Error fetching coin list from Firebase:", error);
    }
}

// Function to populate the dropdown with the coin list
function populateCryptoSelect(selectElement = null) {
    if (!selectElement) return; // Ensure selectElement is not null

    const selectedValue = selectElement.value; // Store the current selected value

    // If a specific select element is provided, populate only that one
    selectElement.innerHTML = "<option value='' disabled>Select Asset</option>";
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
    const maxValue = 200000;  // Maximum profit/loss
    const minAngle = 0;       // Minimum angle (leftmost)
    const maxAngle = 180;     // Maximum angle (rightmost)

    // Ensure profitLoss is positive for mapping
    const absoluteProfitLoss = Math.abs(profitLoss);
    console.log("Profit/Loss:", profitLoss);

    // Correctly map profit/loss to angle (0 to 180 degrees)
    let angle = (absoluteProfitLoss / maxValue) * (maxAngle - minAngle);

    console.log(`Rotating needle to ${angle} degrees`);

    // Apply rotation (adjusting for initial -90 degrees)
    const needle = document.getElementById('needle');
    if (needle) {
        needle.style.setProperty("transform", `translateX(-50%) rotate(${angle - 90}deg)`, "important");
    } else {
        console.error("Needle element not found");
    }

    // Update "D" or "R" state (Drive or Reverse)
    const meterLabels = document.querySelectorAll('.meter-label');
    const gearText = document.querySelector('.gear p'); // Select the paragraph inside .gear

    meterLabels.forEach(meterLabel => {
        if (profitLoss >= maxValue) {
            meterLabel.innerText = '🚀 LAMBO ACHIEVED! 🚀';
            meterLabel.style.color = 'gold';
            gearText.innerText = "You're at maximum speed! Enjoy the ride! 🚀";
        } else if (profitLoss > 0) {
            meterLabel.innerText = 'D'; // Drive state
            meterLabel.style.color = 'green';
            gearText.innerText = "You're picking up speed, keep going! 🚗💨";
        } else {
            meterLabel.innerText = 'R'; // Reverse state
            meterLabel.style.color = 'red';
            gearText.innerText = "You're in Reverse! Be careful! ⚠️";
        }
    });

}

// Add event listener to the "copy-link" button

document.getElementById("copy-link").addEventListener("click", function (e) {
    e.preventDefault();

    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        document.getElementById("copy-status").textContent = "Link copied!";
    }).catch(() => {
        document.getElementById("copy-status").textContent = "Failed to copy link";
    });

    // Optional: Clear message after 2 seconds
    setTimeout(() => {
        document.getElementById("copy-status").textContent = "";
    }, 2000);
});

