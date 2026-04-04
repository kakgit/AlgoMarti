let objDeltaWS = null;
let gByorSl = "";
let gCurrPos = null;
let gBuyPrice, gSellPrice, gLotSize, gQty, gAmtSL, gAmtTP1, gAmtTP, gCharges, gCapital, gOrderDT = 0;
let gBrokerage = 0.05;
let gMaxTradeTime = 30;
let gLeverage = 160;
let gTimerID = 0;
let gTimeDiff = 900;
let gLossRecPerct = 100;
let gMultiplierX = 1.0;
let gMakerFeePct = 0.02;
let gTakerFeePct = 0.05;
let gLiveExitFeeMode = "taker";
let gOldPLAmt = 0;
let gNewPLAmt = 0;
let gPL = 0;
let gHisCandleMins = 1; //Eg: 1, 3, 5, 15, 30
let gSubInterval = 0;
let gManualSubIntvl = 0;
let gForceCloseDFL = false;
let g50Perc1Time = true;
let gRenkoFeedWS = null;
let gRenkoFeedEnabled = false;
let gRenkoFeedForceClose = false;
let gRenkoFeedStepPts = 200;
let gRenkoFeedPriceSource = "mark_price";
let gRenkoFeedAnchor = null;
let gRenkoFeedMaxRows = 300;
let gRenkoPatternSeq = "";
let gRenkoPatternMaxLen = 0;
let gExchangeClosedOrderRows = [];
let gClosedHistoryLoaded = false;
let gRenkoPendingPollId = 0;
let gRenkoPendingPollBusy = false;
let gCloseInFlight = false;
let gCloseStartedAt = 0;
let gLastCloseReason = "";
const gCloseLockTimeoutMs = 20000;
let gTelegramHeartbeatTimer = null;
let gFnGenMessageWrapped = false;
let gLastTgErrAlertKey = "";
let gLastTgErrAlertTs = 0;
let gAppConnDown = false;
let gAppConnDownSince = 0;
let gAppConnDownReason = "";
let gLastTgConnAlertTs = 0;
let gRenkoSellState = {
    LastBox: null,
    LastBoxSize: 0,
    Pending: null,
    SecondChance: null,
    OppExitCount: 0,
    Busy: false,
    LastDiagMsg: "",
    LastDiagTs: 0
};
let gRenkoBuyState = {
    LastBox: null,
    LastBoxSize: 0,
    Pending: null,
    SecondChance: null,
    OppExitCount: 0,
    Busy: false,
    LastDiagMsg: "",
    LastDiagTs: 0
};
let gSellActState = {
    LastBox: null,
    PendingOrders: [],
    Busy: false
};

function fnAcquireCloseLock(pReason = ""){
    const vNow = Date.now();
    if(gCloseInFlight && (vNow - gCloseStartedAt) < gCloseLockTimeoutMs){
        if(pReason){
            fnGenMessage(`Close skipped: already in progress (${gLastCloseReason || "ongoing"}).`, `badge bg-warning`, "spnGenMsg");
        }
        return false;
    }
    gCloseInFlight = true;
    gCloseStartedAt = vNow;
    gLastCloseReason = pReason || "";
    return true;
}

function fnReleaseCloseLock(){
    gCloseInFlight = false;
    gCloseStartedAt = 0;
    gLastCloseReason = "";
}

function fnRequestClose(pReason = "", pMode = "full"){
    if(pMode === "partial"){
        return fnClosePrctTrade(pReason);
    }
    return fnCloseManualFutures(gByorSl, pReason);
}

function fnGetTelegramConfig(){
    let objTgBotToken = document.getElementById("txtTelegramBotToken");
    let objTgChatId = document.getElementById("txtTelegramChatId");
    return {
        botToken: (objTgBotToken?.value || "").trim(),
        chatId: (objTgChatId?.value || "").trim()
    };
}

function fnInitRuntimeTelegramWatchers(){
    if(!gFnGenMessageWrapped && typeof window.fnGenMessage === "function"){
        const fnOrigGenMessage = window.fnGenMessage;
        window.fnGenMessage = function(pMsg, pStyle, pSpnId){
            try{
                fnOrigGenMessage(pMsg, pStyle, pSpnId);
            }
            finally{
                try{
                    const vStyle = String(pStyle || "").toLowerCase();
                    const vMsg = String(pMsg || "");
                    if(vStyle.includes("bg-danger")){
                        fnNotifyStrategyErrorToTelegram(vMsg);
                    }
                }
                catch(_objErr){
                    // no-op
                }
            }
        };
        gFnGenMessageWrapped = true;
    }

    fnStartHourlyTelegramHeartbeat();
}

function fnStartHourlyTelegramHeartbeat(){
    if(gTelegramHeartbeatTimer !== null){
        clearInterval(gTelegramHeartbeatTimer);
    }
    setTimeout(() => {
        fnSendHeartbeatToTelegram();
    }, 15000);

    gTelegramHeartbeatTimer = setInterval(() => {
        fnSendHeartbeatToTelegram();
    }, 3600000);
}

function fnSendHeartbeatToTelegram(){
    const vNetPnl = fnGetNetPnlValue();
    const vY2R = fnGetYetToRecoverValue();
    const vMsg = `DeltaFutScprLive\nApp is Up and Running\nNet PnL: ${vNetPnl.toFixed(2)}\nYet to Recover: ${vY2R.toFixed(2)}\nTime: ${new Date().toLocaleString("en-GB")}`;
    fnSendTelegramRuntimeAlert(vMsg);
}

function fnGetNetPnlValue(){
    const objNet = document.getElementById("tdHeadPL");
    if(objNet){
        const vTxt = String(objNet.innerText || objNet.textContent || "").replace(/,/g, "").trim();
        const vNum = Number(vTxt);
        if(Number.isFinite(vNum)){
            return vNum;
        }
    }
    return Number.isFinite(Number(gPL)) ? Number(gPL) : 0;
}

function fnGetYetToRecoverValue(){
    const objY2R = document.getElementById("spnYtRL");
    if(objY2R){
        const vTxt = String(objY2R.innerText || objY2R.textContent || "").replace(/,/g, "").trim();
        const vNum = Number(vTxt);
        if(Number.isFinite(vNum)){
            return vNum;
        }
    }
    return 0;
}

function fnGetLossToRecoverAmt(){
    const vAmt = Number(localStorage.getItem("DFSL_LossToRecAmt"));
    if(Number.isFinite(vAmt) && vAmt > 0){
        return vAmt;
    }
    // Backward-compatibility: migrate from legacy mixed bucket.
    const vLegacy = Number(localStorage.getItem("DFSL_TotLossAmt"));
    if(Number.isFinite(vLegacy) && vLegacy < 0){
        return Math.abs(vLegacy);
    }
    return 0;
}

function fnSetLossToRecoverAmt(pAmt){
    let vAmt = Number(pAmt);
    if(!Number.isFinite(vAmt) || vAmt < 0){
        vAmt = 0;
    }
    localStorage.setItem("DFSL_LossToRecAmt", vAmt.toFixed(2));
    // Keep legacy recovery bucket strictly loss-only: 0 (recovered) or negative (loss pending).
    localStorage.setItem("DFSL_TotLossAmt", (-vAmt).toFixed(2));
    return vAmt;
}

function fnApplyLossToRecoverFromClosedTradePL(pTradePL){
    const vPL = Number(pTradePL);
    let vLossToRec = fnGetLossToRecoverAmt();
    if(Number.isFinite(vPL)){
        if(vPL < 0){
            vLossToRec += Math.abs(vPL);
        }
        else if(vPL > 0){
            vLossToRec = Math.max(0, vLossToRec - vPL);
        }
    }
    return fnSetLossToRecoverAmt(vLossToRec);
}

function fnNotifyStrategyErrorToTelegram(pMsg){
    const vMsg = String(pMsg || "").trim();
    if(!vMsg){
        return;
    }
    const vNow = Date.now();
    const vKey = vMsg.slice(0, 180);
    if(vKey === gLastTgErrAlertKey && (vNow - gLastTgErrAlertTs) < 30000){
        return;
    }
    gLastTgErrAlertKey = vKey;
    gLastTgErrAlertTs = vNow;
    fnSendTelegramRuntimeAlert(`DeltaFutScprLive ERROR\n${vMsg}`);
}

function fnMarkAppDisconnected(pReason){
    const vNow = Date.now();
    if(!gAppConnDown){
        gAppConnDown = true;
        gAppConnDownSince = vNow;
        gAppConnDownReason = String(pReason || "Connection lost");
        if(vNow - gLastTgConnAlertTs > 30000){
            gLastTgConnAlertTs = vNow;
            fnSendTelegramRuntimeAlert(`DeltaFutScprLive\nConnection Disconnected\nReason: ${gAppConnDownReason}\nTime: ${new Date(vNow).toLocaleString("en-GB")}`);
        }
    }
}

function fnMarkAppReconnected(pSource){
    const vNow = Date.now();
    if(!gAppConnDown){
        return;
    }
    const vDownMs = Math.max(0, vNow - gAppConnDownSince);
    const vDownSec = Math.round(vDownMs / 1000);
    const vMsg = `DeltaFutScprLive\nConnection Reconnected\nSource: ${String(pSource || "Recovered")}\nDowntime: ${vDownSec}s\nPrevious Reason: ${gAppConnDownReason || "-"}`;
    gAppConnDown = false;
    gAppConnDownSince = 0;
    gAppConnDownReason = "";
    fnSendTelegramRuntimeAlert(vMsg);
}

function fnSendTelegramRuntimeAlert(pMsg){
    const objTgCfg = fnGetTelegramConfig();
    if(!objTgCfg.botToken || !objTgCfg.chatId){
        return;
    }

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");
    let vAction = JSON.stringify({
        "TelegramBotToken": objTgCfg.botToken,
        "TelegramChatId": objTgCfg.chatId,
        "Message": String(pMsg || "")
    });

    fetch("/deltaFutScprLive/sendTelegramAlert", {
        method: "POST",
        headers: vHeaders,
        body: vAction,
        redirect: "follow"
    }).catch(() => {
        // no-op
    });
}

function fnSendOpenTradeTelegramAlert(pTrade, pSource = "MANUAL"){
    const objTrade = pTrade || {};
    const vSide = String(objTrade.TransType || "").toUpperCase();
    const vSym = String(objTrade.FutSymbol || "-");
    const vQty = Number(objTrade.Qty || 0);
    const vPxRaw = (String(objTrade.TransType || "").toLowerCase() === "buy") ? objTrade.BuyPrice : objTrade.SellPrice;
    const vPx = Number(vPxRaw);
    const vOrderType = String(objTrade.OrderType || "-");
    const vState = String(objTrade.OrderState || "-");
    const vRule = String(objTrade.EntryRule || "STD");
    const vMsg =
`DeltaFutScprLive
OPEN ${vSide} ${vSym}
Qty: ${Number.isFinite(vQty) ? vQty : 0}
Price: ${Number.isFinite(vPx) ? vPx.toFixed(2) : "-"}
OrderType: ${vOrderType}
State: ${vState}
Rule: ${vRule}
Source: ${String(pSource || "MANUAL").toUpperCase()}
Time: ${new Date().toLocaleString("en-GB")}`;
    fnSendTelegramRuntimeAlert(vMsg);
}

function fnSendCloseTradeTelegramAlert(pPayload = {}){
    const vSym = String(pPayload.symbol || "-");
    const vOpenSide = String(pPayload.openSide || "").toUpperCase();
    const vClosedQty = Number(pPayload.closedQty || 0);
    const vPrevQty = Number(pPayload.prevQty || 0);
    const vRemainingQty = Number(pPayload.remainingQty || 0);
    const vClosePx = Number(pPayload.closePrice);
    const vPnl = Number(pPayload.pnl);
    const vCharges = Number(pPayload.charges);
    const vReason = String(pPayload.reason || "manual");
    const bIsFull = !!pPayload.isFullClose;
    const vMode = bIsFull ? "FULL CLOSE" : "PARTIAL CLOSE";
    const vMsg =
`DeltaFutScprLive
${vMode} ${vOpenSide} ${vSym}
Closed Qty: ${Number.isFinite(vClosedQty) ? vClosedQty : 0}/${Number.isFinite(vPrevQty) ? vPrevQty : 0}
Close Price: ${Number.isFinite(vClosePx) ? vClosePx.toFixed(2) : "-"}
PnL: ${Number.isFinite(vPnl) ? vPnl.toFixed(2) : "-"}
Charges: ${Number.isFinite(vCharges) ? vCharges.toFixed(3) : "-"}
Reason: ${vReason}
Remaining Qty: ${Number.isFinite(vRemainingQty) ? vRemainingQty : 0}
Time: ${new Date().toLocaleString("en-GB")}`;
    fnSendTelegramRuntimeAlert(vMsg);
}

