const CCDE_STORAGE_PREFIX = "CCDE_";
let gCCDECurrPos = { TradeData: [] };
let gCCDEFetchedLivePosRows = [];
let gCCDEWS = null;
let gCCDEForceCloseWS = false;
let gCCDESubscribedSymbols = [];
let gCCDESymbBRateList = {};
let gCCDESymbSRateList = {};
let gCCDESymbDeltaList = {};
let gCCDESymbGammaList = {};
let gCCDESymbThetaList = {};
let gCCDESymbVegaList = {};
let gCCDEOptionBrokerage = 0.01;
let gCCDEFutureBrokerage = 0.05;
let gCCDEMakerFeePct = 0.02;
let gCCDETakerFeePct = 0.05;
let gCCDEExchangeClosedOrderRows = [];
let gCCDEClosedHistoryLoaded = false;
let gCCDEOptionMonitorInst = null;
let gCCDEOptionMonitorBusy = false;
let gCCDEStrategyTimerInst = null;
let gCCDEStrategyBusy = false;
const gCCDESymbolLotSizeMap = {
    BTC: "0.001",
    ETH: "0.01"
};

function fnCCDESetStorage(pKey, pValue){
    localStorage.setItem(CCDE_STORAGE_PREFIX + pKey, String(pValue ?? ""));
}

function fnCCDEGetStorage(pKey, pDefault = ""){
    const vVal = localStorage.getItem(CCDE_STORAGE_PREFIX + pKey);
    return vVal === null ? pDefault : vVal;
}

function fnGetCoveredCallOptionsPnlBase(){
    const vVal = Number(fnCCDEGetStorage("OptionsPnl", "0"));
    return Number.isFinite(vVal) ? vVal : 0;
}

function fnSetCoveredCallOptionsPnlBase(pValue){
    const vSafe = Number.isFinite(Number(pValue)) ? Number(pValue) : 0;
    fnCCDESetStorage("OptionsPnl", vSafe.toFixed(2));
    const objInp = document.getElementById("txtOptionsPnl");
    if(objInp && document.activeElement !== objInp){
        objInp.value = vSafe.toFixed(2);
    }
    return vSafe;
}

function fnApplyCoveredCallOptionsPnlDelta(pDelta){
    const vBase = fnGetCoveredCallOptionsPnlBase();
    const vDelta = Number.isFinite(Number(pDelta)) ? Number(pDelta) : 0;
    return fnSetCoveredCallOptionsPnlBase(vBase + vDelta);
}

function fnRefreshCoveredCallOptionsPnlInput(){
    const objInp = document.getElementById("txtOptionsPnl");
    if(!objInp){
        return;
    }
    objInp.value = fnGetCoveredCallOptionsPnlBase().toFixed(2);
}

function fnBindCoveredCallOptionsPnlInput(){
    const objInp = document.getElementById("txtOptionsPnl");
    if(!objInp || objInp.dataset.ccdeOptionsPnlBound === "true"){
        return;
    }

    const fnPersist = function(){
        const vRaw = String(objInp.value || "").trim();
        const vParsed = Number(vRaw);
        fnSetCoveredCallOptionsPnlBase(Number.isFinite(vParsed) ? vParsed : 0);
    };

    objInp.addEventListener("change", fnPersist);
    objInp.addEventListener("blur", fnPersist);
    objInp.dataset.ccdeOptionsPnlBound = "true";
}

function fnSetControlValueCCDE(pId, pValue){
    const objEle = document.getElementById(pId);
    if(!objEle){
        return;
    }
    if(objEle.type === "checkbox"){
        objEle.checked = String(pValue) === "true";
        return;
    }
    objEle.value = String(pValue ?? "");
}

function fnGetControlValueCCDE(pId){
    const objEle = document.getElementById(pId);
    if(!objEle){
        return "";
    }
    if(objEle.type === "checkbox"){
        return objEle.checked ? "true" : "false";
    }
    return String(objEle.value ?? "");
}

function fnPersistManualTraderControlCCDE(pId){
    const objEle = document.getElementById(pId);
    if(!objEle){
        return;
    }
    const fnSave = function(){
        fnCCDESetStorage("Ctl_" + pId, fnGetControlValueCCDE(pId));
    };
    objEle.addEventListener("change", fnSave);
    objEle.addEventListener("input", fnSave);
}

function fnRestoreManualTraderControlsCCDE(){
    const objControlIds = [
        "ddlCoveredCallSymbol",
        "txtCoveredCallLotSize",
        "txtManualFutQty",
        "ddlManualFutOrderType",
        "ddlActionCoveredCall1",
        "ddlLegSideCoveredCall1",
        "ddlExpiryModeCoveredCall1",
        "txtExpiryCoveredCall1",
        "txtManualOptQtyCoveredCall1",
        "txtNewDeltaCoveredCall1",
        "txtReDeltaCoveredCall1",
        "txtDeltaTPCoveredCall1",
        "txtDeltaSLCoveredCall1",
        "chkReLegCoveredCall1",
        "chkAddOneLotFutIfNegFut"
    ];

    for(let i = 0; i < objControlIds.length; i += 1){
        const vId = objControlIds[i];
        const objEle = document.getElementById(vId);
        if(!objEle){
            continue;
        }
        const vStored = fnCCDEGetStorage("Ctl_" + vId, "__CCDE_EMPTY__");
        if(vStored !== "__CCDE_EMPTY__"){
            fnSetControlValueCCDE(vId, vStored);
        }
        fnPersistManualTraderControlCCDE(vId);
    }
}

function fnGetCoveredCallConfiguredLotSizeBySymbol(pUnderlying){
    const vUnderlying = String(pUnderlying || "").trim().toUpperCase();
    return gCCDESymbolLotSizeMap[vUnderlying] || "0.001";
}

function fnSyncCoveredCallLotSizeBySymbol(pPersist = true){
    const objSymbol = document.getElementById("ddlCoveredCallSymbol");
    const objLotSize = document.getElementById("txtCoveredCallLotSize");
    if(!objSymbol || !objLotSize){
        return;
    }

    const vLotSize = fnGetCoveredCallConfiguredLotSizeBySymbol(objSymbol.value);
    objLotSize.value = vLotSize;
    if(pPersist){
        fnCCDESetStorage("Ctl_txtCoveredCallLotSize", vLotSize);
    }
}

function fnFormatCoveredCallDateInputValue(pDate){
    const vDate = pDate instanceof Date ? new Date(pDate.getTime()) : new Date(pDate);
    if(Number.isNaN(vDate.getTime())){
        return "";
    }
    const vDay = String(vDate.getDate()).padStart(2, "0");
    const vMonth = String(vDate.getMonth() + 1).padStart(2, "0");
    return vDate.getFullYear() + "-" + vMonth + "-" + vDay;
}

function fnSetCoveredCallDDMMYYYY(pDateToConv){
    const vDate = new Date(pDateToConv);
    if(Number.isNaN(vDate.getTime())){
        return "";
    }
    const vDay = String(vDate.getDate()).padStart(2, "0");
    const vMonth = String(vDate.getMonth() + 1).padStart(2, "0");
    return vDay + "-" + vMonth + "-" + vDate.getFullYear();
}

function fnGetCoveredCallLastFridayOfMonth(pYear, pMonthIndex){
    const vDate = new Date(pYear, pMonthIndex + 1, 0);
    while(vDate.getDay() !== 5){
        vDate.setDate(vDate.getDate() - 1);
    }
    return vDate;
}

function fnResolveCoveredCallExpiryDateByMode(pExpiryMode){
    const vMode = String(pExpiryMode || "").trim();
    const vCurrDate = new Date();
    const vCurrDayOfWeek = vCurrDate.getDay();

    if(vMode === "1"){
        vCurrDate.setDate(vCurrDate.getDate() + 1);
        return vCurrDate;
    }
    if(vMode === "2"){
        vCurrDate.setDate(vCurrDate.getDate() + 2);
        return vCurrDate;
    }
    if(vMode === "4"){
        // Weekly expiry is Friday, rolled to next Friday from Tuesday onward.
        const vDaysToThisFriday = (5 - vCurrDayOfWeek + 7) % 7;
        const vDaysToWeeklyFriday = (vCurrDayOfWeek >= 2) ? (vDaysToThisFriday + 7) : vDaysToThisFriday;
        vCurrDate.setDate(vCurrDate.getDate() + vDaysToWeeklyFriday);
        return vCurrDate;
    }
    if(vMode === "5"){
        // Bi-weekly expiry is one Friday after the weekly target, rolled from Tuesday onward.
        const vDaysToThisFriday = (5 - vCurrDayOfWeek + 7) % 7;
        const vDaysToBiWeeklyFriday = (vCurrDayOfWeek >= 2) ? (vDaysToThisFriday + 14) : (vDaysToThisFriday + 7);
        vCurrDate.setDate(vCurrDate.getDate() + vDaysToBiWeeklyFriday);
        return vCurrDate;
    }
    if(vMode === "6"){
        const vLastDayOfMonth = fnGetCoveredCallLastFridayOfMonth(vCurrDate.getFullYear(), vCurrDate.getMonth());
        const vLastDayOfNextMonth = fnGetCoveredCallLastFridayOfMonth(vCurrDate.getFullYear(), vCurrDate.getMonth() + 1);
        return vCurrDate.getDate() > 15 ? vLastDayOfNextMonth : vLastDayOfMonth;
    }

    return vCurrDate;
}

function fnSyncCoveredCallExpiryByMode(){
    const objExpiryMode = document.getElementById("ddlExpiryModeCoveredCall1");
    const objExpiry = document.getElementById("txtExpiryCoveredCall1");
    if(!objExpiryMode || !objExpiry){
        return;
    }

    const vExpiryDate = fnResolveCoveredCallExpiryDateByMode(objExpiryMode.value);
    const vFormatted = fnFormatCoveredCallDateInputValue(vExpiryDate);
    if(!vFormatted){
        return;
    }

    objExpiry.value = vFormatted;
    fnCCDESetStorage("Ctl_txtExpiryCoveredCall1", vFormatted);
}

function fnBindCoveredCallExpiryMode(){
    const objExpiryMode = document.getElementById("ddlExpiryModeCoveredCall1");
    if(!objExpiryMode || objExpiryMode.dataset.ccdeExpiryBound === "true"){
        return;
    }

    objExpiryMode.addEventListener("change", fnSyncCoveredCallExpiryByMode);
    objExpiryMode.dataset.ccdeExpiryBound = "true";
}

function fnGetTelegramConfig(){
    const objTgBotToken = document.getElementById("txtTelegramBotToken");
    const objTgChatId = document.getElementById("txtTelegramChatId");
    return {
        botToken: String(objTgBotToken?.value || "").trim(),
        chatId: String(objTgChatId?.value || "").trim()
    };
}

function fnSendTelegramRuntimeAlert(pMsg){
    const objTgCfg = fnGetTelegramConfig();
    if(!objTgCfg.botToken || !objTgCfg.chatId){
        return;
    }

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    const vAction = JSON.stringify({
        TelegramBotToken: objTgCfg.botToken,
        TelegramChatId: objTgCfg.chatId,
        Message: String(pMsg || "")
    });

    fetch("/coveredCallDE/sendTelegramAlert", {
        method: "POST",
        headers: vHeaders,
        body: vAction,
        redirect: "follow"
    }).catch(() => {
        // no-op
    });
}

function fnGetCCDECreds(){
    const objApiKey = document.getElementById("txtUserAPIKey");
    const objApiSecret = document.getElementById("txtAPISecret");
    return {
        apiKey: String(objApiKey?.value || localStorage.getItem("CCDE_ApiKey") || "").trim(),
        apiSecret: String(objApiSecret?.value || localStorage.getItem("CCDE_ApiSecret") || "").trim()
    };
}

function fnToDateTimeLocalValue(pDate){
    const vDate = pDate instanceof Date ? pDate : new Date(pDate);
    if(Number.isNaN(vDate.getTime())){
        return "";
    }
    const vYYYY = vDate.getFullYear();
    const vMM = String(vDate.getMonth() + 1).padStart(2, "0");
    const vDD = String(vDate.getDate()).padStart(2, "0");
    const vHH = String(vDate.getHours()).padStart(2, "0");
    const vMI = String(vDate.getMinutes()).padStart(2, "0");
    return `${vYYYY}-${vMM}-${vDD}T${vHH}:${vMI}`;
}

function fnNormalizeDateTimeLocalCCDE(pVal, pDefaultVal){
    if(!pVal){
        return pDefaultVal;
    }
    if(typeof pVal === "string"){
        if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(pVal)){
            return pVal.substring(0, 16);
        }
        if(/^\d{4}-\d{2}-\d{2}$/.test(pVal)){
            return `${pVal}T00:00`;
        }
        const vDt = new Date(pVal);
        if(!Number.isNaN(vDt.getTime())){
            return fnToDateTimeLocalValue(vDt);
        }
    }
    return pDefaultVal;
}

function fnGetClosedPosDateFilterDefaultsCCDE(){
    const vNow = new Date();
    const vStart = new Date(vNow.getFullYear(), vNow.getMonth(), 1, 0, 0, 0, 0);
    return {
        From: fnToDateTimeLocalValue(vStart),
        To: fnToDateTimeLocalValue(vNow)
    };
}

function fnInitClosedPosDateTimeFilters(){
    const objFrom = document.getElementById("txtClsFromDate");
    const objTo = document.getElementById("txtClsToDate");
    if(!objFrom || !objTo){
        return;
    }

    const objDefaults = fnGetClosedPosDateFilterDefaultsCCDE();
    const vStoredFrom = fnCCDEGetStorage("ClsFromDate", "");
    const vStoredTo = fnCCDEGetStorage("ClsToDate", "");
    const vFromVal = fnNormalizeDateTimeLocalCCDE(vStoredFrom, objDefaults.From);
    const vToVal = fnNormalizeDateTimeLocalCCDE(vStoredTo, objDefaults.To);

    objFrom.value = vFromVal;
    objTo.value = vToVal;
    fnCCDESetStorage("ClsFromDate", vFromVal);
    fnCCDESetStorage("ClsToDate", vToVal);

    objFrom.addEventListener("change", function(){
        const vNextFrom = fnNormalizeDateTimeLocalCCDE(objFrom.value, objDefaults.From);
        objFrom.value = vNextFrom;
        fnCCDESetStorage("ClsFromDate", vNextFrom);
        fnRefreshCoveredCallClosedPositions();
    });

    objTo.addEventListener("change", function(){
        const vNextTo = fnNormalizeDateTimeLocalCCDE(objTo.value, objDefaults.To);
        objTo.value = vNextTo;
        fnCCDESetStorage("ClsToDate", vNextTo);
        fnRefreshCoveredCallClosedPositions();
    });
}

function fnClearClosedPosDateTimeFilters(){
    const objFrom = document.getElementById("txtClsFromDate");
    const objTo = document.getElementById("txtClsToDate");
    if(!objFrom || !objTo){
        return;
    }
    const objDefaults = fnGetClosedPosDateFilterDefaultsCCDE();
    objFrom.value = objDefaults.From;
    objTo.value = objDefaults.To;
    fnCCDESetStorage("ClsFromDate", objDefaults.From);
    fnCCDESetStorage("ClsToDate", objDefaults.To);
    fnRefreshCoveredCallClosedPositions();
}

function fnGetDateTimeMillisByInputIdCCDE(pInputId, pFallbackDt){
    const objInput = document.getElementById(pInputId);
    const vRaw = objInput?.value || "";
    const vVal = new Date(vRaw).getTime();
    if(!Number.isNaN(vVal)){
        return vVal;
    }
    return pFallbackDt;
}

function fnLoadCoveredCallCurrentPositions(){
    try{
        const vRaw = fnCCDEGetStorage("CurrPos", "");
        gCCDECurrPos = vRaw ? JSON.parse(vRaw) : { TradeData: [] };
    }
    catch(_err){
        gCCDECurrPos = { TradeData: [] };
    }

    if(!gCCDECurrPos || !Array.isArray(gCCDECurrPos.TradeData)){
        gCCDECurrPos = { TradeData: [] };
    }

    gCCDECurrPos.TradeData = fnNormalizeCoveredCallTradeRows(gCCDECurrPos.TradeData);
}

