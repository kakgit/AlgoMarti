const DP_STORE = {
    session: "DP_sessionOn",
    config: "DP_gsConfig",
    state: "DP_gsState",
    strategies: "DP_strategies",
    selectedStrategy: "DP_selectedStrategyId"
};

const DP_TICK_MS = 2000;
const DP_WS_URL = "wss://socket.india.delta.exchange";
const DP_FEE = {
    FUT_TAKER_PCT: 0.05,
    FUT_MAKER_PCT: 0.02,
    OPT_TAKER_PCT: 0.01,
    OPT_MAKER_PCT: 0.01,
    OPT_PREMIUM_CAP_PCT: 3.5,
    GST_PCT: 18
};
const DP_AUTH_KEYS = {
    apiKey: "DP_apiKey",
    apiSecret: "DP_apiSecret"
};

let gDPTimer = null;
let gDPBusy = false;
let gDPWS = null;
let gDPWsReady = false;
let gDPTicks = {};

window.addEventListener("DOMContentLoaded", function () {
    fnLoadDPLoginCred();
    fnGetSetDPTraderStatus();
    fnGetSetDPAutoStatus();
    restoreDPConfig();
    restoreDPState();
    renderAllDP();
    restoreDPSessionState();
    bindDPConfigEvents();
    syncDPFeeInputsByMode();
    ensureDPWebSocket();
    initDPStrategyBuilder();
});

function defaultDPConfig() {
    return {
        symbol: "BTC",
        hedgeDelta: 0.1,
        neutralBand: 0.02,
        qtyBtc: 1.0,
        entryGamma: 0.00005,
        thetaPerDay: 200,
        rollDistPct: 5.0,
        rollGammaPct: 20,
        optBrokPct: DP_FEE.OPT_TAKER_PCT,
        futBrokPct: DP_FEE.FUT_TAKER_PCT,
        feeMode: "TAKER",
        recoverAt: -100,
        stopAt: -300
    };
}

function defaultDPState() {
    return {
        active: false,
        recoveryMode: false,
        symbol: "BTC",
        spot: 0,
        strike: 0,
        qtyBtc: 1.0,
        entryGamma: 0.00005,
        gammaNow: 0.00005,
        rollCount: 0,
        callLeg: null,
        putLeg: null,
        netOptDelta: 0,
        futuresLots: [],
        closedScalps: [],
        events: [],
        optionPnlCurrent: 0,
        realizedOptionPnl: 0,
        realizedScalpPnl: 0,
        thetaAccrued: 0,
        brokerageTotal: 0,
        openedAt: 0
    };
}

function fnToggleDPSession() {
    const isOn = localStorage.getItem(DP_STORE.session) === "true";
    if (isOn) stopDPSession();
    else startDPSession();
}

function startDPSession() {
    if (gDPTimer) return;
    localStorage.setItem(DP_STORE.session, "true");
    updateDPSessionBadge(true);
    gDPTimer = setInterval(() => fnDPTickNow(), DP_TICK_MS);
    fnGenMessage("Paper session started.", "badge bg-success", "spnGenMsg");
}

function stopDPSession() {
    if (gDPTimer) {
        clearInterval(gDPTimer);
        gDPTimer = null;
    }
    localStorage.setItem(DP_STORE.session, "false");
    updateDPSessionBadge(false);
    fnGenMessage("Paper session stopped.", "badge bg-warning", "spnGenMsg");
}

function restoreDPSessionState() {
    const isOn = localStorage.getItem(DP_STORE.session) === "true";
    updateDPSessionBadge(isOn);
    if (isOn) startDPSession();
}

function updateDPSessionBadge(isOn) {
    const btn = document.getElementById("btnDPSessionStatus");
    if (!btn) return;
    fnChangeBtnProps(btn.id, isOn ? "badge bg-success" : "badge bg-secondary", isOn ? "Session - Running" : "Session - Stopped");
}