window.addEventListener("DOMContentLoaded", function(){
    fnInitRuntimeTelegramWatchers();
    fnInitClosedPosDateTimeFilters();
	fnGetAllStatus();

	let objIncType = document.getElementById("ddlIndicatorType");

    socket.on("CdlEmaTrend", (pMsg) => {
        let objTradeSideVal = document["frmSide"]["rdoTradeSide"];
        let objJson = JSON.parse(pMsg);
        // let objQty = document.getElementById("txtStartQty");
        // objQty.value = objJson.Qty;
        // fnChangeStartQty(objQty);

        if(objJson.Indc === parseInt(objIncType.value)){
	        if(objJson.Direc === "UP"){
	            objTradeSideVal.value = true;
	        }
	        else if(objJson.Direc === "DN"){
	            objTradeSideVal.value = false;
	        }
	        else{
	            objTradeSideVal.value = -1;
	        }
        }
        fnTradeSide();
    });

    socket.on("tv-btcusd-exec", (pMsg) => {
        let isLsAutoTrader = localStorage.getItem("isDFSLAutoTrader");
        let vTradeSide = localStorage.getItem("DFSL_TradeSideSwtS");

    	if(pMsg.Indc === parseInt(objIncType.value)){
	        if(isLsAutoTrader !== "true"){
	            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
	        }
	        else{
	        	if(((vTradeSide === "true") && (pMsg.TransType === "buy")) || ((vTradeSide === "false") && (pMsg.TransType === "sell")) || (vTradeSide === "-1")){
		            fnInitiateManualFutures(pMsg.TransType);
	        	}
	        	else{
	                fnGenMessage(pMsg.TransType +" Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
	        	}
	        }
    	}
    });

    socket.on("tv-btcusd-close", (pMsg) => {
    	if(pMsg.Indc === parseInt(objIncType.value)){
	        fnCloseManualFutures(pMsg.TransType);
    	}
    });

    socket.on("cdlOHLC", async (pMsg) => {
        if(fnShouldUseDeltaRenkoFeedForStrategy()){
            return;
        }
        const objRenko = fnParseRenkoMsg(pMsg);
        await fnProcessRenkoSignal(objRenko, "tradingview");
    });

    socket.on("tv-AutoTrade", (pMsg) => {
    	localStorage.setItem("isDFSLAutoTrader", pMsg.AutoTrade);
    	fnGetSetAutoTraderStatus();
    });

    window.addEventListener("offline", function(){
        fnMarkAppDisconnected("Browser offline");
    });
    window.addEventListener("online", function(){
        fnMarkAppReconnected("Browser online");
    });
});

function fnShouldUseDeltaRenkoFeedForStrategy(){
    return gRenkoFeedEnabled === true;
}

async function fnProcessRenkoSignal(pRenkoMsg, pSource = "tradingview"){
    const vOpen = Number(pRenkoMsg?.Open);
    const vClose = Number(pRenkoMsg?.Close);
    if(!Number.isFinite(vOpen) || !Number.isFinite(vClose) || vOpen === vClose){
        return;
    }

    const vColorCode = vClose > vOpen ? "G" : "R";
    const objMatched = fnMatchRenkoPatternsByColor(vColorCode);
    if(objMatched.buy.length === 0 && objMatched.sell.length === 0){
        return;
    }

    if(gCurrPos !== null){
        const vAnyMatch = [...objMatched.buy, ...objMatched.sell].join("|");
        fnAppendRenkoFeedMsg(`[${pSource}] ${vColorCode} matched ${vAnyMatch} but position is open.`);
        return;
    }

    const vSideSwt = fnGetTradeSideSwitch();
    let vSide = "";
    if(vSideSwt === "buy"){
        vSide = objMatched.buy.length > 0 ? "buy" : "";
    }
    else if(vSideSwt === "sell"){
        vSide = objMatched.sell.length > 0 ? "sell" : "";
    }
    else{
        if(objMatched.buy.length > 0 && objMatched.sell.length === 0){
            vSide = "buy";
        }
        else if(objMatched.sell.length > 0 && objMatched.buy.length === 0){
            vSide = "sell";
        }
        else if(objMatched.buy.length > 0 && objMatched.sell.length > 0){
            vSide = vColorCode === "G" ? "buy" : "sell";
        }
    }
    if(vSide === ""){
        fnAppendRenkoFeedMsg(`[${pSource}] ${vColorCode} matched but filtered by trade-side switch.`);
        return;
    }

    const objSideMatches = vSide === "buy" ? objMatched.buy : objMatched.sell;
    const vMatchTxt = objSideMatches.join("|");
    const vAuto = String(localStorage.getItem("isDFSLAutoTrader") || "false");
    if(vAuto !== "true"){
        fnAppendRenkoFeedMsg(`[${pSource}] ${vColorCode} matched ${vSide.toUpperCase()} ${vMatchTxt} but Auto Trader is OFF.`);
        return;
    }

    fnAppendRenkoFeedMsg(`[${pSource}] Pattern ${vMatchTxt} hit on ${vColorCode}. Executing ${vSide.toUpperCase()}.`);
    fnGenMessage(`Renko ${vSide.toUpperCase()} pattern matched (${vMatchTxt})`, "badge bg-info", "spnGenMsg");
    await fnInitiateManualFutures(vSide);
}

function fnParseRenkoMsg(pMsg){
    if(!pMsg){
        return null;
    }
    if(typeof pMsg === "string"){
        try{
            return JSON.parse(pMsg);
        }
        catch(_err){
            return null;
        }
    }
    return pMsg;
}

function fnGetTradeSideSwitch(){
    const vTradeSide = String(localStorage.getItem("DFSL_TradeSideSwtS") || "-1");
    if(vTradeSide === "true"){
        return "buy";
    }
    if(vTradeSide === "false"){
        return "sell";
    }
    return "both";
}

function fnNormalizeRenkoPattern(pToken){
    return String(pToken || "").toUpperCase().replace(/[^GR]/g, "");
}

function fnGetRenkoPatternStorageKey(pSide){
    return pSide === "sell" ? "DFSL_RenkoSellPatterns" : "DFSL_RenkoBuyPatterns";
}

function fnGetConfiguredRenkoPatterns(pSide = "buy"){
    const vRaw = String(localStorage.getItem(fnGetRenkoPatternStorageKey(pSide)) || "");
    return vRaw
        .split(",")
        .map((pToken) => fnNormalizeRenkoPattern(pToken))
        .filter((pToken) => pToken.length > 0);
}

function fnSetConfiguredRenkoPatterns(pSide, pPatterns){
    const objUniq = [];
    for(let i = 0; i < pPatterns.length; i += 1){
        if(!objUniq.includes(pPatterns[i])){
            objUniq.push(pPatterns[i]);
        }
    }
    localStorage.setItem(fnGetRenkoPatternStorageKey(pSide), objUniq.join(","));
    const objBuyPatterns = fnGetConfiguredRenkoPatterns("buy");
    const objSellPatterns = fnGetConfiguredRenkoPatterns("sell");
    gRenkoPatternMaxLen = [...objBuyPatterns, ...objSellPatterns].reduce((pMax, pVal) => Math.max(pMax, pVal.length), 0);
    if(gRenkoPatternMaxLen <= 0){
        gRenkoPatternSeq = "";
    }
    fnSetRenkoFeedMeta();
}

function fnUpdateRenkoPatterns(pThis, pSide = "buy"){
    const vRaw = String(pThis?.value || "");
    const objPatterns = vRaw
        .split(",")
        .map((pToken) => fnNormalizeRenkoPattern(pToken))
        .filter((pToken) => pToken.length > 0);
    fnSetConfiguredRenkoPatterns(pSide, objPatterns);
    if(pThis){
        pThis.value = localStorage.getItem(fnGetRenkoPatternStorageKey(pSide)) || "";
    }
    const vLbl = pSide === "sell" ? "SELL" : "BUY";
    fnAppendRenkoFeedMsg(`${vLbl} patterns updated: ${localStorage.getItem(fnGetRenkoPatternStorageKey(pSide)) || "none"}`);
}

function fnLoadRenkoPatternSettings(){
    const objBuyTxt = document.getElementById("txtRenkoBuyPatterns");
    const objSellTxt = document.getElementById("txtRenkoSellPatterns");

    const vLegacy = String(localStorage.getItem("DFSL_RenkoPatterns") || "");
    if(vLegacy.trim() !== ""){
        if(!localStorage.getItem("DFSL_RenkoBuyPatterns")){
            localStorage.setItem("DFSL_RenkoBuyPatterns", vLegacy);
        }
        localStorage.removeItem("DFSL_RenkoPatterns");
    }

    if(!localStorage.getItem("DFSL_RenkoBuyPatterns")){
        localStorage.setItem("DFSL_RenkoBuyPatterns", "RRG,GRG");
    }
    if(!localStorage.getItem("DFSL_RenkoSellPatterns")){
        localStorage.setItem("DFSL_RenkoSellPatterns", "GGR,RGR");
    }

    fnSetConfiguredRenkoPatterns("buy", fnGetConfiguredRenkoPatterns("buy"));
    fnSetConfiguredRenkoPatterns("sell", fnGetConfiguredRenkoPatterns("sell"));

    if(objBuyTxt){
        objBuyTxt.value = localStorage.getItem("DFSL_RenkoBuyPatterns") || "";
    }
    if(objSellTxt){
        objSellTxt.value = localStorage.getItem("DFSL_RenkoSellPatterns") || "";
    }
}

function fnMatchRenkoPatternsByColor(pColorCode){
    const objBuyPatterns = fnGetConfiguredRenkoPatterns("buy");
    const objSellPatterns = fnGetConfiguredRenkoPatterns("sell");
    if(objBuyPatterns.length === 0 && objSellPatterns.length === 0){
        return { buy: [], sell: [] };
    }
    gRenkoPatternSeq += pColorCode;
    if(gRenkoPatternSeq.length > gRenkoPatternMaxLen){
        gRenkoPatternSeq = gRenkoPatternSeq.slice(-gRenkoPatternMaxLen);
    }
    return {
        buy: objBuyPatterns.filter((pPattern) => gRenkoPatternSeq.endsWith(pPattern)),
        sell: objSellPatterns.filter((pPattern) => gRenkoPatternSeq.endsWith(pPattern))
    };
}

function fnGetRenkoBoxColor(pBox){
    const vOpen = Number(pBox?.Open);
    const vClose = Number(pBox?.Close);
    if(!Number.isFinite(vOpen) || !Number.isFinite(vClose)){
        return "";
    }
    if(vClose > vOpen){
        return "green";
    }
    if(vClose < vOpen){
        return "red";
    }
    return "flat";
}

function fnIsSameRenkoBox(pA, pB){
    if(!pA || !pB){
        return false;
    }
    return Number(pA.Open) === Number(pB.Open) &&
        Number(pA.High) === Number(pB.High) &&
        Number(pA.Low) === Number(pB.Low) &&
        Number(pA.Close) === Number(pB.Close);
}

function fnBuildRenkoBox(pMsg){
    const vOpen = Number(pMsg?.Open);
    const vHigh = Number(pMsg?.High);
    const vLow = Number(pMsg?.Low);
    const vClose = Number(pMsg?.Close);
    if(!Number.isFinite(vOpen) || !Number.isFinite(vClose)){
        return null;
    }
    return {
        Open: vOpen,
        High: Number.isFinite(vHigh) ? vHigh : vOpen,
        Low: Number.isFinite(vLow) ? vLow : vOpen,
        Close: vClose,
        Color: fnGetRenkoBoxColor({ Open: vOpen, Close: vClose }),
        Ts: Date.now()
    };
}

function fnFmtNum(pNum, pD = 2){
    const vNum = Number(pNum);
    if(!Number.isFinite(vNum)){
        return "";
    }
    return vNum.toFixed(pD);
}

function fnIsRenkoStrategyOn(){
    return false;
}

function fnIsSellActOn(){
    return false;
}

function fnIsRenkoFilterGOLOn(){
    return false;
}

function fnIsRenkoFilterROHOn(){
    return false;
}

function fnIsNumEqual(pA, pB, pEps = 1e-8){
    const vA = Number(pA);
    const vB = Number(pB);
    return Number.isFinite(vA) && Number.isFinite(vB) && Math.abs(vA - vB) <= pEps;
}

function fnGetRenkoEntryRule(pTransType, pOpen, pHigh, pLow){
    return "STD";
}

function fnGetRenkoExitColorByEntryRule(pTradeData){
    const vRule = String(pTradeData?.EntryRule || "STD").toUpperCase();
    if(vRule === "ROH"){
        return "green";
    }
    if(vRule === "GOL"){
        return "red";
    }
    return pTradeData?.TransType === "sell" ? "green" : "red";
}

function fnRenkoDiag(pMsg, pCls = "badge bg-secondary"){
    const vNow = Date.now();
    if(gRenkoSellState.LastDiagMsg === pMsg && (vNow - gRenkoSellState.LastDiagTs) < 5000){
        return;
    }
    gRenkoSellState.LastDiagMsg = pMsg;
    gRenkoSellState.LastDiagTs = vNow;
    fnGenMessage(pMsg, pCls, "spnGenMsg");
}

function fnGetSellActBelowPts(){
    return 0;
}

function fnGetSellActSLPts(){
    return 0;
}

function fnGetSellActTPPts(){
    return 0;
}

function fnSetLastOpenBrokerage(pVal){
    const v = Number(pVal);
    const vSafe = (Number.isFinite(v) && v > 0) ? v : 0;
    localStorage.setItem("DFSL_LastOpenBrokerage", vSafe);
}

function fnSetLastCloseBrokerage(pVal){
    const v = Number(pVal);
    const vSafe = (Number.isFinite(v) && v > 0) ? v : 0;
    localStorage.setItem("DFSL_LastCloseBrokerage", vSafe);
}

function fnApplyLastOpenBrokerageOnFullRecovery(){
    const vLastOpenBrok = Number(localStorage.getItem("DFSL_LastOpenBrokerage"));
    const vLastCloseBrok = Number(localStorage.getItem("DFSL_LastCloseBrokerage"));
    const vOpen = (Number.isFinite(vLastOpenBrok) && vLastOpenBrok > 0) ? vLastOpenBrok : 0;
    const vClose = (Number.isFinite(vLastCloseBrok) && vLastCloseBrok > 0) ? vLastCloseBrok : 0;
    const vDeduct = vOpen + vClose;
    localStorage.setItem("DFSL_Y2RBrokerCarry", vDeduct > 0 ? vDeduct : 0);
    localStorage.setItem("DFSL_TotLossAmt", 0);
    return vDeduct > 0 ? -Math.abs(vDeduct) : 0;
}

function fnGetY2RDisplayAmt(){
    const vCore = Number(localStorage.getItem("DFSL_TotLossAmt"));
    if(Number.isFinite(vCore) && vCore < 0){
        return vCore;
    }
    const vCarry = Number(localStorage.getItem("DFSL_Y2RBrokerCarry"));
    if(Number.isFinite(vCarry) && vCarry > 0){
        return -Math.abs(vCarry);
    }
    return 0;
}

function fnGetY2RTargetAmt(){
    const vCore = Number(localStorage.getItem("DFSL_TotLossAmt"));
    if(Number.isFinite(vCore) && vCore < 0){
        return Math.abs(vCore);
    }
    const vCarry = Number(localStorage.getItem("DFSL_Y2RBrokerCarry"));
    return (Number.isFinite(vCarry) && vCarry > 0) ? vCarry : 0;
}

function fnClearY2RCarryOnRealLoss(){
    const vCore = Number(localStorage.getItem("DFSL_TotLossAmt"));
    if(Number.isFinite(vCore) && vCore < 0){
        localStorage.setItem("DFSL_Y2RBrokerCarry", 0);
    }
}

async function fnCancelAllSellActPending(pMsg = ""){
    return;
}

async function fnRefreshSellActPendingFills(){
    return;
}

async function fnPlaceSellActStopLimitForGreenBox(pBox){
    return;
}

async function fnPlaceSellActProtectionOrders(pTrade){
    return;
}

function fnHasSellActProtectionOpen(){
    return false;
}

async function fnFinalizeClosedByExchange(pFillPrice, pCloseCommission = 0, pReason = ""){
    if(gCurrPos === null){
        return;
    }

    const vTrade = gCurrPos.TradeData[0];
    const vDate = new Date();
    const vToday = vDate.getDate() + "-" + (vDate.getMonth() + 1) + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    const vQty = Number(vTrade.Qty);
    const vFill = Number(pFillPrice);
    if(!Number.isFinite(vQty) || vQty <= 0 || !Number.isFinite(vFill) || vFill <= 0){
        return;
    }

    vTrade.CloseDT = vToday;
    vTrade.CloseDTVal = vDate.valueOf();
    if(vTrade.TransType === "buy"){
        vTrade.SellPrice = vFill;
    }
    else{
        vTrade.BuyPrice = vFill;
    }

    const vEntryBuyCommRaw = Number(vTrade.BuyCommission || 0);
    const vEntrySellCommRaw = Number(vTrade.SellCommission || 0);
    const vCloseComm = Number(pCloseCommission || 0);
    const vCloseSide = (vTrade.TransType === "buy") ? "sell" : "buy";
    const vBuyCommission = vEntryBuyCommRaw + (vCloseSide === "buy" ? vCloseComm : 0);
    const vSellCommission = vEntrySellCommRaw + (vCloseSide === "sell" ? vCloseComm : 0);
    const vCharges = (Number.isFinite(vBuyCommission) ? vBuyCommission : 0) + (Number.isFinite(vSellCommission) ? vSellCommission : 0);
    const vCapital = fnGetTradeCapital(vTrade.TransType, vTrade.BuyPrice, vTrade.SellPrice, vTrade.LotSize, vQty);
    const vTradePL = fnGetTradePL(vTrade.SellPrice, vTrade.BuyPrice, vTrade.LotSize, vQty, vCharges);

    vTrade.Capital = vCapital;
    vTrade.Charges = vCharges;
    vTrade.ProfitLoss = vTradePL;
    vTrade.BuyCommission = vBuyCommission;
    vTrade.SellCommission = vSellCommission;

    gOldPLAmt = Number(localStorage.getItem("DFSL_TotLossAmt")) || 0;
    gNewPLAmt = vTradePL;
    localStorage.setItem("DFSL_OldPLAmt", gOldPLAmt);
    localStorage.setItem("DFSL_NewPLAmt", gNewPLAmt);
    fnApplyLossToRecoverFromClosedTradePL(vTradePL);

    const objTodayTrades = JSON.parse(localStorage.getItem("DFSL_TrdBkFut"));
    if(objTodayTrades === null){
        localStorage.setItem("DFSL_TrdBkFut", JSON.stringify(gCurrPos));
    }
    else{
        const vExistingData = objTodayTrades;
        vExistingData.TradeData.push(vTrade);
        localStorage.setItem("DFSL_TrdBkFut", JSON.stringify(vExistingData));
    }

    localStorage.removeItem("DFSL_CurrFutPos");
    gCurrPos = null;
    fnSetNextOptTradeSettings(true, vTradePL);
    fnUpdateMartiDebugStatus();
    document.getElementById("spnLossTrd").className = "badge rounded-pill text-bg-danger";
    clearInterval(gTimerID);
    gClosedHistoryLoaded = false;
    fnSetInitFutTrdDtls();
    fnLoadTodayTrades();
    await fnRefreshClosedPositionsFromExchange();
    fnGenMessage(pReason || "Position closed by exchange protection order.", `badge bg-success`, "spnGenMsg");
}

async function fnSyncSellActProtectionFill(){
    return;
}

async function fnSyncLocalOpenPositionWithExchange(){
    const vTrade = gCurrPos?.TradeData?.[0] || null;
    if(!vTrade){
        return;
    }

    const vProductID = Number(vTrade.ProductID || 0);
    if(!Number.isFinite(vProductID) || vProductID <= 0){
        return;
    }

    const objNetPos = await fnGetNetPositionByProductID(vProductID);
    if(objNetPos.status !== "success"){
        return;
    }

    const vSize = Number(objNetPos?.data?.size || 0);
    const vLocalSide = String(vTrade.TransType || "").toLowerCase();
    const bStillOpen = (vLocalSide === "sell") ? (vSize < 0) : (vSize > 0);
    if(bStillOpen){
        return;
    }

    const objApiKey = document.getElementById("txtUserAPIKey");
    const objApiSecret = document.getElementById("txtAPISecret");
    let vClosePx = Number(vTrade?.BuyPrice || vTrade?.SellPrice || 0);
    let vCloseComm = 0;
    if(objApiKey?.value && objApiSecret?.value){
        const vOpenTs = Number(vTrade?.OpenDTVal || 0);
        const vFrom = Number.isFinite(vOpenTs) && vOpenTs > 0 ? Math.max(vOpenTs - (2 * 60 * 1000), Date.now() - (24 * 60 * 60 * 1000)) : (Date.now() - (24 * 60 * 60 * 1000));
        const objHist = await fnGetFilledOrderHistory(objApiKey.value, objApiSecret.value, vFrom, Date.now());
        if(objHist.status === "success" && Array.isArray(objHist.data)){
            const vOppSide = (vLocalSide === "sell") ? "buy" : "sell";
            const objMatches = objHist.data.filter((objRow) => {
                const vSide = String(objRow?.side || "").toLowerCase();
                const vPid = Number(objRow?.product_id || 0);
                const vTs = new Date(objRow?.created_at || "").getTime();
                return vSide === vOppSide && vPid === vProductID && (!Number.isFinite(vTs) || vTs >= (vFrom - 60000));
            });
            if(objMatches.length > 0){
                objMatches.sort((a, b) => {
                    const vA = new Date(a?.updated_at || a?.created_at || "").getTime();
                    const vB = new Date(b?.updated_at || b?.created_at || "").getTime();
                    return (Number.isFinite(vB) ? vB : 0) - (Number.isFinite(vA) ? vA : 0);
                });
                const objLast = objMatches[0];
                const vPx = Number(objLast?.average_fill_price || objLast?.limit_price || 0);
                if(Number.isFinite(vPx) && vPx > 0){
                    vClosePx = vPx;
                }
                vCloseComm = Number(objLast?.paid_commission || 0);
            }
        }
    }

    if(!Number.isFinite(vClosePx) || vClosePx <= 0){
        const objBestBuy = document.getElementById("txtBestBuyPrice");
        const objBestSell = document.getElementById("txtBestSellPrice");
        const vFallbackPx = (vLocalSide === "sell") ? Number(objBestBuy?.value || 0) : Number(objBestSell?.value || 0);
        if(Number.isFinite(vFallbackPx) && vFallbackPx > 0){
            vClosePx = vFallbackPx;
        }
    }

    if(String(vTrade.EntryRule || "").toUpperCase() === "SACT"){
        await fnCancelSellActProtectionOrders(vTrade);
    }
    await fnFinalizeClosedByExchange(vClosePx, vCloseComm, "Exchange position already closed. Local open position synced.");
}

async function fnCancelSellActProtectionOrders(pTrade, pMsg = ""){
    return;
}

async function fnTrailSellActPendingToRedOpen(pBox){
    return;
}

async function fnTrailSellActActiveSLToRedBox(pTrade, pBox){
    return;
}

async function fnHandleSellActSignal(pMsg){
    return;
}

async function fnPromoteRenkoPendingToMarket(pSide, pPending, pMsgPrefix = ""){
    if(!pPending){
        return false;
    }

    const vSide = (pSide === "sell") ? "sell" : "buy";
    const vPrefix = pMsgPrefix || `Renko ${vSide.toUpperCase()}`;
    const objDet = await fnGetOrderDetailsById(pPending.OrderID, pPending.ClientOrderID);
    if(objDet.status === "success"){
        const vState = String(objDet.data?.state || "").toLowerCase();
        if(vState === "closed" || vState === "filled"){
            if(vSide === "sell"){
                return await fnCreateSellPositionFromFilledRenkoOrder(objDet.data, pPending);
            }
            return await fnCreateBuyPositionFromFilledRenkoOrder(objDet.data, pPending);
        }
    }

    const objCancel = await fnCancelLiveOrder(pPending.OrderID, pPending.ClientOrderID, pPending.Symbol);
    if(objCancel.status !== "success"){
        fnGenMessage(`${vPrefix}: pending cancel failed, market fallback skipped.`, `badge bg-warning`, "spnGenMsg");
        return false;
    }

    const vMktClientOrdID = Date.now() + 5;
    const objMkt = await fnPlaceRealOrder(vMktClientOrdID, pPending.Symbol, "market_order", pPending.Qty, vSide, 0, "", 0, false);
    if(objMkt.status !== "success"){
        fnGenMessage(`${vPrefix}: market fallback failed (${objMkt.message}).`, `badge bg-danger`, "spnGenMsg");
        return false;
    }

    let objMktOrder = objMkt.data?.result;
    if(!Number.isFinite(Number(objMktOrder?.average_fill_price || objMktOrder?.limit_price))){
        const objDetMkt = await fnGetOrderDetailsById(objMktOrder?.id, vMktClientOrdID);
        if(objDetMkt.status === "success"){
            objMktOrder = objDetMkt.data;
        }
    }

    if(vSide === "sell"){
        const bFilledSell = await fnCreateSellPositionFromFilledRenkoOrder(objMktOrder, { ...pPending, ClientOrderID: vMktClientOrdID });
        if(!bFilledSell){
            fnGenMessage(`${vPrefix}: market fallback placed, fill price not available yet.`, `badge bg-warning`, "spnGenMsg");
        }
        return bFilledSell;
    }
    const bFilledBuy = await fnCreateBuyPositionFromFilledRenkoOrder(objMktOrder, { ...pPending, ClientOrderID: vMktClientOrdID });
    if(!bFilledBuy){
        fnGenMessage(`${vPrefix}: market fallback placed, fill price not available yet.`, `badge bg-warning`, "spnGenMsg");
    }
    return bFilledBuy;
}

async function fnPlaceRenkoDirectMarket(pSide, pSymbol, pQty, pEntryRule, pMsgPrefix = ""){
    const vSide = (pSide === "sell") ? "sell" : "buy";
    const vPrefix = pMsgPrefix || `Renko ${vSide.toUpperCase()} market`;
    const vClientOrdID = Date.now() + 7;
    const objMkt = await fnPlaceRealOrder(vClientOrdID, pSymbol, "market_order", pQty, vSide, 0, "", 0, false);
    if(objMkt.status !== "success"){
        fnGenMessage(`${vPrefix} failed: ${objMkt.message}`, `badge bg-danger`, "spnGenMsg");
        return false;
    }

    let objMktOrder = objMkt.data?.result;
    if(!Number.isFinite(Number(objMktOrder?.average_fill_price || objMktOrder?.limit_price))){
        const objDet = await fnGetOrderDetailsById(objMktOrder?.id, vClientOrdID);
        if(objDet.status === "success"){
            objMktOrder = objDet.data;
        }
    }

    const objPending = {
        ClientOrderID: vClientOrdID,
        Symbol: pSymbol,
        Qty: pQty,
        EntryRule: pEntryRule
    };
    if(vSide === "sell"){
        const bFilledSell = await fnCreateSellPositionFromFilledRenkoOrder(objMktOrder, objPending);
        if(!bFilledSell){
            fnGenMessage(`${vPrefix} placed, fill price not available yet.`, `badge bg-warning`, "spnGenMsg");
        }
        return bFilledSell;
    }
    const bFilledBuy = await fnCreateBuyPositionFromFilledRenkoOrder(objMktOrder, objPending);
    if(!bFilledBuy){
        fnGenMessage(`${vPrefix} placed, fill price not available yet.`, `badge bg-warning`, "spnGenMsg");
    }
    return bFilledBuy;
}

function fnGetOrderDetailsById(pOrderID, pClientOrdID){
    return new Promise((resolve) => {
        const objApiKey = document.getElementById("txtUserAPIKey");
        const objApiSecret = document.getElementById("txtAPISecret");
        const vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");
        const vAction = JSON.stringify({
            ApiKey: objApiKey?.value || "",
            ApiSecret: objApiSecret?.value || "",
            OrderID: pOrderID,
            ClientOrdID: pClientOrdID
        });

        fetch("/deltaExcFutR/getOrderDetails", {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        })
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                resolve({ status: "success", data: objResult.data?.result || objResult.data, message: objResult.message || "" });
            }
            else{
                resolve({ status: objResult.status, data: objResult.data, message: objResult.message || "order detail failed" });
            }
        })
        .catch(() => resolve({ status: "danger", data: null, message: "order detail network error" }));
    });
}

async function fnPlaceRenkoOrderWithFallback(pSymbol, pQty, pTransType, pLimitPrice){
    const vLimitClientOrdID = Date.now();
    const objLimitRes = await fnPlaceRealOrder(vLimitClientOrdID, pSymbol, "limit_order", pQty, pTransType, pLimitPrice, "", 0, false);
    if(objLimitRes.status === "success"){
        return {
            status: "success",
            mode: "limit_pending",
            clientOrdID: vLimitClientOrdID,
            data: objLimitRes.data
        };
    }

    fnGenMessage(`Renko ${pTransType.toUpperCase()} limit failed (${objLimitRes.message}). Trying market order.`, `badge bg-warning`, "spnGenMsg");
    const vMktClientOrdID = Date.now() + 1;
    const objMktRes = await fnPlaceRealOrder(vMktClientOrdID, pSymbol, "market_order", pQty, pTransType, 0, "", 0, false);
    if(objMktRes.status === "success"){
        return {
            status: "success",
            mode: "market_fallback",
            clientOrdID: vMktClientOrdID,
            data: objMktRes.data
        };
    }

    return {
        status: "failed",
        mode: "none",
        message: `Limit failed: ${objLimitRes.message}. Market fallback failed: ${objMktRes.message}`
    };
}

async function fnCancelRenkoSellPending(pMsg = ""){
    if(!gRenkoSellState.Pending){
        return;
    }
    const objPending = gRenkoSellState.Pending;
    await fnCancelLiveOrder(objPending.OrderID, objPending.ClientOrderID, objPending.Symbol);
    gRenkoSellState.Pending = null;
    fnSyncRenkoPendingPoller();
    if(pMsg){
        fnGenMessage(pMsg, `badge bg-warning`, "spnGenMsg");
    }
}

async function fnCancelRenkoBuyPending(pMsg = ""){
    if(!gRenkoBuyState.Pending){
        return;
    }
    const objPending = gRenkoBuyState.Pending;
    await fnCancelLiveOrder(objPending.OrderID, objPending.ClientOrderID, objPending.Symbol);
    gRenkoBuyState.Pending = null;
    fnSyncRenkoPendingPoller();
    if(pMsg){
        fnGenMessage(pMsg, `badge bg-warning`, "spnGenMsg");
    }
}

async function fnCreateSellPositionFromFilledRenkoOrder(pOrderData, pPending){
    const vExecPrice = Number(pOrderData?.average_fill_price || pOrderData?.limit_price);
    if(!Number.isFinite(vExecPrice) || vExecPrice <= 0){
        return false;
    }
    const vEntryCommission = Number(pOrderData?.paid_commission || 0);

    const objLotSize = document.getElementById("txtLotSize");
    const objQty = document.getElementById("txtFuturesQty");
    const objSymbol = document.getElementById("ddlFuturesSymbols");
    const vQty = Math.floor(fnParsePositiveNumber(objQty?.value, 0));
    const vDate = new Date();
    const vToday = vDate.getDate() + "-" + (vDate.getMonth() + 1) + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    const vEntryRule = String(pPending?.EntryRule || "STD").toUpperCase();
    const vSLPts = fnParsePositiveNumber(pPending?.SLPts, 200);
    const vTPPts = fnParsePositiveNumber(pPending?.TPPts, 200);
    const vTSLPts = fnParsePositiveNumber(document.getElementById("txtPointsTSL")?.value, 0);
    let vTrailNextTrigger = null;

    gByorSl = "sell";
    if(vEntryRule === "SACT"){
        gAmtSL = (vExecPrice + vSLPts).toFixed(2);
        gAmtTP1 = "0";
        gAmtTP = 0;
    }
    else{
        // Keep strategy exit controlled by Renko green signal only.
        gAmtSL = "99999999";
        gAmtTP1 = "0";
        gAmtTP = 0;
    }
    if(vTSLPts > 0){
        const vCurrRef = Number(document.getElementById("txtBestBuyPrice")?.value || vExecPrice);
        vTrailNextTrigger = Number((vCurrRef - vTSLPts).toFixed(2));
    }

    const vExcTradeDtls = {
        TradeData: [{
            OrderID: pOrderData.id,
            ClientOrderID: pPending.ClientOrderID,
            OpenDT: vToday,
            FutSymbol: objSymbol?.value || pPending.Symbol,
            TransType: "sell",
            LotSize: objLotSize?.value || "0",
            Qty: vQty || pPending.Qty,
            BuyPrice: vExecPrice,
            SellPrice: vExecPrice,
            AmtSL: gAmtSL,
            AmtTP1: gAmtTP1,
            AmtTP: gAmtTP,
            StopLossPts: (vEntryRule === "SACT") ? vSLPts : 0,
            TrailSLPts: vTSLPts,
            TrailNextTrigger: vTrailNextTrigger,
            TakeProfitAmt: 0,
            OpenDTVal: pPending.ClientOrderID,
            OrderType: pOrderData.order_type,
            OrderState: pOrderData.state,
            ProductID: pOrderData.product_id,
            BuyCommission: 0,
            SellCommission: Number.isFinite(vEntryCommission) ? vEntryCommission : 0,
            EntryRule: vEntryRule,
            SACTSLOrderID: 0,
            SACTSLClientOrderID: 0,
            SACTTPOrderID: 0,
            SACTTPClientOrderID: 0
        }]
    };
    gCurrPos = vExcTradeDtls;
    gRenkoSellState.OppExitCount = 0;
    localStorage.removeItem("DFSL_LastCloseTxnKey");
    localStorage.setItem("DFSL_CurrFutPos", JSON.stringify(vExcTradeDtls));
    localStorage.setItem("DFSL_QtyMul", String(vQty || pPending.Qty));
    fnSetLastOpenBrokerage(Number.isFinite(vEntryCommission) ? vEntryCommission : 0);
    g50Perc1Time = true;

    if(vEntryRule === "SACT"){
        await fnPlaceSellActProtectionOrders(gCurrPos.TradeData[0]);
        localStorage.setItem("DFSL_CurrFutPos", JSON.stringify(gCurrPos));
        fnSyncRenkoPendingPoller();
    }

    fnSetInitFutTrdDtls();
    fnSubscribe();
    if(vEntryRule === "SACT"){
        fnGenMessage(`Sell-only order filled @ ${fnFmtNum(vExecPrice)} (SL ${gAmtSL}, trailing on each red box).`, `badge bg-success`, "spnGenMsg");
    }
    else{
        fnGenMessage(`Renko SELL order filled (${vEntryRule}). Waiting for red/green exit signal.`, `badge bg-success`, "spnGenMsg");
    }
    fnSendOpenTradeTelegramAlert(vExcTradeDtls.TradeData[0], "RENKO");
    return true;
}

function fnGetNetPositionByProductID(pProductID){
    return new Promise((resolve) => {
        const objApiKey = document.getElementById("txtUserAPIKey");
        const objApiSecret = document.getElementById("txtAPISecret");
        const vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");
        const vAction = JSON.stringify({
            ApiKey: objApiKey?.value || "",
            ApiSecret: objApiSecret?.value || "",
            ProductID: pProductID
        });

        fetch("/deltaExcFutR/getNetPositionByProduct", {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        })
        .then(response => response.json())
        .then(objResult => {
            resolve({ status: objResult.status, data: objResult.data || {}, message: objResult.message || "" });
        })
        .catch(() => resolve({ status: "danger", data: {}, message: "net position network error" }));
    });
}