function fnGetFilledOrderHistoryCCDE(pApiKey, pApiSecret, pStartDT, pEndDT){
    return fetch("/coveredCallDE/getFilledOrderHistory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ApiKey: pApiKey,
            ApiSecret: pApiSecret,
            StartDT: pStartDT,
            EndDT: pEndDT
        }),
        redirect: "follow"
    })
    .then((response) => response.json())
    .then((objResult) => ({
        status: objResult.status,
        message: objResult.message,
        data: Array.isArray(objResult.data) ? objResult.data : [],
        raw: objResult.data
    }))
    .catch(() => ({ status: "danger", message: "Error while fetching closed order history.", data: [] }));
}

function fnSaveCoveredCallCurrentPositions(){
    gCCDECurrPos.TradeData = fnNormalizeCoveredCallTradeRows(gCCDECurrPos.TradeData);
    fnCCDESetStorage("CurrPos", JSON.stringify(gCCDECurrPos));
    fnEnsureCoveredCallWS();
    fnSyncCoveredCallOptionMonitor();
}

function fnNormalizeCoveredCallTradeRows(pTradeRows){
    const objRows = Array.isArray(pTradeRows) ? pTradeRows.filter((objRow) => !!objRow) : [];
    const objNormalizedRows = [];
    const objFutureRowMap = new Map();

    for(let i = 0; i < objRows.length; i += 1){
        const objTrade = { ...objRows[i] };
        const vStatus = String(objTrade.Status || "OPEN").toUpperCase();
        const vOptionType = String(objTrade.OptionType || "").toUpperCase();
        const vSymbol = String(objTrade.Symbol || "").trim();
        const vTransType = String(objTrade.TransType || "").toLowerCase();

        if(vStatus !== "OPEN" || vOptionType !== "F" || !vSymbol || (vTransType !== "buy" && vTransType !== "sell")){
            objNormalizedRows.push(objTrade);
            continue;
        }

        const vKey = [vStatus, vOptionType, vSymbol, vTransType].join("|");
        const objExisting = objFutureRowMap.get(vKey);
        if(!objExisting){
            objFutureRowMap.set(vKey, {
                ...objTrade,
                Qty: Number(objTrade.Qty || objTrade.LotQty || 0),
                LotQty: Number(objTrade.LotQty || objTrade.Qty || 0),
                UnrealizedPnL: Number(objTrade.UnrealizedPnL || 0),
                Commission: Number(objTrade.Commission || 0),
                Delta: Number(objTrade.Delta || 0),
                DeltaC: Number((objTrade.DeltaC ?? objTrade.Delta) || 0),
                Gamma: Number(objTrade.Gamma || 0),
                GammaC: Number((objTrade.GammaC ?? objTrade.Gamma) || 0),
                Theta: Number(objTrade.Theta || 0),
                ThetaC: Number((objTrade.ThetaC ?? objTrade.Theta) || 0),
                Vega: Number(objTrade.Vega || 0),
                VegaC: Number((objTrade.VegaC ?? objTrade.Vega) || 0)
            });
            continue;
        }

        const vExistingQty = Number(objExisting.LotQty || objExisting.Qty || 0);
        const vIncomingQty = Number(objTrade.LotQty || objTrade.Qty || 0);
        const vTotalQty = vExistingQty + vIncomingQty;

        objExisting.LotQty = vTotalQty;
        objExisting.Qty = vTotalQty;
        objExisting.UnrealizedPnL = Number(objExisting.UnrealizedPnL || 0) + Number(objTrade.UnrealizedPnL || 0);
        objExisting.Commission = Number(objExisting.Commission || 0) + Number(objTrade.Commission || 0);
        objExisting.Delta = Number(objExisting.Delta || 0) + Number(objTrade.Delta || 0);
        objExisting.DeltaC = Number(objExisting.DeltaC || 0) + Number((objTrade.DeltaC ?? objTrade.Delta) || 0);
        objExisting.Gamma = Number(objExisting.Gamma || 0) + Number(objTrade.Gamma || 0);
        objExisting.GammaC = Number(objExisting.GammaC || 0) + Number((objTrade.GammaC ?? objTrade.Gamma) || 0);
        objExisting.Theta = Number(objExisting.Theta || 0) + Number(objTrade.Theta || 0);
        objExisting.ThetaC = Number(objExisting.ThetaC || 0) + Number((objTrade.ThetaC ?? objTrade.Theta) || 0);
        objExisting.Vega = Number(objExisting.Vega || 0) + Number(objTrade.Vega || 0);
        objExisting.VegaC = Number(objExisting.VegaC || 0) + Number((objTrade.VegaC ?? objTrade.Vega) || 0);

        if(vTotalQty > 0){
            objExisting.EntryPrice = fnCalcWeightedCcdePrice(objExisting.EntryPrice, vExistingQty, objTrade.EntryPrice, vIncomingQty);
            objExisting.BuyPrice = fnCalcWeightedCcdePrice(objExisting.BuyPrice, vExistingQty, objTrade.BuyPrice, vIncomingQty);
            objExisting.SellPrice = fnCalcWeightedCcdePrice(objExisting.SellPrice, vExistingQty, objTrade.SellPrice, vIncomingQty);
        }

        const vExistingOpenTs = fnParseCoveredCallDateText(objExisting.OpenDT || "");
        const vIncomingOpenTs = fnParseCoveredCallDateText(objTrade.OpenDT || "");
        if(vIncomingOpenTs > 0 && (vExistingOpenTs <= 0 || vIncomingOpenTs < vExistingOpenTs)){
            objExisting.OpenDT = objTrade.OpenDT;
        }
    }

    objFutureRowMap.forEach((objTrade) => {
        objNormalizedRows.push(objTrade);
    });

    return objNormalizedRows;
}

function fnCalcWeightedCcdePrice(pPriceA, pQtyA, pPriceB, pQtyB){
    const vPriceA = Number(pPriceA || 0);
    const vQtyA = Number(pQtyA || 0);
    const vPriceB = Number(pPriceB || 0);
    const vQtyB = Number(pQtyB || 0);
    const vTotalQty = vQtyA + vQtyB;
    if(!(vTotalQty > 0)){
        return 0;
    }

    const vWeighted = ((vPriceA * vQtyA) + (vPriceB * vQtyB)) / vTotalQty;
    return Number.isFinite(vWeighted) ? vWeighted : 0;
}

function fnGetCoveredCallOpenTrades(){
    if(!gCCDECurrPos || !Array.isArray(gCCDECurrPos.TradeData)){
        return [];
    }
    return gCCDECurrPos.TradeData.filter((objTrade) => objTrade && objTrade.Status === "OPEN");
}

function fnGetCoveredCallOpenOptionTrades(){
    return fnGetCoveredCallOpenTrades().filter((objTrade) => String(objTrade?.OptionType || "").toUpperCase() !== "F");
}

function fnResetCoveredCallTickerMaps(){
    gCCDESymbBRateList = {};
    gCCDESymbSRateList = {};
    gCCDESymbDeltaList = {};
    gCCDESymbGammaList = {};
    gCCDESymbThetaList = {};
    gCCDESymbVegaList = {};
}

function fnSetCoveredCallWSStatus(pText, pCls = "bg-secondary"){
    const objEle = document.getElementById("spnCoveredCallWSStatus");
    if(!objEle){
        return;
    }
    objEle.className = "badge " + pCls;
    objEle.innerText = String(pText || "WS-OFF");
}

function fnGetCoveredCallSubscribedSymbols(){
    const objOpenTrades = fnGetCoveredCallOpenTrades();
    const objSet = new Set();
    const vSelectedTickerSymbol = fnGetCoveredCallSelectedTickerSymbol();
    if(vSelectedTickerSymbol){
        objSet.add(vSelectedTickerSymbol);
    }
    objOpenTrades.forEach((objTrade) => {
        const vSymbol = String(objTrade?.Symbol || "").trim();
        if(vSymbol){
            objSet.add(vSymbol);
        }
    });
    return Array.from(objSet);
}

function fnGetCcdeCurrentBuyPrice(objTrade){
    const vCurr = Number(gCCDESymbBRateList[objTrade?.Symbol]);
    return Number.isFinite(vCurr) && vCurr > 0 ? vCurr : Number(objTrade?.BuyPrice || 0);
}

function fnGetCcdeCurrentSellPrice(objTrade){
    const vCurr = Number(gCCDESymbSRateList[objTrade?.Symbol]);
    return Number.isFinite(vCurr) && vCurr > 0 ? vCurr : Number(objTrade?.SellPrice || 0);
}

function fnGetCcdeCurrentGreek(pSymbol, pMap, pFallback = 0){
    const vCurr = Number(pMap[String(pSymbol || "")]);
    if(Number.isFinite(vCurr)){
        return vCurr;
    }
    return Number(pFallback || 0);
}

function fnGetCoveredCallSelectedTickerSymbol(){
    const vSelectedUnderlying = String(document.getElementById("ddlCoveredCallSymbol")?.value || "").trim().toUpperCase();
    if(!vSelectedUnderlying){
        return "";
    }
    return vSelectedUnderlying + "USD";
}

function fnGetCoveredCallLiveDisplayPrice(pSymbol){
    const vSymbol = String(pSymbol || "").trim();
    if(!vSymbol){
        return NaN;
    }

    const vAsk = Number(gCCDESymbBRateList[vSymbol]);
    const vBid = Number(gCCDESymbSRateList[vSymbol]);
    if(Number.isFinite(vAsk) && vAsk > 0 && Number.isFinite(vBid) && vBid > 0){
        return (vAsk + vBid) / 2;
    }
    if(Number.isFinite(vAsk) && vAsk > 0){
        return vAsk;
    }
    if(Number.isFinite(vBid) && vBid > 0){
        return vBid;
    }
    return NaN;
}

function fnRefreshCoveredCallOneLotValue(){
    const objVal = document.getElementById("divOneLotValue");
    if(!objVal){
        return;
    }

    const vTickerSymbol = fnGetCoveredCallSelectedTickerSymbol();
    const vLotSize = Number(document.getElementById("txtCoveredCallLotSize")?.value || 0);
    const vLivePrice = fnGetCoveredCallLiveDisplayPrice(vTickerSymbol);
    const vOneLotValue = vLivePrice * vLotSize;

    objVal.innerText = (Number.isFinite(vOneLotValue) && vOneLotValue > 0) ? vOneLotValue.toFixed(2) : "-";
}

function fnGetCoveredCallSelectedFuturePositionValue(){
    const vTickerSymbol = fnGetCoveredCallSelectedTickerSymbol();
    if(!vTickerSymbol){
        return NaN;
    }

    const objFutureTrades = (Array.isArray(gCCDEFetchedLivePosRows) ? gCCDEFetchedLivePosRows : []).filter((objTrade) => {
        return String(objTrade?.OptionType || "F").toUpperCase() === "F"
            && String(objTrade?.Symbol || "").trim().toUpperCase() === vTickerSymbol;
    });
    if(objFutureTrades.length === 0){
        return NaN;
    }

    let vTotalValue = 0;
    for(let i = 0; i < objFutureTrades.length; i += 1){
        const objTrade = objFutureTrades[i];
        const vQty = Number(objTrade?.Qty || objTrade?.LotQty || 0);
        const vLotSize = Number(objTrade?.LotSize || document.getElementById("txtCoveredCallLotSize")?.value || 0);
        const vLivePrice = fnGetCoveredCallLiveDisplayPrice(objTrade?.Symbol);
        const vFallbackPrice = Number(objTrade?.EntryPrice || objTrade?.BestAsk || objTrade?.BestBid || 0);
        const vPrice = Number.isFinite(vLivePrice) && vLivePrice > 0 ? vLivePrice : vFallbackPrice;
        const vPositionValue = vQty * vLotSize * vPrice;
        if(Number.isFinite(vPositionValue)){
            vTotalValue += vPositionValue;
        }
    }

    return vTotalValue > 0 ? vTotalValue : NaN;
}

function fnRefreshCoveredCallHealth(){
    const objHealth = document.getElementById("divHealthPct");
    if(!objHealth){
        return;
    }

    const vAvailableBalance = Number(fnCCDEGetStorage("AvailableMargin", ""));
    const vPositionValue = fnGetCoveredCallSelectedFuturePositionValue();
    if(!Number.isFinite(vAvailableBalance) || vAvailableBalance < 0 || !Number.isFinite(vPositionValue) || vPositionValue <= 0){
        objHealth.innerText = "-";
        objHealth.style.color = "";
        return;
    }

    if(vAvailableBalance <= 0){
        objHealth.innerText = "-";
        objHealth.style.color = "";
        return;
    }

    const vHealthPct = (vPositionValue / vAvailableBalance) * 100;
    objHealth.innerText = `${vHealthPct.toFixed(2)}%`;
    if(vHealthPct <= 100){
        objHealth.style.color = "#198754";
    }
    else if(vHealthPct <= 150){
        objHealth.style.color = "#fd7e14";
    }
    else{
        objHealth.style.color = "#dc3545";
    }
}

function fnGetCoveredCallHealthPctValue(){
    const vAvailableBalance = Number(fnCCDEGetStorage("AvailableMargin", ""));
    const vPositionValue = fnGetCoveredCallSelectedFuturePositionValue();
    if(!Number.isFinite(vAvailableBalance) || vAvailableBalance <= 0 || !Number.isFinite(vPositionValue) || vPositionValue <= 0){
        return NaN;
    }
    return (vPositionValue / vAvailableBalance) * 100;
}

function fnGetCoveredCallOneLotValueNumber(){
    const vTickerSymbol = fnGetCoveredCallSelectedTickerSymbol();
    const vLotSize = Number(document.getElementById("txtCoveredCallLotSize")?.value || 0);
    const vLivePrice = fnGetCoveredCallLiveDisplayPrice(vTickerSymbol);
    const vOneLotValue = vLivePrice * vLotSize;
    return Number.isFinite(vOneLotValue) && vOneLotValue > 0 ? vOneLotValue : NaN;
}

function fnIsCoveredCallAddOneLotFutureEnabled(){
    const objSwitch = document.getElementById("chkAddOneLotFutIfNegFut");
    return !!(objSwitch && objSwitch.checked);
}

function fnGetCoveredCallTriggerDecision(objTrade){
    const vOptionType = String(objTrade?.OptionType || "").toUpperCase();
    if(vOptionType !== "C" && vOptionType !== "P"){
        return { shouldAct: false, reason: "" };
    }

    const vCurrDelta = Math.abs(Number(fnGetCoveredCallLiveDeltaForTrade(objTrade)));
    const vDeltaSL = Number(objTrade?.DeltaSL || 0);
    const vDeltaTP = Number(objTrade?.DeltaTP || 0);
    const vTransType = String(objTrade?.TransType || "").toLowerCase();
    const bHasSL = Number.isFinite(vDeltaSL) && vDeltaSL > 0;
    const bHasTP = Number.isFinite(vDeltaTP) && vDeltaTP > 0;

    if(!Number.isFinite(vCurrDelta) || (!bHasSL && !bHasTP)){
        return { shouldAct: false, reason: "" };
    }

    if(vTransType === "sell"){
        if(bHasSL && vCurrDelta >= vDeltaSL){
            return { shouldAct: true, reason: "sl" };
        }
        if(bHasTP && vCurrDelta <= vDeltaTP){
            return { shouldAct: true, reason: "tp" };
        }
    }
    else if(vTransType === "buy"){
        if(bHasSL && vCurrDelta <= vDeltaSL){
            return { shouldAct: true, reason: "sl" };
        }
        if(bHasTP && vCurrDelta >= vDeltaTP){
            return { shouldAct: true, reason: "tp" };
        }
    }

    return { shouldAct: false, reason: "" };
}