async function fnDPOpenStraddle() {
    const apiKey = localStorage.getItem(DP_AUTH_KEYS.apiKey) || "";
    const apiSecret = localStorage.getItem(DP_AUTH_KEYS.apiSecret) || "";
    if (!apiKey || !apiSecret) {
        fnGenMessage("Validate trader login first.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const cfg = loadDPConfig();
    const st = loadDPState();
    if (st.active) {
        fnGenMessage("Engine already active.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const expiryDMY = getNearestFridayDMY();
    const lotSize = 1;
    const lotQty = Math.max(0.01, cfg.qtyBtc);

    const callLeg = await fetchDPOptionLeg(apiKey, apiSecret, cfg.symbol, expiryDMY, "C", "buy", lotSize, lotQty);
    if (!callLeg.ok) {
        fnGenMessage(callLeg.message || "Failed to fetch call leg.", "badge bg-danger", "spnGenMsg");
        return;
    }
    const putLeg = await fetchDPOptionLeg(apiKey, apiSecret, cfg.symbol, expiryDMY, "P", "buy", lotSize, lotQty);
    if (!putLeg.ok) {
        fnGenMessage(putLeg.message || "Failed to fetch put leg.", "badge bg-danger", "spnGenMsg");
        return;
    }

    const spot = Number(callLeg.data.spotPrice || putLeg.data.spotPrice || 0);
    const strike = Number(callLeg.data.strike || putLeg.data.strike || 0);
    if (!Number.isFinite(spot) || spot <= 0 || !Number.isFinite(strike) || strike <= 0) {
        fnGenMessage("Invalid leg data from API.", "badge bg-danger", "spnGenMsg");
        return;
    }

    st.active = true;
    st.recoveryMode = false;
    st.symbol = cfg.symbol;
    st.spot = spot;
    st.strike = strike;
    st.qtyBtc = cfg.qtyBtc;
    st.entryGamma = cfg.entryGamma;
    st.gammaNow = cfg.entryGamma;
    st.rollCount = 0;
    st.callLeg = callLeg.data;
    st.putLeg = putLeg.data;
    st.netOptDelta = signedDelta(st.callLeg.delta, "C") + signedDelta(st.putLeg.delta, "P");
    st.futuresLots = [];
    st.closedScalps = [];
    st.events = [];
    st.optionPnlCurrent = 0;
    st.realizedOptionPnl = 0;
    st.realizedScalpPnl = 0;
    st.thetaAccrued = 0;
    st.brokerageTotal = 0;
    st.openedAt = Date.now();

    const openBrok = computeOptionBrok(st.callLeg.entryPrice, st.qtyBtc, cfg, spot)
        + computeOptionBrok(st.putLeg.entryPrice, st.qtyBtc, cfg, spot);
    st.brokerageTotal += openBrok;

    pushDPEvent(st, `Opened ATM straddle: C ${st.callLeg.symbol} + P ${st.putLeg.symbol} @ spot ${toNumDP(spot)}.`);
    pushDPEvent(st, `Opening brokerage charged: ${toNumDP(openBrok)}.`);
    saveDPState(st);
    subscribeDPSymbols(st);
    renderAllDP();
    fnGenMessage("ATM straddle opened with real API symbols.", "badge bg-success", "spnGenMsg");
}

function fnDPResetEngine() {
    if (!confirm("Reset Dynamic Gamma Scalping engine state?")) return;
    saveDPState(defaultDPState());
    renderAllDP();
    fnGenMessage("Engine reset.", "badge bg-warning", "spnGenMsg");
}

async function fnDPTickNow() {
    if (gDPBusy) return;
    gDPBusy = true;
    try {
        const cfg = loadDPConfig();
        const st = loadDPState();
        if (st.active) await runDPGammaTick(st, cfg);
        saveDPState(st);
        renderAllDP();
    } catch (error) {
        console.error("DP tick error:", error);
        fnGenMessage(`Tick error: ${error.message || "unknown"}`, "badge bg-danger", "spnGenMsg");
        stopDPSession();
    } finally {
        gDPBusy = false;
    }
}

async function runDPGammaTick(st, cfg) {
    updateStateFromLiveTicks(st);

    const prevOptPnl = st.optionPnlCurrent;
    const optNow = computeOptionMtm(st);
    st.optionPnlCurrent = optNow;

    const thetaTick = (cfg.thetaPerDay * DP_TICK_MS) / 86400000;
    st.thetaAccrued += thetaTick;

    const totalDelta = st.netOptDelta + getOpenFuturesQty(st);
    const effectiveHedge = st.recoveryMode ? Math.max(0.01, cfg.hedgeDelta / 2) : cfg.hedgeDelta;

    if (Math.abs(totalDelta) >= effectiveHedge) {
        const tradeQty = roundToStep(-totalDelta, 0.01);
        if (Math.abs(tradeQty) > 0) {
            executeFuturesTrade(st, tradeQty, st.spot, "HEDGE", cfg);
            pushDPEvent(st, `Hedge ${tradeQty > 0 ? "BUY" : "SELL"} ${toNumDP(Math.abs(tradeQty))} BTC at ${toNumDP(st.spot)}.`);
        }
    } else {
        const postHedgeDelta = st.netOptDelta + getOpenFuturesQty(st);
        if (Math.abs(postHedgeDelta) <= cfg.neutralBand && Math.abs(getOpenFuturesQty(st)) > 0) {
            const unwindQty = -getOpenFuturesQty(st);
            executeFuturesTrade(st, unwindQty, st.spot, "UNWIND", cfg);
            pushDPEvent(st, `Neutral unwind ${unwindQty > 0 ? "BUY" : "SELL"} ${toNumDP(Math.abs(unwindQty))} BTC at ${toNumDP(st.spot)}.`);
        }
    }

    const net = computeDPNet(st);
    if (!st.recoveryMode && net <= cfg.recoverAt) {
        st.recoveryMode = true;
        pushDPEvent(st, `Recovery mode ON at net ${toNumDP(net)}.`);
    }
    if (st.recoveryMode && net >= 0) {
        st.recoveryMode = false;
        pushDPEvent(st, `Recovery mode OFF at breakeven ${toNumDP(net)}.`);
    }
    if (net <= cfg.stopAt) {
        const flattenQty = -getOpenFuturesQty(st);
        if (Math.abs(flattenQty) > 0) executeFuturesTrade(st, flattenQty, st.spot, "STOP_FLAT", cfg);
        await closeStraddle(st, cfg, "MAX_DD_STOP");
        stopDPSession();
        pushDPEvent(st, `Hard stop triggered at net ${toNumDP(net)}.`);
        return;
    }

    const distPct = Math.abs((st.spot - st.strike) / st.strike) * 100;
    const gammaPct = st.entryGamma > 0 ? (st.gammaNow / st.entryGamma) * 100 : 0;
    if (distPct >= cfg.rollDistPct || gammaPct <= cfg.rollGammaPct) {
        await rollDPStraddle(st, cfg, distPct >= cfg.rollDistPct ? "ROLL_DIST" : "ROLL_GAMMA");
    }

    if (Math.abs(st.optionPnlCurrent - prevOptPnl) > 1e6) {
        pushDPEvent(st, "Large option MTM jump detected.");
    }
}

async function rollDPStraddle(st, cfg, reason) {
    if (!st.callLeg || !st.putLeg) {
        st.active = false;
        pushDPEvent(st, "Roll skipped: missing option legs.");
        return;
    }
    const flattenQty = -getOpenFuturesQty(st);
    if (Math.abs(flattenQty) > 0) executeFuturesTrade(st, flattenQty, st.spot, "ROLL_FLAT", cfg);
    await closeStraddle(st, cfg, reason);

    const apiKey = localStorage.getItem(DP_AUTH_KEYS.apiKey) || "";
    const apiSecret = localStorage.getItem(DP_AUTH_KEYS.apiSecret) || "";
    const expiryDMY = getNearestFridayDMY();
    const lotSize = 1;
    const lotQty = Math.max(0.01, cfg.qtyBtc);
    const callLeg = await fetchDPOptionLeg(apiKey, apiSecret, cfg.symbol, expiryDMY, "C", "buy", lotSize, lotQty);
    const putLeg = await fetchDPOptionLeg(apiKey, apiSecret, cfg.symbol, expiryDMY, "P", "buy", lotSize, lotQty);
    if (!callLeg.ok || !putLeg.ok) {
        st.active = false;
        pushDPEvent(st, `Roll failed due to API leg fetch error.`);
        return;
    }

    st.callLeg = callLeg.data;
    st.putLeg = putLeg.data;
    st.strike = Number(callLeg.data.strike || st.spot);
    st.entryGamma = cfg.entryGamma;
    st.gammaNow = cfg.entryGamma;
    st.netOptDelta = signedDelta(st.callLeg.delta, "C") + signedDelta(st.putLeg.delta, "P");
    st.optionPnlCurrent = 0;
    st.thetaAccrued = 0;
    st.rollCount += 1;
    const openBrok = computeOptionBrok(st.callLeg.entryPrice, st.qtyBtc, cfg, st.spot)
        + computeOptionBrok(st.putLeg.entryPrice, st.qtyBtc, cfg, st.spot);
    st.brokerageTotal += openBrok;
    pushDPEvent(st, `Rolled straddle (${reason}) to strike ${toNumDP(st.strike)}. Open brok ${toNumDP(openBrok)}.`);
    subscribeDPSymbols(st);
}

async function closeStraddle(st, cfg, reason) {
    if (!st.callLeg || !st.putLeg) {
        pushDPEvent(st, `Close skipped (${reason}): missing option legs.`);
        st.optionPnlCurrent = 0;
        return;
    }
    const mtm = computeOptionMtm(st);
    st.realizedOptionPnl += mtm;
    const callMark = Number.isFinite(Number(st.callLeg.markPrice)) ? Number(st.callLeg.markPrice) : Number(st.callLeg.entryPrice || 0);
    const putMark = Number.isFinite(Number(st.putLeg.markPrice)) ? Number(st.putLeg.markPrice) : Number(st.putLeg.entryPrice || 0);
    const closeBrok = computeOptionBrok(callMark, st.qtyBtc, cfg, st.spot)
        + computeOptionBrok(putMark, st.qtyBtc, cfg, st.spot);
    st.brokerageTotal += closeBrok;
    pushDPEvent(st, `Closed straddle (${reason}) MTM ${toNumDP(mtm)}. Close brok ${toNumDP(closeBrok)}.`);
    st.optionPnlCurrent = 0;
}

function executeFuturesTrade(st, qtyTrade, price, reason, cfg) {
    const execPrice = price;
    let remaining = qtyTrade;
    while (Math.abs(remaining) > 0.0000001 && st.futuresLots.length > 0 && Math.sign(remaining) !== Math.sign(st.futuresLots[0].qty)) {
        const lot = st.futuresLots[0];
        const closeQty = Math.min(Math.abs(remaining), Math.abs(lot.qty));
        const signedClosed = Math.sign(lot.qty) * closeQty;
        const pnl = (execPrice - lot.entry) * signedClosed;
        const brok = computeFutureBrok(execPrice, closeQty, cfg);
        st.realizedScalpPnl += pnl;
        st.brokerageTotal += brok;
        st.closedScalps.unshift({
            id: `S-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            side: signedClosed > 0 ? "LONG" : "SHORT",
            qty: Math.abs(closeQty),
            entry: lot.entry,
            exit: execPrice,
            pnl,
            reason,
            ts: Date.now()
        });
        lot.qty = lot.qty - signedClosed;
        remaining = remaining - (-signedClosed);
        if (Math.abs(lot.qty) < 0.0000001) st.futuresLots.shift();
    }
    if (Math.abs(remaining) > 0.0000001) {
        st.futuresLots.push({ qty: remaining, entry: execPrice });
        st.brokerageTotal += computeFutureBrok(execPrice, Math.abs(remaining), cfg);
    }
}

function updateStateFromLiveTicks(st) {
    const futSymbol = `${st.symbol}USD`;
    const futTick = gDPTicks[futSymbol];
    const callTick = st.callLeg ? gDPTicks[st.callLeg.symbol] : null;
    const putTick = st.putLeg ? gDPTicks[st.putLeg.symbol] : null;

    if (futTick) st.spot = Number(futTick.spotPrice || futTick.markPrice || futTick.bestBid || st.spot);
    if (callTick) {
        st.callLeg.markPrice = Number(callTick.bestBid || st.callLeg.markPrice || st.callLeg.entryPrice);
        st.callLeg.delta = Number.isFinite(Number(callTick.delta)) ? Number(callTick.delta) : st.callLeg.delta;
    }
    if (putTick) {
        st.putLeg.markPrice = Number(putTick.bestBid || st.putLeg.markPrice || st.putLeg.entryPrice);
        st.putLeg.delta = Number.isFinite(Number(putTick.delta)) ? Number(putTick.delta) : st.putLeg.delta;
    }

    const signedCall = signedDelta(st.callLeg?.delta, "C");
    const signedPut = signedDelta(st.putLeg?.delta, "P");
    st.netOptDelta = signedCall + signedPut;
    st.gammaNow = computeGammaNow(st.entryGamma, st.strike, st.spot);
}

function computeOptionMtm(st) {
    if (!st.callLeg || !st.putLeg) return 0;
    const callPnl = (Number(st.callLeg.markPrice || st.callLeg.entryPrice) - Number(st.callLeg.entryPrice || 0)) * st.qtyBtc;
    const putPnl = (Number(st.putLeg.markPrice || st.putLeg.entryPrice) - Number(st.putLeg.entryPrice || 0)) * st.qtyBtc;
    return callPnl + putPnl;
}

function computeDPNet(st) {
    return st.realizedScalpPnl + st.realizedOptionPnl + st.optionPnlCurrent + getUnrealizedFutPnl(st) - st.thetaAccrued - st.brokerageTotal;
}

function getOpenFuturesQty(st) {
    return (st.futuresLots || []).reduce((a, b) => a + Number(b.qty || 0), 0);
}

function getUnrealizedFutPnl(st) {
    const px = st.spot;
    return (st.futuresLots || []).reduce((sum, lot) => sum + ((px - lot.entry) * lot.qty), 0);
}

function computeGammaNow(entryGamma, strike, spot) {
    if (!Number.isFinite(strike) || strike <= 0) return entryGamma;
    const movePct = Math.abs((spot - strike) / strike);
    const decay = Math.exp(-8 * movePct);
    return Math.max(entryGamma * 0.05, entryGamma * decay);
}

function computeOptionBrok(premiumPrice, qtyBtc, cfg, spotPrice) {
    const pct = getEffectiveOptionFeePct(cfg);
    const qty = Math.abs(Number(qtyBtc));
    const premium = Math.abs(Number(premiumPrice) * qty);
    const spot = Math.abs(Number(spotPrice) * qty);
    const byNotional = spot * (Number(pct) / 100);
    const capByPremium = premium * (DP_FEE.OPT_PREMIUM_CAP_PCT / 100);
    const feePreGst = Math.min(byNotional, capByPremium);
    return feePreGst * (1 + (DP_FEE.GST_PCT / 100));
}

function computeFutureBrok(price, qtyBtc, cfg) {
    const pct = getEffectiveFutureFeePct(cfg);
    const n = Math.abs(Number(price) * Number(qtyBtc));
    return n * (Number(pct) / 100) * (1 + (DP_FEE.GST_PCT / 100));
}

function getEffectiveOptionFeePct(cfg) {
    if ((cfg.feeMode || "TAKER") === "MAKER") return DP_FEE.OPT_MAKER_PCT;
    return DP_FEE.OPT_TAKER_PCT;
}

function getEffectiveFutureFeePct(cfg) {
    if ((cfg.feeMode || "TAKER") === "MAKER") return DP_FEE.FUT_MAKER_PCT;
    return DP_FEE.FUT_TAKER_PCT;
}

function signedDelta(delta, type) {
    const d = Number(delta);
    if (!Number.isFinite(d)) return 0;
    if (type === "P") return d > 0 ? -d : d;
    return d;
}

async function fetchDPOptionLeg(apiKey, apiSecret, symbol, expiryDMY, optionType, transType, lotSize, lotQty) {
    try {
        const response = await fetch("/deltaSStrangleDemo/execOptionLeg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ApiKey: apiKey,
                ApiSecret: apiSecret,
                UndAssetSymbol: symbol,
                Expiry: expiryDMY,
                OptionType: optionType,
                TransType: transType,
                OrderType: "limit_order",
                LotSize: lotSize,
                LotQty: lotQty,
                DeltaPos: 0.55,
                DeltaRePos: 0.33,
                DeltaTP: 0.25,
                DeltaSL: 0.65
            })
        });
        const result = await response.json();
        if (result.status !== "success" || !result.data) {
            return { ok: false, message: result.message || "Option leg fetch failed." };
        }
        return {
            ok: true,
            data: {
                symbol: result.data.Symbol,
                strike: Number(result.data.Strike),
                delta: Number(result.data.Delta),
                entryPrice: Number(result.data.BestAsk),
                markPrice: Number(result.data.BestBid),
                spotPrice: Number(result.data.Strike),
                optionType
            }
        };
    } catch (error) {
        return { ok: false, message: "Option leg fetch error." };
    }
}

function ensureDPWebSocket() {
    if (gDPWS && (gDPWS.readyState === 0 || gDPWS.readyState === 1)) return;
    gDPWS = new WebSocket(DP_WS_URL);
    gDPWS.onopen = function () {
        gDPWsReady = true;
        const st = loadDPState();
        subscribeDPSymbols(st);
    };
    gDPWS.onclose = function () {
        gDPWsReady = false;
        setTimeout(ensureDPWebSocket, 2000);
    };
    gDPWS.onerror = function () {
        gDPWsReady = false;
    };
    gDPWS.onmessage = function (evt) {
        const msg = JSON.parse(evt.data || "{}");
        if (msg.type !== "v2/ticker") return;
        gDPTicks[msg.symbol] = {
            bestAsk: Number(msg.quotes?.best_ask),
            bestBid: Number(msg.quotes?.best_bid),
            delta: Number(msg.greeks?.delta),
            markPrice: Number(msg.mark_price),
            spotPrice: Number(msg.spot_price)
        };
    };
}

function subscribeDPSymbols(st) {
    ensureDPWebSocket();
    if (!gDPWsReady || !gDPWS || gDPWS.readyState !== 1) return;
    const symbols = [];
    if (st.callLeg?.symbol) symbols.push(st.callLeg.symbol);
    if (st.putLeg?.symbol) symbols.push(st.putLeg.symbol);
    symbols.push(`${(st.symbol || "BTC")}USD`);
    const uniq = [...new Set(symbols.filter(Boolean))];
    if (uniq.length === 0) return;
    gDPWS.send(JSON.stringify({
        type: "subscribe",
        payload: { channels: [{ name: "v2/ticker", symbols: uniq }] }
    }));
}

function renderAllDP() {
    const st = loadDPState();
    renderDPLiveBadge(st);
    renderDPEngine(st);
    renderDPPnl(st);
    renderDPScalps(st);
    renderDPEvents(st);
    renderDPStrategyTable();
    updateDPSelectedStrategyLabel();
}

function renderDPEngine(st) {
    const body = document.getElementById("tBodyDPEngine");
    if (!body) return;
    const futQty = getOpenFuturesQty(st);
    const totalDelta = st.netOptDelta + futQty;
    body.innerHTML = `<tr>
        <td>${st.active ? "ACTIVE" : "IDLE"}</td>
        <td style="text-align:right;">${toNumDP(st.spot)}</td>
        <td style="text-align:right;">${toNumDP(st.strike)}</td>
        <td style="text-align:right;">${toNumDP(st.netOptDelta, 4)}</td>
        <td style="text-align:right;">${toNumDP(futQty, 4)}</td>
        <td style="text-align:right;">${toNumDP(totalDelta, 4)}</td>
        <td style="text-align:right;">${toNumDP(st.gammaNow, 6)}</td>
        <td style="text-align:right;">${toNumDP(st.rollCount)}</td>
        <td style="text-align:center;">${st.recoveryMode ? "<span class='badge bg-warning'>ON</span>" : "<span class='badge bg-secondary'>OFF</span>"}</td>
    </tr>`;
}

function renderDPPnl(st) {
    const scalp = st.realizedScalpPnl;
    const opt = st.realizedOptionPnl + st.optionPnlCurrent;
    const futUnreal = getUnrealizedFutPnl(st);
    const theta = st.thetaAccrued;
    const brok = st.brokerageTotal;
    const net = computeDPNet(st);
    const el = document.getElementById("spnDPPnl");
    if (!el) return;
    const cfg = loadDPConfig();
    el.innerText = `Mode:${cfg.feeMode} | Scalp: ${toNumDP(scalp)} | Option: ${toNumDP(opt)} | Fut U: ${toNumDP(futUnreal)} | Theta: ${toNumDP(theta)} | Brok: ${toNumDP(brok)} | Net: ${toNumDP(net)}`;
}

function renderDPScalps(st) {
    const body = document.getElementById("tBodyDPScalps");
    if (!body) return;
    const rows = st.closedScalps || [];
    if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center;">No hedge scalps yet</td></tr>`;
        return;
    }
    let html = "";
    for (const r of rows.slice(0, 200)) {
        html += `<tr>
            <td>${r.id}</td>
            <td>${r.side}</td>
            <td style="text-align:right;">${toNumDP(r.qty)}</td>
            <td style="text-align:right;">${toNumDP(r.entry)}</td>
            <td style="text-align:right;">${toNumDP(r.exit)}</td>
            <td style="text-align:right; color:${r.pnl >= 0 ? "#16a34a" : "#dc2626"};">${toNumDP(r.pnl)}</td>
            <td>${r.reason}</td>
        </tr>`;
    }
    body.innerHTML = html;
}

function renderDPEvents(st) {
    const body = document.getElementById("tBodyDPEvents");
    if (!body) return;
    const rows = st.events || [];
    if (rows.length === 0) {
        body.innerHTML = `<tr><td colspan="2" style="text-align:center;">No events yet</td></tr>`;
        return;
    }
    let html = "";
    for (const e of rows.slice(0, 300)) {
        html += `<tr><td>${new Date(e.ts).toLocaleTimeString()}</td><td>${e.msg}</td></tr>`;
    }
    body.innerHTML = html;
}

function renderDPLiveBadge(st) {
    const el = document.getElementById("spnDPLive");
    if (!el) return;
    const spot = Number(st?.spot) || Number(gDPTicks.BTCUSD?.spotPrice) || 0;
    const ws = gDPWsReady ? "WS:ON" : "WS:OFF";
    el.innerText = `BTC Spot: ${toNumDP(spot)} | ${ws}`;
}

function pushDPEvent(st, msg) {
    st.events = st.events || [];
    st.events.unshift({ ts: Date.now(), msg });
}

function bindDPConfigEvents() {
    const ids = [
        "ddlDPSymbol", "txtDPHedgeDelta", "txtDPNeutralBand", "txtDPQtyBTC",
        "txtDPEntryGamma", "txtDPThetaDay", "txtDPRollDistPct", "txtDPRollGammaPct",
        "txtDPOptBrokPct", "txtDPFutBrokPct", "ddlDPFeeMode", "txtDPRecoverAt", "txtDPStopAt"
    ];
    for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.addEventListener("change", saveDPConfigFromUI);
        el.addEventListener("blur", saveDPConfigFromUI);
    }
    const modeEl = document.getElementById("ddlDPFeeMode");
    if (modeEl) {
        modeEl.addEventListener("change", function () {
            syncDPFeeInputsByMode();
            saveDPConfigFromUI();
        });
    }
}

function saveDPConfigFromUI() {
    syncDPFeeInputsByMode();
    const cfg = {
        symbol: document.getElementById("ddlDPSymbol").value,
        hedgeDelta: Number(document.getElementById("txtDPHedgeDelta").value),
        neutralBand: Number(document.getElementById("txtDPNeutralBand").value),
        qtyBtc: Number(document.getElementById("txtDPQtyBTC").value),
        entryGamma: Number(document.getElementById("txtDPEntryGamma").value),
        thetaPerDay: Number(document.getElementById("txtDPThetaDay").value),
        rollDistPct: Number(document.getElementById("txtDPRollDistPct").value),
        rollGammaPct: Number(document.getElementById("txtDPRollGammaPct").value),
        optBrokPct: Number(document.getElementById("txtDPOptBrokPct").value),
        futBrokPct: Number(document.getElementById("txtDPFutBrokPct").value),
        feeMode: document.getElementById("ddlDPFeeMode").value || "TAKER",
        recoverAt: Number(document.getElementById("txtDPRecoverAt").value),
        stopAt: Number(document.getElementById("txtDPStopAt").value)
    };
    saveJSON(DP_STORE.config, cfg);
}

function restoreDPConfig() {
    const cfg = loadDPConfig();
    setValue("ddlDPSymbol", cfg.symbol);
    setValue("txtDPHedgeDelta", cfg.hedgeDelta);
    setValue("txtDPNeutralBand", cfg.neutralBand);
    setValue("txtDPQtyBTC", cfg.qtyBtc);
    setValue("txtDPEntryGamma", cfg.entryGamma);
    setValue("txtDPThetaDay", cfg.thetaPerDay);
    setValue("txtDPRollDistPct", cfg.rollDistPct);
    setValue("txtDPRollGammaPct", cfg.rollGammaPct);
    setValue("txtDPOptBrokPct", cfg.optBrokPct);
    setValue("txtDPFutBrokPct", cfg.futBrokPct);
    setValue("ddlDPFeeMode", cfg.feeMode || "TAKER");
    setValue("txtDPRecoverAt", cfg.recoverAt);
    setValue("txtDPStopAt", cfg.stopAt);
    syncDPFeeInputsByMode();
}

function loadDPConfig() {
    const cfg = loadJSON(DP_STORE.config, defaultDPConfig());
    return {
        symbol: cfg.symbol || "BTC",
        hedgeDelta: positiveOr(cfg.hedgeDelta, 0.1),
        neutralBand: positiveOr(cfg.neutralBand, 0.02),
        qtyBtc: positiveOr(cfg.qtyBtc, 1),
        entryGamma: positiveOr(cfg.entryGamma, 0.00005),
        thetaPerDay: positiveOr(cfg.thetaPerDay, 200),
        rollDistPct: positiveOr(cfg.rollDistPct, 5),
        rollGammaPct: positiveOr(cfg.rollGammaPct, 20),
        optBrokPct: positiveOr(cfg.optBrokPct, DP_FEE.OPT_TAKER_PCT),
        futBrokPct: positiveOr(cfg.futBrokPct, DP_FEE.FUT_TAKER_PCT),
        feeMode: (cfg.feeMode === "MAKER" ? "MAKER" : "TAKER"),
        recoverAt: Number.isFinite(Number(cfg.recoverAt)) ? Number(cfg.recoverAt) : -100,
        stopAt: Number.isFinite(Number(cfg.stopAt)) ? Number(cfg.stopAt) : -300
    };
}

function syncDPFeeInputsByMode() {
    const mode = document.getElementById("ddlDPFeeMode")?.value || "TAKER";
    const opt = mode === "MAKER" ? DP_FEE.OPT_MAKER_PCT : DP_FEE.OPT_TAKER_PCT;
    const fut = mode === "MAKER" ? DP_FEE.FUT_MAKER_PCT : DP_FEE.FUT_TAKER_PCT;
    setValue("txtDPOptBrokPct", opt);
    setValue("txtDPFutBrokPct", fut);
}

function restoreDPState() {
    const st = loadJSON(DP_STORE.state, null);
    if (!st) {
        saveDPState(defaultDPState());
        return;
    }
    // Migrate/repair stale state from previous versions.
    if (st.active && (!st.callLeg || !st.putLeg)) {
        st.active = false;
        st.recoveryMode = false;
        st.callLeg = null;
        st.putLeg = null;
        st.netOptDelta = 0;
        st.optionPnlCurrent = 0;
        st.events = Array.isArray(st.events) ? st.events : [];
        st.events.unshift({ ts: Date.now(), msg: "Recovered from stale state: missing option legs." });
        saveDPState(st);
    }
}

function initDPStrategyBuilder() {
    const list = loadDPStrategies();
    if (!Array.isArray(list) || list.length === 0) {
        const id = `S-${Date.now()}`;
        const seed = [{ id, name: "GS-1", config: loadDPConfig(), state: defaultDPState(), createdAt: Date.now() }];
        saveDPStrategies(seed);
        localStorage.setItem(DP_STORE.selectedStrategy, id);
    }
    renderDPStrategyDropdown();
    renderDPStrategyTable();
    updateDPSelectedStrategyLabel();
}

function loadDPStrategies() {
    return loadJSON(DP_STORE.strategies, []);
}

function saveDPStrategies(arr) {
    saveJSON(DP_STORE.strategies, arr);
}

function getSelectedDPStrategyId() {
    return localStorage.getItem(DP_STORE.selectedStrategy) || "";
}

function setSelectedDPStrategyId(id) {
    localStorage.setItem(DP_STORE.selectedStrategy, id || "");
}

function renderDPStrategyDropdown() {
    const ddl = document.getElementById("ddlDPStrategies");
    if (!ddl) return;
    const list = loadDPStrategies();
    const sel = getSelectedDPStrategyId();
    let html = `<option value="">Select Strategy</option>`;
    for (const s of list) {
        html += `<option value="${s.id}" ${s.id === sel ? "selected" : ""}>${escapeHtmlDP(s.name)}</option>`;
    }
    ddl.innerHTML = html;
}

function renderDPStrategyTable() {
    const body = document.getElementById("tBodyDPStrategies");
    if (!body) return;
    const list = loadDPStrategies();
    const sel = getSelectedDPStrategyId();
    if (!Array.isArray(list) || list.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center;">No strategies</td></tr>`;
        return;
    }
    let html = "";
    for (const s of list) {
        const net = computeDPNet(s.state || defaultDPState());
        const active = (s.state && s.state.active) ? "ACTIVE" : "IDLE";
        html += `<tr>
            <td>${escapeHtmlDP(s.name)}</td>
            <td style="text-align:left;">H:${toNumDP(s.config?.hedgeDelta)} N:${toNumDP(s.config?.neutralBand)} G:${toNumDP(s.config?.entryGamma, 6)}</td>
            <td style="text-align:center;">${active}</td>
            <td style="text-align:right; color:${net >= 0 ? "#16a34a" : "#dc2626"};">${toNumDP(net)}</td>
            <td style="text-align:center;"><button class="btn btn-sm btn-outline-success" onclick="fnDPRunStrategy('${s.id}')">Run</button></td>
            <td style="text-align:center;"><button class="btn btn-sm btn-outline-primary" onclick="fnDPSelectStrategy('${s.id}')">${s.id === sel ? "Loaded" : "Load"}</button></td>
            <td style="text-align:center;"><button class="btn btn-sm btn-outline-danger" onclick="fnDPDeleteStrategy('${s.id}')">Delete</button></td>
        </tr>`;
    }
    body.innerHTML = html;
}

function updateDPSelectedStrategyLabel() {
    const badge = document.getElementById("spnDPSelectedStrategy");
    if (!badge) return;
    const sel = getSelectedDPStrategyId();
    const list = loadDPStrategies();
    const found = list.find((s) => s.id === sel);
    badge.innerText = `Selected: ${found ? found.name : "-"}`;
    renderDPStrategyDropdown();
}

function fnOpenDPStrategyModal() {
    const txt = document.getElementById("txtDPNewStrategyName");
    if (txt) txt.value = "";
    $("#mdlDPStrategy").modal("show");
}

function fnOpenDPStrategySetupModal() {
    const sel = getSelectedDPStrategyId();
    if (!sel) {
        fnGenMessage("Select strategy first.", "badge bg-warning", "spnGenMsg");
        return;
    }
    const list = loadDPStrategies();
    const item = list.find((s) => s.id === sel);
    if (!item) {
        fnGenMessage("Selected strategy not found.", "badge bg-warning", "spnGenMsg");
        return;
    }
    const cfg = item.config || defaultDPConfig();
    setValue("txtDPSetupStrategyName", item.name || "");
    setValue("txtDPSetupHedgeDelta", cfg.hedgeDelta);
    setValue("txtDPSetupNeutralBand", cfg.neutralBand);
    setValue("txtDPSetupQtyBTC", cfg.qtyBtc);
    setValue("txtDPSetupEntryGamma", cfg.entryGamma);
    setValue("txtDPSetupThetaDay", cfg.thetaPerDay);
    setValue("txtDPSetupRollDistPct", cfg.rollDistPct);
    setValue("txtDPSetupRollGammaPct", cfg.rollGammaPct);
    setValue("ddlDPSetupFeeMode", cfg.feeMode || "TAKER");
    setValue("txtDPSetupOptBrokPct", cfg.optBrokPct);
    setValue("txtDPSetupFutBrokPct", cfg.futBrokPct);
    setValue("txtDPSetupRecoverAt", cfg.recoverAt);
    setValue("txtDPSetupStopAt", cfg.stopAt);
    $("#mdlDPStrategySetup").modal("show");
}

function fnApplyDPStrategySetupModal() {
    const sel = getSelectedDPStrategyId();
    if (!sel) {
        fnGenMessage("Select strategy first.", "badge bg-warning", "spnGenMsg");
        return;
    }
    const newName = String(document.getElementById("txtDPSetupStrategyName")?.value || "").trim();
    if (!newName) {
        fnGenMessage("Strategy name cannot be empty.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const setupCfg = {
        symbol: "BTC",
        hedgeDelta: Number(document.getElementById("txtDPSetupHedgeDelta").value),
        neutralBand: Number(document.getElementById("txtDPSetupNeutralBand").value),
        qtyBtc: Number(document.getElementById("txtDPSetupQtyBTC").value),
        entryGamma: Number(document.getElementById("txtDPSetupEntryGamma").value),
        thetaPerDay: Number(document.getElementById("txtDPSetupThetaDay").value),
        rollDistPct: Number(document.getElementById("txtDPSetupRollDistPct").value),
        rollGammaPct: Number(document.getElementById("txtDPSetupRollGammaPct").value),
        feeMode: document.getElementById("ddlDPSetupFeeMode").value || "TAKER",
        optBrokPct: Number(document.getElementById("txtDPSetupOptBrokPct").value),
        futBrokPct: Number(document.getElementById("txtDPSetupFutBrokPct").value),
        recoverAt: Number(document.getElementById("txtDPSetupRecoverAt").value),
        stopAt: Number(document.getElementById("txtDPSetupStopAt").value)
    };

    const list = loadDPStrategies();
    const duplicate = list.some((s) => s.id !== sel && String(s.name).toLowerCase() === newName.toLowerCase());
    if (duplicate) {
        fnGenMessage("Another strategy with same name exists.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const idx = list.findIndex((s) => s.id === sel);
    if (idx < 0) return;
    list[idx].name = newName;
    list[idx].config = {
        ...list[idx].config,
        ...setupCfg
    };
    list[idx].updatedAt = Date.now();
    saveDPStrategies(list);

    // Keep current screen synced with selected strategy setup values.
    saveJSON(DP_STORE.config, list[idx].config);
    restoreDPConfig();
    $("#mdlDPStrategySetup").modal("hide");
    renderAllDP();
    fnGenMessage("Strategy setup updated.", "badge bg-success", "spnGenMsg");
}

function fnCreateDPStrategyFromModal() {
    const txt = document.getElementById("txtDPNewStrategyName");
    const name = String(txt?.value || "").trim();
    if (!name) {
        fnGenMessage("Enter strategy name.", "badge bg-warning", "spnGenMsg");
        return;
    }
    const list = loadDPStrategies();
    if (list.some((s) => String(s.name).toLowerCase() === name.toLowerCase())) {
        fnGenMessage("Strategy name already exists.", "badge bg-warning", "spnGenMsg");
        return;
    }
    const id = `S-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const cfg = loadDPConfig();
    list.push({ id, name, config: { ...cfg }, state: defaultDPState(), createdAt: Date.now() });
    saveDPStrategies(list);
    setSelectedDPStrategyId(id);
    $("#mdlDPStrategy").modal("hide");
    renderDPStrategyDropdown();
    renderDPStrategyTable();
    updateDPSelectedStrategyLabel();
    fnGenMessage(`Strategy created: ${name}`, "badge bg-success", "spnGenMsg");
}

function fnDPSelectStrategy(id) {
    const strategyId = id || document.getElementById("ddlDPStrategies")?.value || "";
    if (!strategyId) return;
    const list = loadDPStrategies();
    const item = list.find((s) => s.id === strategyId);
    if (!item) return;
    saveJSON(DP_STORE.config, item.config || defaultDPConfig());
    saveJSON(DP_STORE.state, item.state || defaultDPState());
    setSelectedDPStrategyId(strategyId);
    restoreDPConfig();
    renderAllDP();
    fnGenMessage(`Loaded strategy: ${item.name}`, "badge bg-success", "spnGenMsg");
}

function fnDPSaveStrategy() {
    const sel = getSelectedDPStrategyId();
    if (!sel) {
        fnGenMessage("Select strategy first.", "badge bg-warning", "spnGenMsg");
        return;
    }
    const list = loadDPStrategies();
    const idx = list.findIndex((s) => s.id === sel);
    if (idx < 0) return;
    list[idx].config = loadDPConfig();
    list[idx].state = loadDPState();
    list[idx].updatedAt = Date.now();
    saveDPStrategies(list);
    renderDPStrategyTable();
    fnGenMessage("Strategy saved.", "badge bg-success", "spnGenMsg");
}

function fnDPDeleteStrategy(id) {
    const list = loadDPStrategies();
    if (list.length <= 1) {
        fnGenMessage("At least one strategy must exist.", "badge bg-warning", "spnGenMsg");
        return;
    }
    const item = list.find((s) => s.id === id);
    if (!item) return;
    if (!confirm(`Delete strategy "${item.name}"?`)) return;
    const next = list.filter((s) => s.id !== id);
    saveDPStrategies(next);
    const sel = getSelectedDPStrategyId();
    if (sel === id) {
        const first = next[0];
        setSelectedDPStrategyId(first?.id || "");
        if (first) {
            saveJSON(DP_STORE.config, first.config || defaultDPConfig());
            saveJSON(DP_STORE.state, first.state || defaultDPState());
        }
    }
    restoreDPConfig();
    renderAllDP();
}

async function fnDPRunStrategy(id) {
    fnDPSelectStrategy(id);
    await fnDPOpenStraddle();
}

function loadDPState() {
    return loadJSON(DP_STORE.state, defaultDPState());
}

function saveDPState(state) {
    saveJSON(DP_STORE.state, state);
    const sel = getSelectedDPStrategyId();
    if (!sel) return;
    const list = loadDPStrategies();
    const idx = list.findIndex((s) => s.id === sel);
    if (idx < 0) return;
    list[idx].state = state;
    list[idx].updatedAt = Date.now();
    saveDPStrategies(list);
}

function loadJSON(key, fallback) {
    try {
        const v = JSON.parse(localStorage.getItem(key) || "null");
        return v === null ? fallback : v;
    } catch (e) {
        return fallback;
    }
}

function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = String(value);
}

function escapeHtmlDP(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function positiveOr(v, d) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : d;
}

function roundToStep(v, step) {
    return Math.round(v / step) * step;
}

function toNumDP(v, decimals) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return n.toFixed(Number.isFinite(Number(decimals)) ? Number(decimals) : 3);
}

function getNearestFridayDMY() {
    const d = new Date();
    const day = d.getDay();
    const add = (5 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + add);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear());
    return `${dd}-${mm}-${yy}`;
}
