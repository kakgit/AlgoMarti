const CFV2_STORAGE = {
    rows: "FundingSortedDataCFV2",
    meta: "FundingMetaCFV2",
    paperOpen: "PaperOpenPositionsCFV2",
    paperClosed: "PaperClosedPositionsCFV2",
    virtualFunds: "VirtualFundsCFV2"
};
const CFV2_ORDER_USD = 10;
const CFV2_LEVERAGE = 20;
const CFV2_USE_EQUAL_USD_SIZING = true; // Rollback option: set false for legacy 10 USD @ 20x sizing.
const CFV2_TARGET_USD_PER_LEG = 100;
const CFV2_DEFAULT_DELTA_TAKER_FEE = 0.0005;
const CFV2_DEFAULT_COIND_TAKER_FEE = 0.00059;
const CFV2_DISPLAY_DECIMALS = 3;
const CFV2_INITIAL_VIRTUAL_FUND = 10000;
let gCFV2Socket = null;
let gCFV2LiveDeltaRatesByTradeId = {};
let gCFV2LiveCoinRatesByTradeId = {};
let gCFV2LiveDeltaFundingByTradeId = {};
let gCFV2LiveCoinFundingByTradeId = {};
let gCFV2WatchHash = "";
let gCFV2CountdownTimer = null;
let gCFV2AutoRefreshTimer = null;
let gCFV2AutoRefreshBusy = false;
let gCFV2AutoPaperTradeBusy = false;

window.addEventListener("DOMContentLoaded", function () {
    fnGetAllStatusCFV2();
    initPaperTradeHandlersCFV2();
    initPaperTradeRatesSocketCFV2();
    ensureVirtualFundsCFV2();
    migrateCapitalReservationCFV2();
    renderVirtualFundsCFV2();
    fnDisplayFundingCFV2();
    migrateOpenTradesLotSizeCFV2();
    renderPaperOpenPositionsCFV2();
    renderPaperClosedPositionsCFV2();
    initFundingCountdownTimerCFV2();
    initFundingAutoRefreshCFV2();
});

function fnGetAllStatusCFV2() {
    const appStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    if (!appStatus) return;
    fnLoadLoginCredCFV2();
    fnGetSetTraderLoginStatusCFV2();
    fnGetSetAutoTraderStatusCFV2();
}

async function fnRefreshFundingDataCFV2() {
    const apiKey = sessionStorage.getItem("lsApiKeyCFV2");
    const apiSecret = sessionStorage.getItem("lsSecretCFV2");
    const minRate = Number(document.getElementById("txtMinRateCFV2").value || 0.5);

    if (!apiKey || !apiSecret) {
        fnGenMessage("Please validate Delta login first.", "badge bg-warning", "spnGenMsg");
        $("#mdlDeltaLoginCFV2").modal("show");
        return;
    }

    showLoadingIcon(true);
    try {
        const response = await fetch("/execCryptoFundingV2/refreshFundingData", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ApiKey: apiKey, ApiSecret: apiSecret, MinDailyRate: minRate })
        });
        const result = await response.json();

        if (result.status !== "success") {
            fnGenMessage(result.message || "Failed to refresh funding data.", `badge bg-${result.status || "warning"}`, "spnGenMsg");
            return;
        }

        localStorage.setItem(CFV2_STORAGE.rows, JSON.stringify(result.data || []));
        localStorage.setItem(CFV2_STORAGE.meta, JSON.stringify(result.meta || {}));
        fnDisplayFundingCFV2();
        await runAutoPaperTradesFromScreenerCFV2();
        fnGenMessage("Funding data updated.", "badge bg-success", "spnGenMsg");
    } catch (error) {
        fnGenMessage("Error refreshing funding data.", "badge bg-danger", "spnGenMsg");
    } finally {
        showLoadingIcon(false);
    }
}

function fnDisplayFundingCFV2() {
    const body = document.getElementById("tBodyAvailFundingCFV2");
    const metaTag = document.getElementById("spnMetaCFV2");
    const rows = JSON.parse(localStorage.getItem(CFV2_STORAGE.rows) || "[]");
    const meta = JSON.parse(localStorage.getItem(CFV2_STORAGE.meta) || "{}");

    if (!Array.isArray(rows) || rows.length === 0) {
        body.innerHTML = '<tr><td colspan="11"><div class="col-sm-12" style="text-align:center; font-weight:bold; font-size:28px;">No Funding Data Available</div></td></tr>';
        metaTag.innerText = "No data loaded";
        return;
    }

    let html = "";
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        html += "<tr>";
        html += `<td style="text-align:left;">Delta<br/>CoinD</td>`;
        html += `<td style="text-align:left;">${safeText(row.SymbolD)}<br/>${safeText(row.SymbolC)}</td>`;
        html += `<td style="text-align:right;">${toNum(row.DVolume, 2)}<br/>${toNum(row.CVolume, 2)}</td>`;
        html += `<td style="text-align:right;">${toNum(row.RateFeqHrD, 3)}<br/>${toNum(row.CRateFeqHr, 3)}</td>`;
        html += `<td style="text-align:right;">${toNum(row.FundDelta, 3)}<br/>${toNum(row.FundCDcx, 3)}</td>`;
        html += `<td style="text-align:right;">${toNum(row.RateDiff, 3)}</td>`;
        html += `<td style="text-align:right;">${toNum(row.RatePD, 3)}</td>`;
        html += `<td style="text-align:center;">${safeText(row.DeltaBS)}<br/>${safeText(row.CDcxBS)}</td>`;
        html += `<td style="text-align:right;">${toRate(row.DRate)}<br/>${toRate(row.CRate)}</td>`;
        html += `<td style="text-align:right;">${toNum(row.MinOdrValC, 2)}</td>`;
        html += `<td style="text-align:center;">${renderTradeButton(row, i)}</td>`;
        html += "</tr>";
    }

    body.innerHTML = html;
    const suffix = `Rows: ${rows.length} | Common: ${meta.totalCommonSymbols || 0} | Missing CoinDCX rates: ${meta.missingCoinDcxRate || 0}`;
    metaTag.innerText = suffix;
    renderPaperOpenPositionsCFV2();
}

function toNum(value, decimals) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    return num.toFixed(CFV2_DISPLAY_DECIMALS);
}

function toRate(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    return num.toFixed(CFV2_DISPLAY_DECIMALS);
}

function renderTradeButton(row, index) {
    if (!shouldShowPaperTrade(row)) return "-";
    return `<button type="button" class="btn btn-sm btn-outline-primary" data-row-index="${index}">Paper Trade</button>`;
}

function shouldShowPaperTrade(row) {
    const dSide = safeText(row.DeltaBS);
    const cSide = safeText(row.CDcxBS);
    const dRate = Number(row.DRate);
    const cRate = Number(row.CRate);

    let buyRate = null;
    let sellRate = null;

    if (dSide === "B" && Number.isFinite(dRate)) buyRate = dRate;
    if (cSide === "B" && Number.isFinite(cRate)) buyRate = cRate;
    if (dSide === "S" && Number.isFinite(dRate)) sellRate = dRate;
    if (cSide === "S" && Number.isFinite(cRate)) sellRate = cRate;

    if (!Number.isFinite(buyRate) || !Number.isFinite(sellRate)) return false;
    return buyRate < sellRate;
}

function safeText(value) {
    if (value === null || value === undefined) return "-";
    return String(value);
}

function showLoadingIcon(show) {
    const loader = document.getElementById("divLoading");
    if (!loader) return;
    loader.style.visibility = show ? "visible" : "hidden";
}