function fnGetCoveredCallLiveFutureSnapshot(pRows = [], objTrade = null){
    const vSelectedUnderlying = String(document.getElementById("ddlCoveredCallSymbol")?.value || objTrade?.UndrAsstSymb || "").trim().toUpperCase();
    const vTickerSymbol = fnGetCoveredCallSelectedTickerSymbol();
    const objRows = Array.isArray(pRows) ? pRows : [];
    const objFutures = objRows.filter((objPos) => {
        if(String(objPos?.OptionType || "F").toUpperCase() !== "F"){
            return false;
        }
        const vUnderlying = String(objPos?.UndrAsstSymb || "").trim().toUpperCase();
        const vSymbol = String(objPos?.Symbol || "").trim().toUpperCase();
        if(vSelectedUnderlying && vUnderlying === vSelectedUnderlying){
            return true;
        }
        return vTickerSymbol && vSymbol === vTickerSymbol;
    });

    let vTotalQty = 0;
    let vSide = "";
    let vLotSize = Number(document.getElementById("txtCoveredCallLotSize")?.value || objTrade?.LotSize || 0);
    for(let i = 0; i < objFutures.length; i += 1){
        const objPos = objFutures[i];
        const vQty = Number(objPos?.Qty || objPos?.LotQty || 0);
        if(Number.isFinite(vQty) && vQty > 0){
            vTotalQty += vQty;
        }
        if(!vSide){
            vSide = String(objPos?.TransType || "").toLowerCase();
        }
        if(!(vLotSize > 0)){
            vLotSize = Number(objPos?.LotSize || 0);
        }
    }

    return {
        totalQty: vTotalQty,
        side: vSide,
        lotSize: Number.isFinite(vLotSize) ? vLotSize : 0,
        symbol: String(document.getElementById("ddlCoveredCallSymbol")?.value || objTrade?.UndrAsstSymb || "").trim()
    };
}

function fnShouldAddOneMoreFutureOnSl(){
    const vHealthPct = fnGetCoveredCallHealthPctValue();
    const vOptionsPnl = fnGetCoveredCallOptionsPnlBase();
    const vOneLotValue = fnGetCoveredCallOneLotValueNumber();
    const bHealthGate = Number.isFinite(vHealthPct) && vHealthPct < 90;
    const bOptionsPnlGate = Number.isFinite(vOneLotValue) && vOneLotValue > 0 && vOptionsPnl >= vOneLotValue;
    return {
        shouldAdd: fnHasCoveredCallAutoTraderEnabled() && fnIsCoveredCallAddOneLotFutureEnabled() && (bHealthGate || bOptionsPnlGate),
        healthGate: bHealthGate,
        optionsPnlGate: bOptionsPnlGate,
        healthPct: vHealthPct,
        optionsPnl: vOptionsPnl,
        oneLotValue: vOneLotValue
    };
}

function fnGetCoveredCallEntryOptionCommission(objTrade){
    const vEntryComm = Number(
        objTrade?.Commission
        || objTrade?.BuyCommission
        || objTrade?.SellCommission
        || 0
    );
    return Number.isFinite(vEntryComm) && vEntryComm > 0 ? vEntryComm : 0;
}

function fnGetCoveredCallCloseOptionCommission(pCloseData){
    const vCloseComm = Number(
        pCloseData?.Commission
        || pCloseData?.paid_commission
        || 0
    );
    return Number.isFinite(vCloseComm) && vCloseComm > 0 ? vCloseComm : 0;
}

function fnCalcCoveredCallOptionTds(pCommissionTotal){
    const vComm = Number(pCommissionTotal);
    if(!Number.isFinite(vComm) || vComm <= 0){
        return 0;
    }
    return vComm * 0.18;
}

function fnApplyCoveredCallClosedOptionPnl(objTrade, pCloseData){
    const vOptionType = String(objTrade?.OptionType || "").toUpperCase();
    if(vOptionType !== "C" && vOptionType !== "P"){
        return 0;
    }

    const vQty = Number(objTrade?.LotQty || objTrade?.Qty || pCloseData?.Qty || 0);
    const vLotSize = Number(objTrade?.LotSize || 0);
    const vClosePrice = Number(pCloseData?.ClosePrice || 0);
    const vTransType = String(objTrade?.TransType || "").toLowerCase();
    let vBuyPrice = Number(objTrade?.BuyPrice || 0);
    let vSellPrice = Number(objTrade?.SellPrice || 0);

    if(vTransType === "buy"){
        vSellPrice = vClosePrice;
    }
    else if(vTransType === "sell"){
        vBuyPrice = vClosePrice;
    }

    if(!Number.isFinite(vQty) || vQty <= 0 || !Number.isFinite(vLotSize) || vLotSize <= 0){
        return 0;
    }
    if(!Number.isFinite(vBuyPrice) || !Number.isFinite(vSellPrice)){
        return 0;
    }

    const vGrossPnl = (vSellPrice - vBuyPrice) * vQty * vLotSize;
    const vEntryComm = fnGetCoveredCallEntryOptionCommission(objTrade);
    const vExitComm = fnGetCoveredCallCloseOptionCommission(pCloseData);
    const vCommissionTotal = vEntryComm + vExitComm;
    const vTds = fnCalcCoveredCallOptionTds(vCommissionTotal);
    const vNetBeforeTds = vGrossPnl - vCommissionTotal;
    const vNetPnl = vNetBeforeTds - vTds;

    fnApplyCoveredCallOptionsPnlDelta(vNetPnl);
    return vNetPnl;
}

async function fnRefreshCoveredCallLivePositionCache(pSilent = true){
    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        return { status: "warning", message: "Please login with API credentials first.", data: [] };
    }

    const objRet = await fnGetLiveOpenPositionsCCDE(objCreds.apiKey, objCreds.apiSecret);
    if(objRet.status !== "success"){
        if(!pSilent){
            fnHandleCoveredCallAuthError(objRet);
        }
        return objRet;
    }

    fnRefreshCoveredCallHealth();
    return objRet;
}

function fnCalcCommByPctCCDE(pNotional, pPct){
    const vNotional = Number(pNotional);
    const vPct = Number(pPct);
    if(!Number.isFinite(vNotional) || vNotional <= 0 || !Number.isFinite(vPct) || vPct < 0){
        return 0;
    }
    return (vNotional * vPct) / 100;
}

function fnCloseCoveredCallWS(){
    if(gCCDEWS){
        try{
            gCCDEForceCloseWS = true;
            gCCDEWS.close();
        }
        catch(_err){
            // no-op
        }
    }
    gCCDEWS = null;
    fnSetCoveredCallWSStatus("WS-OFF", "bg-secondary");
}

function fnHandleCoveredCallTicker(pTicData){
    if(!pTicData || !pTicData.symbol){
        return;
    }

    gCCDESymbBRateList[pTicData.symbol] = Number(pTicData?.quotes?.best_ask || pTicData?.best_ask || 0);
    gCCDESymbSRateList[pTicData.symbol] = Number(pTicData?.quotes?.best_bid || pTicData?.best_bid || 0);
    if(pTicData.contract_type !== "perpetual_futures" && pTicData.greeks){
        gCCDESymbDeltaList[pTicData.symbol] = Number(pTicData.greeks.delta || 0);
        gCCDESymbGammaList[pTicData.symbol] = Number(pTicData.greeks.gamma || 0);
        gCCDESymbThetaList[pTicData.symbol] = Number(pTicData.greeks.theta || 0);
        gCCDESymbVegaList[pTicData.symbol] = Number(pTicData.greeks.vega || 0);
    }

    fnRefreshCoveredCallOneLotValue();
    fnRefreshCoveredCallHealth();
    fnRenderCoveredCallOpenPositions();
}

function fnSubscribeCoveredCallWS(){
    if(!gCCDEWS || gCCDEWS.readyState !== WebSocket.OPEN){
        return;
    }
    if(!Array.isArray(gCCDESubscribedSymbols) || gCCDESubscribedSymbols.length === 0){
        fnSetCoveredCallWSStatus("WS-ON", "bg-success");
        return;
    }

    const vSendData = {
        type: "subscribe",
        payload: {
            channels: [{
                name: "v2/ticker",
                symbols: gCCDESubscribedSymbols
            }]
        }
    };
    gCCDEWS.send(JSON.stringify(vSendData));
    fnSetCoveredCallWSStatus("WS-SUB", "bg-primary");
}

function fnConnectCoveredCallWS(){
    fnEnsureCoveredCallWS();
}

function fnSubscribeCoveredCallWSManual(){
    gCCDESubscribedSymbols = fnGetCoveredCallSubscribedSymbols();
    if(gCCDEWS && gCCDEWS.readyState === WebSocket.OPEN){
        fnSubscribeCoveredCallWS();
        fnRenderCoveredCallOpenPositions();
        return;
    }
    fnEnsureCoveredCallWS();
}

function fnDisconnectCoveredCallWS(){
    fnCloseCoveredCallWS();
}

function fnEnsureCoveredCallWS(){
    const objSymbols = fnGetCoveredCallSubscribedSymbols();
    gCCDESubscribedSymbols = objSymbols;

    if(objSymbols.length === 0){
        fnCloseCoveredCallWS();
        fnResetCoveredCallTickerMaps();
        fnRenderCoveredCallOpenPositions();
        return;
    }

    if(gCCDEWS && gCCDEWS.readyState === WebSocket.OPEN){
        fnSubscribeCoveredCallWS();
        return;
    }

    fnCloseCoveredCallWS();
    gCCDEForceCloseWS = false;
    fnSetCoveredCallWSStatus("WS-CON", "bg-info");
    gCCDEWS = new WebSocket("wss://socket.india.delta.exchange");

    gCCDEWS.onopen = function(){
        fnSetCoveredCallWSStatus("WS-ON", "bg-success");
        fnSubscribeCoveredCallWS();
    };

    gCCDEWS.onerror = function(){
        fnSetCoveredCallWSStatus("WS-ERR", "bg-danger");
    };

    gCCDEWS.onclose = function(){
        gCCDEWS = null;
        if(gCCDEForceCloseWS){
            gCCDEForceCloseWS = false;
            fnSetCoveredCallWSStatus("WS-OFF", "bg-secondary");
            return;
        }
        if(fnGetCoveredCallSubscribedSymbols().length > 0){
            fnSetCoveredCallWSStatus("WS-RETRY", "bg-warning text-dark");
            setTimeout(fnEnsureCoveredCallWS, 3000);
            return;
        }
        fnSetCoveredCallWSStatus("WS-OFF", "bg-secondary");
    };

    gCCDEWS.onmessage = function(pMsg){
        try{
            const vData = JSON.parse(pMsg.data);
            if(vData?.type === "v2/ticker"){
                fnHandleCoveredCallTicker(vData);
            }
            else if(vData?.type === "subscriptions"){
                fnSetCoveredCallWSStatus("WS-SUB", "bg-primary");
            }
        }
        catch(_err){
            // no-op
        }
    };
}

function fnFormatCcdeGreekCell(pCurrent, pBase){
    const vCurr = Number(pCurrent || 0);
    const vBase = Number(pBase ?? pCurrent ?? 0);
    return '<div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + vCurr.toFixed(2) + '</div>'
        + '<div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + vBase.toFixed(2) + '</div>';
}

function fnFormatCcdeGreekCell4(pCurrent, pBase){
    const vCurr = Number(pCurrent || 0);
    const vBase = Number(pBase ?? pCurrent ?? 0);
    return '<div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + vCurr.toFixed(4) + '</div>'
        + '<div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + vBase.toFixed(4) + '</div>';
}

function fnCcdeGetClosedTradeCharges(objTrade){
    const vActualCommission = Number(
        objTrade?.paid_commission
        || objTrade?.Commission
        || objTrade?.BuyCommission
        || objTrade?.SellCommission
        || 0
    );
    if(Number.isFinite(vActualCommission) && vActualCommission > 0){
        return vActualCommission;
    }

    const vStatus = String(objTrade?.Status || "OPEN").toUpperCase();
    if(vStatus === "OPEN"){
        return 0;
    }

    const vOptionType = String(objTrade?.OptionType || "F").toUpperCase();
    const vIndexPrice = Number(objTrade?.StrikePrice || objTrade?.EntryPrice || objTrade?.SellPrice || objTrade?.BuyPrice || 0);
    const vLotSize = Number(objTrade?.LotSize || 0);
    const vQty = Number(objTrade?.LotQty || objTrade?.Qty || 0);
    const vBuyPrice = Number(objTrade?.BuyPrice || 0);
    const vSellPrice = Number(objTrade?.SellPrice || 0);

    if(vOptionType === "F"){
        const vBuyBrokerage = ((vQty * vLotSize * vBuyPrice) * gCCDEFutureBrokerage) / 100;
        const vSellBrokerage = ((vQty * vLotSize * vSellPrice) * gCCDEFutureBrokerage) / 100;
        return (vBuyBrokerage + vSellBrokerage) * 1.18;
    }

    const vNotionalFees = (((vQty * 2) * vLotSize * vIndexPrice) * gCCDEOptionBrokerage) / 100;
    const vBuyBrokerage = ((vQty * vLotSize * vBuyPrice) * 3.5) / 100;
    const vSellBrokerage = ((vQty * vLotSize * vSellPrice) * 3.5) / 100;
    const vPremiumCapFees = vSellBrokerage + vBuyBrokerage;
    if(vPremiumCapFees < vNotionalFees){
        return vPremiumCapFees * 1.18;
    }
    return vNotionalFees * 1.18;
}

function fnCcdeGetLiveOpenCharges(objTrade, pBuyPrice, pSellPrice){
    if(!objTrade){
        return 0;
    }

    const vActualCommission = Number(
        objTrade?.paid_commission
        || objTrade?.Commission
        || objTrade?.BuyCommission
        || objTrade?.SellCommission
        || 0
    );
    if(Number.isFinite(vActualCommission) && vActualCommission > 0){
        return vActualCommission;
    }

    const vQty = Number(objTrade?.LotQty || objTrade?.Qty || 0);
    const vLot = Number(objTrade?.LotSize || 0);
    const vBuy = Number(pBuyPrice);
    const vSell = Number(pSellPrice);
    if(!Number.isFinite(vQty) || vQty <= 0 || !Number.isFinite(vLot) || vLot <= 0){
        return 0;
    }

    const vEntryStored = Number(objTrade?.BuyCommission || 0) + Number(objTrade?.SellCommission || 0);
    let vEntryComm = Number.isFinite(vEntryStored) && vEntryStored > 0 ? vEntryStored : 0;

    if(vEntryComm <= 0){
        const vTransType = String(objTrade?.TransType || "").toLowerCase();
        const vEntryNotional = (vTransType === "buy" ? vBuy : vSell) * vLot * vQty;
        const vOrderType = String(objTrade?.OrderType || "market_order").toLowerCase();
        const vEntryRate = vOrderType === "market_order" ? gCCDETakerFeePct : gCCDEMakerFeePct;
        vEntryComm = fnCalcCommByPctCCDE(vEntryNotional, vEntryRate);
    }

    return Number.isFinite(vEntryComm) ? vEntryComm : 0;
}

function fnCcdeGetTradeCharges(objTrade){
    const vStatus = String(objTrade?.Status || "OPEN").toUpperCase();
    const vBuyPrice = Number(objTrade?.BuyPrice || 0);
    const vSellPrice = Number(objTrade?.SellPrice || 0);
    if(vStatus === "OPEN"){
        return fnCcdeGetLiveOpenCharges(objTrade, vBuyPrice, vSellPrice);
    }
    return fnCcdeGetClosedTradeCharges(objTrade);
}

function fnCcdeGetTradePL(objTrade){
    const vExchUnrealizedPnL = Number(objTrade?.UnrealizedPnL);
    const vQty = Number(objTrade?.LotQty || objTrade?.Qty || 0);
    const vLotSize = Number(objTrade?.LotSize || 0);
    const vBuyPrice = Number(objTrade?.BuyPrice || 0);
    const vSellPrice = Number(objTrade?.SellPrice || 0);
    const vCharges = fnCcdeGetTradeCharges(objTrade);
    if((!Number.isFinite(vBuyPrice) || !Number.isFinite(vSellPrice)) && Number.isFinite(vExchUnrealizedPnL)){
        return vExchUnrealizedPnL - vCharges;
    }
    const vGross = (vSellPrice - vBuyPrice) * vQty * vLotSize;
    return vGross - vCharges;
}