async function fnHandleRenkoSellSignal(pMsg){
    if(gRenkoSellState.Busy){
        return;
    }
    gRenkoSellState.Busy = true;
    try{
        const vAuto = localStorage.getItem("isDFSLAutoTrader");
        const objBox = fnBuildRenkoBox(pMsg);
        if(!objBox){
            return;
        }

        const objPrev = gRenkoSellState.LastBox;
        if(fnIsSameRenkoBox(objPrev, objBox)){
            return;
        }
        gRenkoSellState.LastBox = objBox;
        await fnRefreshRenkoPendingFill("sell", gRenkoSellState);
        await fnExpireRenkoPendingOnNextBox("sell", gRenkoSellState);
        if(gCurrPos !== null){
            const objOpenTrade = gCurrPos?.TradeData?.[0] || {};
            if(objOpenTrade.TransType === "sell" && objBox.Color === "green"){
                fnGenMessage("R-Box exit: red position closed on green box.", `badge bg-warning`, "spnGenMsg");
                await fnCloseManualFutures("sell");
            }
            if(gRenkoSellState.Pending){
                await fnCancelRenkoSellPending("Renko SELL pending cancelled (position already open).");
            }
            return;
        }

        if(vAuto !== "true"){
            if(gRenkoSellState.Pending){
                await fnCancelRenkoSellPending("Renko SELL pending cancelled (Auto Trade OFF).");
            }
            return;
        }

        if(!fnIsRenkoFilterROHOn()){
            if(gRenkoSellState.Pending){
                await fnCancelRenkoSellPending("Renko SELL pending cancelled (R-Box OFF).");
            }
            return;
        }

        if(objBox.Color !== "red"){
            return;
        }

        await fnRefreshRenkoPendingFill("buy", gRenkoBuyState);
        if(gCurrPos !== null){
            return;
        }
        if(gRenkoBuyState.Pending){
            await fnCancelRenkoBuyPending("Renko BUY pending cancelled (R-Box active on red box).");
        }
        await fnExecuteRenkoEntryBySelectedOrderType("sell", objBox, "RBOX");
    }
    catch(err){
        fnGenMessage(`Renko SELL runtime error: ${err?.message || err}`, `badge bg-danger`, "spnGenMsg");
    }
    finally{
        gRenkoSellState.Busy = false;
    }
}

async function fnCreateBuyPositionFromFilledRenkoOrder(pOrderData, pPending){
    const vExecPrice = Number(pOrderData?.average_fill_price || pOrderData?.limit_price);
    if(!Number.isFinite(vExecPrice) || vExecPrice <= 0){
        return false;
    }
    const vEntryCommission = Number(pOrderData?.paid_commission || 0);

    const objLotSize = document.getElementById("txtLotSize");
    const objQty = document.getElementById("txtFuturesQty");
    const objSymbol = document.getElementById("ddlFuturesSymbols");
    const vQty = Math.floor(fnParsePositiveNumber(objQty?.value, 0));
    const vDate = new Date();
    const vToday = vDate.getDate() + "-" + (vDate.getMonth() + 1) + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    const vEntryRule = String(pPending?.EntryRule || "STD").toUpperCase();
    const vTSLPts = fnParsePositiveNumber(document.getElementById("txtPointsTSL")?.value, 0);
    let vTrailNextTrigger = null;

    gByorSl = "buy";
    // Keep strategy exit controlled by Renko red signal only.
    gAmtSL = "0";
    gAmtTP1 = "99999999";
    gAmtTP = 0;
    if(vTSLPts > 0){
        const vCurrRef = Number(document.getElementById("txtBestSellPrice")?.value || vExecPrice);
        vTrailNextTrigger = Number((vCurrRef + vTSLPts).toFixed(2));
    }

    const vExcTradeDtls = {
        TradeData: [{
            OrderID: pOrderData.id,
            ClientOrderID: pPending.ClientOrderID,
            OpenDT: vToday,
            FutSymbol: objSymbol?.value || pPending.Symbol,
            TransType: "buy",
            LotSize: objLotSize?.value || "0",
            Qty: vQty || pPending.Qty,
            BuyPrice: vExecPrice,
            SellPrice: vExecPrice,
            AmtSL: gAmtSL,
            AmtTP1: gAmtTP1,
            AmtTP: gAmtTP,
            StopLossPts: 0,
            TrailSLPts: vTSLPts,
            TrailNextTrigger: vTrailNextTrigger,
            TakeProfitAmt: 0,
            OpenDTVal: pPending.ClientOrderID,
            OrderType: pOrderData.order_type,
            OrderState: pOrderData.state,
            ProductID: pOrderData.product_id,
            BuyCommission: Number.isFinite(vEntryCommission) ? vEntryCommission : 0,
            SellCommission: 0,
            EntryRule: vEntryRule
        }]
    };
    gCurrPos = vExcTradeDtls;
    gRenkoBuyState.OppExitCount = 0;
    localStorage.removeItem("DFSL_LastCloseTxnKey");
    localStorage.setItem("DFSL_CurrFutPos", JSON.stringify(vExcTradeDtls));
    localStorage.setItem("DFSL_QtyMul", String(vQty || pPending.Qty));
    fnSetLastOpenBrokerage(Number.isFinite(vEntryCommission) ? vEntryCommission : 0);
    g50Perc1Time = true;

    fnSetInitFutTrdDtls();
    fnSubscribe();
    fnGenMessage(`Renko BUY order filled (${vEntryRule}). Waiting for red/green exit signal.`, `badge bg-success`, "spnGenMsg");
    fnSendOpenTradeTelegramAlert(vExcTradeDtls.TradeData[0], "RENKO");
    return true;
}

async function fnHandleRenkoBuySignal(pMsg){
    if(gRenkoBuyState.Busy){
        return;
    }
    gRenkoBuyState.Busy = true;
    try{
        const vAuto = localStorage.getItem("isDFSLAutoTrader");
        const objBox = fnBuildRenkoBox(pMsg);
        if(!objBox){
            return;
        }

        const objPrev = gRenkoBuyState.LastBox;
        if(fnIsSameRenkoBox(objPrev, objBox)){
            return;
        }
        gRenkoBuyState.LastBox = objBox;
        await fnRefreshRenkoPendingFill("buy", gRenkoBuyState);
        await fnExpireRenkoPendingOnNextBox("buy", gRenkoBuyState);
        if(gCurrPos !== null){
            const objOpenTrade = gCurrPos?.TradeData?.[0] || {};
            if(objOpenTrade.TransType === "buy" && objBox.Color === "red"){
                fnGenMessage("G-Box exit: green position closed on red box.", `badge bg-warning`, "spnGenMsg");
                await fnCloseManualFutures("buy");
            }
            if(gRenkoBuyState.Pending){
                await fnCancelRenkoBuyPending("Renko BUY pending canceled (position already open).");
            }
            return;
        }

        if(vAuto !== "true"){
            if(gRenkoBuyState.Pending){
                await fnCancelRenkoBuyPending("Renko BUY pending canceled (Auto Trade OFF).");
            }
            return;
        }

        if(!fnIsRenkoFilterGOLOn()){
            if(gRenkoBuyState.Pending){
                await fnCancelRenkoBuyPending("Renko BUY pending canceled (G-Box OFF).");
            }
            return;
        }

        if(objBox.Color !== "green"){
            return;
        }

        await fnRefreshRenkoPendingFill("sell", gRenkoSellState);
        if(gCurrPos !== null){
            return;
        }
        if(gRenkoSellState.Pending){
            await fnCancelRenkoSellPending("Renko SELL pending cancelled (G-Box active on green box).");
        }
        await fnExecuteRenkoEntryBySelectedOrderType("buy", objBox, "GBOX");
    }
    catch(err){
        fnGenMessage(`Renko BUY runtime error: ${err?.message || err}`, `badge bg-danger`, "spnGenMsg");
    }
    finally{
        gRenkoBuyState.Busy = false;
    }
}

function fnFormatDateTimeLocal(pDateVal){
    const vDate = new Date(pDateVal);
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

function fnNormalizeDateTimeLocal(pVal, pDefaultVal){
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
            return fnFormatDateTimeLocal(vDt);
        }
    }
    return pDefaultVal;
}

function fnGetClosedPosDateFilterDefaults(){
    const vNow = new Date();
    const vStart = new Date(vNow.getFullYear(), vNow.getMonth(), 1, 0, 0, 0, 0);
    return {
        From: fnFormatDateTimeLocal(vStart),
        To: fnFormatDateTimeLocal(vNow)
    };
}

function fnInitClosedPosDateTimeFilters(){
    const objFromDate = document.getElementById("txtClsFromDate");
    const objToDate = document.getElementById("txtClsToDate");
    if(!objFromDate || !objToDate){
        return;
    }

    const objDefaults = fnGetClosedPosDateFilterDefaults();
    const vFromSaved = localStorage.getItem("DFSL_ClsFromDate");
    const vToSaved = localStorage.getItem("DFSL_ClsToDate");
    const vFromVal = fnNormalizeDateTimeLocal(vFromSaved, objDefaults.From);
    const vToVal = fnNormalizeDateTimeLocal(vToSaved, objDefaults.To);

    objFromDate.value = vFromVal;
    objToDate.value = vToVal;
    localStorage.setItem("DFSL_ClsFromDate", vFromVal);
    localStorage.setItem("DFSL_ClsToDate", vToVal);

    objFromDate.addEventListener("change", function(){
        const vNextFrom = fnNormalizeDateTimeLocal(objFromDate.value, objDefaults.From);
        objFromDate.value = vNextFrom;
        localStorage.setItem("DFSL_ClsFromDate", vNextFrom);
        fnRefreshClosedPositionsFromExchange();
    });

    objToDate.addEventListener("change", function(){
        const vNextTo = fnNormalizeDateTimeLocal(objToDate.value, objDefaults.To);
        objToDate.value = vNextTo;
        localStorage.setItem("DFSL_ClsToDate", vNextTo);
        fnRefreshClosedPositionsFromExchange();
    });
}

function fnClearClosedPosDateTimeFilters(){
    const objFromDate = document.getElementById("txtClsFromDate");
    const objToDate = document.getElementById("txtClsToDate");
    if(!objFromDate || !objToDate){
        return;
    }

    const objDefaults = fnGetClosedPosDateFilterDefaults();
    objFromDate.value = objDefaults.From;
    objToDate.value = objDefaults.To;
    localStorage.setItem("DFSL_ClsFromDate", objDefaults.From);
    localStorage.setItem("DFSL_ClsToDate", objDefaults.To);
    fnRefreshClosedPositionsFromExchange();
}

function fnGetDateTimeMillisByInputId(pInputId, pFallbackMs){
    const objInput = document.getElementById(pInputId);
    const vRaw = objInput?.value || "";
    const vMs = new Date(vRaw).getTime();
    if(!Number.isNaN(vMs)){
        return vMs;
    }
    return pFallbackMs;
}

function fnGetFilledOrderHistory(pApiKey, pApiSecret, pStartDT, pEndDT){
    return new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            ApiKey: pApiKey,
            ApiSecret: pApiSecret,
            StartDT: pStartDT,
            EndDT: pEndDT
        });

        fetch("/deltaExcFutR/getFilledOrderHistory", {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        })
        .then(response => response.json())
        .then(objResult => {
            resolve({
                status: objResult.status,
                message: objResult.message,
                data: Array.isArray(objResult.data) ? objResult.data : [],
                raw: objResult.data
            });
        })
        .catch(() => {
            resolve({ status: "danger", message: "Error while fetching closed order history.", data: [] });
        });
    });
}

async function fnRefreshClosedPositionsFromExchange(){
    const objApiKey = document.getElementById("txtUserAPIKey");
    const objApiSecret = document.getElementById("txtAPISecret");
    if(!objApiKey || !objApiSecret || !objApiKey.value || !objApiSecret.value){
        gExchangeClosedOrderRows = [];
        gClosedHistoryLoaded = false;
        fnLoadTodayTrades();
        return;
    }

    let vNow = Date.now();
    let vFirstDay = new Date();
    vFirstDay = new Date(vFirstDay.getFullYear(), vFirstDay.getMonth(), 1, 0, 0, 0, 0).getTime();
    let vStartDT = fnGetDateTimeMillisByInputId("txtClsFromDate", vFirstDay);
    let vEndDT = fnGetDateTimeMillisByInputId("txtClsToDate", vNow);
    if(vEndDT < vStartDT){
        let vTmp = vEndDT;
        vEndDT = vStartDT;
        vStartDT = vTmp;
    }

    const objRet = await fnGetFilledOrderHistory(objApiKey.value, objApiSecret.value, vStartDT, vEndDT);
    if(objRet.status === "success"){
        gExchangeClosedOrderRows = objRet.data;
        gClosedHistoryLoaded = true;
    }
    else{
        gExchangeClosedOrderRows = [];
        gClosedHistoryLoaded = false;
    }
    fnLoadTodayTrades();
}

function fnParseTradeDateTimeToMs(pDtTxt){
    const vTxt = (pDtTxt || "").trim();
    if(vTxt === ""){
        return 0;
    }
    const objParts = vTxt.split(" ");
    const objDate = (objParts[0] || "").split("-");
    const objTime = (objParts[1] || "00:00:00").split(":");
    if(objDate.length < 3){
        const vDirect = new Date(vTxt).getTime();
        return Number.isFinite(vDirect) ? vDirect : 0;
    }
    let vDD = Number(objDate[0]);
    let vMM = Number(objDate[1]) - 1;
    let vYYYY = Number(objDate[2]);

    // Support both dd-mm-yyyy and yyyy-mm-dd formats.
    if(String(objDate[0]).length === 4){
        vYYYY = Number(objDate[0]);
        vMM = Number(objDate[1]) - 1;
        vDD = Number(objDate[2]);
    }

    const vHH = Number(objTime[0] || 0);
    const vMI = Number(objTime[1] || 0);
    const vSS = Number(objTime[2] || 0);
    const vTs = new Date(vYYYY, vMM, vDD, vHH, vMI, vSS).getTime();
    if(Number.isFinite(vTs)){
        return vTs;
    }

    const vDirect = new Date(vTxt).getTime();
    return Number.isFinite(vDirect) ? vDirect : 0;
}

function fnGetLsJSON(pKey, pDefaultVal = null){
    try{
        const vRaw = localStorage.getItem(pKey);
        return vRaw === null ? pDefaultVal : JSON.parse(vRaw);
    }
    catch(_err){
        return pDefaultVal;
    }
}

function fnGetLsNumber(pKey, pDefaultVal = 0){
    const vNum = Number(localStorage.getItem(pKey));
    return Number.isFinite(vNum) ? vNum : pDefaultVal;
}

function fnParsePositiveNumber(pVal, pFallback = 0){
    const vNum = Number(pVal);
    return Number.isFinite(vNum) && vNum > 0 ? vNum : pFallback;
}

function fnSetTextByPL(pEl, pValue){
    pEl.textContent = Number(pValue).toFixed(2);
    pEl.style.color = Number(pValue) < 0 ? "red" : "green";
    pEl.style.fontWeight = "bold";
}