function initFundingAutoRefreshCFV2() {
    const input = document.getElementById("txtAutoRefreshMinCFV2");
    if (!input) return;

    const restart = () => {
        if (gCFV2AutoRefreshTimer) {
            clearInterval(gCFV2AutoRefreshTimer);
            gCFV2AutoRefreshTimer = null;
        }

        const minutes = Number(input.value);
        if (!Number.isFinite(minutes) || minutes < 1) return;
        const intervalMs = Math.max(1, Math.floor(minutes)) * 60000;

        gCFV2AutoRefreshTimer = setInterval(async () => {
            if (gCFV2AutoRefreshBusy) return;
            gCFV2AutoRefreshBusy = true;
            try {
                await fnRefreshFundingDataCFV2();
            } finally {
                gCFV2AutoRefreshBusy = false;
            }
        }, intervalMs);
    };

    input.addEventListener("change", restart);
    input.addEventListener("blur", restart);
    restart();
}

async function runAutoPaperTradesFromScreenerCFV2() {
    if (gCFV2AutoPaperTradeBusy) return;
    const autoTradeOn = sessionStorage.getItem("isAutoTraderCFV2") === "true";
    if (!autoTradeOn) return;

    const tableBody = document.getElementById("tBodyAvailFundingCFV2");
    if (!tableBody) return;
    const buttons = Array.from(tableBody.querySelectorAll("button[data-row-index]"));
    if (buttons.length === 0) return;

    gCFV2AutoPaperTradeBusy = true;
    try {
        for (const btn of buttons) {
            const rowIndex = Number(btn.getAttribute("data-row-index"));
            if (!Number.isInteger(rowIndex)) continue;
            await openPaperTradeFromScreenerRowCFV2(rowIndex);
            await sleepCFV2(300);
        }
    } finally {
        gCFV2AutoPaperTradeBusy = false;
    }
}

function sleepCFV2(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function initPaperTradeHandlersCFV2() {
    const tableBody = document.getElementById("tBodyAvailFundingCFV2");
    if (!tableBody) return;

    tableBody.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-row-index]");
        if (!button) return;

        const rowIndex = Number(button.getAttribute("data-row-index"));
        if (!Number.isInteger(rowIndex)) return;
        openPaperTradeFromScreenerRowCFV2(rowIndex);
    });
}