function fnRenderCoveredCallOpenPositions(){
    const objBody = document.getElementById("tBodyCurrTrades");
    if(!objBody){
        return;
    }

    const objOpenTrades = fnGetCoveredCallOpenTrades();
    if(objOpenTrades.length === 0){
        objBody.innerHTML = '<tr><td colspan="16"><div style="width:100%; text-align:center; font-weight:bold; font-size:28px;">No Running Trades Yet</div></td></tr>';
        fnSetTextValue("spnTotalDelta", "0.0000");
        fnSetTextValue("spnTotalGamma", "0.0000");
        fnSetTextValue("spnTotalTheta", "0.0000");
        fnSetTextValue("spnTotalVega", "0.0000");
        fnSetTextValue("spnTotalCharges", "0.00");
        return;
    }

    let vHtml = "";
    let vTotalCharges = 0;
    let vTotalPL = 0;
    let vTotalDelta = 0;
    let vTotalGamma = 0;
    let vTotalTheta = 0;
    let vTotalVega = 0;

    objOpenTrades.forEach((objTrade) => {
        const vTradeID = Number(objTrade.TradeID || 0);
        const vTransType = String(objTrade.TransType || "").toLowerCase();
        const vBaseDelta = Number(objTrade.Delta || 0);
        const vBaseGamma = Number(objTrade.Gamma || 0);
        const vBaseTheta = Number(objTrade.Theta || 0);
        const vBaseVega = Number(objTrade.Vega || 0);
        const vDelta = fnGetCcdeCurrentGreek(objTrade.Symbol, gCCDESymbDeltaList, vBaseDelta);
        const vGamma = fnGetCcdeCurrentGreek(objTrade.Symbol, gCCDESymbGammaList, vBaseGamma);
        const vTheta = fnGetCcdeCurrentGreek(objTrade.Symbol, gCCDESymbThetaList, vBaseTheta);
        const vVega = fnGetCcdeCurrentGreek(objTrade.Symbol, gCCDESymbVegaList, vBaseVega);
        const vLotSize = Number(objTrade.LotSize || 0);
        const vQty = Number(objTrade.LotQty || 0);
        const vEntryBuyPrice = Number(objTrade.BuyPrice || 0);
        const vEntrySellPrice = Number(objTrade.SellPrice || 0);
        const vCurrBuyPrice = fnGetCcdeCurrentBuyPrice(objTrade);
        const vCurrSellPrice = fnGetCcdeCurrentSellPrice(objTrade);
        const vLiveBuyPrice = vTransType === "sell" ? vCurrBuyPrice : vEntryBuyPrice;
        const vLiveSellPrice = vTransType === "buy" ? vCurrSellPrice : vEntrySellPrice;
        const vCharges = fnCcdeGetTradeCharges({
            ...objTrade,
            BuyPrice: vLiveBuyPrice,
            SellPrice: vLiveSellPrice
        });
        let vPL = Number(objTrade.UnrealizedPnL);
        if(Number.isFinite(vLiveBuyPrice) && Number.isFinite(vLiveSellPrice)){
            vPL = fnCcdeGetTradePL({
                ...objTrade,
                BuyPrice: vLiveBuyPrice,
                SellPrice: vLiveSellPrice
            });
        }
        else{
            vPL = fnCcdeGetTradePL(objTrade);
        }
        const vDisplayPL = Number.isFinite(vPL) ? vPL : 0;
        const vCloseDT = objTrade.CloseDT || "-";

        vTotalCharges += vCharges;
        vTotalPL += vDisplayPL;
        vTotalDelta += vDelta;
        vTotalGamma += vGamma;
        vTotalTheta += vTheta;
        vTotalVega += vVega;

        vHtml += '<tr>';
        vHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye" aria-hidden="true" style="color:green;" title="Close This Leg!" onclick="fnCloseCoveredCallPosition(' + vTradeID + ');"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" title="Edit This Leg" onclick="fnOpenEditModel(' + vTradeID + ', ' + vLotSize + ', ' + vQty + ', `' + vEntryBuyPrice + '`, `' + vEntrySellPrice + '`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" title="Delete This Leg" onclick="fnDeleteCoveredCallLeg(' + vTradeID + ');"></i></td>';
        vHtml += '<td>' + fnFormatCcdeGreekCell(vDelta, vBaseDelta) + '</td>';
        vHtml += '<td>' + fnFormatCcdeGreekCell4(vGamma, vBaseGamma) + '</td>';
        vHtml += '<td>' + fnFormatCcdeGreekCell4(vTheta, vBaseTheta) + '</td>';
        vHtml += '<td>' + fnFormatCcdeGreekCell4(vVega, vBaseVega) + '</td>';
        vHtml += '<td style="text-wrap: nowrap; text-align:center;">' + String(objTrade.Symbol || "-") + '</td>';
        vHtml += '<td style="text-wrap: nowrap; text-align:center;">' + String(objTrade.TransType || "-") + '</td>';
        vHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vLotSize + '</td>';
        vHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vQty + '</td>';
        if(vTransType === "sell"){
            vHtml += '<td style="text-wrap: nowrap; color:white; text-align:right;"><span class="blink">' + vLiveBuyPrice.toFixed(2) + '</span></td>';
            vHtml += '<td style="text-wrap: nowrap; color:red; text-align:right;">' + vEntrySellPrice.toFixed(2) + '</td>';
        }
        else{
            vHtml += '<td style="text-wrap: nowrap; color:red; text-align:right;">' + vEntryBuyPrice.toFixed(2) + '</td>';
            vHtml += '<td style="text-wrap: nowrap; color:white; text-align:right;"><span class="blink">' + vLiveSellPrice.toFixed(2) + '</span></td>';
        }
        vHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vCharges.toFixed(2) + '</td>';
        vHtml += '<td style="text-wrap: nowrap; text-align:right; color:#ff9a00;">' + vDisplayPL.toFixed(2) + '</td>';
        vHtml += '<td style="text-wrap: nowrap; text-align:center;">' + String(objTrade.OpenDT || "-") + '</td>';
        vHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vCloseDT + '</td>';
        vHtml += '<td style="text-wrap: nowrap; text-align:right;">' + String(objTrade.Status || "OPEN") + '</td>';
        vHtml += '</tr>';
    });

    vHtml += '<tr>';
    vHtml += '<td></td>';
    vHtml += '<td>' + fnFormatCcdeGreekCell(vTotalDelta, vTotalDelta) + '</td>';
    vHtml += '<td>' + fnFormatCcdeGreekCell4(vTotalGamma, vTotalGamma) + '</td>';
    vHtml += '<td>' + fnFormatCcdeGreekCell4(vTotalTheta, vTotalTheta) + '</td>';
    vHtml += '<td>' + fnFormatCcdeGreekCell4(vTotalVega, vTotalVega) + '</td>';
    vHtml += '<td></td><td></td><td></td><td></td><td></td><td></td>';
    vHtml += '<td style="text-wrap: nowrap; text-align:right; color:red; font-weight:bold;">' + vTotalCharges.toFixed(2) + '</td>';
    vHtml += '<td style="text-wrap: nowrap; text-align:right; color:white; font-weight:bold;">' + vTotalPL.toFixed(2) + '</td>';
    vHtml += '<td></td><td></td><td></td>';
    vHtml += '</tr>';

    objBody.innerHTML = vHtml;
    fnSetTextValue("spnTotalDelta", vTotalDelta.toFixed(4));
    fnSetTextValue("spnTotalGamma", vTotalGamma.toFixed(4));
    fnSetTextValue("spnTotalTheta", vTotalTheta.toFixed(4));
    fnSetTextValue("spnTotalVega", vTotalVega.toFixed(4));
    fnSetTextValue("spnTotalCharges", vTotalCharges.toFixed(2));
}

function fnChangeLater(){
    $("#mdlDeltaLogin").modal("show");
}

function fnSafeSetButton(pId, pClassName, pText){
    const objBtn = document.getElementById(pId);
    if(!objBtn){
        return;
    }

    if(typeof fnChangeBtnProps === "function"){
        fnChangeBtnProps(pId, pClassName, pText);
        return;
    }

    objBtn.className = pClassName;
    objBtn.innerText = pText;
}

function fnSafeGenMessage(pMsg, pClassName, pId){
    let vMsg = pMsg;
    if(pId === "spnGenMsg" || pId === "spnDeltaLogin"){
        vMsg = fnNormalizeCoveredCallMessage(pMsg, pId);
    }

    if(typeof fnGenMessage === "function"){
        fnGenMessage(vMsg, pClassName, pId);
        return;
    }

    const objMsg = document.getElementById(pId);
    if(!objMsg){
        return;
    }
    objMsg.className = pClassName;
    objMsg.innerText = String(vMsg || "");
}

function fnNormalizeCoveredCallMessage(pMsg, pId){
    if(pMsg && typeof pMsg === "object"){
        return fnNormalizeCoveredCallApiError(pMsg, pId);
    }

    const vText = String(pMsg || "").trim();
    if(vText === ""){
        return vText;
    }

    if(vText.startsWith("{") && vText.includes("\"error\"")){
        try{
            const objParsed = JSON.parse(vText);
            return fnNormalizeCoveredCallApiError(objParsed, pId);
        }
        catch(_err){
            return vText;
        }
    }

    return vText;
}

function fnNormalizeCoveredCallApiError(pPayload, pId){
    const objError = pPayload?.error
        || pPayload?.response?.body?.error
        || pPayload?.body?.error
        || null;
    const vErrCode = String(objError?.code || "").trim();
    const vClientIp = String(objError?.context?.client_ip || "").trim();

    if(vErrCode === "ip_not_whitelisted_for_api_key"){
        let vMsg = "Update IP in Delta Exchange:";
        if(vClientIp){
            vMsg += " " + vClientIp;
        }
        return vMsg;
    }

    if(vErrCode){
        return vErrCode.replaceAll("_", " ");
    }

    return String(pPayload?.message || "Request failed.").trim();
}

function fnSetFieldValue(pId, pValue){
    const obj = document.getElementById(pId);
    if(obj){
        obj.value = pValue;
    }
}

function fnSetTextValue(pId, pValue){
    const obj = document.getElementById(pId);
    if(obj){
        obj.innerText = String(pValue);
    }
}

function fnSetPmGuardText(pWalletUsd){
    const vUsd = Number(pWalletUsd);
    const objPm = document.getElementById("txtPmStatus");
    if(!objPm){
        return;
    }

    if(Number.isFinite(vUsd) && vUsd >= 500){
        objPm.value = "PM Likely Enabled";
    }
    else if(Number.isFinite(vUsd) && vUsd > 0){
        objPm.value = "Top Up Required (< 500 USDT)";
    }
    else{
        objPm.value = "Needs wallet check";
    }
}

function fnLoadNetLimitsCCDE(){
    const objTotalMargin = document.getElementById("divTotalMargin");
    const objBlockedMargin = document.getElementById("divBlockedMargin");
    const objBalanceMargin = document.getElementById("divBalanceMargin");
    if(!objTotalMargin || !objBlockedMargin || !objBalanceMargin){
        return;
    }

    const vStoredTotalMargin = Number(fnCCDEGetStorage("TotalMargin", ""));
    const vStoredAvailMargin = Number(fnCCDEGetStorage("AvailableMargin", ""));
    const vWalletUsd = Number(fnCCDEGetStorage("WalletUsd", ""));
    const vWalletInr = Number(fnCCDEGetStorage("WalletInr", ""));
    const vBlockedMargin = Number(fnCCDEGetStorage("BlockedMargin", "0"));
    const vTotalMargin = Number.isFinite(vStoredTotalMargin) && vStoredTotalMargin > 0
        ? vStoredTotalMargin
        : (Number.isFinite(vWalletUsd) && vWalletUsd > 0 ? vWalletUsd : (Number.isFinite(vWalletInr) && vWalletInr > 0 ? vWalletInr : NaN));
    const vSafeBlocked = Number.isFinite(vBlockedMargin) && vBlockedMargin > 0 ? vBlockedMargin : 0;
    const vAvailMargin = Number.isFinite(vStoredAvailMargin) && vStoredAvailMargin >= 0
        ? vStoredAvailMargin
        : (Number.isFinite(vTotalMargin) ? (vTotalMargin - vSafeBlocked) : NaN);

    objTotalMargin.innerText = Number.isFinite(vTotalMargin) ? vTotalMargin.toFixed(2) : "-";
    objBlockedMargin.innerText = vSafeBlocked.toFixed(2);
    objBalanceMargin.innerText = Number.isFinite(vAvailMargin) ? vAvailMargin.toFixed(2) : "-";
    fnRefreshCoveredCallOneLotValue();
    fnRefreshCoveredCallHealth();
}

async function fnRefreshCoveredCallClosedPositions(){
    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        gCCDEExchangeClosedOrderRows = [];
        gCCDEClosedHistoryLoaded = false;
        fnDispCoveredCallClosedPositions();
        return;
    }

    let vNow = Date.now();
    let vFirstDay = new Date();
    vFirstDay = new Date(vFirstDay.getFullYear(), vFirstDay.getMonth(), 1, 0, 0, 0, 0).getTime();
    let vStartDT = fnGetDateTimeMillisByInputIdCCDE("txtClsFromDate", vFirstDay);
    let vEndDT = fnGetDateTimeMillisByInputIdCCDE("txtClsToDate", vNow);
    if(vEndDT < vStartDT){
        const vTmp = vEndDT;
        vEndDT = vStartDT;
        vStartDT = vTmp;
    }

    const objRet = await fnGetFilledOrderHistoryCCDE(objCreds.apiKey, objCreds.apiSecret, vStartDT, vEndDT);
    if(objRet.status === "success"){
        gCCDEExchangeClosedOrderRows = objRet.data;
        gCCDEClosedHistoryLoaded = true;
    }
    else{
        gCCDEExchangeClosedOrderRows = [];
        gCCDEClosedHistoryLoaded = false;
        fnSafeGenMessage(objRet.message || "Unable to load closed positions.", "badge bg-warning", "spnGenMsg");
    }
    fnDispCoveredCallClosedPositions();
}

