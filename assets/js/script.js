let localData = {}; // Object to store the fetched data
let coinList = []; // List to store the fetched coin list

// Function to fetch data Firebase and update it if necessary
firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref("coinData");

const API_URL = `${API_BASE}/coins/markets?vs_currency=usd&per_page=250&page=1`;

// Function to clear Firebase data - commented out to prevent unnecessary clearing
// async function clearFirebaseData() {
//     try {
//         await dbRef.set(null);
//         console.log("🗑️ Firebase data cleared.");
//     } catch (error) {
//         console.error("❌ Error clearing Firebase data:", error);
//     }
// }

// Call the function to clear Firebase data - commented out
// clearFirebaseData();

async function fetchData() {
    try {
        console.log("📥 Checking cached data in Firebase...");
        const snapshot = await dbRef.get();

        const storedData = snapshot.val();
        console.log("Fetched data from Firebase:", storedData);

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
        const response = await fetch(API_URL);
        const coins = await response.json();

        const newData = {
            lastUpdated: Date.now(),
            coins: coins
                .filter(coin => coin.id && coin.name && coin.symbol) // Validate data
                .map(coin => ({
                    id: coin.id,
                    name: coin.name,
                    symbol: coin.symbol.toUpperCase(),
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

// Set up periodic data fetching, but don't run it immediately
// We'll run it manually in the window.onload function
let dataFetchInterval;

// Function to add a new entry row to an asset container
function addEntryRow(button) {
    const assetContainer = button.closest('.assetContainer');
    const cryptoRow = assetContainer.querySelector('.cryptoRow');
    const uniqueId = `stillHolding-${Date.now()}`;
    
    // Create a new row with the same structure as the original but without the asset selection
    const newRow = document.createElement('div');
    newRow.className = 'cryptoRow row mb-2 entry-row';
    newRow.innerHTML = `
        <div class="col-12 col-md-2">
            <label>Asset</label>
            <div class="form-control bg-light text-muted" style="opacity: 0.7;">${cryptoRow.querySelector('.crypto-select option:checked').text}</div>
        </div>
        <div class="col-12 col-md-2">
            <label for="investment">Investment ($)</label>
            <input type="number" id="investment" class="investment form-control" placeholder="Amount" step="any">
        </div>
        <div class="col-12 col-md-2">
            <label for="buyPrice">Buy Price ($)</label>
            <input type="number" id="buyPrice" class="buyPrice form-control" placeholder="Buy Price" step="any">
        </div>
        <div class="col-12 col-md-2">
            <label for="sellPrice">Sell Price ($)</label>
            <input type="number" id="sellPrice" class="sellPrice form-control" placeholder="Sell Price" step="any">
        </div>
        <div id="holding-box" class="col-12 col-md-1">
            <label for="${uniqueId}">Still Holding</label>
            <input type="checkbox" id="${uniqueId}" class="stillHolding form-control" onchange="toggleSellFields(this)">
        </div>
        <div class="col-12 col-md-2">
            <label for="profitLoss">Profit/Loss</label>
            <div id="profitLoss" class="profitLoss text-muted">-</div>
        </div>
        <button class="xbutton btn btn-danger" onclick="removeEntryRow(this)">X</button>
    `;
    
    // Insert the new row after the original row but before the fees row
    const feesRow = assetContainer.querySelector('#cryptoRowWrapper');
    cryptoRow.parentNode.insertBefore(newRow, feesRow);
}

// Function to remove a specific entry row
function removeEntryRow(button) {
    const row = button.closest('.entry-row');
    row.remove();
}

// Function to remove the last entry row from an asset container
function removeLastEntry(button) {
    const assetContainer = button.closest('.assetContainer');
    const entryRows = assetContainer.querySelectorAll('.entry-row');
    
    if (entryRows.length > 0) {
        entryRows[entryRows.length - 1].remove();
    }
}

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
                <input type="number" id="investment" class="investment form-control" placeholder="Amount" step="any">
            </div>
            <div class="col-12 col-md-2">
                <label for="buyPrice">Buy Price ($)</label>
                <input type="number" id="buyPrice" class="buyPrice form-control" placeholder="Buy Price" step="any">
            </div>
            <div class="col-12 col-md-2">
                <label for="sellPrice">Sell Price ($)</label>
                <input type="number" id="sellPrice" class="sellPrice form-control" placeholder="Sell Price" step="any">
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
        <div class="cryptoRow row mb-2" id="cryptoRowWrapper">
            <div class="col-12 col-md-2 offset-md-2">
                <label for="investmentFee">Investment Fee (%)</label>
                <input type="number" id="investmentFee" class="investmentFee form-control" placeholder="Investment Fee in %" value="0" step="any">
            </div>
            <div class="col-12 col-md-2">
                <label for="exitFee">Exit Fee (%)</label>
                <input type="number" id="exitFee" class="exitFee form-control" placeholder="Exit Fee in %" value="0" step="any">
            </div>
        </div>
        <div class="buttons">
                <button class="btn btn-primary w-100 w-md-auto" onclick="addEntryRow(this)">+ Add Entry</button>
                <button class="btn btn-warning w-100 w-md-auto" onclick="removeLastEntry(this)">Delete Entry</button>
                <button id="toggleButton" class="btn btn-outline-info w-100 w-md-auto">Add Fees</button>
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
    let assetContainers = document.querySelectorAll(".assetContainer");
    let totalProfitLoss = 0;
    let totalInvestment = 0;
    let totalFees = 0;
    let totalHoldings = 0;

    for (let container of assetContainers) {
        let rows = container.querySelectorAll(".cryptoRow");
        let assetProfitLoss = 0;
        let assetInvestment = 0;
        let assetFees = 0;
        let assetHoldings = 0;
        
        // Get the fee row (last row in the container)
        let feeRow = container.querySelector('#cryptoRowWrapper');
        let investmentFeePercent = parseFloat(feeRow.querySelector(".investmentFee").value) || 0;
        let exitFeePercent = parseFloat(feeRow.querySelector(".exitFee").value) || 0;
        
        // Get the asset ID from the first row
        let assetId = container.querySelector(".crypto-select").value;
        
        // Process all rows except the fee row
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].id === 'cryptoRowWrapper') continue; // Skip the fee row
            
            let row = rows[i];
            let investment = parseFloat(row.querySelector(".investment").value);
            let buyPrice = parseFloat(row.querySelector(".buyPrice").value);
            let sellPrice = parseFloat(row.querySelector(".sellPrice").value);
            let stillHolding = row.querySelector(".stillHolding").checked;

            if (isNaN(investment) || investment <= 0) continue;

            if (stillHolding) {
                sellPrice = getCurrentPriceFromLocalData(assetId);
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

            assetProfitLoss += profitLoss;
            assetInvestment += investment;
            assetFees += investmentFee + exitFee;
            assetHoldings += sellPrice * quantity;

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
        
        // Add this asset's totals to the overall totals
        totalProfitLoss += assetProfitLoss;
        totalInvestment += assetInvestment;
        totalFees += assetFees;
        totalHoldings += assetHoldings;
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
async function fetchCoinList(coins = null) {
    try {
        // If coins are provided, use them directly
        if (coins) {
            console.log("✅ Using provided coin list.");
            coinList = coins
                .filter(coin => coin.symbol) // Ensure coin.symbol exists
                .map(coin => ({
                    id: coin.id,
                    name: coin.name,
                    symbol: coin.symbol.toUpperCase()
                }));
            return;
        }
        
        console.log("📥 Fetching coin list from Firebase...");
        const snapshot = await dbRef.get();
        const storedData = snapshot.val();

        if (storedData && storedData.coins) {
            console.log("✅ Coin list fetched from Firebase.");
            coinList = storedData.coins
                .filter(coin => coin.symbol) // Ensure coin.symbol exists
                .map(coin => ({
                    id: coin.id,
                    name: coin.name,
                    symbol: coin.symbol.toUpperCase()
                }));
        } else {
            console.log("⚠️ No coin list found in Firebase. Fetching from API...");
            // Instead of calling fetchAndUpdateFirebase again, use the data from fetchData
            const fetchedCoins = await fetchData();
            coinList = fetchedCoins
                .filter(coin => coin.symbol) // Ensure coin.symbol exists
                .map(coin => ({
                    id: coin.id,
                    name: coin.name,
                    symbol: coin.symbol.toUpperCase()
                }));
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
    // Fetch data once and use it for both price data and coin list
    const coins = await fetchData();
    
    // Store the data locally
    localData = coins.reduce((acc, coin) => {
        acc[coin.id] = {
            currentPrice: coin.currentPrice
        };
        return acc;
    }, {});
    
    console.log("📦 Data fetched and stored locally:", localData);
    
    // Use the same data for the coin list
    await fetchCoinList(coins);
    
    // Populate the dropdown with coins
    await populateCryptoSelect();

    // Get all dropdown elements by their class
    const selects = document.querySelectorAll(".crypto-select");

    // Add an event listener to each dropdown for filtering options
    selects.forEach(select => {
        select.addEventListener("click", () => populateCryptoSelect(select));
        select.addEventListener("input", filterCryptoOptions);
    });
    
    // Add entry buttons to existing asset containers
    const assetContainers = document.querySelectorAll(".assetContainer");
    assetContainers.forEach(container => {
        if (!container.querySelector('.entry-buttons')) {
            const entryButtons = document.createElement('div');
            entryButtons.className = 'entry-buttons';
            entryButtons.innerHTML = `
                <button class="btn btn-success" onclick="addEntryRow(this)">+ Add Entry</button>
                <button class="btn btn-warning" onclick="removeLastEntry(this)">- Delete Last Entry</button>
            `;
            
            // Add the buttons at the bottom of the container
            container.appendChild(entryButtons);
        }
    });
    
    // Set up the interval for periodic data fetching
    // This will run every 10 minutes (600000 ms)
    dataFetchInterval = setInterval(fetchDataPeriodically, 600000);
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
            gearText.innerText = "You're driving in Reverse!!! Be careful! ⚠️";
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

