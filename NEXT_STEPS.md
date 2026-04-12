# Crypto Funding V2 - Handoff Notes

Date: 2026-02-27

## Goal
Continue enhancing `cryptoFundingV2` as a funding-arbitrage workflow between Delta and CoinDCX, with paper-trade lifecycle and live monitoring.

## Official API references (locked)
- Delta: https://docs.delta.exchange/#introduction
- CoinDCX: https://docs.coindcx.com/#introduction

## Current working page
- `http://localhost:3000/cryptoFundingV2`

## V2 routes
- `GET /cryptoFundingV2`
- `POST /execCryptoFundingV2/DeltaCredValidate`
- `POST /execCryptoFundingV2/refreshFundingData`
- `POST /execCryptoFundingV2/getLatestTradeRates`

## Key V2 files
- `server/controller/controllerCryptoFundingV2.js`
- `views/cryptoFundingV2.ejs`
- `views/partials/settingsCryptoFundingV2.ejs`
- `public/js/mainCryptoFundingV2.js`
- `public/js/settingsCryptoFundingV2.js`
- `index.js` (socket stream logic for CFV2 paper-trade live updates)

## What is implemented now

### Latest completed updates (2026-02-27, session continuation)
- Funding Screener math corrected:
  - `TB-Rate` uses side-aware signed funding legs.
  - `Day-Rate` now uses both exchange frequencies (Delta + CoinD), not Delta-only.
  - Screener sorting/filtering now runs on corrected `Day-Rate`.
- Open Positions enhancements:
  - Added `Funding/Event` column (USD cashflow per settlement event).
  - Added `Next Funding` column with live countdown + exact UTC time.
  - Added smooth 1s UI countdown timer (display-only, settlement logic unchanged).
- Funding settlement timing engine:
  - Applies funding to virtual capital only when settlement is due.
  - Delta timing uses `next_funding_realization` from ticker stream.
  - CoinD timing uses frequency boundary scheduling (`funding_frequency`).
  - Per-trade settlement state tracked (`nextFundingTs*`, `lastFundingTs*`, `realizedFunding*`) to prevent double-apply.
- Brokerage/net PnL:
  - Added `Brokerage` in Open and Closed paper tables.
  - PnL shown/stored as net (after brokerage).
- Virtual capital behavior:
  - On open: reserves capital (deducts from available funds).
  - On close: returns reserved capital + net PnL.
  - On clear open trades: refunds reserved capital.
  - Header now shows `Avl` and `Dep` for Delta/CoinD.
  - Added reset icon to restore virtual funds (blocked if open paper trades exist).
- Websocket payload updates:
  - Delta stream now includes `dBestAsk`, `dBestBid`, `dFunding`, `dNextFundingTs`.
  - Coin stream includes `cBestAsk`, `cBestBid`, `cFunding`.
  - Auto-close uses opposite-side executable prices for realistic close valuation.

### Funding Screener
- Uses consolidated backend refresh pipeline.
- Columns currently include grouped values + execution/trade fields:
  - Exchange, Symbols, Volume, Hrly Feq, Funding, TB-Rate, Day-Rate, BS, Rates, Min Odr Val, Trade.
- Added:
  - `C Hrly Feq` from CoinDCX `funding_frequency`.
  - `D-Volume` and `C-Volume`.
  - `Min Odr Val` from CoinDCX `min_notional`.
  - `Rates` using best buy/sell from each exchange per side.
  - `Paper Trade` button with prechecks.
- `Min D-Rate` default is `0.50` for screener display filter.
- Filter for Delta `AllowOnlyCloseD === false` is kept in backend.

### Credential + status behavior
- Top message id unified to `spnGenMsg`.
- Delta login handles `ip_not_whitelisted_for_api_key` with visible message and client IP (if present).
- Auto-trade toggle and trader status integrated in V2 settings JS.

### Open Positions container
- Added `Open Positions` card with tabs:
  - `Paper Trades`
  - `Real Trade` (placeholder)
- Added clear icon to wipe open paper trades from memory.
- Added virtual funds on right:
  - Delta Fund
  - CoinD Fund
- Virtual funds initialized to `10000` each and updated with realized closed-trade PnL.

### Closed Positions container
- Added `Closed Positions` card with tabs:
  - `Paper Trades`
  - `Real Trade` (placeholder)
- Auto-closed paper trades move from Open -> Closed with close reason and final snapshot.

### Paper Trade click flow
- Guard checks before open:
  1. Auto Trade must be ON.
  2. No duplicate open trade for same symbol+side combo.
- On click, fetches latest rates from server APIs first (`getLatestTradeRates`) then opens trade.

### Live websocket updates (split by exchange)
- Implemented in `index.js` + V2 client:
  - Client emits: `CFV2_WatchPaperTrades`.
  - Server emits:
    - `CFV2_DeltaRatesUpdate`
    - `CFV2_CoinRatesUpdate`