function fnDispCoveredCallClosedPositions(){
    const objClosedTradeList = document.getElementById("tBodyClosedTrades");
    if(!objClosedTradeList){
        return;
    }

    if(gCCDEClosedHistoryLoaded){
        const objAllClosedRows = Array.isArray(gCCDEExchangeClosedOrderRows) ? gCCDEExchangeClosedOrderRows.slice() : [];
        objAllClosedRows.sort((a, b) => {
            const vA = new Date(a?.created_at || "").getTime();
            const vB = new Date(b?.created_at || "").getTime();
            return (Number.isFinite(vA) ? vA : 0) - (Number.isFinite(vB) ? vB : 0);
        });

        if(objAllClosedRows.length === 0){
            objClosedTradeList.innerHTML = '<tr><td colspan="10"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 32px;">No Closed Trades for Selected Date Range</div></td></tr>';
            return;
        }

        let vTempHtml = "";
        let vTotalCharges = 0;
        let vNetPL = 0;

        for(let i = 0; i < objAllClosedRows.length; i += 1){
            const vTrade = objAllClosedRows[i];
            const vSide = String(vTrade.side || "").toLowerCase();
            const vLotSize = Number(vTrade?.product?.contract_value || vTrade.contract_value || 1);
            const vQty = Number(vTrade.size || 0);
            const vAvgPrice = Number(vTrade.average_fill_price || 0);
            const vBuyPrice = vSide === "buy" ? vAvgPrice : 0;
            const vSellPrice = vSide === "sell" ? vAvgPrice : 0;
            const vCharges = Number(vTrade.paid_commission || 0);
            const vPL = Number(vTrade?.meta_data?.pnl || 0);
            const vOpenDT = vTrade.created_at ? (new Date(vTrade.created_at)).toLocaleString("en-GB") : "-";
            const vCloseDT = vTrade.updated_at ? (new Date(vTrade.updated_at)).toLocaleString("en-GB") : "-";

            vTotalCharges += vCharges;
            vNetPL += vPL;

            vTempHtml += "<tr>";
            vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vOpenDT + "</td>";
            vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vCloseDT + "</td>";
            vTempHtml += '<td style="text-wrap: nowrap; text-align:center; font-weight:bold;">' + (vTrade.product_symbol || "-") + "</td>";
            vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + (vTrade.side || "-") + "</td>";
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vLotSize + "</td>";
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vQty + "</td>";
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:green;">' + (vBuyPrice > 0 ? vBuyPrice.toFixed(2) : "-") + "</td>";
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:red;">' + (vSellPrice > 0 ? vSellPrice.toFixed(2) : "-") + "</td>";
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:orange;">' + vCharges.toFixed(2) + "</td>";
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vPL.toFixed(2) + "</td>";
            vTempHtml += "</tr>";
        }

        vTempHtml += '<tr><td>Total Trades</td><td>' + objAllClosedRows.length + '</td><td></td><td></td><td></td><td></td><td></td><td></td>';
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:red; font-weight:bold;">' + vTotalCharges.toFixed(2) + '</td>';
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:white; font-weight:bold;">' + vNetPL.toFixed(2) + '</td></tr>';
        objClosedTradeList.innerHTML = vTempHtml;
        return;
    }

    let objAllClosedRows = [];
    {
        const objMapClosedById = new Map();
        if(gCCDECurrPos && Array.isArray(gCCDECurrPos.TradeData)){
            for(let i = 0; i < gCCDECurrPos.TradeData.length; i += 1){
                const objLeg = gCCDECurrPos.TradeData[i];
                if(objLeg && objLeg.Status !== "OPEN" && objLeg.TradeID !== undefined){
                    objMapClosedById.set(String(objLeg.TradeID), objLeg);
                }
            }
        }
        objAllClosedRows = Array.from(objMapClosedById.values());
        const vFromMs = fnGetDateTimeMillisByInputIdCCDE("txtClsFromDate", 0);
        const vToMs = fnGetDateTimeMillisByInputIdCCDE("txtClsToDate", Number.MAX_SAFE_INTEGER);
        objAllClosedRows = objAllClosedRows.filter((objLeg) => {
            const vTradeMs = fnParseCoveredCallDateText(objLeg?.OpenDT || "");
            return vTradeMs >= vFromMs && vTradeMs <= vToMs;
        });
    }

    objAllClosedRows.sort((a, b) => fnGetCoveredCallClosedStartTs(a, false) - fnGetCoveredCallClosedStartTs(b, false));

    if(objAllClosedRows.length === 0){
        objClosedTradeList.innerHTML = '<tr><td colspan="10"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 32px;">No Closed Trades for Selected Date Range</div></td></tr>';
        return;
    }

    let vTempHtml = "";
    let vTotalCharges = 0;
    let vNetPL = 0;

    for(let i = 0; i < objAllClosedRows.length; i += 1){
        const objLeg = objAllClosedRows[i];
        const vSymbol = objLeg.Symbol || "-";
        const vTransType = objLeg.TransType || "-";
        const vSideNorm = String(vTransType || "").toLowerCase();
        const vSideColor = vSideNorm === "buy" ? "green" : (vSideNorm === "sell" ? "red" : "inherit");
        const vLotSize = parseFloat(objLeg.LotSize || 0);
        const vQty = parseFloat(objLeg.LotQty || objLeg.Qty || 0);
        let vBuyPrice = parseFloat(objLeg.BuyPrice || 0);
        let vSellPrice = parseFloat(objLeg.SellPrice || 0);
        let vCharges = parseFloat(fnCcdeGetClosedTradeCharges(objLeg));
        let vPL = parseFloat(fnCcdeGetTradePL(objLeg));
        const vOpenDT = objLeg.OpenDT || "-";
        const vCloseDT = objLeg.CloseDT || "-";

        if(!Number.isFinite(vBuyPrice)){
            vBuyPrice = 0;
        }
        if(!Number.isFinite(vSellPrice)){
            vSellPrice = 0;
        }
        if(!Number.isFinite(vCharges)){
            vCharges = 0;
        }
        if(!Number.isFinite(vPL)){
            vPL = 0;
        }

        vTotalCharges += vCharges;
        vNetPL += vPL;

        vTempHtml += "<tr>";
        vTempHtml += '<td style="text-wrap: nowrap; color:' + vSideColor + '; text-align:center;">' + vOpenDT + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:' + vSideColor + '; text-align:center;">' + vCloseDT + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:' + vSideColor + '; text-align:center;">' + vSymbol + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:' + vSideColor + '; text-align:center;">' + vTransType + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + vLotSize + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + vQty + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + (vBuyPrice > 0 ? vBuyPrice.toFixed(2) : "-") + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + (vSellPrice > 0 ? vSellPrice.toFixed(2) : "-") + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + vCharges.toFixed(2) + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + vPL.toFixed(2) + "</td>";
        vTempHtml += "</tr>";
    }

    vTempHtml += '<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>';
    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">' + vTotalCharges.toFixed(2) + '</td>';
    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">' + vNetPL.toFixed(2) + '</td></tr>';
    objClosedTradeList.innerHTML = vTempHtml;
}

function fnGetCoveredCallClosedRowPnl(pLeg, pUseExchangeRows){
    if(pUseExchangeRows){
        return Number(pLeg?.meta_data?.pnl || 0);
    }
    return fnCcdeGetTradePL(pLeg);
}

function fnGetCoveredCallClosedStartTs(pLeg, pUseExchangeRows){
    if(pUseExchangeRows){
        const vTs = new Date(pLeg?.created_at || pLeg?.updated_at || "").getTime();
        return Number.isFinite(vTs) ? vTs : 0;
    }
    return fnParseCoveredCallDateText(pLeg?.OpenDT || pLeg?.CloseDT || "");
}

function fnGetCoveredCallClosedEndTs(pLeg, pUseExchangeRows){
    if(pUseExchangeRows){
        const vTs = new Date(pLeg?.updated_at || pLeg?.created_at || "").getTime();
        return Number.isFinite(vTs) ? vTs : 0;
    }
    return fnParseCoveredCallDateText(pLeg?.CloseDT || pLeg?.OpenDT || "");
}

function fnGetCoveredCallClosedDayKey(pTs){
    const vDate = new Date(Number(pTs || 0));
    if(Number.isNaN(vDate.getTime())){
        return "Unknown";
    }
    const vYYYY = vDate.getFullYear();
    const vMM = String(vDate.getMonth() + 1).padStart(2, "0");
    const vDD = String(vDate.getDate()).padStart(2, "0");
    return `${vYYYY}-${vMM}-${vDD}`;
}

function fnParseCoveredCallDateText(pText){
    const vRaw = String(pText || "").trim();
    if(vRaw === ""){
        return 0;
    }
    let vTs = new Date(vRaw).getTime();
    if(Number.isFinite(vTs)){
        return vTs;
    }
    const objParts = vRaw.split(" ");
    const objDate = (objParts[0] || "").split("-");
    const objTime = (objParts[1] || "00:00:00").split(":");
    if(objDate.length < 3){
        return 0;
    }
    const vDD = Number(objDate[0]);
    const vMM = Number(objDate[1]) - 1;
    const vYYYY = Number(objDate[2]);
    const vHH = Number(objTime[0] || 0);
    const vMI = Number(objTime[1] || 0);
    const vSS = Number(objTime[2] || 0);
    vTs = new Date(vYYYY, vMM, vDD, vHH, vMI, vSS).getTime();
    return Number.isFinite(vTs) ? vTs : 0;
}

function fnHandleCoveredCallAuthError(pResult){
    const vErrCode = String(pResult?.data?.response?.body?.error?.code || "").trim();
    const vClientIp = String(pResult?.data?.response?.body?.error?.context?.client_ip || "").trim();
    let vMsg = String(pResult?.message || "Authentication failed.").trim();

    if(vErrCode === "ip_not_whitelisted_for_api_key"){
        vMsg = "Delta rejected this request because the current IP is not whitelisted.";
        if(vClientIp){
            vMsg += " Add this IP in Delta Exchange API settings: " + vClientIp + ".";
        }
    }
    else if(vErrCode && vMsg !== vErrCode){
        vMsg += " (" + vErrCode + ")";
    }

    fnSafeGenMessage(vMsg, "badge bg-danger", "spnGenMsg");
}

function fnHandleCoveredCallActionError(pResult, pFallbackMsg = "Request failed."){
    if(pResult?.status === "warning"){
        fnSafeGenMessage(pResult.message || pFallbackMsg, "badge bg-warning", "spnGenMsg");
        return;
    }
    fnHandleCoveredCallAuthError(pResult || { message: pFallbackMsg });
}

function fnGetLiveOpenPositionsCCDE(pApiKey, pApiSecret){
    return fetch("/coveredCallDE/getLiveOpenPositions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ApiKey: pApiKey,
            ApiSecret: pApiSecret
        }),
        redirect: "follow"
    })
    .then((response) => response.json())
    .then((objResult) => {
        const objData = Array.isArray(objResult.data) ? objResult.data : [];
        if(objResult.status === "success"){
            gCCDEFetchedLivePosRows = objData;
        }
        return { status: objResult.status, message: objResult.message, data: objData };
    })
    .catch(() => ({ status: "danger", message: "Error while fetching live positions.", data: [] }));
}

function fnRenderFetchLivePosRows(){
    const objTB = document.getElementById("tBodyFetchLivePos");
    const objSelAll = document.getElementById("chkFetchAllLivePos");
    if(!objTB){
        return;
    }
    if(objSelAll){
        objSelAll.checked = false;
    }

    if(!Array.isArray(gCCDEFetchedLivePosRows) || gCCDEFetchedLivePosRows.length === 0){
        objTB.innerHTML = '<tr><td colspan="9" style="text-align:center; font-weight:bold;">No live open positions found.</td></tr>';
        return;
    }

    let vHtml = "";
    for(let i = 0; i < gCCDEFetchedLivePosRows.length; i += 1){
        const objPos = gCCDEFetchedLivePosRows[i];
        vHtml += '<tr>';
        vHtml += '<td style="text-align:center;"><input type="checkbox" class="chkFetchLivePos" data-idx="' + i + '" /></td>';
        vHtml += '<td style="text-align:center;">' + String(objPos.Symbol || "-") + '</td>';
        vHtml += '<td style="text-align:center;">' + String(objPos.ContType || "-") + '</td>';
        vHtml += '<td style="text-align:center;">' + String(objPos.TransType || "-") + '</td>';
        vHtml += '<td style="text-align:right;">' + Number(objPos.Qty || 0).toFixed(4) + '</td>';
        vHtml += '<td style="text-align:right;">' + Number(objPos.EntryPrice || 0).toFixed(2) + '</td>';
        vHtml += '<td style="text-align:right;">' + Number(objPos.BestAsk || 0).toFixed(2) + '</td>';
        vHtml += '<td style="text-align:right;">' + Number(objPos.BestBid || 0).toFixed(2) + '</td>';
        vHtml += '<td style="text-align:right;">' + Number(objPos.UnrealizedPnL || 0).toFixed(2) + '</td>';
        vHtml += '</tr>';
    }
    objTB.innerHTML = vHtml;
}

function fnToggleSelectAllFetchLivePos(pChecked){
    const objChecks = document.querySelectorAll(".chkFetchLivePos");
    for(let i = 0; i < objChecks.length; i += 1){
        objChecks[i].checked = pChecked;
    }
}

function fnMapLivePosRowToCcdeTrade(objPos){
    const vNow = new Date();
    const vMonth = vNow.getMonth() + 1;
    const vOpenDT = vNow.getDate() + "-" + vMonth + "-" + vNow.getFullYear() + " " + vNow.getHours() + ":" + vNow.getMinutes() + ":" + vNow.getSeconds();
    const vEntry = Number(objPos.EntryPrice || 0);
    const vSide = String(objPos.TransType || "").toLowerCase();
    const vManualLotSize = Number(document.getElementById("txtCoveredCallLotSize")?.value || 0);

    const vConfiguredDeltaRaw = Number(document.getElementById("txtNewDeltaCoveredCall1")?.value || NaN);
    const vHasConfiguredDelta = Number.isFinite(vConfiguredDeltaRaw) && vConfiguredDeltaRaw > 0;
    const vOptionType = String(objPos.OptionType || "F").toUpperCase();
    let vMappedDelta = Number(objPos.Delta || 0);

    if(vHasConfiguredDelta && (vOptionType === "C" || vOptionType === "P")){
        const vAbsDelta = Math.abs(vConfiguredDeltaRaw);
        if(vOptionType === "C"){
            vMappedDelta = vSide === "sell" ? (-1 * vAbsDelta) : vAbsDelta;
        }
        else if(vOptionType === "P"){
            vMappedDelta = vSide === "sell" ? vAbsDelta : (-1 * vAbsDelta);
        }
    }

    return {
        TradeID: Number(objPos.PositionID || Date.now() + Math.floor(Math.random() * 1000)),
        ClientOrderID: Number(objPos.PositionID || 0),
        ProductID: Number(objPos.ProductID || 0),
        Symbol: String(objPos.Symbol || "-"),
        UndrAsstSymb: String(objPos.UndrAsstSymb || ""),
        ContType: String(objPos.ContType || ""),
        OptionType: vOptionType,
        TransType: vSide === "sell" ? "sell" : "buy",
        LotSize: Number.isFinite(vManualLotSize) && vManualLotSize > 0 ? vManualLotSize : 1,
        LotQty: Number(objPos.Qty || 0),
        Qty: Number(objPos.Qty || 0),
        OrderType: String(objPos.OrderType || "market_order"),
        BuyPrice: vSide === "buy" ? vEntry : Number(objPos.BestAsk || 0),
        SellPrice: vSide === "sell" ? vEntry : Number(objPos.BestBid || 0),
        EntryPrice: vEntry,
        BestAsk: Number(objPos.BestAsk || 0),
        BestBid: Number(objPos.BestBid || 0),
        StrikePrice: Number(objPos.Strike || 0),
        Expiry: String(objPos.Expiry || ""),
        Delta: vMappedDelta,
        DeltaC: vMappedDelta,
        Gamma: Number(objPos.Gamma || 0),
        GammaC: Number(objPos.Gamma || 0),
        Theta: Number(objPos.Theta || 0),
        ThetaC: Number(objPos.Theta || 0),
        Vega: Number(objPos.Vega || 0),
        VegaC: Number(objPos.Vega || 0),
        UnrealizedPnL: Number(objPos.UnrealizedPnL || 0),
        OpenDT: vOpenDT,
        CloseDT: "-",
        Status: "OPEN"
    };
}

function fnApplyCoveredCallOptionConfigToMappedTrade(objMappedTrade, objExistingTrade = null){
    const vOptionType = String(objMappedTrade?.OptionType || "").toUpperCase();
    if(vOptionType !== "C" && vOptionType !== "P"){
        return objMappedTrade;
    }

    const vControlReEnter = !!document.getElementById("chkReLegCoveredCall1")?.checked;
    const vControlReDelta = Number(document.getElementById("txtReDeltaCoveredCall1")?.value || 0);
    const vControlDeltaTP = Number(document.getElementById("txtDeltaTPCoveredCall1")?.value || 0);
    const vControlDeltaSL = Number(document.getElementById("txtDeltaSLCoveredCall1")?.value || 0);
    const vControlCfgRow = 1;

    objMappedTrade.DeltaNP = Number((objExistingTrade?.DeltaNP ?? objExistingTrade?.DeltaRePos ?? vControlReDelta) || 0);
    objMappedTrade.DeltaTP = Number((objExistingTrade?.DeltaTP ?? vControlDeltaTP) || 0);
    objMappedTrade.DeltaSL = Number((objExistingTrade?.DeltaSL ?? vControlDeltaSL) || 0);
    objMappedTrade.ReEnter = typeof objExistingTrade?.ReEnter === "boolean" ? objExistingTrade.ReEnter : vControlReEnter;
    objMappedTrade.CfgRow = Number((objExistingTrade?.CfgRow ?? vControlCfgRow) || 1);

    return objMappedTrade;
}

function fnFindCoveredCallExistingTradeForLivePos(objPos, objExistingTrades = []){
    const vPositionId = Number(objPos?.PositionID || 0);
    const vSymbol = String(objPos?.Symbol || "").trim();
    const vSide = String(objPos?.TransType || "").toLowerCase();
    const vOptionType = String(objPos?.OptionType || "F").toUpperCase();
    const vExpiry = String(objPos?.Expiry || "").trim();
    const vQty = Number(objPos?.Qty || 0);

    let objMatch = null;
    if(vPositionId > 0){
        objMatch = objExistingTrades.find((objTrade) => Number(objTrade?.TradeID || 0) === vPositionId
            || Number(objTrade?.ClientOrderID || 0) === vPositionId);
        if(objMatch){
            return objMatch;
        }
    }

    return objExistingTrades.find((objTrade) => {
        return String(objTrade?.Symbol || "").trim() === vSymbol
            && String(objTrade?.TransType || "").toLowerCase() === vSide
            && String(objTrade?.OptionType || "").toUpperCase() === vOptionType
            && String(objTrade?.Expiry || "").trim() === vExpiry
            && Number(objTrade?.LotQty || objTrade?.Qty || 0) === vQty;
    }) || null;
}

