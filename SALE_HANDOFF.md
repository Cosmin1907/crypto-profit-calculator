# Sale Handoff

## Project Summary

`cryptocalc` is a static website centered around a crypto profit/loss calculator. The main pages are:

- `index.html`: calculator and supporting educational content
- `faq.html`: FAQ page
- `privacy.html`: minimal privacy page

Shared assets live in:

- `assets/css/style.css`
- `assets/js/script.js`
- `assets/images/`

## Runtime Config

The calculator expects `assets/js/config.js` at runtime.

- This file is gitignored and is **not** included in the repository.
- It must be transferred separately during a sale, or recreated by the buyer.
- It currently contains:
  - `API_BASE` for CoinGecko
  - Firebase configuration for the hosted Realtime Database project

## Data and Service Dependencies

### Firebase

Firebase Realtime Database is used as a lightweight cache layer for coin data.

- The site reads from `coinData`
- If the cached data is older than 10 minutes, the site refreshes it
- This reduces direct repeat calls and keeps the calculator responsive

### CoinGecko

CoinGecko is used as the upstream market data source.

- Market data is requested in USD
- The calculator depends on CoinGecko data for coin list search and current prices

### Google Analytics

Google Analytics is installed on the public pages.

- Tracking ID in the site markup: `G-49CZKTD69C`
- If ownership changes, the buyer should replace this with their own analytics property if desired

## Transfer Checklist

- Transfer or recreate `assets/js/config.js`
- Confirm Firebase project access or replace the Firebase project
- Confirm CoinGecko usage still works as expected
- Replace or retain the Google Analytics property
- Confirm the canonical site domain is still correct in page metadata
- Review the privacy page and update it if ownership or data practices change
- Test calculator actions after transfer:
  - add/remove asset
  - add/remove entry
  - fee toggle
  - calculate
  - CSV export
  - lambo meter update