function fnPickWalletMetric(pWalletRows, pFieldList){
    if(!Array.isArray(pWalletRows) || pWalletRows.length === 0){
        return NaN;
    }

    let vAnyFinite = NaN;
    for(let i=0; i<pWalletRows.length; i++){
        let objRow = pWalletRows[i] || {};
        for(let j=0; j<pFieldList.length; j++){
            let vNum = Number(objRow[pFieldList[j]]);
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

function fnExtractWalletRows(pRespData){
    if(Array.isArray(pRespData?.result)){
        return pRespData.result;
    }
    if(Array.isArray(pRespData)){
        return pRespData;
    }
    return [];
}

function fnLoadNetLimits(){
    const objTotalMargin = document.getElementById("divTotalMargin");
    const objBlockedMargin = document.getElementById("divBlockedMargin");
    const objBalanceMargin = document.getElementById("divBalanceMargin");
    if(!objTotalMargin || !objBlockedMargin || !objBalanceMargin){
        return;
    }

    const objNetLimit = fnGetLsJSON("DFSL_NetLimit", {});
    const vWalletUSD = Number(objNetLimit?.BalanceUSD);
    const vWalletINR = Number(objNetLimit?.BalanceINR);
    const vTotalMargin = Number.isFinite(vWalletUSD) ? vWalletUSD : (Number.isFinite(vWalletINR) ? vWalletINR : NaN);

    let vBlockedMargin = 0;
    if(gCurrPos && Array.isArray(gCurrPos.TradeData) && gCurrPos.TradeData.length > 0){
        const objTrade = gCurrPos.TradeData[0];
        const vBuyPrice = Number(objTrade.BuyPrice);
        const vSellPrice = Number(objTrade.SellPrice);
        const vLotSize = Number(objTrade.LotSize);
        const vQty = Number(objTrade.Qty);
        vBlockedMargin = fnGetTradeCapital(objTrade.TransType, vBuyPrice, vSellPrice, vLotSize, vQty);
        if(!Number.isFinite(vBlockedMargin)){
            vBlockedMargin = 0;
        }
    }

    const vAvailMargin = (Number.isFinite(vTotalMargin)) ? (vTotalMargin - vBlockedMargin) : NaN;
    objTotalMargin.innerText = Number.isFinite(vTotalMargin) ? vTotalMargin.toFixed(2) : "-";
    objBlockedMargin.innerText = Number.isFinite(vBlockedMargin) ? vBlockedMargin.toFixed(2) : "0.00";
    objBalanceMargin.innerText = Number.isFinite(vAvailMargin) ? vAvailMargin.toFixed(2) : "-";
}

async function fnRefreshNetLimits(){
    const objApiKey = document.getElementById("txtUserAPIKey");
    const objApiSecret = document.getElementById("txtAPISecret");
    if(!objApiKey || !objApiSecret || !objApiKey.value || !objApiSecret.value){
        localStorage.setItem("lsDFSLLoginValid", "false");
        if(typeof fnGetSetTraderLoginStatus === "function"){
            fnGetSetTraderLoginStatus();
        }
        fnLoadNetLimits();
        return;
    }

    try{
        const vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        const vAction = JSON.stringify({
            ApiKey: objApiKey.value,
            ApiSecret: objApiSecret.value
        });

        const response = await fetch("/deltaExcFutR/validateLogin", {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        });
        const objResult = await response.json();

        if(objResult.status === "success"){
            const objWalletRows = fnExtractWalletRows(objResult.data);
            const objBalances = {
                BalanceINR: fnPickWalletMetric(objWalletRows, ["available_balance_inr", "balance_inr", "wallet_balance_inr"]),
                BalanceUSD: fnPickWalletMetric(objWalletRows, ["available_balance", "balance", "wallet_balance"])
            };
            localStorage.setItem("DFSL_NetLimit", JSON.stringify(objBalances));
            localStorage.setItem("lsDFSLLoginValid", "true");
            if(typeof fnGetSetTraderLoginStatus === "function"){
                fnGetSetTraderLoginStatus();
            }
            fnLoadNetLimits();
        }
        else{
            localStorage.setItem("lsDFSLLoginValid", "false");
            if(typeof fnGetSetTraderLoginStatus === "function"){
                fnGetSetTraderLoginStatus();
            }
            localStorage.removeItem("DFSL_NetLimit");
            fnLoadNetLimits();
        }
    }
    catch(_err){
        fnLoadNetLimits();
    }
}

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
        if(typeof fnLoadLoginCreds === "function"){
            fnLoadLoginCreds();
        }
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
		fnLoadDefSymbol();
        fnLoadOrderType();
        fnLoadIndicatorType();
		fnLoadMarti();
		fnLoadYetToRec();
		fnLoadDefQty();
		fnLoadLossRecoveryMultiplier();
        fnLoadFeeModel();
		fnLoadCurrentTradePos();
		// UNCOMMENT for LIVE TRADING in DEMO
		fnSubscribe();
		// fnGetHistoricalOHLC();
		// fnSubscribeInterval();
		// UNCOMMENT for LIVE TRADING in DEMO
		fnSetInitFutTrdDtls();
        fnLoadNetLimits();
        fnRefreshNetLimits();
		fnLoadSlTp();
		fnLoadTodayTrades();
        fnRefreshClosedPositionsFromExchange();
		fnLoadTradeCounter();
		fnLoadTradeSide();
        fnUpdateMartiDebugStatus();
        fnSyncRenkoPendingPoller();
        fnPollRenkoPendingFills();
	}
    fnLoadRenkoFeedSettings();
}

function fnLoadOrderType(){
    const objOpenOrderType = document.getElementById("ddlOpenOrderType");
    const objCloseOrderType = document.getElementById("ddlCloseOrderType");
    if(!objOpenOrderType || !objCloseOrderType){
        return;
    }

    const vOpenOrderType = localStorage.getItem("DFSL_OpenOrderType") || localStorage.getItem("DFSL_OrderType") || "market_order";
    const vCloseOrderType = localStorage.getItem("DFSL_CloseOrderType") || "market_order";
    objOpenOrderType.value = (vOpenOrderType === "limit_order") ? "limit_order" : "market_order";
    objCloseOrderType.value = (vCloseOrderType === "limit_order") ? "limit_order" : "market_order";
    fnChangeOpenOrderType(objOpenOrderType.value);
    fnChangeCloseOrderType(objCloseOrderType.value);
}

function fnChangeOpenOrderType(pOrderType){
    const objOrderType = document.getElementById("ddlOpenOrderType");
    if(!objOrderType){
        return;
    }

    const vOrderType = pOrderType || objOrderType.value;
    localStorage.setItem("DFSL_OpenOrderType", vOrderType);
    // backward-compatibility for legacy references
    localStorage.setItem("DFSL_OrderType", vOrderType);
    objOrderType.value = vOrderType;
}

function fnChangeCloseOrderType(pOrderType){
    const objOrderType = document.getElementById("ddlCloseOrderType");
    if(!objOrderType){
        return;
    }

    const vOrderType = pOrderType || objOrderType.value;
    localStorage.setItem("DFSL_CloseOrderType", vOrderType);
    objOrderType.value = vOrderType;
}

function fnSleepMs(pMs){
    return new Promise((resolve) => setTimeout(resolve, pMs));
}

function fnGetLimitPriceBySideWithOffset(pSide, pBestRates){
    const vSide = String(pSide || "").toLowerCase();
    const vBestAsk = Number(pBestRates?.BestBuy);
    const vBestBid = Number(pBestRates?.BestSell);
    const vOffset = 10;
    if(vSide === "buy"){
        const vPx = vBestAsk - vOffset;
        return (Number.isFinite(vPx) && vPx > 0) ? Number(vPx.toFixed(2)) : NaN;
    }
    const vPx = vBestBid + vOffset;
    return (Number.isFinite(vPx) && vPx > 0) ? Number(vPx.toFixed(2)) : NaN;
}

async function fnFetchBestRatesForLimit(){
    try{
        const objBestRates = await fnGetFutBestRates();
        if(objBestRates.status !== "success"){
            return { status: "failed", message: objBestRates.message || "Best rates not available", data: null };
        }
        return { status: "success", message: "", data: objBestRates.data };
    }
    catch(_err){
        return { status: "failed", message: "Best rates not available", data: null };
    }
}

async function fnEnsureOrderFillByPolling(pOrderID, pClientOrdID){
    const objDet = await fnGetOrderDetailsById(pOrderID, pClientOrdID);
    if(objDet.status !== "success"){
        return { status: "failed", message: objDet.message || "order detail failed", data: null };
    }
    const vState = String(objDet.data?.state || "").toLowerCase();
    if(vState === "closed" || vState === "filled"){
        return { status: "filled", message: "", data: objDet.data };
    }
    return { status: "pending", message: vState || "pending", data: objDet.data };
}

async function fnExecuteAdaptiveLimitOrderWithFallback(pSymbol, pQty, pSide, pReduceOnly = false, pLabel = "Order"){
    const vSide = String(pSide || "").toLowerCase();
    const vQty = Math.floor(fnParsePositiveNumber(pQty, 0));
    if(!pSymbol || vQty < 1 || (vSide !== "buy" && vSide !== "sell")){
        return { status: "failed", message: `${pLabel}: invalid order params`, data: null, finalOrderType: "limit_order" };
    }

    const vMaxRepriceCycles = 3;
    for(let vCycle = 1; vCycle <= vMaxRepriceCycles; vCycle += 1){
        let objPlacedOrder = null;
        let vPlacedClientOrdID = 0;
        let vPlaceTry = 0;
        while(objPlacedOrder === null){
            vPlaceTry += 1;
            const objBest = await fnFetchBestRatesForLimit();
            if(objBest.status !== "success"){
                if(vPlaceTry >= 12){
                    break;
                }
                await fnSleepMs(5000);
                continue;
            }
            const vLimitPrice = fnGetLimitPriceBySideWithOffset(vSide, objBest.data);
            if(!Number.isFinite(vLimitPrice) || vLimitPrice <= 0){
                if(vPlaceTry >= 12){
                    break;
                }
                await fnSleepMs(5000);
                continue;
            }

            vPlacedClientOrdID = Date.now() + Math.floor(Math.random() * 1000);
            const objPlace = await fnPlaceRealOrder(vPlacedClientOrdID, pSymbol, "limit_order", vQty, vSide, vLimitPrice, "", 0, true, pReduceOnly);
            if(objPlace.status !== "success"){
                if(vPlaceTry >= 12){
                    break;
                }
                await fnSleepMs(5000);
                continue;
            }

            const objRes = objPlace?.data?.result || {};
            const vState = String(objRes.state || "").toLowerCase();
            if(vState === "closed" || vState === "filled"){
                return { status: "success", message: "", data: objRes, finalOrderType: "limit_order" };
            }
            objPlacedOrder = objRes;
            objPlacedOrder.ClientOrderID = vPlacedClientOrdID;
        }

        if(objPlacedOrder === null){
            break;
        }

        await fnSleepMs(10000);
        const objFillChk = await fnEnsureOrderFillByPolling(objPlacedOrder.id, objPlacedOrder.ClientOrderID);
        if(objFillChk.status === "filled"){
            return { status: "success", message: "", data: objFillChk.data, finalOrderType: "limit_order" };
        }

        await fnCancelLiveOrder(objPlacedOrder.id, objPlacedOrder.ClientOrderID, pSymbol);
    }

    const vMktClientOrdID = Date.now() + Math.floor(Math.random() * 1000) + 7;
    const objMkt = await fnPlaceRealOrder(vMktClientOrdID, pSymbol, "market_order", vQty, vSide, 0, "", 0, false, pReduceOnly);
    if(objMkt.status !== "success"){
        return { status: "failed", message: `${pLabel}: market fallback failed (${objMkt.message})`, data: null, finalOrderType: "market_order" };
    }

    let objMktOrder = objMkt.data?.result || {};
    const vMktState = String(objMktOrder.state || "").toLowerCase();
    if(vMktState !== "closed" && vMktState !== "filled"){
        const objDet = await fnGetOrderDetailsById(objMktOrder?.id, vMktClientOrdID);
        if(objDet.status === "success"){
            objMktOrder = objDet.data;
        }
    }
    return { status: "success", message: "", data: objMktOrder, finalOrderType: "market_order" };
}

async function fnGetLiveLimitPriceBySide(pTransType){
    const vSide = String(pTransType || "").toLowerCase();
    const objBestBuy = document.getElementById("txtBestBuyPrice");
    const objBestSell = document.getElementById("txtBestSellPrice");
    let vBestBuy = Number(objBestBuy?.value);
    let vBestSell = Number(objBestSell?.value);

    if(!Number.isFinite(vBestBuy) || vBestBuy <= 0 || !Number.isFinite(vBestSell) || vBestSell <= 0){
        try{
            const objBestRates = await fnGetFutBestRates();
            if(objBestRates.status === "success"){
                vBestBuy = Number(objBestRates.data?.BestBuy);
                vBestSell = Number(objBestRates.data?.BestSell);
                if(objBestBuy && Number.isFinite(vBestBuy) && vBestBuy > 0){
                    objBestBuy.value = vBestBuy;
                }
                if(objBestSell && Number.isFinite(vBestSell) && vBestSell > 0){
                    objBestSell.value = vBestSell;
                }
            }
        }
        catch(_err){}
    }

    if(vSide === "buy"){
        return (Number.isFinite(vBestBuy) && vBestBuy > 0) ? vBestBuy : NaN;
    }
    return (Number.isFinite(vBestSell) && vBestSell > 0) ? vBestSell : NaN;
}

function fnLoadDefSymbol(){
	let objDefSymM = fnGetLsJSON("DFSL_DefSymbFut", null);
	let objSelSymb = document.getElementById("ddlFuturesSymbols");

	if(objDefSymM === null || objDefSymM === ""){
		objDefSymM = "BTCUSD";
	}

	objSelSymb.value = objDefSymM;
	fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
	let objLotSize = document.getElementById("txtLotSize");

	localStorage.setItem("DFSL_DefSymbFut", JSON.stringify(pThisVal));

	if(pThisVal === "BTCUSD"){
		objLotSize.value = 0.001;
	}
	else if(pThisVal === "ETHUSD"){
		objLotSize.value = 0.01;
	}
	else{
		objLotSize.value = 0;
	}

    fnSetRenkoFeedMeta();
    if(gRenkoFeedEnabled){
        fnRestartRenkoFeedWS();
    }
}

function fnGetRenkoFeedSymbol(){
    const objSelSymb = document.getElementById("ddlFuturesSymbols");
    return (objSelSymb?.value || "BTCUSD");
}

function fnSetRenkoFeedStatus(pTxt, pCls = "bg-secondary"){
    const obj = document.getElementById("spnRenkoFeedStatus");
    if(!obj){
        return;
    }
    obj.className = `badge ${pCls}`;
    obj.innerText = pTxt;
}

function fnSetRenkoFeedMeta(){
    const objMeta = document.getElementById("spnRenkoFeedMeta");
    if(!objMeta){
        return;
    }
    const objBuyPatterns = fnGetConfiguredRenkoPatterns("buy");
    const objSellPatterns = fnGetConfiguredRenkoPatterns("sell");
    const vBuyPatts = objBuyPatterns.length > 0 ? objBuyPatterns.join(",") : "-";
    const vSellPatts = objSellPatterns.length > 0 ? objSellPatterns.join(",") : "-";
    objMeta.innerText = `Symbol: ${fnGetRenkoFeedSymbol()} | Step: ${gRenkoFeedStepPts} | Src: ${gRenkoFeedPriceSource} | B: ${vBuyPatts} | S: ${vSellPatts}`;
}

function fnGetTickerVolumeText(pVol){
    const vParsed = Number(pVol);
    if(!Number.isFinite(vParsed)){
        return "-";
    }
    return vParsed.toLocaleString("en-US");
}

function fnGetTickerVolumeFromTick(pTicData){
    if(!pTicData || typeof pTicData !== "object"){
        return NaN;
    }
    const vDirect = Number(pTicData.volume);
    if(Number.isFinite(vDirect)){
        return vDirect;
    }
    const vMarkVol = Number(pTicData.mark_vol);
    if(Number.isFinite(vMarkVol)){
        return vMarkVol;
    }
    return NaN;
}

function fnGetTickerVolumeFromWSData(pWSData){
    if(!pWSData || typeof pWSData !== "object"){
        return NaN;
    }
    let vVol = fnGetTickerVolumeFromTick(pWSData);
    if(Number.isFinite(vVol)){
        return vVol;
    }
    if(Array.isArray(pWSData.result) && pWSData.result.length > 0){
        vVol = fnGetTickerVolumeFromTick(pWSData.result[0]);
        if(Number.isFinite(vVol)){
            return vVol;
        }
    }
    if(pWSData.payload && typeof pWSData.payload === "object"){
        vVol = fnGetTickerVolumeFromTick(pWSData.payload);
        if(Number.isFinite(vVol)){
            return vVol;
        }
    }
    return NaN;
}

function fnAppendRenkoFeedMsg(pMsg){
    const objWrap = document.getElementById("divRenkoFeedMsgs");
    if(!objWrap){
        return;
    }
    const vRow = document.createElement("div");
    vRow.className = "renko-feed-item";
    vRow.textContent = pMsg;
    objWrap.insertBefore(vRow, objWrap.firstChild);
    while(objWrap.children.length > gRenkoFeedMaxRows){
        objWrap.removeChild(objWrap.lastChild);
    }
}

function fnClearRenkoFeedLog(){
    const objWrap = document.getElementById("divRenkoFeedMsgs");
    if(!objWrap){
        return;
    }
    objWrap.innerHTML = "";
    fnAppendRenkoFeedMsg("Feed log cleared.");
    const objMeta = document.getElementById("spnRenkoFeedMeta");
    if(objMeta && objMeta.innerText){
        fnAppendRenkoFeedMsg(objMeta.innerText);
    }
}

function fnUpdateRenkoFeedStep(pThis){
    const vParsed = Math.floor(fnParsePositiveNumber(pThis?.value, 200));
    gRenkoFeedStepPts = (Number.isFinite(vParsed) && vParsed > 0) ? vParsed : 200;
    if(pThis){
        pThis.value = gRenkoFeedStepPts;
    }
    localStorage.setItem("DFSL_RenkoFeedStepPts", String(gRenkoFeedStepPts));
    gRenkoFeedAnchor = null;
    fnSetRenkoFeedMeta();
    fnAppendRenkoFeedMsg(`Step updated to ${gRenkoFeedStepPts} points.`);
}

function fnUpdateRenkoFeedPriceSource(pThis){
    const vSel = String(pThis?.value || "mark_price");
    const objAllowed = ["mark_price", "spot_price", "best_bid", "best_ask"];
    gRenkoFeedPriceSource = objAllowed.includes(vSel) ? vSel : "mark_price";
    localStorage.setItem("DFSL_RenkoFeedPriceSrc", gRenkoFeedPriceSource);
    gRenkoFeedAnchor = null;
    fnSetRenkoFeedMeta();
    fnAppendRenkoFeedMsg(`Price source changed to ${gRenkoFeedPriceSource}. Anchor reset.`);
}

function fnGetRenkoFeedTickerPrice(pTicData){
    const vMark = Number(pTicData?.mark_price || 0);
    const vSpot = Number(pTicData?.spot_price || pTicData?.index_price || 0);
    const vBid = Number(pTicData?.quotes?.best_bid || pTicData?.best_bid || 0);
    const vAsk = Number(pTicData?.quotes?.best_ask || pTicData?.best_ask || 0);

    if(gRenkoFeedPriceSource === "spot_price"){
        if(Number.isFinite(vSpot) && vSpot > 0){
            return vSpot;
        }
        return vMark;
    }
    if(gRenkoFeedPriceSource === "best_bid"){
        if(Number.isFinite(vBid) && vBid > 0){
            return vBid;
        }
        return vMark;
    }
    if(gRenkoFeedPriceSource === "best_ask"){
        if(Number.isFinite(vAsk) && vAsk > 0){
            return vAsk;
        }
        return vMark;
    }
    return vMark;
}

function fnGetSyntheticRenkoOHLC(pOpen, pClose){
    const vOpen = Number(pOpen);
    const vClose = Number(pClose);
    const vHigh = Math.max(vOpen, vClose);
    const vLow = Math.min(vOpen, vClose);
    const vDir = (vClose > vOpen) ? "UP" : ((vClose < vOpen) ? "DN" : "FLAT");
    return { Open: vOpen, High: vHigh, Low: vLow, Close: vClose, Direction: vDir };
}

function fnFmtRenkoWebhookMsg(pOHLC, pLtp){
    const vNow = new Date();
    const objMsg = {
        Symbol: fnGetRenkoFeedSymbol(),
        Source: gRenkoFeedPriceSource,
        Indc: Number(document.getElementById("ddlIndicatorType")?.value || 0),
        Open: Number(pOHLC.Open.toFixed(2)),
        High: Number(pOHLC.High.toFixed(2)),
        Low: Number(pOHLC.Low.toFixed(2)),
        Close: Number(pOHLC.Close.toFixed(2)),
        Direction: pOHLC.Direction,
        BoxSize: Number(gRenkoFeedStepPts),
        LTP: Number(Number(pLtp || 0).toFixed(2)),
        Time: vNow.toISOString()
    };
    return JSON.stringify(objMsg);
}

async function fnHandleRenkoFeedTicker(pTicData){
    const vMark = fnGetRenkoFeedTickerPrice(pTicData);
    const vVol = fnGetTickerVolumeFromTick(pTicData);
    const vVolTxt = fnGetTickerVolumeText(vVol);
    if(!Number.isFinite(vMark) || vMark <= 0){
        return;
    }
    if(!Number.isFinite(gRenkoFeedAnchor)){
        gRenkoFeedAnchor = Math.floor(vMark / gRenkoFeedStepPts) * gRenkoFeedStepPts;
        fnAppendRenkoFeedMsg(`Anchor set @ ${gRenkoFeedAnchor.toFixed(2)} (${fnGetRenkoFeedSymbol()})`);
        return;
    }

    let vGuard = 0;
    while(Math.abs(vMark - gRenkoFeedAnchor) >= gRenkoFeedStepPts && vGuard < 25){
        const vDir = vMark > gRenkoFeedAnchor ? 1 : -1;
        const vOpen = gRenkoFeedAnchor;
        const vClose = vOpen + (vDir * gRenkoFeedStepPts);
        gRenkoFeedAnchor = vClose;
        const objOHLC = fnGetSyntheticRenkoOHLC(vOpen, vClose);
        const objRenkoMsg = {
            Indc: Number(document.getElementById("ddlIndicatorType")?.value || 0),
            Open: objOHLC.Open,
            High: objOHLC.High,
            Low: objOHLC.Low,
            Close: objOHLC.Close
        };
        fnAppendRenkoFeedMsg(`[delta] O:${objOHLC.Open.toFixed(2)} H:${objOHLC.High.toFixed(2)} L:${objOHLC.Low.toFixed(2)} C:${objOHLC.Close.toFixed(2)} V:${vVolTxt}`);
        if(fnShouldUseDeltaRenkoFeedForStrategy()){
            await fnProcessRenkoSignal(objRenkoMsg, "delta");
        }
        vGuard += 1;
    }
}

function fnStartRenkoFeedWS(){
    if(!gRenkoFeedEnabled){
        return;
    }
    if(gRenkoFeedWS !== null && (gRenkoFeedWS.readyState === WebSocket.OPEN || gRenkoFeedWS.readyState === WebSocket.CONNECTING)){
        return;
    }

    gRenkoFeedForceClose = false;
    const objRenkoWS = new WebSocket("wss://socket.india.delta.exchange");
    gRenkoFeedWS = objRenkoWS;
    objRenkoWS.onopen = function(){
        if(gRenkoFeedWS !== objRenkoWS || objRenkoWS.readyState !== WebSocket.OPEN){
            return;
        }
        const vSymbol = fnGetRenkoFeedSymbol();
        const vSendData = { type: "subscribe", payload: { channels: [{ name: "v2/ticker", symbols: [vSymbol] }] } };
        objRenkoWS.send(JSON.stringify(vSendData));
        gRenkoFeedAnchor = null;
        fnSetRenkoFeedStatus("ON", "bg-success");
        fnSetRenkoFeedMeta();
        fnAppendRenkoFeedMsg(`Feed started for ${vSymbol}. Waiting for ${gRenkoFeedStepPts}-point move...`);
    };
    objRenkoWS.onerror = function(){
        if(gRenkoFeedWS !== objRenkoWS){
            return;
        }
        fnSetRenkoFeedStatus("ERR", "bg-danger");
    };
    objRenkoWS.onmessage = function(pMsg){
        if(gRenkoFeedWS !== objRenkoWS){
            return;
        }
        let vData = null;
        try{
            vData = JSON.parse(pMsg.data);
        }
        catch(_err){
            return;
        }
        if(vData?.type === "v2/ticker"){
            const vVol = fnGetTickerVolumeFromWSData(vData);
            if(Array.isArray(vData.result) && vData.result.length > 0){
                const vTick = { ...vData.result[0] };
                if(Number.isFinite(vVol)){
                    vTick.volume = vVol;
                }
                void fnHandleRenkoFeedTicker(vTick);
            }
            else{
                if(Number.isFinite(vVol)){
                    vData.volume = vVol;
                }
                void fnHandleRenkoFeedTicker(vData);
            }
        }
    };
    objRenkoWS.onclose = function(){
        if(gRenkoFeedWS === objRenkoWS){
            gRenkoFeedWS = null;
        }
        if(gRenkoFeedForceClose || !gRenkoFeedEnabled){
            fnSetRenkoFeedStatus("OFF", "bg-secondary");
            fnAppendRenkoFeedMsg("Feed stopped.");
            return;
        }
        fnSetRenkoFeedStatus("RETRY", "bg-warning");
        setTimeout(() => {
            if(gRenkoFeedEnabled){
                fnStartRenkoFeedWS();
            }
        }, 3000);
    };
}

function fnStopRenkoFeedWS(){
    gRenkoFeedForceClose = true;
    if(gRenkoFeedWS !== null){
        try{
            gRenkoFeedWS.close();
        }
        catch(_err){}
        gRenkoFeedWS = null;
    }
    fnSetRenkoFeedStatus("OFF", "bg-secondary");
}

function fnRestartRenkoFeedWS(){
    if(!gRenkoFeedEnabled){
        return;
    }
    fnStopRenkoFeedWS();
    gRenkoFeedForceClose = false;
    setTimeout(() => {
        if(gRenkoFeedEnabled){
            fnStartRenkoFeedWS();
        }
    }, 500);
}

function fnToggleRenkoFeedSwitch(){
    const objSwt = document.getElementById("swtRenkoFeed");
    gRenkoFeedEnabled = !!objSwt?.checked;
    localStorage.setItem("DFSL_RenkoFeedEnabled", JSON.stringify(gRenkoFeedEnabled));
    if(gRenkoFeedEnabled){
        fnStartRenkoFeedWS();
    }
    else{
        fnStopRenkoFeedWS();
    }
}

function fnLoadRenkoFeedSettings(){
    const objSwt = document.getElementById("swtRenkoFeed");
    const objStep = document.getElementById("txtRenkoFeedPts");
    const objSrc = document.getElementById("ddlRenkoFeedPriceSrc");
    const vEnabled = JSON.parse(localStorage.getItem("DFSL_RenkoFeedEnabled") || "false");
    const vStepLs = Math.floor(fnParsePositiveNumber(localStorage.getItem("DFSL_RenkoFeedStepPts"), 200));
    const vSrcLs = String(localStorage.getItem("DFSL_RenkoFeedPriceSrc") || "mark_price");
    const objAllowed = ["mark_price", "spot_price", "best_bid", "best_ask"];
    gRenkoFeedStepPts = (Number.isFinite(vStepLs) && vStepLs > 0) ? vStepLs : 200;
    gRenkoFeedPriceSource = objAllowed.includes(vSrcLs) ? vSrcLs : "mark_price";

    if(objStep){
        objStep.value = gRenkoFeedStepPts;
    }
    if(objSrc){
        objSrc.value = gRenkoFeedPriceSource;
    }
    if(objSwt){
        objSwt.checked = !!vEnabled;
    }
    gRenkoFeedEnabled = !!vEnabled;
    fnLoadRenkoPatternSettings();
    fnSetRenkoFeedMeta();
    fnSetRenkoFeedStatus(gRenkoFeedEnabled ? "ON" : "OFF", gRenkoFeedEnabled ? "bg-success" : "bg-secondary");
    if(gRenkoFeedEnabled){
        fnStartRenkoFeedWS();
    }
}

function fnLoadDefQty(){
	let objStartQtyM = fnGetLsJSON("DFSL_StartQtyNo", null);
	let objQtyMul = fnGetLsJSON("DFSL_QtyMul", null);

    let objQty = document.getElementById("txtFuturesQty");
    let objStartQty = document.getElementById("txtStartQty");

    if(objQtyMul === null || objQtyMul < 1 || objQtyMul < objStartQtyM){
	    if(objStartQtyM === null){
	    	objStartQty.value = 1;
	    	objQty.value = 1;
	    	localStorage.setItem("DFSL_StartQtyNo", objStartQty.value);
	    }
	    else{
	    	objStartQty.value = objStartQtyM;
	    	objQty.value = objStartQtyM;
	    }
    }
    else{
    	objQty.value = objQtyMul;
    	objStartQty.value = objStartQtyM;
    }
    fnUpdateMartiDebugStatus();
}

function fnLoadLossRecoveryMultiplier(){
	let objLossRecM = fnGetLsJSON("DFSL_LossRecM", null);
	let objProfitMultiX = fnGetLsJSON("DFSL_MultiplierX", null);

	let objLossRecvPerctTxt = document.getElementById("txtLossRecvPerct");
	let objMultiplierXTxt = document.getElementById("txtMultiplierX");

	if(objLossRecM === null || objLossRecM === ""){
		objLossRecvPerctTxt.value = gLossRecPerct;
	}
	else{
		objLossRecvPerctTxt.value = objLossRecM;
		gLossRecPerct = fnParsePositiveNumber(objLossRecM, 100);
	}

	if(objProfitMultiX === null || objProfitMultiX === ""){
		objMultiplierXTxt.value = gMultiplierX;
	}
	else{
		objMultiplierXTxt.value = objProfitMultiX;
		gMultiplierX = fnParsePositiveNumber(objProfitMultiX, 1.0);
	}
}

function fnSetIndicatorType(pIndicator){
    localStorage.setItem("DFSL_IndicatorType", pIndicator);
}

function fnLoadIndicatorType(){
    const objDdlIndicator = document.getElementById("ddlIndicatorType");
    if(!objDdlIndicator){
        return;
    }

    const vIndicatorType = localStorage.getItem("DFSL_IndicatorType") || "Indicator-1";
    objDdlIndicator.value = vIndicatorType;
}

function fnUpdateLossRecPrct(pThisVal){
	const vLossPct = fnParsePositiveNumber(pThisVal.value, 100);
    pThisVal.value = vLossPct;
	localStorage.setItem("DFSL_LossRecM", vLossPct);
	gLossRecPerct = vLossPct;
    fnUpdateMartiDebugStatus();
}

function fnUpdateMultiplierX(pThisVal){
	const vMultiplier = fnParsePositiveNumber(pThisVal.value, 1.0);
    pThisVal.value = vMultiplier;
	localStorage.setItem("DFSL_MultiplierX", vMultiplier);
	gMultiplierX = vMultiplier;
    fnUpdateMartiDebugStatus();
}

function fnLoadFeeModel(){
    const objMaker = document.getElementById("txtMakerFeePct");
    const objTaker = document.getElementById("txtTakerFeePct");
    const objMode = document.getElementById("ddlLiveExitFeeMode");
    if(!objMaker || !objTaker || !objMode){
        return;
    }

    const vMaker = Number(localStorage.getItem("DFSL_MakerFeePct"));
    const vTaker = Number(localStorage.getItem("DFSL_TakerFeePct"));
    const vMode = String(localStorage.getItem("DFSL_LiveExitFeeMode") || "taker").toLowerCase();

    gMakerFeePct = Number.isFinite(vMaker) && vMaker >= 0 ? vMaker : 0.02;
    gTakerFeePct = Number.isFinite(vTaker) && vTaker >= 0 ? vTaker : 0.05;
    gLiveExitFeeMode = (vMode === "maker" || vMode === "auto") ? vMode : "taker";

    objMaker.value = gMakerFeePct;
    objTaker.value = gTakerFeePct;
    objMode.value = gLiveExitFeeMode;

    localStorage.setItem("DFSL_MakerFeePct", gMakerFeePct);
    localStorage.setItem("DFSL_TakerFeePct", gTakerFeePct);
    localStorage.setItem("DFSL_LiveExitFeeMode", gLiveExitFeeMode);
}

function fnUpdateMakerFeePct(pThisVal){
    const vMaker = fnParsePositiveNumber(pThisVal.value, 0.02);
    pThisVal.value = vMaker;
    gMakerFeePct = vMaker;
    localStorage.setItem("DFSL_MakerFeePct", vMaker);
}

function fnUpdateTakerFeePct(pThisVal){
    const vTaker = fnParsePositiveNumber(pThisVal.value, 0.05);
    pThisVal.value = vTaker;
    gTakerFeePct = vTaker;
    localStorage.setItem("DFSL_TakerFeePct", vTaker);
}

function fnUpdateLiveExitFeeMode(pThisVal){
    const vMode = String(pThisVal?.value || "taker").toLowerCase();
    gLiveExitFeeMode = (vMode === "maker" || vMode === "auto") ? vMode : "taker";
    localStorage.setItem("DFSL_LiveExitFeeMode", gLiveExitFeeMode);
}

function fnCalcCommByPct(pNotional, pPct){
    const vNotional = Number(pNotional);
    const vPct = Number(pPct);
    if(!Number.isFinite(vNotional) || vNotional <= 0 || !Number.isFinite(vPct) || vPct < 0){
        return 0;
    }
    return (vNotional * vPct) / 100;
}

function fnGetLiveOpenCharges(pTrade, pBuyPrice, pSellPrice){
    if(!pTrade){
        return 0;
    }
    const vQty = Number(pTrade.Qty);
    const vLot = Number(pTrade.LotSize);
    const vBuy = Number(pBuyPrice);
    const vSell = Number(pSellPrice);
    if(!Number.isFinite(vQty) || vQty <= 0 || !Number.isFinite(vLot) || vLot <= 0){
        return 0;
    }

    const vEntryStored = Number(pTrade.BuyCommission || 0) + Number(pTrade.SellCommission || 0);
    let vEntryComm = Number.isFinite(vEntryStored) && vEntryStored > 0 ? vEntryStored : 0;

    if(vEntryComm <= 0){
        const vEntryNotional = (String(pTrade.TransType).toLowerCase() === "buy" ? vBuy : vSell) * vLot * vQty;
        const vEntryRate = (String(pTrade.OrderType).toLowerCase() === "market_order") ? gTakerFeePct : gMakerFeePct;
        vEntryComm = fnCalcCommByPct(vEntryNotional, vEntryRate);
    }

    // Open Positions should show only entry-side brokerage (already paid on open order).
    // Exit-side brokerage is accounted at close time.
    return Number.isFinite(vEntryComm) ? vEntryComm : 0;
}

function fnLoadTradeCounter(){
	let objCounterSwtM = JSON.parse(localStorage.getItem("DFSL_CounterSwt"));
	let objCounterSwt = document.getElementById("swtTradeCounter");

	if(objCounterSwtM){
		objCounterSwt.checked = true;
	}
	else{
		objCounterSwt.checked = false;
	}
}

function fnLoadRenkoStrategySwitch(){
    let objSwt = document.getElementById("swtRenkoStrategy");
    if(!objSwt){
        return;
    }
    const vStored = localStorage.getItem("DFSL_RenkoStrategyOn");
    if(vStored === null){
        localStorage.setItem("DFSL_RenkoStrategyOn", false);
        objSwt.checked = false;
    }
    else{
        objSwt.checked = JSON.parse(vStored) === true;
    }
}

function fnToggleRenkoStrategy(){
    let objSwt = document.getElementById("swtRenkoStrategy");
    if(!objSwt){
        return;
    }
    localStorage.setItem("DFSL_RenkoStrategyOn", objSwt.checked ? true : false);
    fnGenMessage(`Renko Strategy ${objSwt.checked ? "ON" : "OFF"}`, `badge ${objSwt.checked ? "bg-success" : "bg-warning"}`, "spnGenMsg");
}

function fnLoadMarti(){
    let objSwtStep = document.getElementById("swtMartingale");
    let objSwtMarti = document.getElementById("swtMarti");
    if(!objSwtStep){
        return;
    }

    let vMode = (localStorage.getItem("DFSL_TradeMode") || "").toUpperCase();
    if(vMode === ""){
        let vLegacyMarti = JSON.parse(localStorage.getItem("DFSL_Marti"));
        vMode = vLegacyMarti ? "MARTI" : "STEP";
    }

    if(objSwtMarti){
        objSwtStep.checked = (vMode === "STEP");
        objSwtMarti.checked = (vMode === "MARTI");
        if(objSwtStep.checked === objSwtMarti.checked){
            objSwtStep.checked = true;
            objSwtMarti.checked = false;
            vMode = "STEP";
        }
        localStorage.setItem("DFSL_TradeMode", vMode);
        localStorage.setItem("DFSL_Marti", JSON.stringify(objSwtMarti.checked));
    }
    else{
        objSwtStep.checked = (vMode === "MARTI");
        localStorage.setItem("DFSL_Marti", JSON.stringify(objSwtStep.checked));
    }
    fnUpdateMartiDebugStatus();
}

function fnChangeTradeMode(pMode){
    let objSwtStep = document.getElementById("swtMartingale");
    let objSwtMarti = document.getElementById("swtMarti");
    if(!objSwtStep){
        return;
    }

    if(!objSwtMarti){
        localStorage.setItem("DFSL_Marti", JSON.stringify(objSwtStep.checked));
        return;
    }

    if(pMode === "step"){
        if(objSwtStep.checked){
            objSwtMarti.checked = false;
        }
        else if(!objSwtMarti.checked){
            objSwtStep.checked = true;
        }
    }
    else if(pMode === "marti"){
        if(objSwtMarti.checked){
            objSwtStep.checked = false;
        }
        else if(!objSwtStep.checked){
            objSwtMarti.checked = true;
        }
    }

    let vMode = objSwtMarti.checked ? "MARTI" : "STEP";
    localStorage.setItem("DFSL_TradeMode", vMode);
    localStorage.setItem("DFSL_Marti", JSON.stringify(objSwtMarti.checked));
    fnUpdateMartiDebugStatus();
}

function fnLoadYetToRec(){
    let vYet2RecM = JSON.parse(localStorage.getItem("DFSL_Yet2Rec"));
    let objSwtYet2Rec = document.getElementById("swtYetToRec");

    if(vYet2RecM){
    	objSwtYet2Rec.checked = true;
    }
    else{
    	objSwtYet2Rec.checked = false;
    }
}

function fnUpdateYet2RecSwt(){
	let objSwtYet2Rec = document.getElementById("swtYetToRec");

	if(objSwtYet2Rec.checked){
		localStorage.setItem("DFSL_Yet2Rec", true);
	}
	else{
		localStorage.setItem("DFSL_Yet2Rec", false);
	}
}

function fnUpdateTrdSwtCounter(){
	let objCounterSwt = document.getElementById("swtTradeCounter");

	if(objCounterSwt.checked){
		localStorage.setItem("DFSL_CounterSwt", true);
	}
	else{
		localStorage.setItem("DFSL_CounterSwt", false);
	}
}

function fnChangeStartQty(pThisVal){
    let objQty = document.getElementById("txtFuturesQty");
    const vQtyParsed = Number(pThisVal.value);

    if(!Number.isFinite(vQtyParsed) || vQtyParsed < 1){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("DFSL_StartQtyNo", 1);
    }
    else{
        const vSafeQty = Math.floor(vQtyParsed);
        pThisVal.value = vSafeQty;
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("DFSL_StartQtyNo", vSafeQty);

        // if(confirm("Are You Sure You want to change the Quantity?")){
            objQty.value = vSafeQty;
            localStorage.setItem("DFSL_QtyMul", vSafeQty);
        // }
    }
    fnUpdateMartiDebugStatus();
}

function fnLoadCurrentTradePos(){
    let objCurrPos = fnGetLsJSON("DFSL_CurrFutPos", null);

	gCurrPos = objCurrPos;
}

function fnCloseWS(){
	if(objDeltaWS !== null){
		clearInterval(gSubInterval);
		objDeltaWS.close();
	}
	else{
		console.log("There is no Open WS Connection!")
	}
}

function fnConnectWS(){
    let objSub = document.getElementById("spnSub");
    if(objDeltaWS !== null && (objDeltaWS.readyState === WebSocket.OPEN || objDeltaWS.readyState === WebSocket.CONNECTING)){
        return;
    }

    let vUrl = "wss://socket.india.delta.exchange";
    objDeltaWS = new WebSocket(vUrl);

    objDeltaWS.onopen = function (){
        fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
        fnMarkAppReconnected("WebSocket open");
        // console.log("WS is Open!");
    }
    objDeltaWS.onerror = function (){
        fnMarkAppDisconnected("WebSocket error");
        console.log("WS Error, Trying to Reconnect.....");
    }
    objDeltaWS.onclose = function (){
		let objSpotPrice = document.getElementById("txtSpotPrice");
		let objBestBuy = document.getElementById("txtBestBuyPrice");
		let objBestSell = document.getElementById("txtBestSellPrice");

        if(gForceCloseDFL){
            gForceCloseDFL = false;
            // console.log("WS Disconnected & Closed!!!!!!");
            objSub.className = "badge rounded-pill text-bg-success ws-dot";
			objSpotPrice.value = "";
			objBestBuy.value = "";
			objBestSell.value = "";
            fnGenMessage("Streaming Stopped & Disconnected!", `badge bg-warning`, "spnGenMsg");
        }
        else{
            fnMarkAppDisconnected("WebSocket closed");
            setTimeout(fnSubscribe, 3000);
            // console.log("Restarting WS....");
        }
    }
	objDeltaWS.onmessage = function (pMsg){
        let vTicData = JSON.parse(pMsg.data);

		// console.log(vTicData);
		switch (vTicData.type){
			case "v2/ticker":
				// console.log("Msg Sub Received........");
				fnGetRates(vTicData);
				break;
			case "candlestick_5m":
				// fnGetOHLC(vTicData);
				console.log("#######################");
				break;
			case "subscriptions":
	            // Suppressed to avoid overwriting strategy/runtime messages too frequently.
	            objSub.className = "badge rounded-pill text-bg-success ws-dot blink";
				break;
			case "unsubscribed":

	            fnGenMessage("Streaming Unsubscribed!", `badge bg-warning`, "spnGenMsg");
                objSub.className = "badge rounded-pill text-bg-success ws-dot";
				break;
		}
	}
}

function fnSubscribeInterval(){
	// console.log("Interval subscription.....");
	clearInterval(gSubInterval);
	gSubInterval = setInterval(fnSubscribe, 60000);
	// setInterval(fnGetHistoricalOHLC, 60000);
}

function fnSubscribe(){
	let objDdlSymbol = document.getElementById("ddlFuturesSymbols");
    if(!objDdlSymbol.value){
        fnGenMessage("Please select a symbol before subscribing.", "badge bg-warning", "spnGenMsg");
        return;
    }

	if(objDeltaWS === null){
		fnConnectWS();
		// console.log("WS is looping to Connect.....");
		setTimeout(fnSubscribe, 3000);
	}
	else{
		// console.log("Subscribing to Channel....");

        const vTimer = setInterval(() => {
            if(objDeltaWS.readyState === 1){
                clearInterval(vTimer);
                //Write Subscription code here
			    let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": [ objDdlSymbol.value ] }]}};

			    objDeltaWS.send(JSON.stringify(vSendData));
                // console.log("Subscribing............");
            }
            else if(objDeltaWS.readyState === 2 || objDeltaWS.readyState === 3){
                // console.log("Trying to Reconnect...");
                fnConnectWS();
            }
        }, 3000);
	}
}

function fnUnsubscribe(){
	let objSpotPrice = document.getElementById("txtSpotPrice");
	let objBestBuy = document.getElementById("txtBestBuyPrice");
	let objBestSell = document.getElementById("txtBestSellPrice");

	if(objDeltaWS === null){
		fnConnectWS();
		setTimeout(fnUnsubscribe, 3000);
	    // fnGenMessage("Already Streaming is Unsubscribed & Disconnected!", `badge bg-warning`, "spnGenMsg");
	}
	else{
        const vTimer = setInterval(() => {
            if(objDeltaWS.readyState === 1){
                clearInterval(vTimer);
			    let vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker" }]}};

			    objDeltaWS.send(JSON.stringify(vSendData));
                // console.log("UnSubscribing........!!!!!");
            }
            else{
                // console.log("Trying to Reconnect...");
                fnConnectWS();
            }
        }, 3000);
	}
	objSpotPrice.value = "";
	objBestBuy.value = "";
	objBestSell.value = "";
}

function fnGetRates(pTicData){
	let objSpotPrice = document.getElementById("txtSpotPrice");
	let objBestBuy = document.getElementById("txtBestBuyPrice");
	let objBestSell = document.getElementById("txtBestSellPrice");

	objSpotPrice.value = parseFloat(pTicData.mark_price).toFixed(2);
	objBestBuy.value = pTicData.quotes.best_ask;
	objBestSell.value = pTicData.quotes.best_bid;

	if(gCurrPos !== null){
		fnUpdateOpnPosStatus();
	}
	// else{
	// 	fnExecInternalStrategy();
	// }
}

function fnExecInternalStrategy(){
	let objSpotPrice = document.getElementById("txtSpotPrice");
	let objBestBuy = document.getElementById("txtBestBuyPrice");
	let objBestSell = document.getElementById("txtBestSellPrice");
    let isLsAutoTrader = localStorage.getItem("isDFSLAutoTrader");
    // let vTradeSide = localStorage.getItem("DFSL_TradeSideSwtS");

    if(isLsAutoTrader !== "true"){
        fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
    }
    else{
		let vOpen = parseFloat(document.getElementById("txtCandleOpen").value);
		let vHigh = parseFloat(document.getElementById("txtCandleHigh").value);
		let vLow = parseFloat(document.getElementById("txtCandleLow").value);
		let vClose = parseFloat(document.getElementById("txtCandleClose").value);
		let vBestBuy = parseFloat(objBestBuy.value);
		let vBestSell = parseFloat(objBestSell.value);
		let vTopWick = 0;
		let vBottomWick = 0;
		let vDefWickSize = 10;

		if(vOpen < vClose){
			vTopWick = vHigh - vClose;
			vBottomWick = vOpen - vLow;
		}
		else{
			vTopWick = vHigh - vOpen;
			vBottomWick = vClose - vLow;
		}
		console.log(vTopWick + " - " + vBottomWick)
		if((vBottomWick < vTopWick) && ((vBottomWick > vDefWickSize) || (vTopWick > vDefWickSize))){
			fnInitiateManualFutures("sell");
		}
		else if((vTopWick < vBottomWick) && ((vBottomWick > vDefWickSize) || (vTopWick > vDefWickSize))){
			fnInitiateManualFutures("buy");
		}
		else{
			console.log("No Trade: " + vTopWick + " - " + vBottomWick);
		}
		// let vBodySize = Math.abs(vOpen - vClose);
		// console.log(vBodySize);

        // //*********** Strategy Based Previous 5 Min Candle Size
        // let vCandleDef = vHigh - vLow;

        // if(vCandleDef > 70){
        // 	if(vBestBuy > vHigh){
	    //         fnInitiateManualFutures("buy");
        // 	}
        // 	else if(vBestSell < vLow){
	    //         fnInitiateManualFutures("sell");
        // 	}
        // 	else{
        // 		console.log("No Trade........");
        // 	}
        // }
        // //*********** Strategy Based Previous 5 Min Candle Size
    }
}

function fnUpdateOpnPosStatus(){
    let objCharges = document.getElementById("tdCharges");
    let objProfitLoss = document.getElementById("tdProfitLoss");

    let vDate = new Date();
    let vCurrDT = vDate.valueOf();

	if(gByorSl === "buy"){
		let objBestSell = document.getElementById("txtBestSellPrice");
		let objSellPrice = document.getElementById("tdSellPrice");
		
		gSellPrice = parseFloat(objBestSell.value).toFixed(2);

		objSellPrice.innerHTML = "<span class='blink'>" + gSellPrice + "</span>";

		gCharges = fnGetLiveOpenCharges(gCurrPos?.TradeData?.[0], gBuyPrice, gSellPrice);
		gPL = fnGetTradePL(gSellPrice, gBuyPrice, gLotSize, gQty, gCharges);

		objCharges.innerText = (gCharges).toFixed(3);
		objProfitLoss.innerText = (gPL).toFixed(2);

		gCurrPos.TradeData[0].SellPrice = gSellPrice;
		gCurrPos.TradeData[0].Charges = gCharges;
		gCurrPos.TradeData[0].ProfitLoss = gPL;

		fnCheckBuySLTP(gSellPrice);
	}
	else if(gByorSl === "sell"){
		let objBestBuy = document.getElementById("txtBestBuyPrice");
		let objBuyPrice = document.getElementById("tdBuyPrice");

		gBuyPrice = parseFloat(objBestBuy.value).toFixed(2);

		objBuyPrice.innerHTML = "<span class='blink'>" + gBuyPrice + "</span>";

		gCharges = fnGetLiveOpenCharges(gCurrPos?.TradeData?.[0], gBuyPrice, gSellPrice);
		gPL = fnGetTradePL(gSellPrice, gBuyPrice, gLotSize, gQty, gCharges);

		objCharges.innerText = (gCharges).toFixed(3);
		objProfitLoss.innerText = (gPL).toFixed(2);

		gCurrPos.TradeData[0].BuyPrice = gBuyPrice;
		gCurrPos.TradeData[0].Charges = gCharges;
		gCurrPos.TradeData[0].ProfitLoss = gPL;

		fnCheckSellSLTP(gBuyPrice);
	}
	else{
		fnGenMessage("No Open Position!", `badge bg-warning`, "spnGenMsg");
	}
    fnUpdateMartiDebugStatus();
}

function fnGetCurrentRateTesting(){
	let objBuyPrice = document.getElementById("tdBuyPrice");
	let objSellPrice = document.getElementById("tdSellPrice");

	let objBestBuy = document.getElementById("txtBestBuyPrice");
	let objBestSell = document.getElementById("txtBestSellPrice");

	let objCurrRate = document.getElementById("txtCurrentRate");

	if(gByorSl === "buy"){
		objBestSell.value = objCurrRate.value;
	}
	else if(gByorSl === "sell"){
		objBestBuy.value = objCurrRate.value;
	}
	else{
		alert("No Open Psoition");
	}
	fnUpdateOpnPosStatus();
}

function fnCheckBuySLTP(pCurrPrice){
	let objSwtYet2Rec = document.getElementById("swtYetToRec");
    let vTotLossAmt = JSON.parse(localStorage.getItem("DFSL_TotLossAmt"));
    let vNewProfit = Math.abs(parseFloat(localStorage.getItem("DFSL_TotLossAmt")) * parseFloat(gMultiplierX));
	let objCounterSwt = document.getElementById("swtTradeCounter");
	let objBrkRec = document.getElementById("tdHeadBrkRec");
    const vMode = String(localStorage.getItem("DFSL_TradeMode") || "").toUpperCase();
    const bIsMarti = (vMode === "MARTI");
    const objOpenTrade = gCurrPos?.TradeData?.[0] || {};
    const vEntryRule = String(objOpenTrade.EntryRule || "").toUpperCase();
    const vEntryPrice = Number(objOpenTrade.BuyPrice || gBuyPrice);

    if(vTotLossAmt === null || isNaN(vTotLossAmt)){
    	vTotLossAmt = 0;
    }
    if(vNewProfit === null || isNaN(vNewProfit)){
    	vNewProfit = 0;
    }

	// let vBrokTotLossRec = Math.abs(parseFloat(vTotLossAmt) - parseFloat(gCharges));
	// objBrkRec.innerText = (vBrokTotLossRec).toFixed(2);

    // console.log("vTotLossAmt: " + vTotLossAmt);
    // console.log("gCharges: " + gCharges);
	// console.log("vBrokTotLossRec: " + vBrokTotLossRec);
    // console.log("gPL: " + gPL);
    fnApplyTrailingSL(pCurrPrice);

    // Common rule across all strategies:
    // If Y2R is ON and current running net P&L fully recovers the loss bucket,
    // force full close (no partial close).
    const vY2RTarget = fnGetY2RTargetAmt();
    if(objSwtYet2Rec?.checked && vY2RTarget > 0 && Number(gPL) >= vY2RTarget){
        fnGenMessage(`Y2R target hit (${vY2RTarget.toFixed(2)}). Closing full trade.`, `badge bg-success`, "spnGenMsg");
        fnRequestClose("Y2R target hit", "full");
        return;
    }

	if((vEntryRule === "GOL" || vEntryRule === "ROH") && Number.isFinite(vEntryPrice) && Number(pCurrPrice) <= (vEntryPrice - 30)){
        fnGenMessage("Strict SL hit for BUY (-30 points).", `badge bg-danger`, "spnGenMsg");
		fnRequestClose("Buy strict SL hit", "full");
	}
	else if(pCurrPrice <= gAmtSL){
		fnRequestClose("Buy SL hit", "full");
	}
	else if(bIsMarti && (parseFloat(vTotLossAmt) < 0) && (parseFloat(gPL) >= parseFloat(vNewProfit))){
        if(fnParsePositiveNumber(gLossRecPerct, 100) >= 100 || Number(gCurrPos?.TradeData?.[0]?.Qty || 0) <= 1){
            fnRequestClose("Buy marti recovery full close", "full");
        }
        else{
            fnRequestClose("Buy marti recovery partial close", "partial");
        }
	}
	else if((parseFloat(vTotLossAmt) < 0) && (parseFloat(gPL) > parseFloat(vNewProfit)) && (parseInt(gQty) > 10)){
		// console.log("50 Profit Taken.............");
		if(objSwtYet2Rec.checked){
			fnRequestClose("Buy Y2R partial close", "partial");
		}
	}
	// else if(parseFloat(gPL) >= vBrokTotLossRec){
	// 	fnCloseManualFutures(gByorSl);
	// }
	else if(gTimeDiff < gMaxTradeTime){
		// console.log("Timer Ending...");
		if(objCounterSwt.checked){
			fnRequestClose("Buy timer close", "full");
		}
	}
	else if((parseFloat(gAmtTP) > 0) && (parseFloat(gPL) >= parseFloat(gAmtTP))){
		// console.log("TP Hit");
		fnRequestClose("Buy TP amount hit", "full");
	}
	else if(parseFloat(pCurrPrice) >= parseFloat(gAmtTP1)){
		// console.log("TP1 Hit");
		if(g50Perc1Time){
			g50Perc1Time = false;
			fnRequestClose("Buy TP1 partial close", "partial");
		}
	}
	else{
		// console.log("Buy Trade is Still ON");
	}
}

function fnCheckSellSLTP(pCurrPrice){
	let objSwtYet2Rec = document.getElementById("swtYetToRec");
    let vTotLossAmt = JSON.parse(localStorage.getItem("DFSL_TotLossAmt"));
    let vNewProfit = Math.abs(parseFloat(localStorage.getItem("DFSL_TotLossAmt")) * parseFloat(gMultiplierX));
	let objCounterSwt = document.getElementById("swtTradeCounter");
	let objBrkRec = document.getElementById("tdHeadBrkRec");
    const vMode = String(localStorage.getItem("DFSL_TradeMode") || "").toUpperCase();
    const bIsMarti = (vMode === "MARTI");
    const objOpenTrade = gCurrPos?.TradeData?.[0] || {};
    const vEntryRule = String(objOpenTrade.EntryRule || "").toUpperCase();
    const vEntryPrice = Number(objOpenTrade.SellPrice || gSellPrice);
    if(vEntryRule === "SACT"){
        if(Number(pCurrPrice) >= Number(gAmtSL)){
            fnRequestClose("Sell SACT SL hit", "full");
            return;
        }
        if(Number(pCurrPrice) <= Number(gAmtTP1)){
            fnRequestClose("Sell SACT TP hit", "full");
            return;
        }
    }

    if(vTotLossAmt === null || isNaN(vTotLossAmt)){
    	vTotLossAmt = 0;
    }
    if(vNewProfit === null || isNaN(vNewProfit)){
    	vNewProfit = 0;
    }

	// let vBrokTotLossRec = Math.abs(parseFloat(vTotLossAmt) - parseFloat(gCharges));
	// objBrkRec.innerText =  (vBrokTotLossRec).toFixed(2);

    // console.log("vTotLossAmt: " + vTotLossAmt);
	// console.log("gCharges: " + gCharges);
	// console.log("vBrokTotLossRec: " + vBrokTotLossRec);
    // console.log("gPL: " + gPL);
    fnApplyTrailingSL(pCurrPrice);

    // Common rule across all strategies:
    // If Y2R is ON and current running net P&L fully recovers the loss bucket,
    // force full close (no partial close).
    const vY2RTarget = fnGetY2RTargetAmt();
    if(objSwtYet2Rec?.checked && vY2RTarget > 0 && Number(gPL) >= vY2RTarget){
        fnGenMessage(`Y2R target hit (${vY2RTarget.toFixed(2)}). Closing full trade.`, `badge bg-success`, "spnGenMsg");
        fnRequestClose("Y2R target hit", "full");
        return;
    }

	if((vEntryRule === "GOL" || vEntryRule === "ROH") && Number.isFinite(vEntryPrice) && Number(pCurrPrice) >= (vEntryPrice + 30)){
        fnGenMessage("Strict SL hit for SELL (+30 points).", `badge bg-danger`, "spnGenMsg");
		fnRequestClose("Sell strict SL hit", "full");
	}
	else if(pCurrPrice >= gAmtSL){
		// console.log("SL Hit");
		fnRequestClose("Sell SL hit", "full");
	}
	else if(bIsMarti && (parseFloat(vTotLossAmt) < 0) && (parseFloat(gPL) >= parseFloat(vNewProfit))){
        if(fnParsePositiveNumber(gLossRecPerct, 100) >= 100 || Number(gCurrPos?.TradeData?.[0]?.Qty || 0) <= 1){
            fnRequestClose("Sell marti recovery full close", "full");
        }
        else{
            fnRequestClose("Sell marti recovery partial close", "partial");
        }
	}
	else if((parseFloat(vTotLossAmt) < 0) && (parseFloat(gPL) > parseFloat(vNewProfit)) && (parseInt(gQty) > 10)){
		// console.log("50 Profit Taken.............");
		if(objSwtYet2Rec.checked){
			fnRequestClose("Sell Y2R partial close", "partial");
		}
	}
	// else if(parseFloat(gPL) >= vBrokTotLossRec){
	// 	fnCloseManualFutures(gByorSl);
	// }
	else if(gTimeDiff < gMaxTradeTime){
		// console.log("Timer Ending...");
		if(objCounterSwt.checked){
			fnRequestClose("Sell timer close", "full");
		}
	}
	else if((parseFloat(gAmtTP) > 0) && (parseFloat(gPL) >= parseFloat(gAmtTP))){
		// console.log("TP Hit");
		fnRequestClose("Sell TP amount hit", "full");
	}
	else if(parseFloat(pCurrPrice) <= parseFloat(gAmtTP1)){
		// console.log("TP Hit");
		if(g50Perc1Time){
			g50Perc1Time = false;
			fnRequestClose("Sell TP1 partial close", "partial");
		}
	}
	else{
		// console.log("Sell Trade is Still ON");
	}
}

function fnGetHistoricalOHLC(){
    let objFutDDL = document.getElementById("ddlFuturesSymbols");

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ CandleMinutes : gHisCandleMins, Symbol: objFutDDL.value });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaFutScprDemo/getHistOHLC", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
        	let vRes = JSON.parse(objResult.data);
			let objOpen = document.getElementById("txtCandleOpen");
			let objHigh = document.getElementById("txtCandleHigh");
			let objLow = document.getElementById("txtCandleLow");
			let objClose = document.getElementById("txtCandleClose");

			objOpen.value = vRes.result[0].open;
			objHigh.value = vRes.result[0].high;
			objLow.value = vRes.result[0].low;
			objClose.value = vRes.result[0].close;
            // console.log(vRes);

            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
	            // console.log("Client IP: " + objResult.data.response.body.error.context.client_ip);
	            fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
	            fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error to Get OHLC Data, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
    });
}