function fnOpenEditModel(pLegID, pLotSize, pQty, pBuyPrice, pSellPrice){
    const objLegID = document.getElementById("hidLegID");
    const objLotSize = document.getElementById("txtEdLotSize");
    const objQty = document.getElementById("txtEdQty");
    const objBuyPrice = document.getElementById("txtEdBuyPrice");
    const objSellPrice = document.getElementById("txtEdSellPrice");
    if(!objLegID || !objLotSize || !objQty || !objBuyPrice || !objSellPrice){
        return;
    }

    objLegID.value = pLegID;
    objLotSize.value = pLotSize;
    objQty.value = pQty;
    objBuyPrice.value = pBuyPrice;
    objSellPrice.value = pSellPrice;
    $("#mdlLegEditor").modal("show");
}

function fnUpdateOptionLeg(){
    const objLegID = document.getElementById("hidLegID");
    const objLotSize = document.getElementById("txtEdLotSize");
    const objQty = document.getElementById("txtEdQty");
    const objBuyPrice = document.getElementById("txtEdBuyPrice");
    const objSellPrice = document.getElementById("txtEdSellPrice");

    if(!objLegID || !objLotSize || !objQty || !objBuyPrice || !objSellPrice){
        return;
    }
    if(objLotSize.value === "" || objQty.value === "" || objBuyPrice.value === "" || objSellPrice.value === ""){
        fnSafeGenMessage("Please complete all leg values before updating.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const vLegID = Number(objLegID.value);
    for(let i = 0; i < gCCDECurrPos.TradeData.length; i += 1){
        if(Number(gCCDECurrPos.TradeData[i].TradeID) === vLegID){
            gCCDECurrPos.TradeData[i].LotSize = Number(objLotSize.value);
            gCCDECurrPos.TradeData[i].LotQty = Number(objQty.value);
            gCCDECurrPos.TradeData[i].Qty = Number(objQty.value);
            gCCDECurrPos.TradeData[i].BuyPrice = Number(objBuyPrice.value);
            gCCDECurrPos.TradeData[i].SellPrice = Number(objSellPrice.value);
        }
    }

    fnSaveCoveredCallCurrentPositions();
    fnRenderCoveredCallOpenPositions();
    $("#mdlLegEditor").modal("hide");
    fnSafeGenMessage("Option leg updated.", "badge bg-success", "spnGenMsg");
}

function fnDeleteCoveredCallLeg(pLegID){
    if(!confirm("Are you sure you want to delete this leg from local Covered Call view?")){
        return;
    }
    gCCDECurrPos.TradeData = gCCDECurrPos.TradeData.filter((objTrade) => Number(objTrade.TradeID) !== Number(pLegID));
    fnSaveCoveredCallCurrentPositions();
    fnRenderCoveredCallOpenPositions();
    fnSafeGenMessage("Leg deleted from local Covered Call view.", "badge bg-warning", "spnGenMsg");
}

function fnExtractWalletRowsCCDECore(pRespData){
    if(Array.isArray(pRespData?.result)){
        return pRespData.result;
    }
    if(Array.isArray(pRespData)){
        return pRespData;
    }
    return [];
}

function fnPickWalletMetricCCDECore(pWalletRows, pFieldList){
    if(!Array.isArray(pWalletRows) || pWalletRows.length === 0){
        return NaN;
    }

    let vAnyFinite = NaN;
    for(let i = 0; i < pWalletRows.length; i += 1){
        const objRow = pWalletRows[i] || {};
        for(let j = 0; j < pFieldList.length; j += 1){
            const vNum = Number(objRow[pFieldList[j]]);
            if(Number.isFinite(vNum)){
                if(!Number.isFinite(vAnyFinite)){
                    vAnyFinite = vNum;
                }
                if(vNum > 0){
                    return vNum;
                }
            }
        }
    }
    return vAnyFinite;
}

function fnPickWalletMetricCCDECoreByPriority(pWalletRows, pPrimaryFields, pFallbackFields = []){
    const vPrimary = fnPickWalletMetricCCDECore(pWalletRows, pPrimaryFields);
    if(Number.isFinite(vPrimary)){
        return vPrimary;
    }
    return fnPickWalletMetricCCDECore(pWalletRows, pFallbackFields);
}

async function fnRefreshCoveredCallNetLimits(){
    const vIsLoggedIn = localStorage.getItem("lsCCDELoginValid") === "true";
    const vApiKey = localStorage.getItem("CCDE_ApiKey") || "";
    const vApiSecret = localStorage.getItem("CCDE_ApiSecret") || "";

    if(!vIsLoggedIn || !vApiKey || !vApiSecret){
        fnLoadNetLimitsCCDE();
        return;
    }

    try{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        const vAction = JSON.stringify({
            ApiKey: vApiKey,
            ApiSecret: vApiSecret
        });

        const response = await fetch("/coveredCallDE/validateLogin", {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        });
        const objResult = await response.json();
        if(objResult.status === "success"){
            const objWalletRows = fnExtractWalletRowsCCDECore(objResult.data);
            const vWalletUsd = fnPickWalletMetricCCDECoreByPriority(objWalletRows, ["available_balance"], ["balance", "wallet_balance"]);
            const vWalletInr = fnPickWalletMetricCCDECoreByPriority(objWalletRows, ["available_balance_inr"], ["balance_inr", "wallet_balance_inr"]);
            const vTotalMargin = fnPickWalletMetricCCDECoreByPriority(objWalletRows, ["total_margin"], ["total_margin_inr", "balance", "wallet_balance"]);
            const vBlockedMargin = fnPickWalletMetricCCDECoreByPriority(objWalletRows, ["blocked_margin"], ["blocked_margin_inr"]);
            const vAvailableMargin = fnPickWalletMetricCCDECoreByPriority(objWalletRows, ["available_balance"], ["available_balance_inr", "balance", "wallet_balance"]);

            fnCCDESetStorage("WalletUsd", Number.isFinite(vWalletUsd) ? String(vWalletUsd) : "");
            fnCCDESetStorage("WalletInr", Number.isFinite(vWalletInr) ? String(vWalletInr) : "");
            fnCCDESetStorage("TotalMargin", Number.isFinite(vTotalMargin) ? String(vTotalMargin) : "");
            fnCCDESetStorage("BlockedMargin", Number.isFinite(vBlockedMargin) ? String(vBlockedMargin) : "0");
            fnCCDESetStorage("AvailableMargin", Number.isFinite(vAvailableMargin) ? String(vAvailableMargin) : "");
        }
    }
    catch(_err){
        // Keep previously stored margin data on fetch errors.
    }

    fnLoadNetLimitsCCDE();
}

function fnLoadCoveredCallShell(){
    const vWalletUsd = fnCCDEGetStorage("WalletUsd", "");
    const vWalletInr = fnCCDEGetStorage("WalletInr", "");
    const vFutQty = fnCCDEGetStorage("FutQty", "0");
    const vCallQty = fnCCDEGetStorage("CallQty", "0");

    fnSetFieldValue("txtWalletUsd", vWalletUsd);
    fnSetFieldValue("txtWalletInr", vWalletInr);
    fnSetFieldValue("txtFutOpenQty", vFutQty);
    fnSetPmGuardText(vWalletUsd);

    const vFutNum = Number(vFutQty);
    const vCallNum = Number(vCallQty);
    if(Number.isFinite(vFutNum) && Number.isFinite(vCallNum)){
        fnSetTextValue("spnHedgeMatch", vFutNum === vCallNum ? "MATCHED" : "MISMATCH");
    }
    else{
        fnSetTextValue("spnHedgeMatch", "-");
    }

    fnLoadNetLimitsCCDE();
}

function fnRefreshCoveredCallShell(){
    fnEnsureCoveredCallWS();
    fnLoadCoveredCallShell();
    fnSafeSetButton("btnStrategyStatus", "badge bg-success", "Shell - Ready");
    fnRefreshCoveredCallNetLimits();
    fnRefreshCoveredCallHealth();
}

function fnBindCoveredCallLiveValueEvents(){
    const objSymbol = document.getElementById("ddlCoveredCallSymbol");
    const objLotSize = document.getElementById("txtCoveredCallLotSize");

    if(objSymbol && objSymbol.dataset.ccdeOneLotBound !== "true"){
        objSymbol.addEventListener("change", function(){
            fnSyncCoveredCallLotSizeBySymbol(true);
            fnEnsureCoveredCallWS();
            fnRefreshCoveredCallOneLotValue();
            fnRefreshCoveredCallHealth();
        });
        objSymbol.dataset.ccdeOneLotBound = "true";
    }

    if(objLotSize && objLotSize.dataset.ccdeOneLotBound !== "true"){
        objLotSize.addEventListener("input", fnRefreshCoveredCallOneLotValue);
        objLotSize.addEventListener("change", fnRefreshCoveredCallOneLotValue);
        objLotSize.addEventListener("input", fnRefreshCoveredCallHealth);
        objLotSize.addEventListener("change", fnRefreshCoveredCallHealth);
        objLotSize.dataset.ccdeOneLotBound = "true";
    }
}

function fnToggleAutoTrader(){
    const bAppStatus = localStorage.getItem("AppMsgStatusS");
    const vIsLoggedIn = localStorage.getItem("lsCCDELoginValid") === "true";
    const vAutoTrader = localStorage.getItem("isCCDEAutoTrader") === "true";

    if(bAppStatus === "false"){
        fnSafeGenMessage("Login to App to start Auto Trading!", "badge bg-warning", "spnGenMsg");
        return;
    }
    if(!vIsLoggedIn){
        fnSafeGenMessage("Validate trader login first.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const vNext = !vAutoTrader;
    localStorage.setItem("isCCDEAutoTrader", String(vNext));
    fnGetSetAutoTraderStatus();
    fnSafeGenMessage(`Covered Call Auto Trader is ${vNext ? "ON" : "OFF"}!`, `badge ${vNext ? "bg-success" : "bg-danger"}`, "spnGenMsg");
}

function fnGetSetAutoTraderStatus(){
    const vIsLoggedIn = localStorage.getItem("lsCCDELoginValid") === "true";
    if(!vIsLoggedIn){
        localStorage.removeItem("isCCDEAutoTrader");
        fnSafeSetButton("btnAutoTraderStatus", "badge bg-danger", "Auto Trader - OFF");
        return;
    }

    const vIsAutoTrader = localStorage.getItem("isCCDEAutoTrader") === "true";
    fnSafeSetButton("btnAutoTraderStatus", `badge ${vIsAutoTrader ? "bg-success" : "bg-danger"}`, `Auto Trader - ${vIsAutoTrader ? "ON" : "OFF"}`);
}

function fnGetCoveredCallOpenFutureTrades(){
    return fnGetCoveredCallOpenTrades().filter((objTrade) => String(objTrade?.OptionType || "").toUpperCase() === "F");
}

function fnHasCoveredCallAutoTraderEnabled(){
    return localStorage.getItem("isCCDEAutoTrader") === "true";
}

function fnValidateCoveredCallEntryReady(){
    const vIsLoggedIn = localStorage.getItem("lsCCDELoginValid") === "true";
    if(!vIsLoggedIn){
        fnSafeGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        return false;
    }
    if(!fnHasCoveredCallAutoTraderEnabled()){
        fnSafeGenMessage("Activate Auto Trader.", "badge bg-warning", "spnGenMsg");
        return false;
    }
    return true;
}

function fnGetCoveredCallFutureOrderInput(){
    const objSymbol = document.getElementById("ddlCoveredCallSymbol");
    const objLotSize = document.getElementById("txtCoveredCallLotSize");
    const objQty = document.getElementById("txtManualFutQty");
    const objOrderType = document.getElementById("ddlManualFutOrderType");

    return {
        symbol: String(objSymbol?.value || "").trim(),
        lotSize: Number(objLotSize?.value || 0),
        qty: Number(objQty?.value || 0),
        orderType: String(objOrderType?.value || "market_order").trim()
    };
}

function fnGetCoveredCallOppositeFutureSide(pSide){
    return pSide === "buy" ? "sell" : "buy";
}

function fnGetCoveredCallFutureTradesBySide(pRows, pSide){
    return (Array.isArray(pRows) ? pRows : []).filter((objTrade) => {
        return String(objTrade?.OptionType || "").toUpperCase() === "F"
            && String(objTrade?.Status || "OPEN").toUpperCase() === "OPEN"
            && String(objTrade?.TransType || "").toLowerCase() === pSide;
    });
}

function fnExecCoveredCallFutureOrder(pApiKey, pApiSecret, pSide, pInput){
    return fetch("/coveredCallDE/execFutureLeg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ApiKey: pApiKey,
            ApiSecret: pApiSecret,
            UndAssetSymbol: pInput.symbol,
            OptionType: "F",
            TransType: pSide,
            LotSize: Number(pInput.lotSize || 0),
            LotQty: Number(pInput.qty || 0),
            OrderType: pInput.orderType || "market_order",
            PointsTP: 0,
            PointsSL: 0,
            OffsetPoints: 10,
            RetryMs: 10000
        }),
        redirect: "follow"
    })
    .then((response) => response.json())
    .then((objResult) => ({ status: objResult.status, message: objResult.message, data: objResult.data }))
    .catch(() => ({ status: "danger", message: "Error while placing futures order.", data: "" }));
}

function fnGetCoveredCallExistingFutureSide(){
    const objOpenFutures = fnGetCoveredCallOpenFutureTrades();
    if(objOpenFutures.length === 0){
        return "";
    }
    return String(objOpenFutures[0]?.TransType || "").toLowerCase();
}

function fnResolveCoveredCallStrategyFutureSide(pOptionAction){
    const vExistingSide = fnGetCoveredCallExistingFutureSide();
    if(vExistingSide === "buy" || vExistingSide === "sell"){
        return vExistingSide;
    }

    const vOptionAction = String(pOptionAction || "").toLowerCase();
    if(vOptionAction === "sell"){
        return "buy";
    }
    if(vOptionAction === "buy"){
        return "sell";
    }
    return "";
}

async function fnExecuteCoveredCallFutureFlow(pSide, pInput, pOptions = {}){
    const vSide = String(pSide || "").toLowerCase();
    if(vSide !== "buy" && vSide !== "sell"){
        return { status: "warning", message: "Invalid futures side." };
    }

    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        return { status: "warning", message: "Please login with API credentials first." };
    }

    if(!pInput?.symbol){
        return { status: "warning", message: "Please select a symbol first." };
    }
    if(!Number.isFinite(Number(pInput?.qty)) || Number(pInput.qty) <= 0){
        return { status: "warning", message: "Please enter a valid futures qty." };
    }

    const objLivePos = await fnGetLiveOpenPositionsCCDE(objCreds.apiKey, objCreds.apiSecret);
    if(objLivePos.status !== "success"){
        return objLivePos;
    }

    const vOppositeSide = fnGetCoveredCallOppositeFutureSide(vSide);
    const objOppositeFutureTrades = fnGetCoveredCallFutureTradesBySide(objLivePos.data, vOppositeSide);
    if(objOppositeFutureTrades.length > 0){
        return {
            status: "warning",
            message: vSide === "sell" ? "Pls Close Open Buy Positions First" : "Pls Close Open Sell Positions First"
        };
    }

    const objOrderRes = await fnExecCoveredCallFutureOrder(objCreds.apiKey, objCreds.apiSecret, vSide, pInput);
    if(objOrderRes.status !== "success"){
        return objOrderRes;
    }

    await fnRefreshAllOpenBrowser(!!pOptions.silentRefresh);
    await fnRefreshCoveredCallClosedPositions();

    if(!pOptions.silentSuccess){
        fnSafeGenMessage(vSide === "buy" ? "Future buy executed." : "Future sell executed.", "badge bg-success", "spnGenMsg");
    }
    return { status: "success", message: "Futures executed.", data: objOrderRes.data };
}