- Open paper positions `Current` column updates via websocket and blinks.
- Funding also updates via websocket:
  - `dFunding`, `cFunding`.
- `TB-Rate` and `Day-Rate` recalculate from live funding updates.

### Auto-close rule (current)
- Only one active close rule now:
  - Close when `Day-Rate < 0.20`.
- Removed spread-reversal close condition.

### Sizing and lots/qty
- Verified from APIs that lot models differ across exchanges.
- Current sizing mode:
  - Equal target capital per leg near `100 USD` each (exchange-specific constraints applied).
- Rollback switch exists in JS:
  - `CFV2_USE_EQUAL_USD_SIZING = true`

---

# StrategyFOGreeks - Live Coding Backlog

Date: 2026-04-12

## Current status
- Paper-trade mode remains the current focus.
- `StrategyFOGreeks` delta-hedge sizing and futures brokerage issues were fixed in the current session.
- Browser-console and terminal debug noise for the `StrategyFOGreeks` flow was reduced.

## Key StrategyFOGreeks files
- `views/StrategyFOGreeks.ejs`
- `public/js/StrategyFOGreeks.js`
- `server/controller/cntrStrategyFOGreeks.js`

## Second-level review summary

### Current behavior
- The strategy works as a delta-band hedger, not a true continuous net-position rebalancer.
- Option legs are opened first, then total net delta is checked.
- If total delta is outside the configured `-Delta / +Delta` threshold band, futures are used to hedge back toward neutral.
- Open futures are included in later total-delta checks.

### Current limitations / risks
- Hedge stacking risk:
  - The code can add new futures hedge legs based on current net delta instead of first computing the exact net futures adjustment needed.
- Threshold edge behavior:
  - Exact threshold values do not trigger hedge placement; hedging starts only when delta is strictly outside the band.
- Coarse hedge rounding:
  - Hedge size is rounded from absolute net delta, which can slightly under- or over-correct.
- Delayed first hedge:
  - After `Exec All Legs`, neutrality check is delayed by about 8 seconds.
- Global close behavior:
  - If one open leg hits its SL/TP condition, the current logic closes all open positions, including hedge futures.
- Re-entry dependency:
  - Re-entry currently depends on futures still being open, but full-position close can remove that prerequisite.

## Recommended live-code implementation order
1. Replace hedge stacking with true net futures rebalance logic.
2. Add hysteresis / two-stage threshold behavior to reduce hedge churn.
3. Add minimum hedge-size filter so tiny delta drift does not trigger extra brokerage.
4. Separate leg-level exits from full strategy exits.
5. Add max hedge exposure guardrails.
6. Add a small hedge dashboard in UI:
   - option delta
   - futures delta
   - total net delta
   - current futures qty
   - target futures qty

## Profitability improvement ideas
- Use volatility-aware thresholds:
  - tighter in calm markets, wider in fast markets.
- Use asymmetric thresholds:
  - hedge faster on the side with higher gamma risk.
- Add hedge-difference filter:
  - place hedge only if required change exceeds a minimum contract count.
- Add partial hedge unwind rules:
  - reduce hedge when option delta normalizes instead of waiting for another full band break.
- Tune thresholds by strategy structure:
  - short premium, long premium, ratio-type structures should not share one default band.
- Track hedge efficiency metrics:
  - delta before hedge
  - delta after hedge
  - slippage
  - brokerage spent
  - net PnL contribution of hedging

## Suggested first live-coding milestone
- Implement true net futures rebalance so the system trades only the exact futures difference required, instead of stacking hedge legs.
  - Set `false` to revert to legacy sizing (`10 USD @ 20x` path).
- CoinDCX constraints used in qty:
  - `quantity_increment`
  - `min_quantity`
  - `min_notional`
- Existing open trades migration added to fix old lot/qty data.

### Open Positions columns (paper tab)
- Exchange, Symbol, Side, Lot Size, Qty, Entry, Current, Funding, TB-Rate, Day-Rate, Capital, PnL.
- `Capital` column added per trade (D/C/T).
- Bottom summary row added:
  - `Total Capital Deployed` (D/C/T).

## Important notes
- Original `cryptoFunding` files/flow should remain untouched.
- V2 is the active enhancement surface.
- Several placeholders still exist for `Real Trade` tabs (open/closed).

## Next recommended enhancements
1. Add `Funding/Day` USD column in Open Positions (alongside `Funding/Event`) using per-exchange frequency.
2. Add manual close action for paper trades (button per row with confirmation).
3. Add header summary cards:
   - unrealized PnL,
   - realized funding,
   - total fees,
   - net strategy PnL.
4. Add debug/inspection tooltip per row:
   - next funding timestamps,
   - interval hours,
   - last settled timestamps,
   - settlement amounts.
5. Add UI controls for sizing config:
   - target USD per leg,
   - leverage,
   - quick switch (equal-usd vs legacy).
6. Begin wiring real-order flow in `Real Trade` tabs with strict safety checks and dry-run mode.