function fnApplyTrailingSL(pCurrPrice){
    if(!gCurrPos || !gCurrPos.TradeData || !gCurrPos.TradeData[0]){
        return;
    }

    const objTrade = gCurrPos.TradeData[0];
    const vTrailPts = fnParsePositiveNumber(objTrade.TrailSLPts, 0);
    if(!Number.isFinite(vTrailPts) || vTrailPts <= 0){
        return;
    }

    const vCurr = Number(pCurrPrice);
    let vCurrSL = Number(gAmtSL);
    if(!Number.isFinite(vCurr) || !Number.isFinite(vCurrSL)){
        return;
    }

    const vSide = String(objTrade.TransType || "").toLowerCase();
    let vNextTrigger = Number(objTrade.TrailNextTrigger);
    if(!Number.isFinite(vNextTrigger)){
        if(vSide === "buy"){
            vNextTrigger = vCurr + vTrailPts;
        }
        else if(vSide === "sell"){
            vNextTrigger = vCurr - vTrailPts;
        }
        objTrade.TrailNextTrigger = Number(vNextTrigger.toFixed(2));
        localStorage.setItem("DFSL_CurrFutPos", JSON.stringify(gCurrPos));
        return;
    }

    let bChanged = false;
    if(vSide === "buy"){
        while(vCurr >= vNextTrigger){
            vCurrSL += vTrailPts;
            vNextTrigger += vTrailPts;
            bChanged = true;
        }
    }
    else if(vSide === "sell"){
        while(vCurr <= vNextTrigger){
            vCurrSL -= vTrailPts;
            vNextTrigger -= vTrailPts;
            bChanged = true;
        }
    }

    if(bChanged){
        gAmtSL = Number(vCurrSL.toFixed(2));
        objTrade.AmtSL = gAmtSL;
        objTrade.TrailNextTrigger = Number(vNextTrigger.toFixed(2));
        localStorage.setItem("DFSL_CurrFutPos", JSON.stringify(gCurrPos));
    }
}