function fnGetCoveredCallOptionOrderInput(){
    const objReEnter = document.getElementById("chkReLegCoveredCall1");
    return {
        action: String(document.getElementById("ddlActionCoveredCall1")?.value || "none").trim().toLowerCase(),
        legSide: String(document.getElementById("ddlLegSideCoveredCall1")?.value || "ce").trim().toLowerCase(),
        expiryRaw: String(document.getElementById("txtExpiryCoveredCall1")?.value || "").trim(),
        expiry: fnSetCoveredCallDDMMYYYY(document.getElementById("txtExpiryCoveredCall1")?.value || ""),
        qty: Number(document.getElementById("txtManualOptQtyCoveredCall1")?.value || 0),
        newDelta: Number(document.getElementById("txtNewDeltaCoveredCall1")?.value || 0),
        reDelta: Number(document.getElementById("txtReDeltaCoveredCall1")?.value || 0),
        deltaTP: Number(document.getElementById("txtDeltaTPCoveredCall1")?.value || 0),
        deltaSL: Number(document.getElementById("txtDeltaSLCoveredCall1")?.value || 0),
        symbol: String(document.getElementById("ddlCoveredCallSymbol")?.value || "").trim(),
        lotSize: Number(document.getElementById("txtCoveredCallLotSize")?.value || 0),
        orderType: String(document.getElementById("ddlManualFutOrderType")?.value || "market_order").trim(),
        reEnter: !!(objReEnter && objReEnter.checked)
    };
}

function fnGetCoveredCallOptionTypesBySelection(pLegSide){
    const vLegSide = String(pLegSide || "").toLowerCase();
    if(vLegSide === "both"){
        return ["C", "P"];
    }
    if(vLegSide === "pe"){
        return ["P"];
    }
    return ["C"];
}

function fnFindCoveredCallOpenOptionTrade(pOptionType, pTransType, pExpiry){
    return fnGetCoveredCallOpenTrades().find((objTrade) => {
        return String(objTrade?.OptionType || "").toUpperCase() === String(pOptionType || "").toUpperCase()
            && String(objTrade?.TransType || "").toLowerCase() === String(pTransType || "").toLowerCase()
            && String(objTrade?.Expiry || "").trim() === String(pExpiry || "").trim();
    }) || null;
}

function fnExecCoveredCallOptionLeg(pApiKey, pApiSecret, pOptionType, pInput){
    return fetch("/coveredCallDE/execOptionLeg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ApiKey: pApiKey,
            ApiSecret: pApiSecret,
            UndAssetSymbol: pInput.symbol,
            Expiry: pInput.expiry,
            OptionType: pOptionType,
            TransType: pInput.action,
            LotSize: Number(pInput.lotSize || 0),
            LotQty: Number(pInput.qty || 0),
            OrderType: pInput.orderType || "market_order",
            DeltaPos: Number(pInput.newDelta || 0),
            DeltaRePos: Number(pInput.reDelta || 0),
            DeltaTP: Number(pInput.deltaTP || 0),
            DeltaSL: Number(pInput.deltaSL || 0)
        }),
        redirect: "follow"
    })
    .then((response) => response.json())
    .then((objResult) => ({ status: objResult.status, message: objResult.message, data: objResult.data }))
    .catch(() => ({ status: "danger", message: "Error while placing option order.", data: "" }));
}

function fnMapCoveredCallExecOptionTrade(objTradeDtls, pInput){
    const vDate = new Date();
    const vMonth = vDate.getMonth() + 1;
    const vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

    return {
        TradeID: objTradeDtls?.TradeID,
        ProductID: objTradeDtls?.ProductID,
        OpenDT: vToday,
        Symbol: objTradeDtls?.Symbol,
        UndrAsstSymb: objTradeDtls?.UndrAsstSymb,
        ContrctType: objTradeDtls?.ContType,
        ContType: objTradeDtls?.ContType,
        TransType: objTradeDtls?.TransType,
        OptionType: objTradeDtls?.OptionType,
        StrikePrice: parseInt(objTradeDtls?.Strike || 0),
        Expiry: objTradeDtls?.Expiry,
        LotSize: Number(objTradeDtls?.LotSize || pInput.lotSize || 0),
        LotQty: Number(objTradeDtls?.LotQty || pInput.qty || 0),
        Qty: Number(objTradeDtls?.LotQty || pInput.qty || 0),
        BuyPrice: Number(objTradeDtls?.BestAsk || 0),
        SellPrice: Number(objTradeDtls?.BestBid || 0),
        Commission: Number(objTradeDtls?.Commission || 0),
        BuyCommission: String(objTradeDtls?.TransType || "").toLowerCase() === "buy" ? Number(objTradeDtls?.Commission || 0) : 0,
        SellCommission: String(objTradeDtls?.TransType || "").toLowerCase() === "sell" ? Number(objTradeDtls?.Commission || 0) : 0,
        Delta: Number(objTradeDtls?.Delta || 0),
        DeltaC: Number(objTradeDtls?.DeltaC || objTradeDtls?.Delta || 0),
        Gamma: Number(objTradeDtls?.Gamma || 0),
        GammaC: Number(objTradeDtls?.GammaC || objTradeDtls?.Gamma || 0),
        Theta: Number(objTradeDtls?.Theta || 0),
        ThetaC: Number(objTradeDtls?.ThetaC || objTradeDtls?.Theta || 0),
        Vega: Number(objTradeDtls?.Vega || 0),
        VegaC: Number(objTradeDtls?.VegaC || objTradeDtls?.Vega || 0),
        DeltaNP: Number(objTradeDtls?.DeltaRePos || pInput.reDelta || 0),
        DeltaTP: Number(objTradeDtls?.DeltaTP || pInput.deltaTP || 0),
        DeltaSL: Number(objTradeDtls?.DeltaSL || pInput.deltaSL || 0),
        ReEnter: !!pInput.reEnter,
        CfgRow: 1,
        Status: "OPEN",
        CloseDT: "-"
    };
}

async function fnOpenCoveredCallOption(){
    if(!fnValidateCoveredCallEntryReady()){
        return;
    }

    fnSyncCoveredCallExpiryByMode();

    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        fnSafeGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const objRes = await fnExecuteCoveredCallOptionFlow(fnGetCoveredCallOptionOrderInput(), { silentSuccess: false });
    if(objRes.status !== "success"){
        if(objRes.status === "warning"){
            fnSafeGenMessage(objRes.message || "Option execution skipped.", "badge bg-warning", "spnGenMsg");
            return;
        }
        fnHandleCoveredCallAuthError(objRes);
    }
}

async function fnExecuteCoveredCallOptionFlow(pInput, pOptions = {}){
    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        return { status: "warning", message: "Please login with API credentials first." };
    }

    const objInput = { ...pInput };
    if(objInput.action === "none"){
        return { status: "warning", message: "Please select option action first." };
    }
    if(!objInput.expiryRaw && objInput.expiry){
        objInput.expiryRaw = objInput.expiry;
    }
    if(!objInput.expiryRaw || !objInput.expiry){
        return { status: "warning", message: "Please select a valid expiry date." };
    }
    if(!Number.isFinite(objInput.qty) || objInput.qty <= 0){
        return { status: "warning", message: "Please enter a valid option qty." };
    }
    if(!Number.isFinite(objInput.newDelta) || objInput.newDelta <= 0){
        return { status: "warning", message: "Please enter a valid New D value." };
    }

    const objOptionTypes = fnGetCoveredCallOptionTypesBySelection(objInput.legSide);
    let vOpenedCount = 0;
    for(let i = 0; i < objOptionTypes.length; i += 1){
        const vOptionType = objOptionTypes[i];
        const objTradeDtls = await fnExecCoveredCallOptionLeg(objCreds.apiKey, objCreds.apiSecret, vOptionType, objInput);
        if(objTradeDtls.status !== "success"){
            return objTradeDtls;
        }

        gCCDECurrPos.TradeData.push(fnMapCoveredCallExecOptionTrade(objTradeDtls.data, objInput));
        vOpenedCount += 1;
    }

    fnSaveCoveredCallCurrentPositions();
    fnRenderCoveredCallOpenPositions();
    fnRefreshCoveredCallNetLimits();
    if(!pOptions.silentSuccess){
        fnSafeGenMessage("Option leg(s) opened: " + vOpenedCount, "badge bg-success", "spnGenMsg");
    }
    return { status: "success", message: "Option leg(s) opened: " + vOpenedCount };
}

async function fnExitCoveredCallOption(){
    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        fnSafeGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const objInput = fnGetCoveredCallOptionOrderInput();
    const objOptionTypes = fnGetCoveredCallOptionTypesBySelection(objInput.legSide);
    const objOpenOptionTrades = fnGetCoveredCallOpenTrades().filter((objTrade) => {
        return String(objTrade?.OptionType || "").toUpperCase() !== "F"
            && objOptionTypes.includes(String(objTrade?.OptionType || "").toUpperCase());
    });

    if(objOpenOptionTrades.length === 0){
        fnSafeGenMessage("No open option leg available.", "badge bg-warning", "spnGenMsg");
        return;
    }

    let vClosedCount = 0;
    for(let i = 0; i < objOpenOptionTrades.length; i += 1){
        const objCloseRes = await fnCloseLiveLegCCDE(objCreds.apiKey, objCreds.apiSecret, objOpenOptionTrades[i]);
        if(objCloseRes.status !== "success"){
            fnHandleCoveredCallAuthError(objCloseRes);
            return;
        }
        fnApplyCoveredCallClosedOptionPnl(objOpenOptionTrades[i], objCloseRes.data || {});
        vClosedCount += 1;
    }

    await fnRefreshAllOpenBrowser();
    await fnRefreshCoveredCallClosedPositions();
    fnSafeGenMessage("Option leg(s) exited: " + vClosedCount, "badge bg-success", "spnGenMsg");
}

function fnSyncCoveredCallOptionMonitor(){
    const bHasOpenOptions = fnGetCoveredCallOpenOptionTrades().length > 0;
    if(!bHasOpenOptions){
        if(gCCDEOptionMonitorInst){
            clearInterval(gCCDEOptionMonitorInst);
            gCCDEOptionMonitorInst = null;
        }
        return;
    }

    if(!gCCDEOptionMonitorInst){
        gCCDEOptionMonitorInst = setInterval(fnProcessCoveredCallOptionRolls, 10000);
    }
}

function fnGetCoveredCallLiveDeltaForTrade(objTrade){
    return fnGetCcdeCurrentGreek(objTrade?.Symbol, gCCDESymbDeltaList, Number((objTrade?.DeltaC ?? objTrade?.Delta) || 0));
}

async function fnOpenCoveredCallReplacementOption(objTrade, pOptions = {}){
    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        return { status: "warning", message: "Please login with API credentials first." };
    }
    const bRequireAutoTrader = pOptions.requireAutoTrader !== false;
    if(bRequireAutoTrader && !fnHasCoveredCallAutoTraderEnabled()){
        return { status: "warning", message: "Activate Auto Trader for re-entry." };
    }

    fnSyncCoveredCallExpiryByMode();
    const vRefreshedExpiryRaw = String(document.getElementById("txtExpiryCoveredCall1")?.value || "").trim();
    const vRefreshedExpiry = fnSetCoveredCallDDMMYYYY(vRefreshedExpiryRaw || "");

    const objInput = {
        symbol: String(objTrade?.UndrAsstSymb || document.getElementById("ddlCoveredCallSymbol")?.value || "").trim(),
        expiryRaw: vRefreshedExpiryRaw || String(objTrade?.Expiry || "").trim(),
        expiry: vRefreshedExpiry || String(objTrade?.Expiry || "").trim(),
        qty: Number.isFinite(Number(pOptions.qtyOverride)) && Number(pOptions.qtyOverride) > 0
            ? Number(pOptions.qtyOverride)
            : Number(objTrade?.LotQty || objTrade?.Qty || 0),
        lotSize: Number(objTrade?.LotSize || document.getElementById("txtCoveredCallLotSize")?.value || 0),
        orderType: String(document.getElementById("ddlManualFutOrderType")?.value || "market_order").trim(),
        action: String(objTrade?.TransType || "").toLowerCase(),
        newDelta: Number(objTrade?.DeltaNP || objTrade?.DeltaRePos || 0),
        reDelta: Number(objTrade?.DeltaNP || objTrade?.DeltaRePos || 0),
        deltaTP: Number(objTrade?.DeltaTP || 0),
        deltaSL: Number(objTrade?.DeltaSL || 0),
        reEnter: !!objTrade?.ReEnter
    };

    const objTradeDtls = await fnExecCoveredCallOptionLeg(objCreds.apiKey, objCreds.apiSecret, String(objTrade?.OptionType || "").toUpperCase(), objInput);
    if(objTradeDtls.status !== "success"){
        return objTradeDtls;
    }

    gCCDECurrPos.TradeData.push(fnMapCoveredCallExecOptionTrade(objTradeDtls.data, objInput));
    fnSaveCoveredCallCurrentPositions();
    fnRenderCoveredCallOpenPositions();
    return { status: "success", message: "Replacement option opened.", data: objTradeDtls.data };
}

async function fnCloseCoveredCallTriggeredOption(objTrade){
    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        return { status: "warning", message: "Please login with API credentials first." };
    }

    const objCloseRes = await fnCloseLiveLegCCDE(objCreds.apiKey, objCreds.apiSecret, objTrade);
    if(objCloseRes.status !== "success"){
        return objCloseRes;
    }

    fnApplyCoveredCallClosedOptionPnl(objTrade, objCloseRes.data || {});
    return objCloseRes;
}

async function fnHandleCoveredCallOptionTp(objTrade){
    const bReEnter = !!objTrade?.ReEnter;
    if(bReEnter){
        await fnRefreshCoveredCallLivePositionCache(true);
        const objSnapshot = fnGetCoveredCallLiveFutureSnapshot(gCCDEFetchedLivePosRows, objTrade);
        const vQtyToOpen = objSnapshot.totalQty > 0 ? objSnapshot.totalQty : Number(objTrade?.LotQty || objTrade?.Qty || 0);
        const objOpenRes = await fnOpenCoveredCallReplacementOption(objTrade, {
            qtyOverride: vQtyToOpen,
            requireAutoTrader: true
        });
        if(objOpenRes.status !== "success"){
            fnSafeGenMessage((objOpenRes.message || "TP re-entry open failed.") + " Existing option kept open.", "badge bg-warning", "spnGenMsg");
            return;
        }
    }

    const objCloseRes = await fnCloseCoveredCallTriggeredOption(objTrade);
    if(objCloseRes.status !== "success"){
        fnHandleCoveredCallActionError(objCloseRes, "Unable to close TP option.");
        return;
    }

    await fnRefreshAllOpenBrowser(true);
    await fnRefreshCoveredCallClosedPositions();
    fnSafeGenMessage(bReEnter ? "Option rolled after TP trigger." : "Option exited after TP trigger.", "badge bg-success", "spnGenMsg");
}

