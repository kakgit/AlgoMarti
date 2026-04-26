# Optionyze Server-Side Plan

## Goal

Create a fresh backend-first project named `Optionyze` in a separate repository under `D:\NodeJS\Optionyze`.

This new app should:

- run `CoveredCall` as a live-trading server-side strategy
- run `StrategyFOGreeks` as a paper-trading server-side strategy
- enhance `MngUsers` into a real user-management/admin surface
- remove the dependency on always-open browser tabs
- support multiple users with separate API keys, secrets, capital, Telegram config, and strategy preferences

The current `AlgoMarti` project remains unchanged as the stable browser-based version.

## Why A Fresh Project

The current implementation is strongly coupled to:

- browser `localStorage`
- page memory / DOM state
- browser timers
- page-specific JavaScript runtime

That works for one interactive operator session, but it is not a good foundation for:

- multi-user execution
- independent always-on runners
- restart-safe recovery
- background trading without browser tabs
- clean deployment on Railway

## Product Scope

### 1. CoveredCall

Role in `Optionyze`:

- live trading strategy
- multi-user capable
- each user can have their own:
  - API key / secret
  - preferred capital
  - symbol
  - lot sizing rules
  - expiry mode
  - delta / TP / SL settings
  - Telegram config
  - auto trader status

### 2. StrategyFOGreeks

Role in `Optionyze`:

- paper trading strategy only
- no real order placement
- user-specific paper state
- useful for strategy research, monitoring, and configuration

### 3. MngUsers

Role in `Optionyze`:

- user-management console
- create / edit / disable users
- assign strategies
- store exchange credentials
- manage runner lifecycle
- show current status, logs, and alerts

## High-Level Architecture

The new app should be split into two major server concerns:

### API / Admin Service

Responsibilities:

- authentication / admin access
- user CRUD
- strategy profile CRUD
- runner start / stop / restart actions
- status endpoints
- trade / log / alert inspection

### Runner Service

Responsibilities:

- execute strategy loops on the server
- maintain per-user runtime state
- connect to exchange / market data
- place real or paper orders depending on strategy type
- persist snapshots and trade state
- send Telegram alerts

## Storage Strategy

Phase 1 can use JSON files instead of a database.

Recommended structure:

```text
Optionyze/
  data/
    users/
      users.json
    profiles/
      <userId>.json
    strategies/
      covered-call/
        <userId>.json
      strategy-fo-greeks-paper/
        <userId>.json
    state/
      covered-call/
        <userId>.json
      strategy-fo-greeks-paper/
        <userId>.json
    trades/
      covered-call/
        <userId>-open.json
        <userId>-closed.json
      strategy-fo-greeks-paper/
        <userId>-open.json
        <userId>-closed.json
    runtime/
      runners.json
    logs/
      covered-call/
        <userId>.log
      strategy-fo-greeks-paper/
        <userId>.log
```

Important implementation rule:

- all file writes must go through a storage layer
- writes should be atomic using temp file + rename
- state should be separated per user to reduce write conflicts

## Strategy Runtime Model

### CoveredCall Live Runner

Each active user gets an isolated runtime context:

- user profile
- exchange credentials
- Telegram config
- open positions snapshot
- closed trade history
- current strategy controls
- market-data subscriptions
- health / error status

Suggested runtime loop:

1. load user strategy profile
2. connect to market data
3. refresh live positions
4. reconcile server-side state with exchange state
5. evaluate strategy conditions
6. place / close / roll trades when required
7. save state
8. emit logs and Telegram alerts
9. continue on schedule

### StrategyFOGreeks Paper Runner

Each active paper user gets:

- isolated paper balance
- isolated open / closed paper positions
- isolated settings
- no real order placement

Suggested runtime loop:

1. load profile and paper state
2. subscribe to market data
3. simulate entries / exits
4. update paper PnL and paper Greeks
5. persist snapshots
6. emit logs / alerts

## User Management Model

`MngUsers` should evolve into an admin feature set with:

- create user
- edit user
- activate / deactivate user
- assign strategy type
- save API credentials
- save capital and risk preferences
- start / stop runner
- inspect runner state
- inspect last errors
- inspect trade history

Suggested user fields:

- `userId`
- `name`
- `email`
- `isActive`
- `strategyType`
- `exchange`
- `apiKey`
- `apiSecret`
- `telegramBotToken`
- `telegramChatId`
- `capital`
- `preferredSymbol`
- `notes`

## CoveredCall Migration Notes

The current `CoveredCall-DE` logic in `AlgoMarti` should be split into:

### Reusable Domain Logic

These parts can be ported into server modules:

- expiry calculations
- delta / TP / SL decision logic
- position reconciliation logic
- roll / re-entry logic
- hedge-health logic

### Browser-Only Logic To Remove

These must not remain in the server runner:

- `localStorage`
- DOM reads and writes
- modal state
- browser WebSocket UI controls
- page-only timers and button handlers

## StrategyFOGreeks Migration Notes

For the new system:

- keep `StrategyFOGreeks` as paper-only
- preserve configurable legs / Greeks logic where useful
- keep paper orders fully separate from live strategies

This makes it a good sandbox strategy in the new platform while `CoveredCall` remains the live strategy.

## Suggested Project Layout

```text
Optionyze/
  src/
    app/
      server.ts
    api/
      routes/
      controllers/
      schemas/
    runners/
      runner-manager.ts
      covered-call-runner.ts
      strategy-fo-greeks-paper-runner.ts
    strategies/
      covered-call/
      strategy-fo-greeks-paper/
    brokers/
      delta/
    storage/
      json-store.ts
      users-store.ts
      profiles-store.ts
      trades-store.ts
      runtime-store.ts
    services/
      telegram/
      logging/
      auth/
    types/
    utils/
  data/
  scripts/
  README.md
```

## Phase Plan

### Phase 1

- create new repo
- scaffold server app
- create JSON storage layer
- create user/profile schema
- create runner manager
- implement one CoveredCall live runner for one user
- persist state and logs

### Phase 2

- expand CoveredCall to multi-user
- add admin endpoints
- add runner lifecycle controls
- add Telegram integration

### Phase 3

- add StrategyFOGreeks paper runner
- add paper state inspection
- add better operational monitoring

### Phase 4

- enhance MngUsers equivalent admin UI
- optional DB migration later if scale requires it

## Deployment Direction

Target hosting:

- Railway Hobby Plan

Expected deployment shape:

- one always-on Node service for API + runners initially
- optional split into separate API and runner services later

## Success Criteria

The new project is successful when:

- browser tabs are no longer required for strategy execution
- multiple users can run independently on the server
- CoveredCall can execute real trades per user
- StrategyFOGreeks can execute paper trades per user
- user settings survive restart
- runner state can recover after restart
- trade logs and alerts remain traceable per user