function fnLoadSlTp(){
    let objCurrSlTp = fnGetLsJSON("DFSL_CurrFutSlTp", null);
    let objTxtSL = document.getElementById("txtPointsSL");
    let objTxtTSL = document.getElementById("txtPointsTSL");
    let objTxtTP1 = document.getElementById("txtPointsTP1");
    let objTxtTP = document.getElementById("txtAmountTP") || document.getElementById("txtPointsTP");

    if(!objTxtSL || !objTxtTSL || !objTxtTP1 || !objTxtTP){
        return;
    }

    if(objCurrSlTp === null){
    	let objSlTp = { PointSL : 200, PointTSL : 0, PointTP1 : 1000, AmountTP : 1000 };
    	localStorage.setItem("DFSL_CurrFutSlTp", JSON.stringify(objSlTp));
    	objTxtSL.value = 200;
    	objTxtTSL.value = 0;
    	objTxtTP1.value = 1000;
    	objTxtTP.value = 1000;
    }
    else{
    	objTxtSL.value = objCurrSlTp.PointSL;
    	objTxtTSL.value = Number.isFinite(Number(objCurrSlTp.PointTSL)) ? Number(objCurrSlTp.PointTSL) : 0;
    	objTxtTP1.value = objCurrSlTp.PointTP1;
    	objTxtTP.value = (objCurrSlTp.AmountTP !== undefined) ? objCurrSlTp.AmountTP : objCurrSlTp.PointTP;
    }
}

function fnUpdateSlTp(){
    let objTxtSL = document.getElementById("txtPointsSL");
    let objTxtTSL = document.getElementById("txtPointsTSL");
    let objTxtTP1 = document.getElementById("txtPointsTP1");
    let objTxtTP = document.getElementById("txtAmountTP") || document.getElementById("txtPointsTP");

    if(!objTxtSL || !objTxtTSL || !objTxtTP1 || !objTxtTP){
        return;
    }

    const vSL = fnParsePositiveNumber(objTxtSL.value, 200);
    const vTSL = fnParsePositiveNumber(objTxtTSL.value, 0);
    const vTP1 = fnParsePositiveNumber(objTxtTP1.value, 1000);
    const vTPAmt = fnParsePositiveNumber(objTxtTP.value, 1000);
    objTxtSL.value = vSL;
    objTxtTSL.value = vTSL;
    objTxtTP1.value = vTP1;
    objTxtTP.value = vTPAmt;

    let objSlTp = { PointSL : vSL, PointTSL : vTSL, PointTP1 : vTP1, AmountTP : vTPAmt };
    localStorage.setItem("DFSL_CurrFutSlTp", JSON.stringify(objSlTp));
    if(gCurrPos && gCurrPos.TradeData && gCurrPos.TradeData[0]){
        const objTrade = gCurrPos.TradeData[0];
        objTrade.TrailSLPts = vTSL;
        if(vTSL > 0){
            const vSide = String(objTrade.TransType || "").toLowerCase();
            let vCurrRef = NaN;
            if(vSide === "buy"){
                vCurrRef = Number(document.getElementById("txtBestSellPrice")?.value || objTrade.SellPrice);
                objTrade.TrailNextTrigger = Number((vCurrRef + vTSL).toFixed(2));
            }
            else if(vSide === "sell"){
                vCurrRef = Number(document.getElementById("txtBestBuyPrice")?.value || objTrade.BuyPrice);
                objTrade.TrailNextTrigger = Number((vCurrRef - vTSL).toFixed(2));
            }
        }
        else{
            objTrade.TrailNextTrigger = null;
        }
        localStorage.setItem("DFSL_CurrFutPos", JSON.stringify(gCurrPos));
    }

    fnGenMessage("Updated SL / T-SL / TP!", `badge bg-success`, "spnGenMsg");    
}

async function fnInitiateManualFutures(pTransType){
    let isLsAutoTrader = localStorage.getItem("isDFSLAutoTrader");
    const objCurrPos = fnGetLsJSON("DFSL_CurrFutPos", null);

    if(isLsAutoTrader !== "true"){
        fnGenMessage("Trade not Executed, Auto Trade is Off!", `badge bg-warning`, "spnGenMsg");
        return;
    }
    if(objCurrPos !== null){
        fnGenMessage("Close the Open Position to Execute New Trade!", `badge bg-warning`, "spnGenMsg");
        return;
    }
    const objFutDDL = document.getElementById("ddlFuturesSymbols");
    const objQty = document.getElementById("txtFuturesQty");
    const objLotSize = document.getElementById("txtLotSize");
    const objOrderType = document.getElementById("ddlOpenOrderType");
    const vSLPoints = fnParsePositiveNumber(document.getElementById("txtPointsSL").value, NaN);
    const vTSLPoints = fnParsePositiveNumber(document.getElementById("txtPointsTSL")?.value, 0);
    const vTPPoints1 = fnParsePositiveNumber(document.getElementById("txtPointsTP1").value, NaN);
    const objTPAmount = document.getElementById("txtAmountTP") || document.getElementById("txtPointsTP");
    const vTPAmount = fnParsePositiveNumber(objTPAmount ? objTPAmount.value : NaN, 0);
    const vQty = fnParsePositiveNumber(objQty.value, NaN);

    if(!objFutDDL.value){
        fnGenMessage("Please Select Symbol to Place the Order!", `badge bg-warning`, "spnGenMsg");
        return;
    }
    if(!Number.isFinite(vQty)){
        fnGenMessage("Please Input Valid Quantity to Place the Order!", `badge bg-warning`, "spnGenMsg");
        return;
    }
    if(objLotSize.value === "" || parseFloat(objLotSize.value) <= 0){
        fnGenMessage("Please Input Lot Size to Place the Order!", `badge bg-warning`, "spnGenMsg");
        return;
    }
    if(!Number.isFinite(vSLPoints) || !Number.isFinite(vTPPoints1)){
        fnGenMessage("Please provide valid SL / TP values before opening trade.", `badge bg-warning`, "spnGenMsg");
        return;
    }

    const vExecOrderType = objOrderType?.value || "market_order";
    localStorage.setItem("DFSL_OpenOrderType", vExecOrderType);
    localStorage.setItem("DFSL_OrderType", vExecOrderType);

    const vDate = new Date();
    const vClientOrdID = vDate.valueOf();
    const vToday = vDate.getDate() + "-" + (vDate.getMonth() + 1) + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    objQty.value = Math.floor(vQty);

    let objExecOrder = null;
    if(vExecOrderType === "limit_order"){
        const objLimitExec = await fnExecuteAdaptiveLimitOrderWithFallback(objFutDDL.value, objQty.value, pTransType, false, `Open ${pTransType.toUpperCase()}`);
        if(objLimitExec.status !== "success"){
            fnGenMessage(objLimitExec.message || "Unable to place open order.", `badge bg-danger`, "spnGenMsg");
            return;
        }
        objExecOrder = objLimitExec.data;
    }
    else{
        const objOrder = await fnPlaceRealOrder(vClientOrdID, objFutDDL.value, "market_order", objQty.value, pTransType, 0);
        if(objOrder.status !== "success"){
            fnGenMessage(objOrder.message, `badge bg-${objOrder.status}`, "spnGenMsg");
            return;
        }
        objExecOrder = objOrder.data.result;
    }

    const vRes = objExecOrder || {};
    const vOrdId = vRes.id;
    const vState = vRes.state;
    const vOrderTypeVal = vRes.order_type;
    const vProductID = vRes.product_id;
    const vActualClientOrdID = Number(vRes.client_order_id || vClientOrdID);
    const vExecPrice = parseFloat(vRes.average_fill_price || vRes.limit_price);
    const vEntryCommission = Number(vRes.paid_commission || 0);
    let vTrailNextTrigger = null;

    gByorSl = pTransType;
    if(gByorSl === "buy"){
        gAmtSL = (vExecPrice - vSLPoints).toFixed(2);
        gAmtTP1 = (vExecPrice + vTPPoints1).toFixed(2);
        gAmtTP = Number.isFinite(vTPAmount) ? vTPAmount : 0;
    }
    else if(gByorSl === "sell"){
        gAmtSL = (vExecPrice + vSLPoints).toFixed(2);
        gAmtTP1 = (vExecPrice - vTPPoints1).toFixed(2);
        gAmtTP = Number.isFinite(vTPAmount) ? vTPAmount : 0;
    }
    else{
        gAmtSL = 0;
        gAmtTP1 = 0;
        gAmtTP = 0;
    }
    if(vTSLPoints > 0){
        if(gByorSl === "buy"){
            const vCurrRef = Number(document.getElementById("txtBestSellPrice")?.value || vExecPrice);
            vTrailNextTrigger = Number((vCurrRef + vTSLPoints).toFixed(2));
        }
        else if(gByorSl === "sell"){
            const vCurrRef = Number(document.getElementById("txtBestBuyPrice")?.value || vExecPrice);
            vTrailNextTrigger = Number((vCurrRef - vTSLPoints).toFixed(2));
        }
    }

    const vExcTradeDtls = {
        TradeData: [{
            OrderID: vOrdId,
            ClientOrderID: vActualClientOrdID,
            OpenDT: vToday,
            FutSymbol: objFutDDL.value,
            TransType: pTransType,
            LotSize: objLotSize.value,
            Qty: objQty.value,
            BuyPrice: vExecPrice,
            SellPrice: vExecPrice,
            AmtSL: gAmtSL,
            AmtTP1: gAmtTP1,
            AmtTP: gAmtTP,
            StopLossPts: vSLPoints,
            TrailSLPts: vTSLPoints,
            TrailNextTrigger: vTrailNextTrigger,
            TakeProfitAmt: vTPAmount,
            OpenDTVal: vActualClientOrdID,
            OrderType: vOrderTypeVal,
            OrderState: vState,
            ProductID: vProductID,
            BuyCommission: (pTransType === "buy" && Number.isFinite(vEntryCommission)) ? vEntryCommission : 0,
            SellCommission: (pTransType === "sell" && Number.isFinite(vEntryCommission)) ? vEntryCommission : 0
        }]
    };
    gCurrPos = vExcTradeDtls;
    localStorage.removeItem("DFSL_LastCloseTxnKey");
    localStorage.setItem("DFSL_CurrFutPos", JSON.stringify(vExcTradeDtls));
    localStorage.setItem("DFSL_QtyMul", objQty.value);
    fnSetLastOpenBrokerage(Number.isFinite(vEntryCommission) ? vEntryCommission : 0);
    g50Perc1Time = true;

    fnSetInitFutTrdDtls();
    fnSubscribe();
    fnGenMessage("Live order placed successfully!", `badge bg-success`, "spnGenMsg");
    document.getElementById("spnLossTrd").className = "badge rounded-pill text-bg-success";
    fnSendOpenTradeTelegramAlert(vExcTradeDtls.TradeData[0], "MANUAL");
}

function fnPlaceRealOrder(pOrdId, pSymbol, pOrderType, pQty, pTransType, pLimitPrice, pStopOrderType = "", pStopPrice = 0, pPostOnly = false, pReduceOnly = false){
    return new Promise((resolve, reject) => {
        if(localStorage.getItem("isDFSLAutoTrader") !== "true"){
            resolve({ status: "warning", message: "Trade blocked: Auto Trade is OFF.", data: "" });
            return;
        }

        const objApiKey = document.getElementById("txtUserAPIKey");
        const objApiSecret = document.getElementById("txtAPISecret");
        const vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        const vAction = JSON.stringify({
            ApiKey: objApiKey.value,
            ApiSecret: objApiSecret.value,
            ClientOrdID: pOrdId,
            SymbolID: pSymbol,
            OrderType: pOrderType,
            Quantity: pQty,
            TransType: pTransType,
            LimitPrice: pLimitPrice,
            StopOrderType: pStopOrderType,
            StopPrice: pStopPrice,
            PostOnly: pPostOnly,
            ReduceOnly: pReduceOnly
        });

        fetch("/deltaExcFutR/placeRealOrder", {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        })
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success" || objResult.status === "warning"){
                resolve({ status: objResult.status, message: objResult.message, data: objResult.data });
            }
            else if(objResult.status === "danger"){
                const vErrCode = objResult?.data?.response?.body?.error?.code || "order_failed";
                resolve({ status: objResult.status, message: "Error: " + vErrCode, data: objResult.data });
            }
            else{
                resolve({ status: "warning", message: objResult.message || "Order not placed", data: objResult.data });
            }
        })
        .catch(() => {
            reject({ status: "danger", message: "Error in placing live order...", data: "" });
        });
    });
}

function fnCancelLiveOrder(pOrderID, pClientOrdID, pSymbol){
    return new Promise((resolve, reject) => {
        const objApiKey = document.getElementById("txtUserAPIKey");
        const objApiSecret = document.getElementById("txtAPISecret");
        const vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");
        const vAction = JSON.stringify({
            ApiKey: objApiKey?.value || "",
            ApiSecret: objApiSecret?.value || "",
            OrderID: pOrderID,
            ClientOrdID: pClientOrdID,
            Symbol: pSymbol
        });

        fetch("/deltaExcFutR/cancelPendingOrder", {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        })
        .then(response => response.json())
        .then(objResult => resolve({ status: objResult.status, data: objResult.data }))
        .catch(() => resolve({ status: "danger", data: null }));
    });
}

function fnEditLiveOrder(pOrderID, pSymbol, pQty, pLimitPrice, pStopPrice = 0, pPostOnly = false){
    return new Promise((resolve) => {
        const objApiKey = document.getElementById("txtUserAPIKey");
        const objApiSecret = document.getElementById("txtAPISecret");
        const vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");
        const vAction = JSON.stringify({
            ApiKey: objApiKey?.value || "",
            ApiSecret: objApiSecret?.value || "",
            OrderID: pOrderID,
            Symbol: pSymbol,
            Quantity: pQty,
            LimitPrice: pLimitPrice,
            StopPrice: pStopPrice,
            PostOnly: pPostOnly
        });

        fetch("/deltaExcFutR/editPendingOrder", {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        })
        .then(response => response.json())
        .then(objResult => resolve({ status: objResult.status, data: objResult.data, message: objResult.message || "" }))
        .catch(() => resolve({ status: "danger", data: null, message: "edit pending network error" }));
    });
}

function fnSetInitFutTrdDtls(){
    let objDateTime = document.getElementById("tdDateTime");
    let objSymbol = document.getElementById("tdSymbol");
    let objTransType = document.getElementById("tdTransType");
    let objLotSize = document.getElementById("tdLotSize");
    let objQty = document.getElementById("tdQty");
    let objBuyPrice = document.getElementById("tdBuyPrice");
    let objSellPrice = document.getElementById("tdSellPrice");
    let objCapital = document.getElementById("tdCapital");
    let objCharges = document.getElementById("tdCharges");
    let objProfitLoss = document.getElementById("tdProfitLoss");
    let objTrdExitTime = document.getElementById("txtTrdExitTime");

    // console.log(gCurrPos);

	if(gCurrPos !== null){
        gOrderDT = gCurrPos.TradeData[0].OpenDTVal || gCurrPos.TradeData[0].OrderID;

	    let vDate = new Date();
	    let vCurrDT = vDate.valueOf();
	    let vTimeDiff = ((vCurrDT - gOrderDT)/60000) + 0.15;

		if(vTimeDiff < parseInt(objTrdExitTime.value))
		fnInnitiateTimer(parseInt(objTrdExitTime.value) - vTimeDiff);

		gBuyPrice = parseFloat(gCurrPos.TradeData[0].BuyPrice).toFixed(2);
		gSellPrice = parseFloat(gCurrPos.TradeData[0].SellPrice).toFixed(2);
		gLotSize = parseFloat(gCurrPos.TradeData[0].LotSize);
		gQty = parseFloat(gCurrPos.TradeData[0].Qty);
		gByorSl = gCurrPos.TradeData[0].TransType;
		gAmtSL = gCurrPos.TradeData[0].AmtSL;
		gAmtTP1 = gCurrPos.TradeData[0].AmtTP1;
		gAmtTP = (gCurrPos.TradeData[0].TakeProfitAmt !== undefined) ? gCurrPos.TradeData[0].TakeProfitAmt : gCurrPos.TradeData[0].AmtTP;

		objDateTime.innerText = gCurrPos.TradeData[0].OpenDT;
		objSymbol.innerText = gCurrPos.TradeData[0].FutSymbol;
		objTransType.innerText = gCurrPos.TradeData[0].TransType;
		objLotSize.innerText = gLotSize;
		objQty.innerText = gQty;
		gCapital = fnGetTradeCapital(gByorSl, gBuyPrice, gSellPrice, gLotSize, gQty);
		objCapital.innerText = (gCapital).toFixed(2);
		gCharges = fnGetLiveOpenCharges(gCurrPos?.TradeData?.[0], gBuyPrice, gSellPrice);
		objCharges.innerText = (gCharges).toFixed(3);
		let vPL = fnGetTradePL(gSellPrice, gBuyPrice, gLotSize, gQty, gCharges);
		objProfitLoss.innerText = (vPL).toFixed(2);

		if(gCurrPos.TradeData[0].TransType === "buy"){
			objBuyPrice.innerHTML = gBuyPrice;
			objSellPrice.innerHTML = "<span class='blink'>" + gSellPrice + "</span>";
		}
		else if(gCurrPos.TradeData[0].TransType === "sell"){
			objBuyPrice.innerHTML = "<span class='blink'>" + gBuyPrice + "</span>";
			objSellPrice.innerHTML = gSellPrice;
		}
		else{
			objBuyPrice.innerHTML = 0.00;
			objSellPrice.innerHTML = 0.00;
			objCapital.innerText = 0.00;
			objCharges.innerText = 0.00;
		}
	    fnSet50PrctQty();
        fnGenMessage("<span class='blink'>Position Is Open</span>", `badge bg-warning`, "btnPositionStatus");
	}
	else{
		objDateTime.innerText = "";
		objSymbol.innerText = "";
		objTransType.innerText = "";
		objLotSize.innerText = "";
		objQty.innerText = "";
		objBuyPrice.innerText = "";
		objSellPrice.innerText = "";
		objCapital.innerText = "";
		objCharges.innerText = "";
		objProfitLoss.innerText = "";

		gByorSl = "";
	}

    fnLoadNetLimits();
}

function fnManualSubStart(){
	fnManualSubcription();
	clearInterval(gManualSubIntvl);
	gManualSubIntvl = setInterval(fnManualSubcription, 8000);
}

async function fnManualSubcription(){
    let objBestRates = await fnGetFutBestRates();
    if(objBestRates.status === "success"){
    	let objBestBuy = document.getElementById("txtBestBuyPrice");
		let objBestSell = document.getElementById("txtBestSellPrice");

	    objBestBuy.value = parseFloat(objBestRates.data.BestBuy);
	    objBestSell.value = parseFloat(objBestRates.data.BestSell);
    	
		if(gCurrPos !== null){
			fnUpdateOpnPosStatus();
		}
		console.log("Manual Rates Started.....")
    }
	else{

	}
}

function fnManualSubStop(){
	clearInterval(gManualSubIntvl);
	console.log("Manual Rates Stopped.....");

   	let objBestBuy = document.getElementById("txtBestBuyPrice");
	let objBestSell = document.getElementById("txtBestSellPrice");

	objBestBuy.value = "";
	objBestSell.value= "";
}