async function fnHandleCoveredCallOptionSl(objTrade){
    const objAddDecision = fnShouldAddOneMoreFutureOnSl();
    let objLiveRes = await fnRefreshCoveredCallLivePositionCache(true);
    if(objLiveRes.status !== "success"){
        fnHandleCoveredCallActionError(objLiveRes, "Unable to fetch live positions for SL handling.");
        return;
    }

    let objSnapshot = fnGetCoveredCallLiveFutureSnapshot(gCCDEFetchedLivePosRows, objTrade);
    let bAddedFuture = false;
    let bResetOptionsPnl = false;

    if(objAddDecision.shouldAdd){
        let vFutureSide = objSnapshot.side;
        if(vFutureSide !== "buy" && vFutureSide !== "sell"){
            vFutureSide = fnResolveCoveredCallStrategyFutureSide(String(objTrade?.TransType || "").toLowerCase());
        }

        if(vFutureSide === "buy" || vFutureSide === "sell"){
            const objFutureInput = fnGetCoveredCallFutureOrderInput();
            objFutureInput.symbol = String(objTrade?.UndrAsstSymb || objFutureInput.symbol || "").trim();
            objFutureInput.qty = 1;
            objFutureInput.lotSize = objSnapshot.lotSize > 0 ? objSnapshot.lotSize : Number(objTrade?.LotSize || objFutureInput.lotSize || 0);

            const objFutRes = await fnExecuteCoveredCallFutureFlow(vFutureSide, objFutureInput, { silentSuccess: true, silentRefresh: true });
            if(objFutRes.status !== "success"){
                fnHandleCoveredCallActionError(objFutRes, "Unable to add 1 futures lot on SL.");
                return;
            }

            bAddedFuture = true;
            if(objAddDecision.optionsPnlGate){
                fnSetCoveredCallOptionsPnlBase(0);
                bResetOptionsPnl = true;
            }

            objLiveRes = await fnRefreshCoveredCallLivePositionCache(true);
            if(objLiveRes.status !== "success"){
                fnHandleCoveredCallActionError(objLiveRes, "Unable to refresh live positions after adding futures.");
                return;
            }
            objSnapshot = fnGetCoveredCallLiveFutureSnapshot(gCCDEFetchedLivePosRows, objTrade);
        }
    }

    const vQtyToOpen = objSnapshot.totalQty;
    if(Number.isFinite(vQtyToOpen) && vQtyToOpen > 0){
        const objOpenRes = await fnOpenCoveredCallReplacementOption(objTrade, {
            qtyOverride: vQtyToOpen,
            requireAutoTrader: false
        });
        if(objOpenRes.status !== "success"){
            fnSafeGenMessage((objOpenRes.message || "SL replacement open failed.") + " Existing option kept open.", "badge bg-warning", "spnGenMsg");
            return;
        }
    }

    const objCloseRes = await fnCloseCoveredCallTriggeredOption(objTrade);
    if(objCloseRes.status !== "success"){
        fnHandleCoveredCallActionError(objCloseRes, "Unable to close SL option.");
        return;
    }

    await fnRefreshAllOpenBrowser(true);
    await fnRefreshCoveredCallClosedPositions();
    if(bAddedFuture){
        fnSafeGenMessage(`Option rolled after SL trigger. Added 1 futures lot${bResetOptionsPnl ? " and reset Options PnL" : ""}.`, "badge bg-success", "spnGenMsg");
    }
    else if(Number.isFinite(vQtyToOpen) && vQtyToOpen > 0){
        fnSafeGenMessage("Option rolled after SL trigger using existing futures qty.", "badge bg-success", "spnGenMsg");
    }
    else{
        fnSafeGenMessage("Option exited after SL trigger. No futures qty available for replacement.", "badge bg-warning", "spnGenMsg");
    }
}

async function fnProcessCoveredCallOptionRolls(){
    if(gCCDEOptionMonitorBusy){
        return;
    }

    const objOpenOptions = fnGetCoveredCallOpenOptionTrades();
    if(objOpenOptions.length === 0){
        fnSyncCoveredCallOptionMonitor();
        return;
    }

    gCCDEOptionMonitorBusy = true;
    try{
        for(let i = 0; i < objOpenOptions.length; i += 1){
            const objTrade = objOpenOptions[i];
            const objDecision = fnGetCoveredCallTriggerDecision(objTrade);
            if(!objDecision.shouldAct){
                continue;
            }

            if(objDecision.reason === "sl"){
                await fnHandleCoveredCallOptionSl(objTrade);
                return;
            }
            if(objDecision.reason === "tp"){
                await fnHandleCoveredCallOptionTp(objTrade);
                return;
            }
        }
    }
    finally{
        gCCDEOptionMonitorBusy = false;
    }
}

function fnGetCoveredCallStrategyOptionInput(pQtyOverride = null){
    fnSyncCoveredCallExpiryByMode();
    const objInput = fnGetCoveredCallOptionOrderInput();
    if(Number.isFinite(Number(pQtyOverride)) && Number(pQtyOverride) > 0){
        objInput.qty = Number(pQtyOverride);
    }
    return objInput;
}

function fnGetCoveredCallManualStrategyFutureInput(){
    return fnGetCoveredCallFutureOrderInput();
}

async function fnGetCoveredCallBestRatesBySymbol(pSymbol){
    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        return { status: "warning", message: "Please login with API credentials first.", data: null };
    }

    return fetch("/coveredCallDE/getBestRatesBySymb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ApiKey: objCreds.apiKey,
            ApiSecret: objCreds.apiSecret,
            Symbol: pSymbol
        }),
        redirect: "follow"
    })
    .then((response) => response.json())
    .then((objResult) => {
        if(objResult.status !== "success"){
            return { status: objResult.status, message: objResult.message, data: null };
        }
        try{
            return { status: "success", message: objResult.message, data: JSON.parse(objResult.data) };
        }
        catch(_err){
            return { status: "warning", message: "Unable to parse ticker response.", data: null };
        }
    })
    .catch(() => ({ status: "danger", message: "Error while fetching BTCUSD price.", data: null }));
}

async function fnRunCoveredCallStrategy(pOptions = {}){
    if(gCCDEStrategyBusy){
        return { status: "warning", message: "Strategy execution already running." };
    }

    gCCDEStrategyBusy = true;
    try{
        if(!fnValidateCoveredCallEntryReady()){
            return { status: "warning", message: "Activate Auto Trader." };
        }

        const objOptionInput = fnGetCoveredCallStrategyOptionInput();
        const vFutureSide = fnResolveCoveredCallStrategyFutureSide(objOptionInput.action);
        if(vFutureSide !== "buy" && vFutureSide !== "sell"){
            return { status: "warning", message: "Unable to resolve futures side for strategy." };
        }

        const objFutureInput = fnGetCoveredCallManualStrategyFutureInput();
        const objFutRes = await fnExecuteCoveredCallFutureFlow(vFutureSide, objFutureInput, { silentSuccess: true });
        if(objFutRes.status !== "success"){
            return objFutRes;
        }

        const objOptRes = await fnExecuteCoveredCallOptionFlow(objOptionInput, { silentSuccess: true });
        if(objOptRes.status !== "success"){
            return objOptRes;
        }

        fnSafeGenMessage("Strategy executed. Futures opened first, then option leg(s).", "badge bg-success", "spnGenMsg");
        return { status: "success", message: "Strategy executed." };
    }
    finally{
        gCCDEStrategyBusy = false;
    }
}

async function fnExecCoveredCallStrategy(){
    const objRes = await fnRunCoveredCallStrategy({ autoDaily: false });
    if(objRes.status !== "success"){
        if(objRes.status === "warning"){
            fnSafeGenMessage(objRes.message || "Strategy execution skipped.", "badge bg-warning", "spnGenMsg");
            return;
        }
        fnHandleCoveredCallAuthError(objRes);
    }
}

function fnSyncCoveredCallStrategyTimer(){
    if(gCCDEStrategyTimerInst){
        clearInterval(gCCDEStrategyTimerInst);
        gCCDEStrategyTimerInst = null;
    }
}

async function fnOpenCoveredCallFuture(pSide){
    const vSide = String(pSide || "").toLowerCase();
    if(vSide !== "buy" && vSide !== "sell"){
        fnSafeGenMessage("Invalid futures side.", "badge bg-warning", "spnGenMsg");
        return;
    }

    if(!fnValidateCoveredCallEntryReady()){
        return;
    }

    const objInput = fnGetCoveredCallFutureOrderInput();
    const objRes = await fnExecuteCoveredCallFutureFlow(vSide, objInput, { silentSuccess: false });
    if(objRes.status !== "success"){
        if(objRes.status === "warning"){
            fnSafeGenMessage(objRes.message || "Future execution skipped.", "badge bg-warning", "spnGenMsg");
            return;
        }
        fnHandleCoveredCallAuthError(objRes);
    }
}

async function fnExitCoveredCallFuture(){
    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        fnSafeGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const objFutureTrades = fnGetCoveredCallOpenFutureTrades();
    if(objFutureTrades.length === 0){
        fnSafeGenMessage("No open futures position available.", "badge bg-warning", "spnGenMsg");
        return;
    }

    let vClosedCount = 0;
    for(let i = 0; i < objFutureTrades.length; i += 1){
        const objCloseRes = await fnCloseLiveLegCCDE(objCreds.apiKey, objCreds.apiSecret, objFutureTrades[i]);
        if(objCloseRes.status !== "success"){
            fnHandleCoveredCallAuthError(objCloseRes);
            return;
        }
        vClosedCount += 1;
    }

    await fnRefreshAllOpenBrowser();
    await fnRefreshCoveredCallClosedPositions();
    fnSafeGenMessage("Futures exit completed. Closed row(s): " + vClosedCount, "badge bg-success", "spnGenMsg");
}

async function fnOpenFetchLivePosModal(){
    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        fnSafeGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const objRet = await fnGetLiveOpenPositionsCCDE(objCreds.apiKey, objCreds.apiSecret);
    if(objRet.status !== "success"){
        fnHandleCoveredCallAuthError(objRet);
        return;
    }

    gCCDEFetchedLivePosRows = Array.isArray(objRet.data) ? objRet.data : [];
    fnRenderFetchLivePosRows();
    $("#mdlFetchLivePos").modal("show");
}

function fnAddSelectedLivePosToLocal(){
    const objChecks = document.querySelectorAll(".chkFetchLivePos:checked");
    if(objChecks.length === 0){
        fnSafeGenMessage("Please select at least one position.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const objReplaceInp = document.getElementById("chkReplaceExistingLivePos");
    const bReplaceExisting = !!(objReplaceInp && objReplaceInp.checked);

    for(let i = 0; i < objChecks.length; i += 1){
        const vIdx = parseInt(objChecks[i].getAttribute("data-idx"));
        if(!Number.isFinite(vIdx)){
            continue;
        }
        const objPos = gCCDEFetchedLivePosRows[vIdx];
        if(!objPos){
            continue;
        }

        if(bReplaceExisting){
            gCCDECurrPos.TradeData = gCCDECurrPos.TradeData.filter((objTrade) => String(objTrade.Symbol) !== String(objPos.Symbol));
        }

        const vExistingIdx = gCCDECurrPos.TradeData.findIndex((objTrade) => Number(objTrade.TradeID) === Number(objPos.PositionID));
        const objExistingTrade = vExistingIdx >= 0 ? gCCDECurrPos.TradeData[vExistingIdx] : fnFindCoveredCallExistingTradeForLivePos(objPos, gCCDECurrPos.TradeData);
        const objMappedTrade = fnApplyCoveredCallOptionConfigToMappedTrade(fnMapLivePosRowToCcdeTrade(objPos), objExistingTrade);
        if(vExistingIdx >= 0){
            gCCDECurrPos.TradeData[vExistingIdx] = objMappedTrade;
        }
        else{
            gCCDECurrPos.TradeData.push(objMappedTrade);
        }
    }

    fnSaveCoveredCallCurrentPositions();
    fnRenderCoveredCallOpenPositions();
    $("#mdlFetchLivePos").modal("hide");
    fnSafeGenMessage("Selected live positions added to Covered Call.", "badge bg-success", "spnGenMsg");
}

function fnClearLocalStorageTemp(){
    gCCDECurrPos = { TradeData: [] };
    fnSaveCoveredCallCurrentPositions();
    fnRenderCoveredCallOpenPositions();
    fnSafeGenMessage("Covered Call local open-position view cleared.", "badge bg-warning", "spnGenMsg");
}

async function fnRefreshAllOpenBrowser(pSilent = false){
    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        if(!pSilent){
            fnSafeGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        }
        return;
    }

    const objRet = await fnGetLiveOpenPositionsCCDE(objCreds.apiKey, objCreds.apiSecret);
    if(objRet.status !== "success"){
        if(!pSilent){
            fnHandleCoveredCallActionError(objRet, "Unable to refresh open positions.");
        }
        return;
    }

    const objRows = Array.isArray(objRet.data) ? objRet.data : [];
    const objExistingTrades = Array.isArray(gCCDECurrPos?.TradeData) ? [...gCCDECurrPos.TradeData] : [];
    gCCDECurrPos.TradeData = objRows.map((objPos) => {
        const objExistingTrade = fnFindCoveredCallExistingTradeForLivePos(objPos, objExistingTrades);
        return fnApplyCoveredCallOptionConfigToMappedTrade(fnMapLivePosRowToCcdeTrade(objPos), objExistingTrade);
    });
    fnSaveCoveredCallCurrentPositions();
    fnRefreshCoveredCallHealth();
    fnRenderCoveredCallOpenPositions();
    fnRefreshCoveredCallClosedPositions();
    fnRefreshCoveredCallNetLimits();
    if(!pSilent){
        fnSafeGenMessage("Covered Call open positions refreshed from Delta Exchange.", "badge bg-success", "spnGenMsg");
    }
}

function fnCloseLiveLegCCDE(pApiKey, pApiSecret, objTrade){
    const objOrderType = document.getElementById("ddlManualFutOrderType");
    const vOrderType = objOrderType?.value || "market_order";
    return fetch("/coveredCallDE/closeLeg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ApiKey: pApiKey,
            ApiSecret: pApiSecret,
            Symbol: objTrade.Symbol,
            TransType: objTrade.TransType,
            OptionType: objTrade.OptionType,
            LotSize: Number(objTrade.LotSize || 0),
            LotQty: Number(objTrade.LotQty || objTrade.Qty || 0),
            OrderType: vOrderType
        }),
        redirect: "follow"
    })
    .then((response) => response.json())
    .then((objResult) => ({ status: objResult.status, message: objResult.message, data: objResult.data }))
    .catch(() => ({ status: "danger", message: "Error at close leg.", data: "" }));
}

async function fnCloseCoveredCallPosition(pLegID){
    const objTrade = gCCDECurrPos.TradeData.find((objRow) => Number(objRow.TradeID) === Number(pLegID));
    if(!objTrade){
        fnSafeGenMessage("Leg not found for close.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        fnSafeGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const objCloseRes = await fnCloseLiveLegCCDE(objCreds.apiKey, objCreds.apiSecret, objTrade);
    if(objCloseRes.status !== "success"){
        fnHandleCoveredCallAuthError(objCloseRes);
        return;
    }

    if(String(objTrade?.OptionType || "").toUpperCase() !== "F"){
        fnApplyCoveredCallClosedOptionPnl(objTrade, objCloseRes.data || {});
    }

    await fnRefreshAllOpenBrowser();
    await fnRefreshCoveredCallClosedPositions();
}

async function fnKillSwitchCloseAll(){
    const objOpenLegs = gCCDECurrPos.TradeData.filter((objTrade) => objTrade && objTrade.Status === "OPEN");
    if(objOpenLegs.length === 0){
        fnSafeGenMessage("No open legs to close.", "badge bg-warning", "spnGenMsg");
        return;
    }
    if(!confirm("Kill switch: close all open Covered Call live legs now?")){
        return;
    }

    const objCreds = fnGetCCDECreds();
    if(!objCreds.apiKey || !objCreds.apiSecret){
        fnSafeGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        return;
    }

    let vClosed = 0;
    for(let i = 0; i < objOpenLegs.length; i += 1){
        const objCloseRes = await fnCloseLiveLegCCDE(objCreds.apiKey, objCreds.apiSecret, objOpenLegs[i]);
        if(objCloseRes.status === "success"){
            if(String(objOpenLegs[i]?.OptionType || "").toUpperCase() !== "F"){
                fnApplyCoveredCallClosedOptionPnl(objOpenLegs[i], objCloseRes.data || {});
            }
            vClosed += 1;
        }
    }

    await fnRefreshAllOpenBrowser();
    await fnRefreshCoveredCallClosedPositions();
    fnSafeGenMessage("Kill switch executed. Closed legs: " + vClosed, "badge bg-success", "spnGenMsg");
}

window.addEventListener("DOMContentLoaded", function(){
    fnLoadCoveredCallCurrentPositions();
    fnRestoreManualTraderControlsCCDE();
    fnSyncCoveredCallLotSizeBySymbol(true);
    fnBindCoveredCallOptionsPnlInput();
    fnRefreshCoveredCallOptionsPnlInput();
    fnBindCoveredCallLiveValueEvents();
    fnBindCoveredCallExpiryMode();
    fnSyncCoveredCallExpiryByMode();
    fnInitClosedPosDateTimeFilters();
    fnEnsureCoveredCallWS();
    fnLoadCoveredCallShell();
    fnGetSetAutoTraderStatus();
    fnSafeSetButton("btnStrategyStatus", "badge bg-success", "Shell - Ready");
    fnRenderCoveredCallOpenPositions();
    fnSyncCoveredCallOptionMonitor();
    fnSyncCoveredCallStrategyTimer();
    fnDispCoveredCallClosedPositions();
    fnRefreshCoveredCallClosedPositions();
    fnRefreshCoveredCallNetLimits();
    fnRefreshCoveredCallLivePositionCache(true);
});