async function openPaperTradeFromScreenerRowCFV2(rowIndex) {
    const autoTradeOn = sessionStorage.getItem("isAutoTraderCFV2") === "true";
    if (!autoTradeOn) {
        fnGenMessage("Auto Trade is OFF. Turn ON Auto Trade to place Paper Trade.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const rows = JSON.parse(localStorage.getItem(CFV2_STORAGE.rows) || "[]");
    const row = rows[rowIndex];
    if (!row) {
        fnGenMessage("Selected screener row not found.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const paperOpen = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperOpen) || "[]");
    const isDuplicate = paperOpen.some((trade) =>
        trade.symbolD === row.SymbolD &&
        trade.symbolC === row.SymbolC &&
        trade.sideD === row.DeltaBS &&
        trade.sideC === row.CDcxBS
    );
    if (isDuplicate) {
        fnGenMessage(`Duplicate trade blocked for ${safeText(row.SymbolD)} / ${safeText(row.SymbolC)}.`, "badge bg-warning", "spnGenMsg");
        return;
    }

    const latestRates = await fetchLatestRatesForPaperTradeCFV2(row);
    if (latestRates.status !== "success") {
        fnGenMessage(latestRates.message || "Failed to fetch latest rates for paper trade.", `badge bg-${latestRates.status || "warning"}`, "spnGenMsg");
        return;
    }

    const trade = {
        id: `PT-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        openedAt: Date.now(),
        symbolD: row.SymbolD,
        symbolC: row.SymbolC,
        sideD: row.DeltaBS,
        sideC: row.CDcxBS,
        lotSizeD: Number(row.LotSizeD),
        lotSizeC: Number(row.CLotSize),
        qtyStepD: null,
        qtyStepC: Number(row.CQtyStep),
        minQtyD: null,
        minQtyC: Number(row.CQtyMin),
        leverageD: CFV2_LEVERAGE,
        leverageC: CFV2_LEVERAGE,
        orderUsdD: CFV2_ORDER_USD,
        orderUsdC: CFV2_ORDER_USD,
        entryRateD: Number(latestRates.data.DRate),
        entryRateC: Number(latestRates.data.CRate),
        entryFundingD: Number(row.FundDelta),
        entryFundingC: Number(row.FundCDcx),
        entryTBRate: Number(row.RateDiff),
        entryDayRate: Number(row.RatePD),
        entryDHrlyFeq: Number(row.RateFeqHrD),
        entryCHrlyFeq: Number(row.CRateFeqHr),
        nextFundingTsD: null,
        nextFundingTsC: null,
        realizedFundingD: 0,
        realizedFundingC: 0,
        minOrderValueC: Number(row.MinOdrValC),
        feeRateD: Number.isFinite(Number(row.DTakerFee)) ? Number(row.DTakerFee) : CFV2_DEFAULT_DELTA_TAKER_FEE,
        feeRateC: Number.isFinite(Number(row.CTakerFee)) ? Number(row.CTakerFee) : CFV2_DEFAULT_COIND_TAKER_FEE
    };

    const sizing = applyPaperTradeSizingCFV2(trade);
    if (!sizing.ok) {
        fnGenMessage(sizing.message || "Unable to size trade.", "badge bg-warning", "spnGenMsg");
        return;
    }
    trade.qtyD = sizing.qtyD;
    trade.qtyC = sizing.qtyC;
    trade.orderUsdD = sizing.usdD;
    trade.orderUsdC = sizing.usdC;
    trade.sizingMode = sizing.mode;
    trade.capitalReserved = true;

    const reserveResult = reserveVirtualFundsForTradeCFV2(trade);
    if (!reserveResult.ok) {
        fnGenMessage(reserveResult.message || "Insufficient virtual funds to open trade.", "badge bg-warning", "spnGenMsg");
        return;
    }

    paperOpen.push(trade);
    localStorage.setItem(CFV2_STORAGE.paperOpen, JSON.stringify(paperOpen));
    renderPaperOpenPositionsCFV2();
    if (trade.sizingMode === "equal_100") {
        fnGenMessage(
            `Paper trade opened for ${safeText(row.SymbolD)} / ${safeText(row.SymbolC)} near ${toNum(CFV2_TARGET_USD_PER_LEG, 2)} USD each (D: ${toNum(trade.orderUsdD, 2)}, C: ${toNum(trade.orderUsdC, 2)}).`,
            "badge bg-success",
            "spnGenMsg"
        );
    } else {
        fnGenMessage(`Paper trade opened for ${safeText(row.SymbolD)} / ${safeText(row.SymbolC)} at ${CFV2_LEVERAGE}x with ${CFV2_ORDER_USD} USD each.`, "badge bg-success", "spnGenMsg");
    }
}

async function fetchLatestRatesForPaperTradeCFV2(row) {
    const apiKey = sessionStorage.getItem("lsApiKeyCFV2");
    const apiSecret = sessionStorage.getItem("lsSecretCFV2");
    if (!apiKey || !apiSecret) {
        return { status: "warning", message: "Missing Delta credentials for latest rate fetch.", data: {} };
    }

    try {
        const response = await fetch("/execCryptoFundingV2/getLatestTradeRates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ApiKey: apiKey,
                ApiSecret: apiSecret,
                SymbolD: row.SymbolD,
                SymbolC: row.SymbolC,
                DeltaBS: row.DeltaBS,
                CDcxBS: row.CDcxBS
            })
        });
        const result = await response.json();
        return result;
    } catch (error) {
        return { status: "danger", message: "Error while fetching latest trade rates.", data: {} };
    }
}

function renderPaperOpenPositionsCFV2() {
    const tBody = document.getElementById("tBodyPaperOpenPositionsCFV2");
    if (!tBody) return;

    const paperOpen = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperOpen) || "[]");
    const paperClosed = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperClosed) || "[]");
    if (!Array.isArray(paperOpen) || paperOpen.length === 0) {
        tBody.innerHTML = '<tr><td colspan="15" style="text-align:center;">No Paper Trades</td></tr>';
        publishPaperTradeWatchlistCFV2([]);
        renderPaperClosedPositionsCFV2();
        return;
    }

    const liveRowMap = buildLiveRowMapCFV2();
    let html = "";
    let totalCapD = 0;
    let totalCapC = 0;
    let totalBrokerageD = 0;
    let totalBrokerageC = 0;
    let totalNetPnlD = 0;
    let totalNetPnlC = 0;
    let settledFundingDelta = 0;
    let settledFundingCoin = 0;
    let settledFundingCount = 0;
    const stillOpen = [];
    const newlyClosed = [];

    for (const trade of paperOpen) {
        const live = liveRowMap[`${trade.symbolD}|${trade.symbolC}`] || {};
        const wsLiveD = gCFV2LiveDeltaRatesByTradeId[trade.id] || {};
        const wsLiveC = gCFV2LiveCoinRatesByTradeId[trade.id] || {};
        const closeSideD = getOppositeSideCFV2(trade.sideD);
        const closeSideC = getOppositeSideCFV2(trade.sideC);
        const wsCloseRateD = pickRateBySideCFV2(closeSideD, wsLiveD.dBestAsk, wsLiveD.dBestBid);
        const wsCloseRateC = pickRateBySideCFV2(closeSideC, wsLiveC.cBestAsk, wsLiveC.cBestBid);
        const currentRateD = Number.isFinite(Number(wsCloseRateD)) ? Number(wsCloseRateD) : (Number.isFinite(Number(live.DRate)) ? Number(live.DRate) : Number(trade.entryRateD));
        const currentRateC = Number.isFinite(Number(wsCloseRateC)) ? Number(wsCloseRateC) : (Number.isFinite(Number(live.CRate)) ? Number(live.CRate) : Number(trade.entryRateC));
        const wsFundingD = Number(gCFV2LiveDeltaFundingByTradeId[trade.id]);
        const wsFundingC = Number(gCFV2LiveCoinFundingByTradeId[trade.id]);
        const fundingD = Number.isFinite(wsFundingD) ? wsFundingD : (Number.isFinite(Number(live.FundDelta)) ? Number(live.FundDelta) : Number(trade.entryFundingD));
        const fundingC = Number.isFinite(wsFundingC) ? wsFundingC : (Number.isFinite(Number(live.FundCDcx)) ? Number(live.FundCDcx) : Number(trade.entryFundingC));
        const rateFeqHrD = Number.isFinite(Number(trade.entryDHrlyFeq)) ? Number(trade.entryDHrlyFeq) : Number(live.RateFeqHrD);
        const rateFeqHrC = Number.isFinite(Number(trade.entryCHrlyFeq)) ? Number(trade.entryCHrlyFeq) : Number(live.CRateFeqHr);
        const settleResult = applyFundingSettlementIfDueCFV2(trade, {
            fundingD,
            fundingC,
            rateFeqHrD,
            rateFeqHrC,
            currentRateD,
            currentRateC,
            deltaBestAsk: wsLiveD.dBestAsk,
            deltaBestBid: wsLiveD.dBestBid,
            coinBestAsk: wsLiveC.cBestAsk,
            coinBestBid: wsLiveC.cBestBid,
            deltaNextFundingTs: wsLiveD.dNextFundingTs
        });
        if (settleResult.applied) {
            settledFundingDelta += settleResult.deltaAmount;
            settledFundingCoin += settleResult.coinAmount;
            settledFundingCount += settleResult.count;
        }
        const signal = computeFundingSignalCFV2(fundingD, fundingC, rateFeqHrD, rateFeqHrC, trade.sideD, trade.sideC);
        const tbRate = Number.isFinite(signal.tbRate) ? signal.tbRate : Number(trade.entryTBRate);
        const dayRate = Number.isFinite(signal.dayRate) ? signal.dayRate : Number(trade.entryDayRate);
        const tbClass = getDeltaClassCFV2(tbRate, Number(trade.entryTBRate));
        const dayClass = getDeltaClassCFV2(dayRate, Number(trade.entryDayRate));
        const pnlD = computeLegPnlCFV2(trade.sideD, trade.entryRateD, currentRateD, trade.qtyD);
        const pnlC = computeLegPnlCFV2(trade.sideC, trade.entryRateC, currentRateC, trade.qtyC);
        const feeRateD = Number.isFinite(Number(trade.feeRateD)) ? Number(trade.feeRateD) : CFV2_DEFAULT_DELTA_TAKER_FEE;
        const feeRateC = Number.isFinite(Number(trade.feeRateC)) ? Number(trade.feeRateC) : CFV2_DEFAULT_COIND_TAKER_FEE;
        const entryNotionalD = Number(trade.qtyD) * Number(trade.entryRateD) * normalizePositiveCFV2(trade.lotSizeD, 1);
        const currentNotionalD = Number(trade.qtyD) * Number(currentRateD) * normalizePositiveCFV2(trade.lotSizeD, 1);
        const entryNotionalC = Number(trade.qtyC) * Number(trade.entryRateC) * normalizePositiveCFV2(trade.lotSizeC, 1);
        const currentNotionalC = Number(trade.qtyC) * Number(currentRateC) * normalizePositiveCFV2(trade.lotSizeC, 1);
        const fundingEventD = computeFundingEventCFV2(trade.sideD, fundingD, currentNotionalD);
        const fundingEventC = computeFundingEventCFV2(trade.sideC, fundingC, currentNotionalC);
        const brokerageD = computeBrokerageCFV2(entryNotionalD, currentNotionalD, feeRateD);
        const brokerageC = computeBrokerageCFV2(entryNotionalC, currentNotionalC, feeRateC);
        const netPnlD = pnlD - brokerageD;
        const netPnlC = pnlC - brokerageC;
        const pnlTotal = netPnlD + netPnlC;
        const capD = Number.isFinite(Number(trade.orderUsdD)) ? Number(trade.orderUsdD) : 0;
        const capC = Number.isFinite(Number(trade.orderUsdC)) ? Number(trade.orderUsdC) : 0;
        const closeEval = evaluateAutoCloseTradeCFV2(trade, currentRateD, currentRateC, dayRate);

        if (closeEval.shouldClose) {
            const closedTrade = {
                ...trade,
                closedAt: Date.now(),
                closeRateD: currentRateD,
                closeRateC: currentRateC,
                closeFundingD: fundingD,
                closeFundingC: fundingC,
                closeTBRate: tbRate,
                closeDayRate: dayRate,
                closeReason: closeEval.reason,
                realizedFundingD: Number(trade.realizedFundingD || 0),
                realizedFundingC: Number(trade.realizedFundingC || 0),
                brokerageD,
                brokerageC,
                pnlD: netPnlD,
                pnlC: netPnlC,
                pnlTotal
            };
            paperClosed.push(closedTrade);
            newlyClosed.push(closedTrade);
            continue;
        }

        stillOpen.push(trade);
        totalCapD += capD;
        totalCapC += capC;
        totalBrokerageD += brokerageD;
        totalBrokerageC += brokerageC;
        totalNetPnlD += netPnlD;
        totalNetPnlC += netPnlC;

        html += "<tr>";
        html += "<td style=\"text-align:left;\">Delta<br/>CoinD</td>";
        html += `<td style="text-align:left;">${safeText(trade.symbolD)}<br/>${safeText(trade.symbolC)}</td>`;
        html += `<td style="text-align:right;">${toNum(fundingD, 3)}%<br/>${toNum(fundingC, 3)}%</td>`;
        html += `<td style="text-align:right;">$${toNum(fundingEventD, 3)}<br/>$${toNum(fundingEventC, 3)}<br/><span style="color:#0d6efd; font-weight:700;">$${toNum(fundingEventD + fundingEventC, 3)}</span></td>`;
        const intD = Number.isFinite(Number(rateFeqHrD)) && Number(rateFeqHrD) > 0 ? Math.round(Number(rateFeqHrD) * 3600000) : 0;
        const intC = Number.isFinite(Number(rateFeqHrC)) && Number(rateFeqHrC) > 0 ? Math.round(Number(rateFeqHrC) * 3600000) : 0;
        html += `<td style="text-align:right;" class="cfv2-next-funding-cell" data-next-d="${toAttrTsCFV2(trade.nextFundingTsD)}" data-next-c="${toAttrTsCFV2(trade.nextFundingTsC)}" data-int-d="${intD}" data-int-c="${intC}"><span class="cfv2-next-d">${formatNextFundingCountdownCFV2(trade.nextFundingTsD)}</span><br/><span class="cfv2-next-c">${formatNextFundingCountdownCFV2(trade.nextFundingTsC)}</span></td>`;
        html += `<td style="text-align:right;" class="${tbClass}">${toNum(tbRate, 3)}</td>`;
        html += `<td style="text-align:right;" class="${dayClass}">${toNum(dayRate, 3)}</td>`;
        html += `<td style="text-align:center;">${safeText(trade.sideD)}<br/>${safeText(trade.sideC)}</td>`;
        html += `<td style="text-align:right;">${toNum(trade.lotSizeD, 3)}<br/>${toNum(trade.lotSizeC, 3)}</td>`;
        html += `<td style="text-align:right;">${toNum(trade.qtyD, 6)}<br/>${toNum(trade.qtyC, 6)}</td>`;
        html += `<td style="text-align:right;">${toRate(trade.entryRateD)}<br/>${toRate(trade.entryRateC)}</td>`;
        html += `<td style="text-align:right;" class="cfv2-live-blink">${toRate(currentRateD)}<br/>${toRate(currentRateC)}</td>`;
        html += `<td style="text-align:right;">${toNum(capD, 2)}<br/>${toNum(capC, 2)}<br/><span style="color:#0d6efd; font-weight:700;">${toNum(capD + capC, 2)}</span></td>`;
        html += `<td style="text-align:right;">${toNum(brokerageD, 6)}<br/>${toNum(brokerageC, 6)}<br/><span style="color:#0d6efd; font-weight:700;">${toNum(brokerageD + brokerageC, 6)}</span></td>`;
        html += `<td style="text-align:right;">${toNum(netPnlD, 6)}<br/>${toNum(netPnlC, 6)}<br/><span style="color:#0d6efd; font-weight:700;">${toNum(pnlTotal, 6)}</span></td>`;
        html += "</tr>";
    }

    localStorage.setItem(CFV2_STORAGE.paperOpen, JSON.stringify(stillOpen));
    localStorage.setItem(CFV2_STORAGE.paperClosed, JSON.stringify(paperClosed));
    if (settledFundingCount > 0) {
        applyFundingCashflowToVirtualFundsCFV2(settledFundingDelta, settledFundingCoin);
    }
    if (newlyClosed.length > 0) {
        applyClosedTradesToVirtualFundsCFV2(newlyClosed);
    }

    if (stillOpen.length === 0) {
        tBody.innerHTML = '<tr><td colspan="15" style="text-align:center;">No Paper Trades</td></tr>';
    } else {
        html += "<tr>";
        html += "<td colspan=\"12\" style=\"text-align:right; font-weight:700;\">Totals</td>";
        html += `<td style="text-align:right; font-weight:700;">${toNum(totalCapD + totalCapC, 3)}</td>`;
        html += `<td style="text-align:right; font-weight:700;">${toNum(totalBrokerageD + totalBrokerageC, 3)}</td>`;
        html += `<td style="text-align:right; font-weight:700;">${toNum(totalNetPnlD + totalNetPnlC, 3)}</td>`;
        html += "</tr>";
        tBody.innerHTML = html;
    }
    refreshFundingCountdownCellsCFV2();
    publishPaperTradeWatchlistCFV2(stillOpen);
    renderPaperClosedPositionsCFV2();

    if (newlyClosed.length > 0) {
        fnGenMessage(`${newlyClosed.length} paper trade(s) moved to Closed Positions.`, "badge bg-warning", "spnGenMsg");
    } else if (settledFundingCount > 0) {
        fnGenMessage(
            `Funding settled on ${settledFundingCount} leg(s). D: ${toNum(settledFundingDelta, 3)}, C: ${toNum(settledFundingCoin, 3)}.`,
            "badge bg-info",
            "spnGenMsg"
        );
    }
}

function buildLiveRowMapCFV2() {
    const rows = JSON.parse(localStorage.getItem(CFV2_STORAGE.rows) || "[]");
    const map = {};
    if (!Array.isArray(rows)) return map;
    for (const row of rows) {
        if (!row || !row.SymbolD || !row.SymbolC) continue;
        map[`${row.SymbolD}|${row.SymbolC}`] = row;
    }
    return map;
}

function computeLegPnlCFV2(side, entry, current, qty) {
    const e = Number(entry);
    const c = Number(current);
    const q = Number(qty);
    if (!Number.isFinite(e) || !Number.isFinite(c) || !Number.isFinite(q)) return 0;
    if (side === "B") return (c - e) * q;
    if (side === "S") return (e - c) * q;
    return 0;
}

function computeBrokerageCFV2(entryNotional, currentNotional, feeRate) {
    const e = Math.abs(Number(entryNotional));
    const c = Math.abs(Number(currentNotional));
    const f = Number(feeRate);
    if (!Number.isFinite(e) || !Number.isFinite(c) || !Number.isFinite(f) || f < 0) return 0;
    return (e + c) * f;
}

function computeFundingEventCFV2(side, fundingRatePercent, currentNotional) {
    const s = safeText(side);
    const rPct = Number(fundingRatePercent);
    const notional = Math.abs(Number(currentNotional));
    if (!Number.isFinite(rPct) || !Number.isFinite(notional)) return 0;
    const rDec = rPct / 100;
    if (s === "B") return -1 * notional * rDec;
    if (s === "S") return notional * rDec;
    return 0;
}

function applyFundingSettlementIfDueCFV2(trade, ctx) {
    const now = Date.now();
    const freqD = Number(ctx.rateFeqHrD);
    const freqC = Number(ctx.rateFeqHrC);
    const intervalD = Number.isFinite(freqD) && freqD > 0 ? Math.round(freqD * 3600000) : null;
    const intervalC = Number.isFinite(freqC) && freqC > 0 ? Math.round(freqC * 3600000) : null;
    const lastSettledD = Number(trade.lastFundingTsD);
    const lastSettledC = Number(trade.lastFundingTsC);

    let nextD = Number(trade.nextFundingTsD);
    const wsNextD = Number(ctx.deltaNextFundingTs);
    if (Number.isFinite(wsNextD) && wsNextD > 0) {
        const isAlreadySettled = Number.isFinite(lastSettledD) && wsNextD <= (lastSettledD + 1000);
        const isReasonableTime = wsNextD > (now - 60000); // tolerate slight clock drift/network lag
        if (!isAlreadySettled && isReasonableTime) {
            nextD = wsNextD;
        }
    }
    if (!Number.isFinite(nextD) && Number.isFinite(intervalD)) {
        if (Number.isFinite(lastSettledD) && lastSettledD > 0) {
            nextD = lastSettledD + intervalD;
        } else {
            nextD = computeNextFundingBoundaryTsCFV2(now, intervalD);
        }
    }

    let nextC = Number(trade.nextFundingTsC);
    if (!Number.isFinite(nextC) && Number.isFinite(intervalC)) {
        if (Number.isFinite(lastSettledC) && lastSettledC > 0) {
            nextC = lastSettledC + intervalC;
        } else {
            nextC = computeNextFundingBoundaryTsCFV2(now, intervalC);
        }
    }

    let deltaAmount = 0;
    let coinAmount = 0;
    let count = 0;

    const lotD = normalizePositiveCFV2(trade.lotSizeD, 1);
    const lotC = normalizePositiveCFV2(trade.lotSizeC, 1);
    const qtyD = Number(trade.qtyD);
    const qtyC = Number(trade.qtyC);
    const pxD = resolveFundingPriceCFV2(ctx.deltaBestAsk, ctx.deltaBestBid, ctx.currentRateD);
    const pxC = resolveFundingPriceCFV2(ctx.coinBestAsk, ctx.coinBestBid, ctx.currentRateC);
    const notionalD = Math.abs(qtyD * pxD * lotD);
    const notionalC = Math.abs(qtyC * pxC * lotC);

    let guard = 0;
    while (Number.isFinite(nextD) && Number.isFinite(intervalD) && intervalD > 0 && now >= nextD && guard < 8) {
        const evtD = computeFundingEventCFV2(trade.sideD, ctx.fundingD, notionalD);
        if (Number.isFinite(evtD)) {
            deltaAmount += evtD;
            trade.realizedFundingD = Number(trade.realizedFundingD || 0) + evtD;
            trade.lastFundingTsD = nextD;
            count += 1;
        }
        nextD += intervalD;
        guard += 1;
    }

    guard = 0;
    while (Number.isFinite(nextC) && Number.isFinite(intervalC) && intervalC > 0 && now >= nextC && guard < 8) {
        const evtC = computeFundingEventCFV2(trade.sideC, ctx.fundingC, notionalC);
        if (Number.isFinite(evtC)) {
            coinAmount += evtC;
            trade.realizedFundingC = Number(trade.realizedFundingC || 0) + evtC;
            trade.lastFundingTsC = nextC;
            count += 1;
        }
        nextC += intervalC;
        guard += 1;
    }

    if (Number.isFinite(nextD)) trade.nextFundingTsD = nextD;
    if (Number.isFinite(nextC)) trade.nextFundingTsC = nextC;

    return {
        applied: count > 0,
        deltaAmount,
        coinAmount,
        count
    };
}

function resolveFundingPriceCFV2(bestAsk, bestBid, fallbackRate) {
    const ask = Number(bestAsk);
    const bid = Number(bestBid);
    if (Number.isFinite(ask) && Number.isFinite(bid) && ask > 0 && bid > 0) return (ask + bid) / 2;
    const fb = Number(fallbackRate);
    return Number.isFinite(fb) && fb > 0 ? fb : 0;
}

function computeNextFundingBoundaryTsCFV2(nowMs, intervalMs) {
    const now = Number(nowMs);
    const intv = Number(intervalMs);
    if (!Number.isFinite(now) || !Number.isFinite(intv) || intv <= 0) return null;
    return Math.ceil(now / intv) * intv;
}

function formatNextFundingCountdownCFV2(nextTsMs) {
    const ts = Number(nextTsMs);
    if (!Number.isFinite(ts) || ts <= 0) return "-";
    const diff = ts - Date.now();
    if (diff <= 0) return "Due";
    const totalSec = Math.floor(diff / 1000);
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}

function toAttrTsCFV2(value) {
    const ts = Number(value);
    return Number.isFinite(ts) && ts > 0 ? String(Math.floor(ts)) : "";
}

function refreshFundingCountdownCellsCFV2() {
    const cells = document.querySelectorAll("#tBodyPaperOpenPositionsCFV2 .cfv2-next-funding-cell");
    if (!cells || cells.length === 0) return;
    const now = Date.now();
    for (const cell of cells) {
        let dTs = Number(cell.getAttribute("data-next-d"));
        let cTs = Number(cell.getAttribute("data-next-c"));
        const intD = Number(cell.getAttribute("data-int-d"));
        const intC = Number(cell.getAttribute("data-int-c"));

        if (Number.isFinite(dTs) && dTs > 0 && Number.isFinite(intD) && intD > 0 && dTs <= now) {
            const k = Math.floor((now - dTs) / intD) + 1;
            dTs = dTs + (k * intD);
            cell.setAttribute("data-next-d", String(Math.floor(dTs)));
        }
        if (Number.isFinite(cTs) && cTs > 0 && Number.isFinite(intC) && intC > 0 && cTs <= now) {
            const k = Math.floor((now - cTs) / intC) + 1;
            cTs = cTs + (k * intC);
            cell.setAttribute("data-next-c", String(Math.floor(cTs)));
        }

        const dEl = cell.querySelector(".cfv2-next-d");
        const cEl = cell.querySelector(".cfv2-next-c");
        if (dEl) dEl.textContent = formatNextFundingCountdownCFV2(dTs);
        if (cEl) cEl.textContent = formatNextFundingCountdownCFV2(cTs);
    }
}

function initFundingCountdownTimerCFV2() {
    if (gCFV2CountdownTimer) clearInterval(gCFV2CountdownTimer);
    gCFV2CountdownTimer = setInterval(refreshFundingCountdownCellsCFV2, 1000);
}

function fnClearOpenPaperTradesCFV2() {
    const openTrades = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperOpen) || "[]");
    refundVirtualFundsForOpenTradesCFV2(openTrades);
    localStorage.removeItem(CFV2_STORAGE.paperOpen);
    gCFV2LiveDeltaRatesByTradeId = {};
    gCFV2LiveCoinRatesByTradeId = {};
    gCFV2LiveDeltaFundingByTradeId = {};
    gCFV2LiveCoinFundingByTradeId = {};
    renderPaperOpenPositionsCFV2();
    renderVirtualFundsCFV2();
    fnGenMessage("Open paper trades cleared from memory.", "badge bg-warning", "spnGenMsg");
}

function renderPaperClosedPositionsCFV2() {
    const tBody = document.getElementById("tBodyPaperClosedPositionsCFV2");
    if (!tBody) return;

    const paperClosed = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperClosed) || "[]");
    if (!Array.isArray(paperClosed) || paperClosed.length === 0) {
        tBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No Closed Paper Trades</td></tr>';
        return;
    }

    let html = "";
    for (const trade of paperClosed) {
        const brokerageD = Number.isFinite(Number(trade.brokerageD)) ? Number(trade.brokerageD) : 0;
        const brokerageC = Number.isFinite(Number(trade.brokerageC)) ? Number(trade.brokerageC) : 0;
        html += "<tr>";
        html += "<td style=\"text-align:left;\">Delta<br/>CoinD</td>";
        html += `<td style="text-align:left;">${safeText(trade.symbolD)}<br/>${safeText(trade.symbolC)}</td>`;
        html += `<td style="text-align:center;">${safeText(trade.sideD)}<br/>${safeText(trade.sideC)}</td>`;
        html += `<td style="text-align:right;">${toNum(trade.qtyD, 6)}<br/>${toNum(trade.qtyC, 6)}</td>`;
        html += `<td style="text-align:right;">${toRate(trade.entryRateD)}<br/>${toRate(trade.entryRateC)}</td>`;
        html += `<td style="text-align:right;">${toRate(trade.closeRateD)}<br/>${toRate(trade.closeRateC)}</td>`;
        html += `<td style="text-align:right;">D: ${toNum(brokerageD, 6)}<br/>C: ${toNum(brokerageC, 6)}<br/><span style="color:#0d6efd; font-weight:700;">${toNum(brokerageD + brokerageC, 6)}</span></td>`;
        html += `<td style="text-align:right;">D: ${toNum(trade.pnlD, 6)}<br/>C: ${toNum(trade.pnlC, 6)}<br/><span style="color:#0d6efd; font-weight:700;">${toNum(trade.pnlTotal, 6)}</span><br/>${safeText(trade.closeReason)}</td>`;
        html += "</tr>";
    }
    tBody.innerHTML = html;
}

function initPaperTradeRatesSocketCFV2() {
    if (typeof io === "undefined") return;
    gCFV2Socket = io();
    gCFV2Socket.on("CFV2_DeltaRatesUpdate", (objMsg) => {
        if (objMsg?.status !== "success" || !Array.isArray(objMsg.data)) return;
        for (const upd of objMsg.data) {
            if (!upd?.id) continue;
            gCFV2LiveDeltaRatesByTradeId[upd.id] = {
                dRate: Number.isFinite(Number(upd.dRate)) ? Number(upd.dRate) : null,
                dBestAsk: Number.isFinite(Number(upd.dBestAsk)) ? Number(upd.dBestAsk) : null,
                dBestBid: Number.isFinite(Number(upd.dBestBid)) ? Number(upd.dBestBid) : null,
                dNextFundingTs: Number.isFinite(Number(upd.dNextFundingTs)) ? Number(upd.dNextFundingTs) : null
            };
            gCFV2LiveDeltaFundingByTradeId[upd.id] = Number.isFinite(Number(upd.dFunding)) ? Number(upd.dFunding) : null;
        }
        renderPaperOpenPositionsCFV2();
    });

    gCFV2Socket.on("CFV2_CoinRatesUpdate", (objMsg) => {
        if (objMsg?.status !== "success" || !Array.isArray(objMsg.data)) return;
        for (const upd of objMsg.data) {
            if (!upd?.id) continue;
            gCFV2LiveCoinRatesByTradeId[upd.id] = {
                cRate: Number.isFinite(Number(upd.cRate)) ? Number(upd.cRate) : null,
                cBestAsk: Number.isFinite(Number(upd.cBestAsk)) ? Number(upd.cBestAsk) : null,
                cBestBid: Number.isFinite(Number(upd.cBestBid)) ? Number(upd.cBestBid) : null
            };
            gCFV2LiveCoinFundingByTradeId[upd.id] = Number.isFinite(Number(upd.cFunding)) ? Number(upd.cFunding) : null;
        }
        renderPaperOpenPositionsCFV2();
    });
}

function publishPaperTradeWatchlistCFV2(paperOpen) {
    if (!gCFV2Socket || typeof gCFV2Socket.emit !== "function") return;
    const trades = Array.isArray(paperOpen) ? paperOpen.map((x) => ({
        id: x.id,
        symbolD: x.symbolD,
        symbolC: x.symbolC,
        sideD: x.sideD,
        sideC: x.sideC
    })) : [];
    const nextHash = JSON.stringify(trades);
    if (nextHash === gCFV2WatchHash) return;
    gCFV2WatchHash = nextHash;
    gCFV2Socket.emit("CFV2_WatchPaperTrades", { trades });
}

function computeFundingSignalCFV2(fundingD, fundingC, rateFeqHrD, rateFeqHrC, sideD, sideC) {
    const d = Number(fundingD);
    const c = Number(fundingC);
    const freqD = Number(rateFeqHrD);
    const freqC = Number(rateFeqHrC);
    if (!Number.isFinite(d) || !Number.isFinite(c)) return { tbRate: null, dayRate: null };

    const legD = computeSignedFundingRateCFV2(sideD, d);
    const legC = computeSignedFundingRateCFV2(sideC, c);
    if (!Number.isFinite(legD) || !Number.isFinite(legC)) return { tbRate: null, dayRate: null };

    const tbRate = Number.isFinite(freqD) && freqD > 0 && Number.isFinite(freqC) && freqC > 0
        ? Math.abs((legD / freqD) + (legC / freqC))
        : null;
    const dayRate = Number.isFinite(tbRate) ? tbRate * 24 : null;
    return { tbRate, dayRate };
}

function computeSignedFundingRateCFV2(side, fundingRate) {
    const s = safeText(side);
    const r = Number(fundingRate);
    if (!Number.isFinite(r)) return null;
    if (s === "B") return -r;
    if (s === "S") return r;
    return null;
}

function evaluateAutoCloseTradeCFV2(trade, currentRateD, currentRateC, dayRate) {
    const closeThreshold = 0.2;
    if (Number.isFinite(Number(dayRate)) && Number(dayRate) < closeThreshold) {
        if (!Number.isFinite(Number(currentRateD)) || !Number.isFinite(Number(currentRateC))) {
            return { shouldClose: false, reason: "" };
        }
        return { shouldClose: true, reason: `Day-Rate below threshold (${closeThreshold})` };
    }

    return { shouldClose: false, reason: "" };
}

function getOppositeSideCFV2(side) {
    if (side === "B") return "S";
    if (side === "S") return "B";
    return null;
}

function pickRateBySideCFV2(side, bestAsk, bestBid) {
    const ask = Number(bestAsk);
    const bid = Number(bestBid);
    if (side === "B") return Number.isFinite(ask) ? ask : null;
    if (side === "S") return Number.isFinite(bid) ? bid : null;
    return null;
}

function getDeltaClassCFV2(current, entry) {
    const c = Number(current);
    const e = Number(entry);
    if (!Number.isFinite(c) || !Number.isFinite(e)) return "";
    if (c > e) return "text-success fw-bold";
    if (c < e) return "text-danger fw-bold";
    return "text-muted";
}

function computeOrderQtyCFV2(orderUsd, leverage, entryRate, lotSize, qtyStep, minQty) {
    const usd = Number(orderUsd);
    const lev = Number(leverage);
    const rate = Number(entryRate);
    const lot = Number(lotSize);
    if (!Number.isFinite(usd) || !Number.isFinite(lev) || !Number.isFinite(rate) || rate <= 0) return 0;

    const effectiveNotional = usd * lev;
    const lotUnit = Number.isFinite(lot) && lot > 0 ? lot : 1;
    let qty = effectiveNotional / (rate * lotUnit);
    if (!Number.isFinite(qty) || qty <= 0) return 0;

    const step = Number(qtyStep);
    if (Number.isFinite(step) && step > 0) {
        qty = Math.floor(qty / step) * step;
    }

    const minQ = Number(minQty);
    if (Number.isFinite(minQ) && minQ > 0 && qty < minQ) {
        qty = minQ;
    }

    return Number(qty.toFixed(6));
}

function applyPaperTradeSizingCFV2(trade) {
    if (!CFV2_USE_EQUAL_USD_SIZING) {
        const qtyD = computeOrderQtyCFV2(trade.orderUsdD, trade.leverageD, trade.entryRateD, trade.lotSizeD, trade.qtyStepD, trade.minQtyD);
        const qtyC = computeOrderQtyCFV2(trade.orderUsdC, trade.leverageC, trade.entryRateC, trade.lotSizeC, trade.qtyStepC, trade.minQtyC);
        return {
            ok: qtyD > 0 && qtyC > 0,
            qtyD,
            qtyC,
            usdD: trade.orderUsdD * trade.leverageD,
            usdC: trade.orderUsdC * trade.leverageC,
            mode: "legacy",
            message: "Legacy sizing failed with computed zero quantity."
        };
    }

    const rateD = Number(trade.entryRateD);
    const rateC = Number(trade.entryRateC);
    const lotD = normalizePositiveCFV2(trade.lotSizeD, 1);
    const lotC = normalizePositiveCFV2(trade.lotSizeC, 1);
    const minNotionalC = normalizePositiveCFV2(trade.minOrderValueC, 0);
    const minQtyC = normalizePositiveCFV2(trade.minQtyC, 0);
    const stepC = normalizePositiveCFV2(trade.qtyStepC, 0);

    if (!Number.isFinite(rateD) || rateD <= 0 || !Number.isFinite(rateC) || rateC <= 0) {
        return { ok: false, message: "Invalid live rates for sizing.", mode: "equal_100" };
    }

    // 1) Size Delta close to target USD.
    let qtyD = CFV2_TARGET_USD_PER_LEG / (rateD * lotD);
    qtyD = roundDownCFV2(qtyD, 6);
    if (!Number.isFinite(qtyD) || qtyD <= 0) {
        return { ok: false, message: "Delta quantity became zero for target USD.", mode: "equal_100" };
    }
    const usdD = qtyD * rateD * lotD;

    // 2) Size CoinD close to same target USD, honoring Coin constraints.
    let qtyC = CFV2_TARGET_USD_PER_LEG / (rateC * lotC);
    qtyC = applyCoinQtyConstraintsCFV2(qtyC, stepC, minQtyC, false);
    let usdC = qtyC * rateC * lotC;

    // 3) Ensure CoinD min notional criterion.
    if (minNotionalC > 0 && usdC < minNotionalC) {
        const reqQtyByNotional = minNotionalC / (rateC * lotC);
        qtyC = applyCoinQtyConstraintsCFV2(reqQtyByNotional, stepC, minQtyC, true);
        usdC = qtyC * rateC * lotC;
    }

    if (!Number.isFinite(qtyC) || qtyC <= 0) {
        return { ok: false, message: "CoinD quantity became zero after constraints.", mode: "equal_100" };
    }

    return {
        ok: true,
        qtyD: roundDownCFV2(qtyD, 6),
        qtyC: roundDownCFV2(qtyC, 6),
        usdD: roundDownCFV2(usdD, 6),
        usdC: roundDownCFV2(usdC, 6),
        mode: "equal_100"
    };
}

function normalizePositiveCFV2(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return n;
}

function roundDownCFV2(value, decimals) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.floor(num * factor) / factor;
}

function roundUpToStepCFV2(value, step) {
    const v = Number(value);
    const s = Number(step);
    if (!Number.isFinite(v) || !Number.isFinite(s) || s <= 0) return v;
    return Math.ceil(v / s) * s;
}

function applyCoinQtyConstraintsCFV2(rawQty, step, minQty, isRoundUp) {
    let qty = Number(rawQty);
    if (!Number.isFinite(qty) || qty <= 0) return 0;

    const s = Number(step);
    if (Number.isFinite(s) && s > 0) {
        qty = isRoundUp ? roundUpToStepCFV2(qty, s) : Math.floor(qty / s) * s;
    }

    const minQ = Number(minQty);
    if (Number.isFinite(minQ) && minQ > 0 && qty < minQ) {
        qty = isRoundUp ? roundUpToStepCFV2(minQ, s) : minQ;
    }

    return roundDownCFV2(qty, 6);
}

function ensureVirtualFundsCFV2() {
    const existing = JSON.parse(localStorage.getItem(CFV2_STORAGE.virtualFunds) || "null");
    if (existing && Number.isFinite(Number(existing.delta)) && Number.isFinite(Number(existing.coin))) return;
    const initial = { delta: CFV2_INITIAL_VIRTUAL_FUND, coin: CFV2_INITIAL_VIRTUAL_FUND };
    localStorage.setItem(CFV2_STORAGE.virtualFunds, JSON.stringify(initial));
}

function fnResetVirtualFundsCFV2() {
    const openTrades = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperOpen) || "[]");
    if (Array.isArray(openTrades) && openTrades.length > 0) {
        fnGenMessage("Clear open paper trades before resetting virtual funds.", "badge bg-warning", "spnGenMsg");
        return;
    }
    localStorage.removeItem(CFV2_STORAGE.paperClosed);
    localStorage.setItem(CFV2_STORAGE.virtualFunds, JSON.stringify({ delta: CFV2_INITIAL_VIRTUAL_FUND, coin: CFV2_INITIAL_VIRTUAL_FUND }));
    renderVirtualFundsCFV2();
    fnGenMessage("Virtual funds reset to 10000 for Delta and CoinD (closed paper history cleared).", "badge bg-success", "spnGenMsg");
}

function renderVirtualFundsCFV2() {
    const snapshot = reconcileVirtualFundsCFV2();
    const availableDelta = Number(snapshot.availableDelta);
    const availableCoin = Number(snapshot.availableCoin);
    const deployedDelta = Number(snapshot.deployedDelta);
    const deployedCoin = Number(snapshot.deployedCoin);
    const deltaEl = document.getElementById("spnVirtFundDeltaCFV2");
    const coinEl = document.getElementById("spnVirtFundCoinCFV2");
    if (deltaEl) deltaEl.innerText = `Delta Avl: ${toNum(availableDelta, 3)} | Dep: ${toNum(deployedDelta, 3)}`;
    if (coinEl) coinEl.innerText = `CoinD Avl: ${toNum(availableCoin, 3)} | Dep: ${toNum(deployedCoin, 3)}`;
}

function computeDeployedCapitalCFV2() {
    const openTrades = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperOpen) || "[]");
    let delta = 0;
    let coin = 0;
    if (!Array.isArray(openTrades)) return { delta, coin };

    for (const trade of openTrades) {
        if (trade?.capitalReserved === false) continue;
        const capD = Number(trade?.orderUsdD);
        const capC = Number(trade?.orderUsdC);
        if (Number.isFinite(capD) && capD > 0) delta += capD;
        if (Number.isFinite(capC) && capC > 0) coin += capC;
    }

    return { delta, coin };
}

function reconcileVirtualFundsCFV2() {
    const openTrades = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperOpen) || "[]");
    const closedTrades = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperClosed) || "[]");

    let deployedDelta = 0;
    let deployedCoin = 0;
    let closedPnlDelta = 0;
    let closedPnlCoin = 0;
    let realizedFundingDelta = 0;
    let realizedFundingCoin = 0;

    for (const trade of (Array.isArray(openTrades) ? openTrades : [])) {
        if (trade?.capitalReserved !== false) {
            const capD = Number(trade.orderUsdD);
            const capC = Number(trade.orderUsdC);
            if (Number.isFinite(capD) && capD > 0) deployedDelta += capD;
            if (Number.isFinite(capC) && capC > 0) deployedCoin += capC;
        }
        const rfD = Number(trade.realizedFundingD);
        const rfC = Number(trade.realizedFundingC);
        if (Number.isFinite(rfD)) realizedFundingDelta += rfD;
        if (Number.isFinite(rfC)) realizedFundingCoin += rfC;
    }

    for (const trade of (Array.isArray(closedTrades) ? closedTrades : [])) {
        const pnlD = Number(trade.pnlD);
        const pnlC = Number(trade.pnlC);
        const rfD = Number(trade.realizedFundingD);
        const rfC = Number(trade.realizedFundingC);
        if (Number.isFinite(pnlD)) closedPnlDelta += pnlD;
        if (Number.isFinite(pnlC)) closedPnlCoin += pnlC;
        if (Number.isFinite(rfD)) realizedFundingDelta += rfD;
        if (Number.isFinite(rfC)) realizedFundingCoin += rfC;
    }

    const availableDelta = CFV2_INITIAL_VIRTUAL_FUND + closedPnlDelta + realizedFundingDelta - deployedDelta;
    const availableCoin = CFV2_INITIAL_VIRTUAL_FUND + closedPnlCoin + realizedFundingCoin - deployedCoin;

    localStorage.setItem(CFV2_STORAGE.virtualFunds, JSON.stringify({ delta: availableDelta, coin: availableCoin }));
    return { availableDelta, availableCoin, deployedDelta, deployedCoin };
}

function applyClosedTradesToVirtualFundsCFV2(closedTrades) {
    // Funds are derived deterministically in reconcileVirtualFundsCFV2.
    // Keep this hook as a UI refresh point after open->closed state changes.
    renderVirtualFundsCFV2();
}

function applyFundingCashflowToVirtualFundsCFV2(deltaAmount, coinAmount) {
    // Funding cashflow is tracked on trades (realizedFundingD/C) and included in reconciliation.
    // Keep this hook as a UI refresh point.
    renderVirtualFundsCFV2();
}

function reserveVirtualFundsForTradeCFV2(trade) {
    const snap = reconcileVirtualFundsCFV2();
    const funds = { delta: snap.availableDelta, coin: snap.availableCoin };
    let delta = Number(funds.delta);
    let coin = Number(funds.coin);
    if (!Number.isFinite(delta)) delta = CFV2_INITIAL_VIRTUAL_FUND;
    if (!Number.isFinite(coin)) coin = CFV2_INITIAL_VIRTUAL_FUND;

    const capD = Number(trade?.orderUsdD);
    const capC = Number(trade?.orderUsdC);
    const reqD = Number.isFinite(capD) && capD > 0 ? capD : 0;
    const reqC = Number.isFinite(capC) && capC > 0 ? capC : 0;

    if (delta < reqD || coin < reqC) {
        return {
            ok: false,
            message: `Insufficient virtual funds. Need D:${toNum(reqD, 3)} C:${toNum(reqC, 3)} | Available D:${toNum(delta, 3)} C:${toNum(coin, 3)}`
        };
    }

    // No direct mutation here. Actual reserve effect appears once trade is persisted in paperOpen
    // and reflected by reconcileVirtualFundsCFV2().
    return { ok: true };
}

function refundVirtualFundsForOpenTradesCFV2(openTrades) {
    // No direct mutation needed. After open trades are cleared, reconciliation updates Avl/Dep.
}

function migrateOpenTradesLotSizeCFV2() {
    const openTrades = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperOpen) || "[]");
    if (!Array.isArray(openTrades) || openTrades.length === 0) return;

    const rows = JSON.parse(localStorage.getItem(CFV2_STORAGE.rows) || "[]");
    const rowMap = {};
    if (Array.isArray(rows)) {
        for (const row of rows) {
            if (!row?.SymbolD || !row?.SymbolC) continue;
            rowMap[`${row.SymbolD}|${row.SymbolC}`] = row;
        }
    }

    let changed = false;
    for (const trade of openTrades) {
        const key = `${trade.symbolD}|${trade.symbolC}`;
        const row = rowMap[key];
        const fixedLot = Number(row?.CLotSize);
        const fixedStep = Number(row?.CQtyStep);
        const fixedMinQty = Number(row?.CQtyMin);
        const currentLot = Number(trade.lotSizeC);

        if (Number.isFinite(fixedLot)) {
            if (!Number.isFinite(currentLot) || Math.abs(currentLot - fixedLot) > 1e-12) {
                trade.lotSizeC = fixedLot;
                changed = true;
            }
        }

        if (Number.isFinite(fixedStep)) {
            if (!Number.isFinite(Number(trade.qtyStepC)) || Math.abs(Number(trade.qtyStepC) - fixedStep) > 1e-12) {
                trade.qtyStepC = fixedStep;
                changed = true;
            }
        }

        if (Number.isFinite(fixedMinQty)) {
            if (!Number.isFinite(Number(trade.minQtyC)) || Math.abs(Number(trade.minQtyC) - fixedMinQty) > 1e-12) {
                trade.minQtyC = fixedMinQty;
                changed = true;
            }
        }

        // Recompute qty using current sizing model for consistency.
        const orderUsdD = Number.isFinite(Number(trade.orderUsdD)) ? Number(trade.orderUsdD) : CFV2_ORDER_USD;
        const orderUsdC = Number.isFinite(Number(trade.orderUsdC)) ? Number(trade.orderUsdC) : CFV2_ORDER_USD;
        const levD = Number.isFinite(Number(trade.leverageD)) ? Number(trade.leverageD) : CFV2_LEVERAGE;
        const levC = Number.isFinite(Number(trade.leverageC)) ? Number(trade.leverageC) : CFV2_LEVERAGE;

        const sizing = applyPaperTradeSizingCFV2({
            ...trade,
            orderUsdD,
            orderUsdC,
            leverageD: levD,
            leverageC: levC
        });
        if (sizing.ok && (Math.abs(Number(trade.qtyD) - Number(sizing.qtyD)) > 1e-12 || Math.abs(Number(trade.qtyC) - Number(sizing.qtyC)) > 1e-12)) {
            trade.qtyD = sizing.qtyD;
            trade.qtyC = sizing.qtyC;
            trade.orderUsdD = sizing.usdD;
            trade.orderUsdC = sizing.usdC;
            trade.sizingMode = sizing.mode;
            changed = true;
        }
    }

    if (changed) {
        localStorage.setItem(CFV2_STORAGE.paperOpen, JSON.stringify(openTrades));
        fnGenMessage("Open paper trades lot size migrated to latest CoinD lot settings.", "badge bg-warning", "spnGenMsg");
    }
}

function migrateCapitalReservationCFV2() {
    const openTrades = JSON.parse(localStorage.getItem(CFV2_STORAGE.paperOpen) || "[]");
    if (!Array.isArray(openTrades) || openTrades.length === 0) return;
    let changed = false;
    for (const trade of openTrades) {
        if (trade?.capitalReserved !== true) {
            // Normalize legacy/open trades to reserved-capital model.
            trade.capitalReserved = true;
            changed = true;
        }
    }
    if (changed) {
        localStorage.setItem(CFV2_STORAGE.paperOpen, JSON.stringify(openTrades));
    }
}