function fnGetFutBestRates(){
	const objPromise = new Promise((resolve, reject) => {

	    let objFutDDL = document.getElementById("ddlFuturesSymbols");
        if(!objFutDDL.value){
            reject({ "status": "warning", "message": "Please select a symbol first.", "data": "" });
            return;
        }

	    let vHeaders = new Headers();
	    vHeaders.append("Content-Type", "application/json");

	    let vAction = JSON.stringify({ Symbol : objFutDDL.value });

	    let requestOptions = {
	        method: 'POST',
	        headers: vHeaders,
	        body: vAction,
	        redirect: 'follow'
	    };

	    fetch("/deltaFutScprDemo/getCurrBSRates", requestOptions)
	    .then(response => response.json())
	    .then(objResult => {

	        if(objResult.status === "success"){
	        	let vRes = JSON.parse(objResult.data);

	            let objBestRates = { BestBuy : vRes.result.quotes.best_ask, BestSell : vRes.result.quotes.best_bid }

                resolve({ "status": objResult.status, "message": objResult.message, "data": objBestRates });
	        }
	        else if(objResult.status === "danger"){
	            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){

		            // fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
	                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
	            }
	            else{
		            // fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
	                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
	            }
	        }
	        else if(objResult.status === "warning"){
	            // fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
	        }
	        else{
	            fnGenMessage("Error in Getting Best Rates Data, Contact Admin!", `badge bg-danger`, "spnGenMsg");
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
	        }
	    })
	    .catch(error => {
	        // fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error in Getting Fut Best Rates...", "data": "" });
	    });
    });

    return objPromise;
}

async function fnCloseManualFutures(pTransType, pReason = ""){
	if(gCurrPos === null){
        fnGenMessage("No Open Position to Close!", `badge bg-warning`, "spnGenMsg");
        return { status: "warning", message: "No Open Position to Close!" };
	}
	else if(gCurrPos.TradeData[0].TransType !== pTransType){
        const vMsg = "No " + pTransType + " Position to Close!";
        fnGenMessage(vMsg, `badge bg-warning`, "spnGenMsg");
        return { status: "warning", message: vMsg };
	}
	else{
        if(!fnAcquireCloseLock(pReason || `manual-${pTransType}`)){
            return { status: "warning", message: "Close already in progress." };
        }
        try{
            const objTrade = gCurrPos?.TradeData?.[0] || {};
            if(String(objTrade.EntryRule || "").toUpperCase() === "SACT"){
                await fnCancelSellActProtectionOrders(objTrade);
                localStorage.setItem("DFSL_CurrFutPos", JSON.stringify(gCurrPos));
            }
    		let objClsTrd = await fnInnitiateClsFutTrade(0);
    		if(objClsTrd.status === "success"){
                fnSetInitFutTrdDtls();
                gClosedHistoryLoaded = false;
    		    fnLoadTodayTrades();
                await fnRefreshClosedPositionsFromExchange();

                fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
    		}
    		else{
                fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
    		}
            return objClsTrd;
        }
        finally{
            fnReleaseCloseLock();
        }
	}
}

function fnStartRenkoPendingPoller(){
    if(gRenkoPendingPollId){
        return;
    }
    gRenkoPendingPollId = setInterval(() => {
        fnPollRenkoPendingFills();
    }, 10000);
}

function fnStopRenkoPendingPoller(){
    if(!gRenkoPendingPollId){
        return;
    }
    clearInterval(gRenkoPendingPollId);
    gRenkoPendingPollId = 0;
}

function fnSyncRenkoPendingPoller(){
    if(gCurrPos !== null || gRenkoSellState.Pending || gRenkoBuyState.Pending){
        fnStartRenkoPendingPoller();
    }
    else{
        fnStopRenkoPendingPoller();
    }
}

async function fnPollRenkoPendingFills(){
    if(gRenkoPendingPollBusy){
        return;
    }
    gRenkoPendingPollBusy = true;
    try{
        await fnRefreshRenkoPendingFill("sell", gRenkoSellState);
        await fnRefreshRenkoPendingFill("buy", gRenkoBuyState);
        await fnSyncLocalOpenPositionWithExchange();

        if(gCurrPos !== null){
            if(gCurrPos?.TradeData?.[0]?.TransType === "sell" && gRenkoBuyState.Pending){
                await fnCancelRenkoBuyPending("Renko BUY pending cancelled (SELL already open).");
            }
            else if(gCurrPos?.TradeData?.[0]?.TransType === "buy" && gRenkoSellState.Pending){
                await fnCancelRenkoSellPending("Renko SELL pending cancelled (BUY already open).");
            }
        }
    }
    finally{
        gRenkoPendingPollBusy = false;
        fnSyncRenkoPendingPoller();
    }
}

function fnSet50PrctQty(){
    let objBtn50Prct = document.getElementById("btn50PerClose");

    if(gCurrPos.TradeData[0].Qty >= 2){
        objBtn50Prct.disabled = false;
    }
    else{
        objBtn50Prct.disabled = true;
    }
}

async function fnClosePrctTrade(pReason = ""){
    try{
        if (gCurrPos === null){
            fnGenMessage("No Open Positions to Close 50% Qty!", `badge bg-warning`, "spnGenMsg");
        }
        else{
            if(!fnAcquireCloseLock(pReason || "partial-close")){
                return { status: "warning", message: "Close already in progress." };
            }
            const vCurrQty = Number(gCurrPos.TradeData[0].Qty);
            let vPrctQty2Rec = Math.floor((vCurrQty * Number(gLossRecPerct)) / 100);
            if(vPrctQty2Rec < 1){
                vPrctQty2Rec = 1;
            }
            if(vPrctQty2Rec >= vCurrQty){
                vPrctQty2Rec = vCurrQty - 1;
            }
            if(vPrctQty2Rec < 1){
                fnGenMessage("Not enough quantity for partial close.", `badge bg-warning`, "spnGenMsg");
                return;
            }
            let objClsTrd = await fnInnitiateClsFutTrade(vPrctQty2Rec);

            if(objClsTrd.status === "success"){
                fnSetInitFutTrdDtls();
                gClosedHistoryLoaded = false;
			    fnLoadTodayTrades();
                await fnRefreshClosedPositionsFromExchange();
                fnGenMessage("Partial Qty Closed!", `badge bg-${objClsTrd.status}`, "spnGenMsg");   
            }
            else{
                fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
            }
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
    finally{
        fnReleaseCloseLock();
    }
}

async function fnInnitiateClsFutTrade(pQty){
    const vCurrQty = Number(gCurrPos.TradeData[0].Qty);
    const vCloseQty = Number(pQty);
    if(Number.isNaN(vCloseQty) || vCloseQty < 0 || vCloseQty > vCurrQty){
        return { "status": "warning", "message": "Invalid quantity requested for close.", "data": "" };
    }

    const vDate = new Date();
    const vToday = vDate.getDate() + "-" + (vDate.getMonth() + 1) + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    const vToCntuQty = vCurrQty - vCloseQty;
    const objApiKey = document.getElementById("txtUserAPIKey");
    const objApiSecret = document.getElementById("txtAPISecret");
    const vOrderID = gCurrPos.TradeData[0].OrderID;
    const vClientOrderID = gCurrPos.TradeData[0].ClientOrderID;
    const vSymbol = gCurrPos.TradeData[0].FutSymbol;
    const vProductID = gCurrPos.TradeData[0].ProductID;
    const vStartValDT = (gCurrPos.TradeData[0].OpenDTVal || vClientOrderID) * 1000;
    const vOpenSide = String(gCurrPos.TradeData[0].TransType || "").toLowerCase();
    const vTransType = gCurrPos.TradeData[0].TransType === "buy" ? "sell" : "buy";
    const objCloseOrderType = document.getElementById("ddlCloseOrderType");
    const vOrderType = objCloseOrderType?.value || localStorage.getItem("DFSL_CloseOrderType") || "market_order";
    let vExecQty = vCurrQty;
    if(vCloseQty > 0){
        vExecQty = vCloseQty;
    }

    const objNetPos = await fnGetNetPositionByProductID(vProductID);
    if(objNetPos.status === "success"){
        const vNetSize = Number(objNetPos?.data?.size || 0);
        let vExchOpenQty = 0;
        if(vOpenSide === "sell"){
            vExchOpenQty = vNetSize < 0 ? Math.abs(vNetSize) : 0;
        }
        else{
            vExchOpenQty = vNetSize > 0 ? vNetSize : 0;
        }
        vExchOpenQty = Math.floor(vExchOpenQty);

        if(vExchOpenQty <= 0){
            await fnSyncLocalOpenPositionWithExchange();
            return { "status": "warning", "message": "Exchange shows no open quantity. Synced local position.", "data": "" };
        }
        if(vExecQty > vExchOpenQty){
            vExecQty = vExchOpenQty;
            fnGenMessage(`Close qty adjusted to exchange open qty: ${vExecQty}`, `badge bg-warning`, "spnGenMsg");
        }
    }

    let vCloseExecResult = null;
    let vReturnData = "";
    if(vOrderType === "limit_order"){
        const objLimitClose = await fnExecuteAdaptiveLimitOrderWithFallback(vSymbol, vExecQty, vTransType, true, `Close ${vTransType.toUpperCase()}`);
        if(objLimitClose.status !== "success"){
            return { "status": "danger", "message": objLimitClose.message || "Limit close failed.", "data": "" };
        }
        vCloseExecResult = objLimitClose.data || {};
        vReturnData = vCloseExecResult;
    }
    else{
        const vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");
        const vAction = JSON.stringify({
            ApiKey: objApiKey.value,
            ApiSecret: objApiSecret.value,
            OrderID: vOrderID,
            ClientOrdID: vClientOrderID,
            Symbol: vSymbol,
            OrderType: "market_order",
            Quantity: vExecQty,
            TransType: vTransType,
            ProductID: vProductID,
            StartValDT: vStartValDT
        });

        let objResult = null;
        try{
            const response = await fetch("/deltaExcFutR/closeRealPosition", {
                method: "POST",
                headers: vHeaders,
                body: vAction,
                redirect: "follow"
            });
            objResult = await response.json();
        }
        catch(_err){
            return { "status": "danger", "message": "Error in placing close order...", "data": "" };
        }

        if(objResult.status !== "success"){
            const vErrCode = objResult?.data?.response?.body?.error?.code || objResult.message;
            return { "status": objResult.status, "message": vErrCode, "data": objResult.data };
        }
        vCloseExecResult = objResult?.data?.result || {};
        vReturnData = objResult.data;
    }

    const vCloseOrderID = Number(vCloseExecResult?.id || 0);
    const vTxnKey = [vOrderID, vCloseOrderID, vExecQty, vTransType].join("_");
    if(localStorage.getItem("DFSL_LastCloseTxnKey") === vTxnKey){
        return { "status": "success", "message": "Duplicate close callback ignored.", "data": vReturnData };
    }

    const vFillPrice = parseFloat(vCloseExecResult.average_fill_price || vCloseExecResult.limit_price || 0);
    const vCloseCommission = Number(vCloseExecResult?.paid_commission || 0);
    fnSetLastCloseBrokerage(vCloseCommission);
    const vEntryBuyCommRaw = Number(gCurrPos.TradeData[0].BuyCommission || 0);
    const vEntrySellCommRaw = Number(gCurrPos.TradeData[0].SellCommission || 0);
    const vExecRatio = (vCurrQty > 0) ? (vExecQty / vCurrQty) : 1;
    const vEntryBuyCommForClose = vEntryBuyCommRaw * vExecRatio;
    const vEntrySellCommForClose = vEntrySellCommRaw * vExecRatio;
    const vCloseBuyComm = (vTransType === "buy" && Number.isFinite(vCloseCommission)) ? vCloseCommission : 0;
    const vCloseSellComm = (vTransType === "sell" && Number.isFinite(vCloseCommission)) ? vCloseCommission : 0;
    const vBuyCommission = vEntryBuyCommForClose + vCloseBuyComm;
    const vSellCommission = vEntrySellCommForClose + vCloseSellComm;
    gCurrPos.TradeData[0].CloseDT = vToday;
    gCurrPos.TradeData[0].CloseDTVal = vDate.valueOf();
    gCurrPos.TradeData[0].Qty = vExecQty;
    if(vTransType === "buy"){
        gCurrPos.TradeData[0].BuyPrice = vFillPrice;
    }
    else{
        gCurrPos.TradeData[0].SellPrice = vFillPrice;
    }

    const vCapital = fnGetTradeCapital(gCurrPos.TradeData[0].TransType, gCurrPos.TradeData[0].BuyPrice, gCurrPos.TradeData[0].SellPrice, gCurrPos.TradeData[0].LotSize, vExecQty);
    const vOpenMs = Number(gCurrPos.TradeData[0].OpenDTVal) || Number(gCurrPos.TradeData[0].ClientOrderID) || vDate.valueOf();
    let vCharges = vBuyCommission + vSellCommission;
    if(!Number.isFinite(vCharges) || vCharges <= 0){
        vCharges = fnGetTradeCharges(vOpenMs, vDate.valueOf(), gCurrPos.TradeData[0].LotSize, vExecQty, gCurrPos.TradeData[0].BuyPrice, gCurrPos.TradeData[0].SellPrice, gCurrPos.TradeData[0].TransType);
    }
    const vTradePL = fnGetTradePL(gCurrPos.TradeData[0].SellPrice, gCurrPos.TradeData[0].BuyPrice, gCurrPos.TradeData[0].LotSize, vExecQty, vCharges);
    gCurrPos.TradeData[0].Capital = vCapital;
    gCurrPos.TradeData[0].Charges = vCharges;
    gCurrPos.TradeData[0].ProfitLoss = vTradePL;
    gCurrPos.TradeData[0].BuyCommission = vBuyCommission;
    gCurrPos.TradeData[0].SellCommission = vSellCommission;

    gOldPLAmt = Number(localStorage.getItem("DFSL_TotLossAmt")) || 0;
    gNewPLAmt = vTradePL;
    localStorage.setItem("DFSL_OldPLAmt", gOldPLAmt);
    localStorage.setItem("DFSL_NewPLAmt", gNewPLAmt);

    const objTodayTrades = JSON.parse(localStorage.getItem("DFSL_TrdBkFut"));
    if(objTodayTrades === null){
        localStorage.setItem("DFSL_TrdBkFut", JSON.stringify(gCurrPos));
    }
    else{
        const vExistingData = objTodayTrades;
        vExistingData.TradeData.push(gCurrPos.TradeData[0]);
        localStorage.setItem("DFSL_TrdBkFut", JSON.stringify(vExistingData));
    }

    fnApplyLossToRecoverFromClosedTradePL(vTradePL);
    fnUpdateMartiDebugStatus();

    const bIsFullClose = (vCloseQty === 0 || vToCntuQty === 0);
    const vCloseReason = String(gLastCloseReason || "manual");
    const objCloseAlert = {
        symbol: vSymbol,
        openSide: vOpenSide,
        prevQty: vCurrQty,
        closedQty: vExecQty,
        remainingQty: Math.max(0, vToCntuQty),
        closePrice: vFillPrice,
        pnl: vTradePL,
        charges: vCharges,
        reason: vCloseReason,
        isFullClose: bIsFullClose
    };
    if(bIsFullClose){
        localStorage.removeItem("DFSL_CurrFutPos");
        gCurrPos = null;
        fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
    }
    else{
        // Keep remaining entry-side commission with the open balance quantity.
        gCurrPos.TradeData[0].BuyCommission = Math.max(0, vEntryBuyCommRaw - vEntryBuyCommForClose);
        gCurrPos.TradeData[0].SellCommission = Math.max(0, vEntrySellCommRaw - vEntrySellCommForClose);
        gCurrPos.TradeData[0].Qty = vToCntuQty;
        localStorage.setItem("DFSL_CurrFutPos", JSON.stringify(gCurrPos));
    }

    fnSetNextOptTradeSettings(bIsFullClose, vTradePL);
    fnSendCloseTradeTelegramAlert(objCloseAlert);
    document.getElementById("spnLossTrd").className = "badge rounded-pill text-bg-danger";
    localStorage.setItem("DFSL_LastCloseTxnKey", vTxnKey);
    clearInterval(gTimerID);
    return { "status": "success", "message": "Future live trade closed successfully!", "data": vReturnData };
}

//************* Yet To Recover Adjustment **************//
function fnSetNextOptTradeSettings(pIsFullClose = true, pTradePL = 0){
    if(!pIsFullClose){
        return;
    }
    let objQty = document.getElementById("txtFuturesQty");
    let vOldLossAmt = Number(localStorage.getItem("DFSL_OldPLAmt"));
	let vNewLossAmt = Number(localStorage.getItem("DFSL_NewPLAmt"));
	let vTotLossAmt = Number(localStorage.getItem("DFSL_TotLossAmt"));

    let vOldQtyMul = Number(JSON.parse(localStorage.getItem("DFSL_QtyMul")));
    let vStartLots = Number(JSON.parse(localStorage.getItem("DFSL_StartQtyNo")));
    const vMode = String(localStorage.getItem("DFSL_TradeMode") || "").toUpperCase();
    const bIsMarti = (vMode === "MARTI");
    const bIsStep = !bIsMarti;

    if(!Number.isFinite(vStartLots) || vStartLots < 1){
        vStartLots = 1;
    }
    if(!Number.isFinite(vOldQtyMul) || vOldQtyMul < 1){
        vOldQtyMul = vStartLots;
    }
    if(!Number.isFinite(vOldLossAmt)){
        vOldLossAmt = 0;
    }
    if(!Number.isFinite(vNewLossAmt)){
        vNewLossAmt = 0;
    }
    if(!Number.isFinite(vTotLossAmt)){
        vTotLossAmt = 0;
    }

    if(bIsMarti){
		if(vNewLossAmt < 0){
            fnClearY2RCarryOnRealLoss();
	        let vNextQty = Math.floor(vOldQtyMul * 2);
            if(!Number.isFinite(vNextQty) || vNextQty < vStartLots){
                vNextQty = vStartLots;
            }
	        localStorage.setItem("DFSL_QtyMul", vNextQty);
	        objQty.value = vNextQty;
		}
		else if(vTotLossAmt < 0 && vOldLossAmt < 0){
	        const vRemainRatio = Math.abs(vTotLossAmt) / Math.abs(vOldLossAmt);
	        let vNextQty = Math.ceil(vOldQtyMul * vRemainRatio);

	        if(!Number.isFinite(vNextQty) || vNextQty < vStartLots){
                vNextQty = vStartLots;
            }

	        localStorage.setItem("DFSL_QtyMul", vNextQty);
	        objQty.value = vNextQty;
		}
	    else {
	        fnApplyLastOpenBrokerageOnFullRecovery();
	        localStorage.setItem("DFSL_QtyMul", vStartLots);
	        objQty.value = vStartLots;
	    }
    }
    else if(bIsStep){
        if(vNewLossAmt < 0){
            fnClearY2RCarryOnRealLoss();
            const vNextQty = Math.floor(vOldQtyMul + vStartLots);
            localStorage.setItem("DFSL_QtyMul", vNextQty);
            objQty.value = vNextQty;
        }
        else if(vTotLossAmt < 0 && vOldLossAmt < 0){
            // Step mode: on partial recovery, reduce qty proportionally
            // to remaining loss bucket instead of keeping qty unchanged.
            let vRemainRatio = Math.abs(vTotLossAmt) / Math.abs(vOldLossAmt);
            if(!Number.isFinite(vRemainRatio)){
                vRemainRatio = 1;
            }
            vRemainRatio = Math.max(0, Math.min(1, vRemainRatio));
            let vNextQty = Math.ceil(vOldQtyMul * vRemainRatio);
            if(!Number.isFinite(vNextQty) || vNextQty < vStartLots){
                vNextQty = vStartLots;
            }
            if(vNextQty > vOldQtyMul){
                vNextQty = vOldQtyMul;
            }
            localStorage.setItem("DFSL_QtyMul", vNextQty);
            objQty.value = vNextQty;
        }
        else if(vTotLossAmt >= 0){
            fnApplyLastOpenBrokerageOnFullRecovery();
            localStorage.setItem("DFSL_QtyMul", vStartLots);
            objQty.value = vStartLots;
        }
        else{
            localStorage.setItem("DFSL_QtyMul", vOldQtyMul);
            objQty.value = vOldQtyMul;
        }
    }

	// Keep loss-recovery math strictly based on closed-trade P&L.
    // vTradePL already includes charges, so don't adjust loss bucket again.

    if(Number(localStorage.getItem("DFSL_TotLossAmt")) >= 0){
        fnApplyLastOpenBrokerageOnFullRecovery();
        localStorage.setItem("DFSL_QtyMul", vStartLots);
        objQty.value = vStartLots;
    }
    fnUpdateMartiDebugStatus();
	// console.log(localStorage.getItem("DFSL_TotLossAmt"))
}

function fnUpdateMartiDebugStatus(){
    const objDbg = document.getElementById("divMartiDbg");
    if(!objDbg){
        return;
    }

    const vMode = String(localStorage.getItem("DFSL_TradeMode") || "STEP").toUpperCase();
    const vLossBucketRaw = Number(localStorage.getItem("DFSL_TotLossAmt"));
    const vLossBucket = Number.isFinite(vLossBucketRaw) ? vLossBucketRaw : 0;
    const vXRaw = Number(gMultiplierX);
    const vX = Number.isFinite(vXRaw) && vXRaw > 0 ? vXRaw : 1;
    const vTargetProfit = Math.abs(vLossBucket) * vX;
    const vStartRaw = Number(JSON.parse(localStorage.getItem("DFSL_StartQtyNo")));
    const vStartQty = Number.isFinite(vStartRaw) && vStartRaw >= 1 ? vStartRaw : 1;
    const objQty = document.getElementById("txtFuturesQty");
    const vQtyRaw = Number(objQty?.value);
    const vCurrQty = Number.isFinite(vQtyRaw) && vQtyRaw >= 1 ? Math.floor(vQtyRaw) : vStartQty;

    let vNextQty = vStartQty;
    if(vMode === "MARTI"){
        vNextQty = vLossBucket < 0 ? Math.max(vStartQty, Math.floor(vCurrQty * 2)) : vStartQty;
    }
    else{
        vNextQty = vLossBucket < 0 ? Math.max(vStartQty, Math.floor(vCurrQty + vStartQty)) : vStartQty;
    }
    const vLossToRec = fnGetLossToRecoverAmt();
    const vLossToRecColor = (vLossToRec > 0) ? "#b02a37" : "inherit";
    const vLossToRecTxt = ` | <span style="font-weight:700;color:${vLossToRecColor};">Loss To Rec: ${vLossToRec.toFixed(2)}</span>`;
    objDbg.innerHTML = `Mode: ${vMode} | LossBucket: ${vLossBucket.toFixed(2)} | X: ${vX.toFixed(2)} | Target@X: ${vTargetProfit.toFixed(2)} | Qty: ${vCurrQty} | NextQty: ${vNextQty}${vLossToRecTxt}`;
}

function fnGetRenkoMidPrice(pBox){
    const vOpen = Number(pBox?.Open);
    const vClose = Number(pBox?.Close);
    if(!Number.isFinite(vOpen) || !Number.isFinite(vClose)){
        return NaN;
    }
    // 80% from open toward close (works for both green and red boxes).
    return Number((vOpen + ((vClose - vOpen) * 0.70)).toFixed(2));
}

async function fnCreatePositionFromFilledRenkoBySide(pSide, pOrderData, pPending){
    if(pSide === "sell"){
        return await fnCreateSellPositionFromFilledRenkoOrder(pOrderData, pPending);
    }
    return await fnCreateBuyPositionFromFilledRenkoOrder(pOrderData, pPending);
}

async function fnRefreshRenkoPendingFill(pSide, pStateObj){
    if(!pStateObj?.Pending){
        return false;
    }
    const objPending = pStateObj.Pending;
    const objDet = await fnGetOrderDetailsById(objPending.OrderID, objPending.ClientOrderID);
    if(objDet.status !== "success"){
        return false;
    }
    const vState = String(objDet.data?.state || "").toLowerCase();
            if(vState === "closed" || vState === "filled"){
                pStateObj.Pending = null;
                fnSyncRenkoPendingPoller();
                return await fnCreatePositionFromFilledRenkoBySide(pSide, objDet.data, objPending);
            }
            if(vState === "cancelled" || vState === "rejected"){
                pStateObj.Pending = null;
                fnSyncRenkoPendingPoller();
            }
            return false;
}

async function fnExpireRenkoPendingOnNextBox(pSide, pStateObj){
    if(!pStateObj?.Pending){
        return;
    }
    pStateObj.Pending.BoxesAfterPlace = Number(pStateObj.Pending.BoxesAfterPlace || 0) + 1;
    if(pStateObj.Pending.BoxesAfterPlace < 1){
        return;
    }

    if(pSide === "sell"){
        await fnCancelRenkoSellPending("Renko SELL pending cancelled: not filled by next box.");
    }
    else{
        await fnCancelRenkoBuyPending("Renko BUY pending cancelled: not filled by next box.");
    }
}

async function fnExecuteRenkoEntryBySelectedOrderType(pSide, pBox, pEntryRule){
    const vSide = (pSide === "sell") ? "sell" : "buy";
    const objFutDDL = document.getElementById("ddlFuturesSymbols");
    const objQty = document.getElementById("txtFuturesQty");
    const vQty = Math.floor(fnParsePositiveNumber(objQty?.value, 0));
    if(!objFutDDL?.value || vQty < 1){
        fnGenMessage(`Renko ${vSide.toUpperCase()} setup skipped due to invalid symbol/qty.`, `badge bg-warning`, "spnGenMsg");
        return;
    }

    const objOrderType = document.getElementById("ddlOpenOrderType");
    const vOpenOrderType = objOrderType?.value || localStorage.getItem("DFSL_OpenOrderType") || "market_order";
    if(vOpenOrderType === "market_order"){
        await fnPlaceRenkoDirectMarket(vSide, objFutDDL.value, vQty, pEntryRule, `Renko ${vSide.toUpperCase()} market`);
        return;
    }

    const objExec = await fnExecuteAdaptiveLimitOrderWithFallback(objFutDDL.value, vQty, vSide, false, `Renko ${vSide.toUpperCase()} open`);
    if(objExec.status !== "success"){
        fnGenMessage(objExec.message || `Renko ${vSide.toUpperCase()} open failed.`, `badge bg-danger`, "spnGenMsg");
        return;
    }

    const objOrder = objExec.data || {};
    const objPending = {
        ClientOrderID: Number(objOrder.client_order_id || Date.now()),
        Symbol: objFutDDL.value,
        Qty: vQty,
        EntryRule: pEntryRule
    };
    await fnCreatePositionFromFilledRenkoBySide(vSide, objOrder, objPending);
}

async function fnUpsertRenkoMidLimit(pSide, pBox, pStateObj, pEntryRule){
    const vSide = (pSide === "sell") ? "sell" : "buy";
    const objFutDDL = document.getElementById("ddlFuturesSymbols");
    const objQty = document.getElementById("txtFuturesQty");
    const vQty = Math.floor(fnParsePositiveNumber(objQty?.value, 0));
    const vLimitPrice = fnGetRenkoMidPrice(pBox);

    if(!objFutDDL?.value || vQty < 1 || !Number.isFinite(vLimitPrice) || vLimitPrice <= 0){
        fnGenMessage(`Renko ${vSide.toUpperCase()} setup skipped due to invalid symbol/qty/midpoint.`, `badge bg-warning`, "spnGenMsg");
        return;
    }

    if(pStateObj.Pending){
        const objPrevPending = pStateObj.Pending;
        const objDet = await fnGetOrderDetailsById(objPrevPending.OrderID, objPrevPending.ClientOrderID);
        if(objDet.status === "success"){
            const vState = String(objDet.data?.state || "").toLowerCase();
            if(vState === "closed" || vState === "filled"){
                pStateObj.Pending = null;
                await fnCreatePositionFromFilledRenkoBySide(vSide, objDet.data, objPrevPending);
                return;
            }
            if(vState === "cancelled" || vState === "rejected"){
                pStateObj.Pending = null;
            }
            else if(fnIsNumEqual(Number(objPrevPending.LimitPrice), vLimitPrice)){
                fnRenkoDiag(`Renko ${vSide.toUpperCase()} pending already at midpoint ${fnFmtNum(vLimitPrice)}.`, "badge bg-secondary");
                return;
            }
            else{
                await fnCancelLiveOrder(objPrevPending.OrderID, objPrevPending.ClientOrderID, objPrevPending.Symbol);
                pStateObj.Pending = null;
            }
        }
        else{
            fnRenkoDiag(`Renko ${vSide.toUpperCase()} pending check failed: ${objDet.message}`, "badge bg-danger");
            return;
        }
    }

    const vClientOrdID = Date.now();
    const objPlace = await fnPlaceRealOrder(vClientOrdID, objFutDDL.value, "limit_order", vQty, vSide, vLimitPrice, "", 0, true);
    if(objPlace.status !== "success"){
        fnGenMessage(`Renko ${vSide.toUpperCase()} limit place/modify failed: ${objPlace.message}`, `badge bg-danger`, "spnGenMsg");
        return;
    }

    const objRes = objPlace.data?.result;
    pStateObj.Pending = {
        OrderID: objRes.id,
        ClientOrderID: vClientOrdID,
        Symbol: objFutDDL.value,
        Qty: vQty,
        LimitPrice: vLimitPrice,
        BoxesAfterPlace: 0,
        EntryRule: pEntryRule
    };
    fnSyncRenkoPendingPoller();
    fnGenMessage(`Renko ${vSide.toUpperCase()} limit active @ ${fnFmtNum(vLimitPrice)} (${pEntryRule}).`, `badge bg-info`, "spnGenMsg");
}

function fnChangeMartingale(){
    fnChangeTradeMode("step");
}

function fnSetLotsByQtyMulLossAmt(){
    let vStartLots = JSON.parse(localStorage.getItem("DFSL_StartQtyNo"));
    let vQtyMul = JSON.parse(localStorage.getItem("DFSL_QtyMul"));
    let objOptQty = document.getElementById("txtFuturesQty");
    let vTotLossAmt = JSON.parse(localStorage.getItem("DFSL_TotLossAmt"));
    
    if (vQtyMul === null || vQtyMul === "") {
        localStorage.setItem("DFSL_QtyMul", vStartLots);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
    
    if (vTotLossAmt === null || vTotLossAmt === "" || vTotLossAmt === 0) {
        localStorage.setItem("DFSL_QtyMul", vStartLots);
        localStorage.setItem("DFSL_TotLossAmt", 0);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
}

// function fnTest(){
// 	console.log("Total Loss in Momory: " + localStorage.getItem("DFSL_TotLossAmt"));
// 	console.log("gPL: " + gPL);
// }

function fnTest(){
	console.log(localStorage.getItem("DFSL_TrdBkFut"));
}

function fnDeleteThisTrade(pOrderID){
   	let objTradeBook = fnGetLsJSON("DFSL_TrdBkFut", null);
    let vDelRec = null;

    if(!objTradeBook || !Array.isArray(objTradeBook.TradeData)){
        return;
    }

   	if(confirm("Are You Sure, You Want to Delete This Leg!")){
        for(let i=0; i<objTradeBook.TradeData.length; i++){
            if(objTradeBook.TradeData[i].OrderID === pOrderID){
                vDelRec = i;
            }
        }


        objTradeBook.TradeData.splice(vDelRec, 1);

        let objExcTradeDtls = JSON.stringify(objTradeBook);
        localStorage.setItem("DFSL_TrdBkFut", objExcTradeDtls);
        fnLoadTodayTrades();
   	}
}

function fnLoadTodayTrades(){
    let objTodayTradeList = document.getElementById("tBodyTodayPaperTrades");
   	let objTradeBook = fnGetLsJSON("DFSL_TrdBkFut", null);
    let objHeadPL = document.getElementById("tdHeadPL");
    let objYtRL = document.getElementById("spnYtRL");
    const vFromMs = fnGetDateTimeMillisByInputId("txtClsFromDate", 0);
    const vToMs = fnGetDateTimeMillisByInputId("txtClsToDate", Number.MAX_SAFE_INTEGER);
    objTodayTradeList.innerHTML = "";
    
    if(gClosedHistoryLoaded){
        const objAllClosedRows = Array.isArray(gExchangeClosedOrderRows) ? gExchangeClosedOrderRows.slice() : [];
        objAllClosedRows.sort((a, b) => {
            const vA = new Date(a?.created_at || "").getTime();
            const vB = new Date(b?.created_at || "").getTime();
            return (Number.isFinite(vA) ? vA : 0) - (Number.isFinite(vB) ? vB : 0);
        });

        if(objAllClosedRows.length === 0){
            const vRow = document.createElement("tr");
            const vCell = document.createElement("td");
            vCell.colSpan = 11;
            vCell.style.textAlign = "center";
            vCell.style.fontWeight = "bold";
            vCell.textContent = "No Closed Trades for Selected Date Range";
            vRow.appendChild(vCell);
            objTodayTradeList.appendChild(vRow);
            fnSetTextByPL(objHeadPL, 0);
            objYtRL.innerText = fnGetY2RDisplayAmt().toFixed(2);
            return;
        }

        let vTotalTrades = 0;
        let vNetProfit = 0;
        let vTotalCharges = 0;
        let vHighCapital = 0;

        for(let i=0; i<objAllClosedRows.length; i++){
            const vTrade = objAllClosedRows[i];
            const vSide = (vTrade.side || "").toLowerCase();
            const vLotSize = Number(vTrade?.product?.contract_value || vTrade.contract_value || 1);
            const vQty = Number(vTrade.size || 0);
            const vAvgPrice = Number(vTrade.average_fill_price || 0);
            const vBuyPrice = vSide === "buy" ? vAvgPrice : 0;
            const vSellPrice = vSide === "sell" ? vAvgPrice : 0;
            const vCapital = fnGetTradeCapital(vSide, (vBuyPrice || vAvgPrice), (vSellPrice || vAvgPrice), vLotSize, vQty);
            const vCharges = Number(vTrade.paid_commission || 0);
            const vPL = Number(vTrade?.meta_data?.pnl || 0);
            const vOpenDT = vTrade.created_at ? (new Date(vTrade.created_at)).toLocaleString("en-GB") : "-";
            const vCloseDT = vTrade.updated_at ? (new Date(vTrade.updated_at)).toLocaleString("en-GB") : "-";

            vTotalTrades += 1;
            vTotalCharges += vCharges;
            vNetProfit += vPL;
            if(vCapital > vHighCapital){
                vHighCapital = vCapital;
            }

            const vRow = document.createElement("tr");
            const vCells = [
                vOpenDT,
                vCloseDT,
                vTrade.product_symbol || "-",
                vTrade.side || "-",
                vLotSize,
                vQty,
                vBuyPrice > 0 ? vBuyPrice.toFixed(2) : "-",
                vSellPrice > 0 ? vSellPrice.toFixed(2) : "-",
                Number(vCapital).toFixed(2),
                Number(vCharges).toFixed(2),
                Number(vPL).toFixed(2)
            ];

            for(let c=0; c<vCells.length; c++){
                const td = document.createElement("td");
                td.style.textWrap = "nowrap";
                td.textContent = String(vCells[c]);
                if(c >= 4){ td.style.textAlign = "right"; }
                if(c === 2){ td.style.fontWeight = "bold"; td.style.textAlign = "left"; }
                if(c === 6){ td.style.color = "green"; }
                if(c === 7){ td.style.color = "red"; }
                if(c === 8 || c === 9){ td.style.color = "orange"; }
                vRow.appendChild(td);
            }
            objTodayTradeList.appendChild(vRow);
        }

        const vTotalRow = document.createElement("tr");
        const vTotalCells = ["Total Trades", vTotalTrades, "", "", "", "", "", "", Number(vHighCapital).toFixed(2), Number(vTotalCharges).toFixed(2), Number(vNetProfit).toFixed(2)];
        for(let t=0; t<vTotalCells.length; t++){
            const td = document.createElement("td");
            td.textContent = String(vTotalCells[t]);
            td.style.textWrap = "nowrap";
            if(t >= 8){ td.style.textAlign = "right"; td.style.fontWeight = "bold"; }
            if(t === 9){ td.style.color = "red"; }
            vTotalRow.appendChild(td);
        }
        objTodayTradeList.appendChild(vTotalRow);
        fnSetTextByPL(objHeadPL, vNetProfit);
        objYtRL.innerText = fnGetY2RDisplayAmt().toFixed(2);
        return;
    }

    if (!objTradeBook || !Array.isArray(objTradeBook.TradeData) || objTradeBook.TradeData.length === 0) {
        const vRow = document.createElement("tr");
        const vCell = document.createElement("td");
        vCell.colSpan = 11;
        vCell.style.textAlign = "center";
        vCell.style.fontWeight = "bold";
        vCell.textContent = "No Trades Yet";
        vRow.appendChild(vCell);
        objTodayTradeList.appendChild(vRow);
        fnSetTextByPL(objHeadPL, 0);
        objYtRL.innerText = fnGetY2RDisplayAmt().toFixed(2);
    }
    else{
        let vTotalTrades = 0;
        let vNetProfit = 0;
        let vTotalCharges = 0;
        let vHighCapital = 0;
        let vHasRowsInRange = false;

		for (let i = 0; i < objTradeBook.TradeData.length; i++){
            const vTrade = objTradeBook.TradeData[i];
            const vOpenDtVal = Number(vTrade.OpenDTVal);
            const vTradeMs = Number.isFinite(vOpenDtVal) && vOpenDtVal > 0
                ? vOpenDtVal
                : fnParseTradeDateTimeToMs(vTrade.OpenDT);
            if(vTradeMs < vFromMs || vTradeMs > vToMs){
                continue;
            }
            vHasRowsInRange = true;

            let vCharges = Number(vTrade.Charges);
            if(!Number.isFinite(vCharges)){
                const vBuyComm = Number(vTrade.BuyCommission || 0);
                const vSellComm = Number(vTrade.SellCommission || 0);
                const vCommTot = vBuyComm + vSellComm;
                if(Number.isFinite(vCommTot) && vCommTot > 0){
                    vCharges = vCommTot;
                }
                else{
                    vCharges = fnGetTradeCharges(vTrade.OpenDTVal, vTrade.CloseDTVal, vTrade.LotSize, vTrade.Qty, vTrade.BuyPrice, vTrade.SellPrice, vTrade.TransType);
                }
            }
    		let vCapital = fnGetTradeCapital(vTrade.TransType, vTrade.BuyPrice, vTrade.SellPrice, vTrade.LotSize, vTrade.Qty);
            let vPL = Number(vTrade.ProfitLoss);
            if(!Number.isFinite(vPL)){
                vPL = fnGetTradePL(vTrade.SellPrice, vTrade.BuyPrice, vTrade.LotSize, vTrade.Qty, vCharges);
            }
            vTotalTrades += 1;
            vTotalCharges += parseFloat(vCharges);
            vNetProfit += vPL;

	        if(parseFloat(vCapital) > vHighCapital){
	            vHighCapital = vCapital;
	        }

            const vRow = document.createElement("tr");
            const vCells = [
                vTrade.OpenDT,
                vTrade.CloseDT,
                vTrade.FutSymbol,
                vTrade.TransType,
                vTrade.LotSize,
                vTrade.Qty,
                Number(vTrade.BuyPrice).toFixed(2),
                Number(vTrade.SellPrice).toFixed(2),
                Number(vCapital).toFixed(2),
                Number(vCharges).toFixed(2),
                Number(vPL).toFixed(2)
            ];

            for(let c=0; c<vCells.length; c++){
                const td = document.createElement("td");
                td.style.textWrap = "nowrap";
                td.textContent = String(vCells[c]);
                if(c >= 4){ td.style.textAlign = "right"; }
                if(c === 2){ td.style.fontWeight = "bold"; td.style.textAlign = "left"; }
                if(c === 6){ td.style.color = "green"; }
                if(c === 7){ td.style.color = "red"; }
                if(c === 8 || c === 9){ td.style.color = "orange"; }
                vRow.appendChild(td);
            }
            vRow.children[0].style.cursor = "pointer";
            vRow.children[0].onclick = function(){ fnDeleteThisTrade(vTrade.OrderID); };
            objTodayTradeList.appendChild(vRow);
		}    	

        if(!vHasRowsInRange){
            const vRow = document.createElement("tr");
            const vCell = document.createElement("td");
            vCell.colSpan = 11;
            vCell.style.textAlign = "center";
            vCell.style.fontWeight = "bold";
            vCell.textContent = "No Closed Trades for Selected Date Range";
            vRow.appendChild(vCell);
            objTodayTradeList.appendChild(vRow);
            fnSetTextByPL(objHeadPL, 0);
            objYtRL.innerText = fnGetY2RDisplayAmt().toFixed(2);
            return;
        }

        const vTotalRow = document.createElement("tr");
        const vTotalCells = ["Total Trades", vTotalTrades, "", "", "", "", "", "", Number(vHighCapital).toFixed(2), Number(vTotalCharges).toFixed(2), Number(vNetProfit).toFixed(2)];
        for(let t=0; t<vTotalCells.length; t++){
            const td = document.createElement("td");
            td.textContent = String(vTotalCells[t]);
            td.style.textWrap = "nowrap";
            if(t >= 8){ td.style.textAlign = "right"; td.style.fontWeight = "bold"; }
            if(t === 9){ td.style.color = "red"; }
            vTotalRow.appendChild(td);
        }
        objTodayTradeList.appendChild(vTotalRow);

        fnSetTextByPL(objHeadPL, vNetProfit);
        objYtRL.innerText = fnGetY2RDisplayAmt().toFixed(2);
    }
}

function fnGetTradeCharges(pOpenDT, pCloseDT, pLotSize, pQty, pBuyPrice, pSellPrice, pTransType){
    let objTrdExitTime = document.getElementById("txtTrdExitTime");

	let vDateDiff = pCloseDT - pOpenDT;
	let vMaxTradeTime = 60000 * parseInt(objTrdExitTime.value);
	let vBuyBrokerage = ((parseFloat(pBuyPrice * parseFloat(pLotSize) * parseFloat(pQty)) * gBrokerage) / 100) * 1.18;
	let vSellBrokerage = ((parseFloat(pSellPrice * parseFloat(pLotSize) * parseFloat(pQty)) * gBrokerage) / 100) * 1.18;
	let vTotalBrokerage = 0;
	// console.log(vDateDiff); //Must be less than 900000

	if(vDateDiff < vMaxTradeTime){
		if(pTransType === "buy"){
			vTotalBrokerage = vBuyBrokerage;
		}
		else if(pTransType === "sell"){
			vTotalBrokerage = vSellBrokerage;
		}
		else{
			vTotalBrokerage = 0;
		}
	}
	else{
		vTotalBrokerage = vBuyBrokerage + vSellBrokerage;
	}
	return vTotalBrokerage;
}

function fnGetTradeCapital(pTransType, pBuyPrice, pSellPrice, pLotSize, pQty){
	let vTotalCapital = 0;

	if(pTransType === "buy"){
		vTotalCapital = (pBuyPrice * pLotSize * pQty) / gLeverage;
	}
	else if(pTransType === "sell"){
		vTotalCapital = (pSellPrice * pLotSize * pQty) / gLeverage;
	}
	else{
		vTotalCapital = 0;
	}
	return vTotalCapital;
}

function fnGetTradePL(pSellPrice, pBuyPrice, pLotSize, pQty, pCharges){
	let vPL = ((parseFloat(pSellPrice) - parseFloat(pBuyPrice)) * parseFloat(pLotSize) * parseFloat(pQty)) - parseFloat(pCharges);

	return vPL;
}

function fnClearLocalStorageTemp(){
    fnReleaseCloseLock();
    gSellActState.LastBox = null;
    gSellActState.PendingOrders = [];
    gSellActState.Busy = false;
    if(gRenkoSellState.Pending){
        fnCancelRenkoSellPending("Renko SELL pending canceled due to Clear All.");
    }
    if(gRenkoBuyState.Pending){
        fnCancelRenkoBuyPending("Renko BUY pending canceled due to Clear All.");
    }
    gRenkoSellState.LastBox = null;
    gRenkoSellState.LastBoxSize = 0;
    gRenkoSellState.Pending = null;
    gRenkoSellState.SecondChance = null;
    gRenkoSellState.OppExitCount = 0;
    gRenkoSellState.Busy = false;
    gRenkoBuyState.LastBox = null;
    gRenkoBuyState.LastBoxSize = 0;
    gRenkoBuyState.Pending = null;
    gRenkoBuyState.SecondChance = null;
    gRenkoBuyState.OppExitCount = 0;
    fnStopRenkoPendingPoller();
    gRenkoBuyState.Busy = false;
    localStorage.removeItem("DFSL_CurrFutPos");
	localStorage.removeItem("DFSL_TrdBkFut");
    localStorage.removeItem("DFSL_LossRecM");
    localStorage.removeItem("DFSL_MultiplierX");
    localStorage.removeItem("DFSL_LastOpenBrokerage");
    localStorage.removeItem("DFSL_LastCloseBrokerage");
    localStorage.removeItem("DFSL_Y2RBrokerCarry");
    localStorage.removeItem("DFSL_LossToRecAmt");
    localStorage.removeItem("DFSL_SellActOn");
    localStorage.removeItem("DFSL_SellActBelow");
    localStorage.removeItem("DFSL_SellActSL");
    localStorage.removeItem("DFSL_SellActTP");
	localStorage.setItem("DFSL_TotLossAmt", 0);
    clearInterval(gTimerID);

	fnGetAllStatus();
}

function fnInnitiateTimer(pMinutes){
	var vMinutes = 60 * pMinutes,
    display = document.querySelector('#time');
    fnStartTimer(vMinutes, display);
}

function fnStartTimer(duration, display) {
    var start = Date.now(),
        diff,
        minutes,
        seconds;
    function timer() {
        // get the number of seconds that have elapsed since 
        // startTimer() was called
        diff = duration - (((Date.now() - start) / 1000) | 0);
        gTimeDiff = diff;
        // does the same job as parseInt truncates the float
        minutes = (diff / 60) | 0;
        seconds = (diff % 60) | 0;

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds; 

        if (diff <= 0) {
            // add one second so that the count down starts at the full duration
            // example 05:00 not 04:59
            start = Date.now() + 1000;
        }
    };
    // we don't want to wait a full second before the timer starts
    timer();
    clearInterval(gTimerID);
    gTimerID = setInterval(timer, 1000);
}

function fnPositionStatus(){
    let objBtnPosition = document.getElementById("btnPositionStatus");

    if(localStorage.getItem("DFSL_CurrFutPos") === null)
    {
        fnGenMessage("Position Closed!", `badge bg-success`, "spnGenMsg");
        fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
    }
    else
    {
        objBtnPosition.className = "badge bg-warning";
        objBtnPosition.innerText = "Position is open";
        fnGenMessage("Position is Still Open!", `badge bg-warning`, "spnGenMsg");
    }
}

//********** Indicators Sections *************//

function fnTradeSide(){
    let objTradeSideVal = document["frmSide"]["rdoTradeSide"];

    localStorage.setItem("DFSL_TradeSideSwtS", objTradeSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("DFSL_TradeSideSwtS") === null){
        localStorage.setItem("DFSL_TradeSideSwtS", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("DFSL_TradeSideSwtS");
    let objTradeSideVal = document["frmSide"]["rdoTradeSide"];

    if(lsTradeSideSwitchS === "true"){
        objTradeSideVal.value = true;
    }
    else if(lsTradeSideSwitchS === "false"){
        objTradeSideVal.value = false;
    }
    else{
        objTradeSideVal.value = -1;
    }
}


//********** Sample Code to Place Order *************//
function fnPlaceLimitOrder(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objFutDDL = document.getElementById("ddlFuturesSymbols");
    let objClientOrderId = document.getElementById("hidClientOrderId");

    let vDate = new Date();
    let vOrdId = vDate.valueOf();
    objClientOrderId.value = vOrdId;

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, ClientOrderID : vOrdId });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaFutScprDemo/placeLimitOrder", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){

        	console.log(objResult);
            // let objBestRates = { BestBuy : vRes.result.quotes.best_ask, BestSell : vRes.result.quotes.best_bid }

            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "danger"){
        	console.log(objResult);
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
	            fnGenMessage(objResult.data.response.body.error.code + " for IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
	            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error in Placing Limit Order!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
    });
}
