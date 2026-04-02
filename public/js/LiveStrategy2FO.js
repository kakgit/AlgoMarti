
let obj_WS_DFL = null;
let gSubList = [];
let gMinReqMargin = 5.00;
let gQtyBuyMultiplierM = 0;
let gQtySellMultiplierM = 0;
let gObjDeltaDirec = [];
let gCurrPosLS2FOLV = { TradeData : []};
let gClsdPosLS2FOLV = { TradeData : []};
let gTradeInst, gTodayClsOpt = 0;

let gUpdPos = true;
let gSymbBRateList = {};
let gSymbSRateList = {};
let gSymbDeltaList = {};
let gSymbGammaList = {};
let gSymbThetaList = {};
let gSymbVegaList = {};
let gSpotPrice = 0;
let gPL = 0;
let gLossRecPerct = 100;
let gMultiplierX = 1.0;
let gPayoffGraphLastData = null;
let gPayoffGraphRenderTs = 0;

// let gSymbMarkIVList = {};
// let gSymbRhoList = {};

let gForceCloseDFL = false;
let gOptionBrokerage = 0.01;
let gFutureBrokerage = 0.05;
let gReLeg = false;
let gReLegCfgRow = 0;
let gClsBuyLeg = false;
let gSaveUpdBusy = false;
let gCloseSeqBusy = false;
let gRenkoFeedWS = null;
let gRenkoFeedEnabled = false;
let gRenkoFeedForceClose = false;
let gRenkoFeedStepPts = 200;
let gRenkoFeedPriceSource = "mark_price";
let gRenkoFeedAnchor = null;
let gRenkoFeedMaxRows = 300;
let gRenkoPatternSeq = "";
let gRenkoPatternMaxLen = 0;
let gAutoEntrySeqBusy = false;
let gExchangeClosedOrderRows = [];
let gClosedHistoryLoaded = false;
let gTelegramHeartbeatTimer = null;
let gTelegramCompactCloseAlerts = true;
let gCurrStrats = { StratsData : [{StratID : 1, NewSellCE : true, NewSellPE : true, StartQty1 : 75, NewDelta1 : 0.25, ReDelta1 : 0.25, DeltaTP1 : 0.12, DeltaSL1 : 0.42, NewBuyCE : true, NewBuyPE : true, StartQty2 : 50, NewDelta2 : 0.12, ReDelta2 : 0.12, DeltaTP2 : 0.25, DeltaSL2 : 0.06, StartQty3 : 25, NewDelta3 : 0.06, ReDelta3 : 0.06, DeltaTP3 : 0.14, DeltaSL3 : 0.03, SellAction : "sell", SellLegSide : "both", BuyAction : "buy", BuyLegSide : "both", Action3 : "buy", LegSide3 : "both" }]};
let gCurrFutStrats = { StratsData : [{StratID : 11, StartFutQty : 1, PointsSL : 100, PointsTP : 200, PointsTSL : 0 }]};
let gOtherFlds = [{ BrokerageAmt : 0, Yet2RecvrAmt : 0, SwtBrokRec : false, BrokX4Profit : 2, LossRecPerct : 100, MultiplierX : 1.0, ReLegBrok : false, ReLeg1 : true, ReLeg2 : true, ReLeg3 : false }];

window.addEventListener("DOMContentLoaded", function(){
    fnGetAllStatus();

    // socket.on("CdlEmaTrend", (pMsg) => {
    //     let objTradeSideVal = document["frmSide"]["rdoTradeSide"];
    //     let objJson = JSON.parse(pMsg);

    //     if(objJson.Direc === "UP"){
    //         objTradeSideVal.value = true;
    //     }
    //     else if(objJson.Direc === "DN"){
    //         objTradeSideVal.value = false;
    //     }
    //     else{
    //         objTradeSideVal.value = -1;
    //     }
    //     fnTradeSideSync();
    // });

    socket.on("refreshAllDFL", () => {
        document.location.reload();
    });

    socket.on("tv-Msg-SSDemo-Open", (pMsg) => {
        let isLsAutoTrader = localStorage.getItem("isAutoTraderLS2FOLV");
        let vTradeSide = localStorage.getItem("LS2FO_RenkoSideSwt");
        let objMsg = (pMsg);

        if(isLsAutoTrader === "false"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
            if(((vTradeSide === "true") && (objMsg.TransType === "buy")) || ((vTradeSide === "false") && (objMsg.TransType === "sell")) || (vTradeSide === "-1") || (vTradeSide === null)){
                void fnRunFuturesThenOptionRow1Sequence(objMsg.TransType, "tv");
            }
            else{
                fnGenMessage(objMsg.TransType + " Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
            }
        }
    });

    socket.on("tv-Msg-SSDemo-Close", (pMsg) => {
        let objMsg = (pMsg);
        fnPreInitTradeClose(objMsg.OptionType, objMsg.TransType);
    });
});

window.addEventListener("resize", function(){
    if(gPayoffGraphLastData){
        fnDrawPayoffGraph(gPayoffGraphLastData);
    }
});

function fnParsePositiveNumber(pVal, pFallback = 0){
    const vNum = Number(pVal);
    return Number.isFinite(vNum) && vNum > 0 ? vNum : pFallback;
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

function fnSetTextByPL(pEl, pValue){
    if(!pEl){
        return;
    }
    pEl.textContent = Number(pValue).toFixed(2);
    pEl.style.color = Number(pValue) < 0 ? "red" : "green";
    pEl.style.fontWeight = "bold";
}

function fnSendTelegramRuntimeAlert(pMsg){
    let objTgCfg = fnGetTelegramConfig();
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");
    let vAction = JSON.stringify({
        "TelegramBotToken": objTgCfg.botToken,
        "TelegramChatId": objTgCfg.chatId,
        "Message": String(pMsg || "")
    });

    fetch("/liveStrategy2fo/sendTelegramAlert", {
        method: "POST",
        headers: vHeaders,
        body: vAction,
        redirect: "follow"
    }).catch(() => {
        // no-op
    });
}

function fnGetTelegramConfig(){
    let objTgBotToken = document.getElementById("txtTelegramBotToken");
    let objTgChatId = document.getElementById("txtTelegramChatId");
    return {
        botToken: String(objTgBotToken?.value || "").trim(),
        chatId: String(objTgChatId?.value || "").trim()
    };
}

function fnIsCompactCloseAlertMode(){
    const vRaw = localStorage.getItem("LS2FO_TgCompactClose");
    if(vRaw === null){
        return gTelegramCompactCloseAlerts === true;
    }
    return String(vRaw).toLowerCase() !== "false";
}

function fnGetNetPnlValueS2(){
    const objNet = document.getElementById("divNetPL");
    if(objNet){
        const vTxt = String(objNet.innerText || objNet.textContent || "").replace(/,/g, "").trim();
        const vNum = Number(vTxt);
        if(Number.isFinite(vNum)){
            return vNum;
        }
    }
    return Number.isFinite(Number(gPL)) ? Number(gPL) : 0;
}

function fnGetBrokerageRecoverValueS2(){
    const objBrok = document.getElementById("txtBrok2Rec");
    const vNum = Number(objBrok?.value || 0);
    return Number.isFinite(vNum) ? vNum : 0;
}

function fnSendHeartbeatToTelegramS2(){
    const vNetPnl = fnGetNetPnlValueS2();
    const vBrokRec = fnGetBrokerageRecoverValueS2();
    const vMsg = `LiveStrategy2FO\nApp is Up and Running\nNet PnL: ${vNetPnl.toFixed(2)}\nTotal Brokerage to Recvr: ${vBrokRec.toFixed(2)}\nTime: ${new Date().toLocaleString("en-GB")}`;
    fnSendTelegramRuntimeAlert(vMsg);
}

function fnStartHourlyTelegramHeartbeatS2(){
    if(gTelegramHeartbeatTimer !== null){
        clearInterval(gTelegramHeartbeatTimer);
    }
    setTimeout(() => {
        fnSendHeartbeatToTelegramS2();
    }, 15000);

    gTelegramHeartbeatTimer = setInterval(() => {
        fnSendHeartbeatToTelegramS2();
    }, 3600000);
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
    const vFromSaved = localStorage.getItem("LS2FO_ClsFromDate");
    const vToSaved = localStorage.getItem("LS2FO_ClsToDate");
    const vFromVal = fnNormalizeDateTimeLocal(vFromSaved, objDefaults.From);
    const vToVal = fnNormalizeDateTimeLocal(vToSaved, objDefaults.To);

    objFromDate.value = vFromVal;
    objToDate.value = vToVal;
    localStorage.setItem("LS2FO_ClsFromDate", vFromVal);
    localStorage.setItem("LS2FO_ClsToDate", vToVal);

    objFromDate.addEventListener("change", function(){
        const vNextFrom = fnNormalizeDateTimeLocal(objFromDate.value, objDefaults.From);
        objFromDate.value = vNextFrom;
        localStorage.setItem("LS2FO_ClsFromDate", vNextFrom);
        fnRefreshClosedPositionsFromExchange();
    });

    objToDate.addEventListener("change", function(){
        const vNextTo = fnNormalizeDateTimeLocal(objToDate.value, objDefaults.To);
        objToDate.value = vNextTo;
        localStorage.setItem("LS2FO_ClsToDate", vNextTo);
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
    localStorage.setItem("LS2FO_ClsFromDate", objDefaults.From);
    localStorage.setItem("LS2FO_ClsToDate", objDefaults.To);
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
    return new Promise((resolve) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            ApiKey: pApiKey,
            ApiSecret: pApiSecret,
            StartDT: pStartDT,
            EndDT: pEndDT
        });

        fetch("/liveStrategy2fo/getFilledOrderHistory", {
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
                data: Array.isArray(objResult.data) ? objResult.data : []
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

function fnShouldUseDeltaRenkoFeedForStrategy(){
    return gRenkoFeedEnabled === true;
}

function fnGetRenkoFeedSymbol(){
    const objSelSymb = document.getElementById("ddlSymbols");
    const vSymb = String(objSelSymb?.value || "BTC").toUpperCase();
    if(vSymb === "ETH"){
        return "ETHUSD";
    }
    return "BTCUSD";
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

function fnNormalizeRenkoPattern(pToken){
    return String(pToken || "").toUpperCase().replace(/[^GR]/g, "");
}

function fnGetRenkoPatternStorageKey(pSide){
    return pSide === "sell" ? "LS2FO_RenkoSellPatterns" : "LS2FO_RenkoBuyPatterns";
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

    if(!localStorage.getItem("LS2FO_RenkoBuyPatterns")){
        localStorage.setItem("LS2FO_RenkoBuyPatterns", "RRG,GRG");
    }
    if(!localStorage.getItem("LS2FO_RenkoSellPatterns")){
        localStorage.setItem("LS2FO_RenkoSellPatterns", "GGR,RGR");
    }

    fnSetConfiguredRenkoPatterns("buy", fnGetConfiguredRenkoPatterns("buy"));
    fnSetConfiguredRenkoPatterns("sell", fnGetConfiguredRenkoPatterns("sell"));

    if(objBuyTxt){
        objBuyTxt.value = localStorage.getItem("LS2FO_RenkoBuyPatterns") || "";
    }
    if(objSellTxt){
        objSellTxt.value = localStorage.getItem("LS2FO_RenkoSellPatterns") || "";
    }
}

function fnUpdateRenkoFeedStep(pThis){
    const vParsed = Math.floor(fnParsePositiveNumber(pThis?.value, 200));
    gRenkoFeedStepPts = (Number.isFinite(vParsed) && vParsed > 0) ? vParsed : 200;
    if(pThis){
        pThis.value = gRenkoFeedStepPts;
    }
    localStorage.setItem("LS2FO_RenkoFeedStepPts", String(gRenkoFeedStepPts));
    gRenkoFeedAnchor = null;
    fnSetRenkoFeedMeta();
    fnAppendRenkoFeedMsg(`Step updated to ${gRenkoFeedStepPts} points.`);
}

function fnUpdateRenkoFeedPriceSource(pThis){
    const vSel = String(pThis?.value || "mark_price");
    const objAllowed = ["mark_price", "spot_price", "best_bid", "best_ask"];
    gRenkoFeedPriceSource = objAllowed.includes(vSel) ? vSel : "mark_price";
    localStorage.setItem("LS2FO_RenkoFeedPriceSrc", gRenkoFeedPriceSource);
    gRenkoFeedAnchor = null;
    fnSetRenkoFeedMeta();
    fnAppendRenkoFeedMsg(`Price source changed to ${gRenkoFeedPriceSource}. Anchor reset.`);
}

function fnGetTradeSideSwitch(){
    const vTradeSide = String(localStorage.getItem("LS2FO_RenkoSideSwt") || "-1");
    if(vTradeSide === "true"){
        return "buy";
    }
    if(vTradeSide === "false"){
        return "sell";
    }
    return "both";
}

function fnTradeSide(){
    let objTradeSideVal = document["frmSide"]?.["rdoTradeSide"];
    if(!objTradeSideVal){
        return;
    }

    localStorage.setItem("LS2FO_RenkoSideSwt", objTradeSideVal.value);
    fnApplySideSwitchToRow1Legs();
}

function fnTradeSideSync(){
    fnTradeSide();
}

function fnLoadTradeSide(){
    if(localStorage.getItem("LS2FO_RenkoSideSwt") === null){
        localStorage.setItem("LS2FO_RenkoSideSwt", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("LS2FO_RenkoSideSwt");
    let objTradeSideVal = document["frmSide"]?.["rdoTradeSide"];
    if(!objTradeSideVal){
        return;
    }

    if(lsTradeSideSwitchS === "true"){
        objTradeSideVal.value = true;
    }
    else if(lsTradeSideSwitchS === "false"){
        objTradeSideVal.value = false;
    }
    else{
        objTradeSideVal.value = -1;
    }

    fnApplySideSwitchToRow1Legs();
}

function fnApplySideSwitchToRow1Legs(pSkipUpdateCall = false){
    let vTradeSide = String(localStorage.getItem("LS2FO_RenkoSideSwt") || "-1");
    let objAction1 = document.getElementById("ddlAction1");
    let objLegSide1 = document.getElementById("ddlLegSide1");

    if(!objLegSide1){
        return;
    }

    let vAction = String(objAction1?.value || "sell").toLowerCase();
    let vLegSide = "both";
    if(vTradeSide !== "-1"){
        if(vAction === "buy"){
            if(vTradeSide === "false"){
                vLegSide = "ce";
            }
            else if(vTradeSide === "true"){
                vLegSide = "pe";
            }
        }
        else{
            if(vTradeSide === "false"){
                vLegSide = "pe";
            }
            else if(vTradeSide === "true"){
                vLegSide = "ce";
            }
        }
    }

    objLegSide1.value = vLegSide;
    if(pSkipUpdateCall){
        if(gCurrStrats && Array.isArray(gCurrStrats.StratsData) && gCurrStrats.StratsData[0]){
            gCurrStrats.StratsData[0].SellAction = vAction;
            gCurrStrats.StratsData[0].SellLegSide = vLegSide;
            fnApplyLegacyFlagsFromSelector(gCurrStrats.StratsData[0]);
            localStorage.setItem("StrategyLS2FOLV", JSON.stringify(gCurrStrats));
        }
        return;
    }
    fnUpdateLegSelector("sell");
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

async function fnHandleRenkoSignalExecution(pSide, pMatchTxt, pSource, pColorCode){
    fnAppendRenkoFeedMsg(`[${pSource}] Pattern ${pMatchTxt} hit on ${pColorCode}. ${pSide.toUpperCase()} signal ready.`);
    fnGenMessage(`Renko ${pSide.toUpperCase()} pattern matched (${pMatchTxt})`, "badge bg-info", "spnGenMsg");
    await fnRunFuturesThenOptionRow1Sequence(pSide, pSource);
}

async function fnRunFuturesThenOptionRow1Sequence(pSide, pSource = "auto"){
    const vAuto = String(localStorage.getItem("isAutoTraderLS2FOLV") || "false");
    if(vAuto !== "true"){
        fnGenMessage("Auto Trader is OFF. Futures/Option sequence skipped.", "badge bg-warning", "spnGenMsg");
        return { status : "warning", message : "Auto Trader is OFF." };
    }

    if(gAutoEntrySeqBusy){
        fnAppendRenkoFeedMsg(`[${pSource}] Entry sequence skipped: previous sequence still running.`);
        fnGenMessage("Entry skipped: previous sequence is still running.", "badge bg-warning", "spnGenMsg");
        return { status : "warning", message : "Entry sequence already in progress." };
    }

    gAutoEntrySeqBusy = true;
    try{
        let objFutExec = await fnPreInitAutoFutTrade("F", pSide, { skipOptionRow1 : true });
        if(!objFutExec || objFutExec.status !== "success"){
            fnAppendRenkoFeedMsg(`[${pSource}] Futures entry did not complete; option leg(s) skipped.`);
            const vFutMsg = objFutExec?.message || "Futures entry did not complete.";
            fnGenMessage(`Futures not completed (${vFutMsg}). Option row skipped.`, "badge bg-warning", "spnGenMsg");
            return objFutExec || { status : "warning", message : "Futures entry failed." };
        }

        let vFutFilledQty = Number(objFutExec.filledQty);
        await fnExecuteOptionRow1BySelections(vFutFilledQty);
        fnGenMessage(`Entry complete: Futures filled first, Option row executed with Qty ${Math.max(1, Math.floor(vFutFilledQty || 1))}.`, "badge bg-success", "spnGenMsg");
        fnSendTelegramRuntimeAlert(`LiveStrategy2FO\nEntry Complete\nSide: ${pSide}\nQty: ${Math.max(1, Math.floor(vFutFilledQty || 1))}\nSource: ${pSource}\nTime: ${new Date().toLocaleString("en-GB")}`);
        return { status : "success", message : "Futures and option entry executed.", filledQty : vFutFilledQty };
    }
    finally{
        gAutoEntrySeqBusy = false;
    }
}

async function fnProcessRenkoSignal(pRenkoMsg, pSource = "delta"){
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

    const vOpenPosExists = Array.isArray(gCurrPosLS2FOLV?.TradeData) && gCurrPosLS2FOLV.TradeData.some(objLeg => objLeg?.Status === "OPEN");
    if(vOpenPosExists){
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
    const vAuto = String(localStorage.getItem("isAutoTraderLS2FOLV") || "false");
    if(vAuto !== "true"){
        fnAppendRenkoFeedMsg(`[${pSource}] ${vColorCode} matched ${vSide.toUpperCase()} ${vMatchTxt} but Auto Trader is OFF.`);
        return;
    }

    await fnHandleRenkoSignalExecution(vSide, vMatchTxt, pSource, vColorCode);
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
    return { Open: vOpen, High: vHigh, Low: vLow, Close: vClose };
}

async function fnHandleRenkoFeedTicker(pTicData){
    const vMark = fnGetRenkoFeedTickerPrice(pTicData);
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
            Open: objOHLC.Open,
            High: objOHLC.High,
            Low: objOHLC.Low,
            Close: objOHLC.Close
        };
        fnAppendRenkoFeedMsg(`[delta] O:${objOHLC.Open.toFixed(2)} H:${objOHLC.High.toFixed(2)} L:${objOHLC.Low.toFixed(2)} C:${objOHLC.Close.toFixed(2)}`);
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
            void fnHandleRenkoFeedTicker(vData);
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
    localStorage.setItem("LS2FO_RenkoFeedEnabled", JSON.stringify(gRenkoFeedEnabled));
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
    const vEnabled = JSON.parse(localStorage.getItem("LS2FO_RenkoFeedEnabled") || "false");
    const vStepLs = Math.floor(fnParsePositiveNumber(localStorage.getItem("LS2FO_RenkoFeedStepPts"), 200));
    const vSrcLs = String(localStorage.getItem("LS2FO_RenkoFeedPriceSrc") || "mark_price");
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

function fnFormatPayoffAxisVal(pVal){
    let vVal = Number(pVal || 0);
    let vAbs = Math.abs(vVal);
    if(vAbs >= 1000000){
        return `${(vVal / 1000000).toFixed(1)}M`;
    }
    if(vAbs >= 1000){
        return `${(vVal / 1000).toFixed(1)}K`;
    }
    return vVal.toFixed(2);
}

function fnBuildPayoffGraphData(){
    if(!gCurrPosLS2FOLV || !Array.isArray(gCurrPosLS2FOLV.TradeData)){
        return null;
    }

    let objOpenLegs = gCurrPosLS2FOLV.TradeData.filter(objLeg => objLeg && objLeg.Status === "OPEN");
    if(objOpenLegs.length === 0){
        return null;
    }

    let objStrikes = [];
    let vFallbackSpot = 0;
    let vCurrentPnl = 0;
    let objExposureByStrike = {};

    for(let i=0; i<objOpenLegs.length; i++){
        let objLeg = objOpenLegs[i];
        let vStrike = Number(objLeg.StrikePrice || 0);
        let vLotSize = Math.abs(Number(objLeg.LotSize || 0));
        let vLotQty = Math.abs(Number(objLeg.LotQty || 0));
        let vUnits = vLotSize * vLotQty;
        let vSymbol = objLeg.Symbol || "";
        let vSide = (objLeg.TransType || "").toLowerCase();
        let vOptType = (objLeg.OptionType || "").toUpperCase();

        if(vStrike > 0){
            objStrikes.push(vStrike);
            vFallbackSpot += vStrike;
            let vExpSign = (vSide === "sell") ? 1 : -1;
            objExposureByStrike[vStrike] = (objExposureByStrike[vStrike] || 0) + (vUnits * vExpSign);
        }

        let vCurrBuy = Number(gSymbBRateList[vSymbol]);
        let vCurrSell = Number(gSymbSRateList[vSymbol]);
        let vLegBuyPrice = Number(objLeg.BuyPrice || 0);
        let vLegSellPrice = Number(objLeg.SellPrice || 0);

        if(!Number.isFinite(vCurrBuy)){
            vCurrBuy = vLegBuyPrice;
        }
        if(!Number.isFinite(vCurrSell)){
            vCurrSell = vLegSellPrice;
        }

        let vBuyVal = (vSide === "sell") ? vCurrBuy : vLegBuyPrice;
        let vSellVal = (vSide === "sell") ? vLegSellPrice : vCurrSell;
        let vCharges = fnGetTradeCharges(vStrike, vLotSize, vLotQty, vBuyVal, vSellVal, vOptType);
        vCurrentPnl += fnGetTradePL(vBuyVal, vSellVal, vLotSize, vLotQty, vCharges);
    }

    let vSpot = Number(gSpotPrice || 0);
    if(!(vSpot > 0)){
        vSpot = objStrikes.length > 0 ? (vFallbackSpot / objStrikes.length) : 0;
    }
    if(!(vSpot > 0)){
        return null;
    }

    let vMinStrike = objStrikes.length > 0 ? Math.min(...objStrikes) : vSpot;
    let vMaxStrike = objStrikes.length > 0 ? Math.max(...objStrikes) : vSpot;
    let vSpan = Math.max(vMaxStrike - vMinStrike, vSpot * 0.03, 20);
    let vXMin = Math.max(1, Math.min(vMinStrike, vSpot) - (vSpan * 1.1));
    let vXMax = Math.max(vMaxStrike, vSpot) + (vSpan * 1.1);
    let vPoints = 49;
    let vStep = (vXMax - vXMin) / (vPoints - 1);

    let objSeries = [];
    for(let i=0; i<vPoints; i++){
        let vS = vXMin + (i * vStep);
        let vExpiryPnl = 0;

        for(let j=0; j<objOpenLegs.length; j++){
            let objLeg = objOpenLegs[j];
            let vStrike = Number(objLeg.StrikePrice || vSpot);
            let vLotSize = Math.abs(Number(objLeg.LotSize || 0));
            let vLotQty = Math.abs(Number(objLeg.LotQty || 0));
            let vUnits = vLotSize * vLotQty;
            let vSide = (objLeg.TransType || "").toLowerCase();
            let vOptType = (objLeg.OptionType || "").toUpperCase();
            let vBuy = Number(objLeg.BuyPrice || 0);
            let vSell = Number(objLeg.SellPrice || 0);
            let vIntrinsic = 0;
            let vEntryCash = ((vSide === "sell") ? vSell : -vBuy) * vUnits;
            let vSign = (vSide === "sell") ? -1 : 1;

            if(vOptType === "C"){
                vIntrinsic = Math.max(vS - vStrike, 0);
                vExpiryPnl += (vSign * vIntrinsic * vUnits) + vEntryCash;
            }
            else if(vOptType === "P"){
                vIntrinsic = Math.max(vStrike - vS, 0);
                vExpiryPnl += (vSign * vIntrinsic * vUnits) + vEntryCash;
            }
            else if(vOptType === "F"){
                let vRef = (vStrike > 0) ? vStrike : vSpot;
                vExpiryPnl += (vSign * (vS - vRef) * vUnits);
            }
        }

        let vTargetPnl = vCurrentPnl + ((vExpiryPnl - vCurrentPnl) * 0.42);
        objSeries.push({ x: vS, expiry: vExpiryPnl, target: vTargetPnl });
    }

    return {
        series: objSeries,
        spot: vSpot,
        currentPnl: vCurrentPnl,
        exposureByStrike: objExposureByStrike
    };
}

function fnDrawPayoffGraph(pGraphData){
    let objCanvas = document.getElementById("cnvPayoffGraph");
    let objEmpty = document.getElementById("divPayoffGraphEmpty");
    if(!objCanvas){
        return;
    }

    if(!pGraphData || !Array.isArray(pGraphData.series) || pGraphData.series.length === 0){
        if(objEmpty){
            objEmpty.style.display = "block";
        }
        let objCtxBlank = objCanvas.getContext("2d");
        objCtxBlank.clearRect(0, 0, objCanvas.width, objCanvas.height);
        return;
    }

    if(objEmpty){
        objEmpty.style.display = "none";
    }

    let dpr = window.devicePixelRatio || 1;
    let vWidth = Math.max(600, objCanvas.clientWidth || 600);
    let vHeight = Math.max(360, objCanvas.clientHeight || 380);
    objCanvas.width = Math.floor(vWidth * dpr);
    objCanvas.height = Math.floor(vHeight * dpr);

    let ctx = objCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vWidth, vHeight);

    let padL = 58;
    let padR = 72;
    let padT = 44;
    let padB = 54;
    let plotW = vWidth - padL - padR;
    let plotH = vHeight - padT - padB;

    let bg = ctx.createLinearGradient(0, 0, 0, vHeight);
    bg.addColorStop(0, "#111a2b");
    bg.addColorStop(1, "#0b111e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, vWidth, vHeight);

    let objSeries = pGraphData.series;
    let xs = objSeries.map(o => o.x);
    let ysExp = objSeries.map(o => o.expiry);
    let ysTar = objSeries.map(o => o.target);
    let yAll = ysExp.concat(ysTar).concat([0]);

    let xMin = Math.min(...xs);
    let xMax = Math.max(...xs);
    let yMin = Math.min(...yAll);
    let yMax = Math.max(...yAll);
    let yPad = Math.max((yMax - yMin) * 0.12, 1);
    yMin -= yPad;
    yMax += yPad;

    let toX = (v) => padL + ((v - xMin) / (xMax - xMin || 1)) * plotW;
    let toY = (v) => padT + ((yMax - v) / (yMax - yMin || 1)) * plotH;

    ctx.strokeStyle = "rgba(145, 167, 199, 0.16)";
    ctx.lineWidth = 1;
    for(let i=0; i<=5; i++){
        let yVal = yMin + ((yMax - yMin) * i / 5);
        let py = toY(yVal);
        ctx.beginPath();
        ctx.moveTo(padL, py);
        ctx.lineTo(vWidth - padR, py);
        ctx.stroke();
    }

    let yZero = toY(0);
    ctx.strokeStyle = "rgba(219, 97, 97, 0.7)";
    ctx.beginPath();
    ctx.moveTo(padL, yZero);
    ctx.lineTo(vWidth - padR, yZero);
    ctx.stroke();

    let objBars = pGraphData.exposureByStrike || {};
    let objBarKeys = Object.keys(objBars).map(Number).filter(Number.isFinite);
    let maxBar = 1;
    for(let i=0; i<objBarKeys.length; i++){
        maxBar = Math.max(maxBar, Math.abs(objBars[objBarKeys[i]] || 0));
    }

    for(let i=0; i<objBarKeys.length; i++){
        let k = objBarKeys[i];
        let v = Number(objBars[k] || 0);
        let px = toX(k);
        let bw = Math.max(4, plotW / 65);
        let bh = (Math.abs(v) / maxBar) * (plotH * 0.24);
        ctx.fillStyle = v >= 0 ? "rgba(0, 210, 160, 0.56)" : "rgba(230, 88, 100, 0.56)";
        if(v >= 0){
            ctx.fillRect(px - (bw / 2), yZero - bh, bw, bh);
        }
        else{
            ctx.fillRect(px - (bw / 2), yZero, bw, bh);
        }
    }

    ctx.beginPath();
    for(let i=0; i<objSeries.length; i++){
        let px = toX(objSeries[i].x);
        let py = toY(objSeries[i].expiry);
        if(i === 0){
            ctx.moveTo(px, py);
        }
        else{
            ctx.lineTo(px, py);
        }
    }
    let xEnd = toX(objSeries[objSeries.length - 1].x);
    let xStart = toX(objSeries[0].x);
    ctx.lineTo(xEnd, yZero);
    ctx.lineTo(xStart, yZero);
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 214, 165, 0.24)";
    ctx.fill();

    ctx.beginPath();
    for(let i=0; i<objSeries.length; i++){
        let px = toX(objSeries[i].x);
        let py = toY(objSeries[i].expiry);
        if(i === 0){
            ctx.moveTo(px, py);
        }
        else{
            ctx.lineTo(px, py);
        }
    }
    ctx.strokeStyle = "#00e0b8";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    for(let i=0; i<objSeries.length; i++){
        let px = toX(objSeries[i].x);
        let py = toY(objSeries[i].target);
        if(i === 0){
            ctx.moveTo(px, py);
        }
        else{
            ctx.lineTo(px, py);
        }
    }
    ctx.strokeStyle = "#ff8f1f";
    ctx.lineWidth = 2;
    ctx.stroke();

    let xSpot = toX(pGraphData.spot);
    ctx.beginPath();
    ctx.moveTo(xSpot, padT + 2);
    ctx.lineTo(xSpot, vHeight - padB);
    ctx.strokeStyle = "rgba(252, 71, 111, 0.95)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#9fb5d1";
    ctx.font = "12px sans-serif";
    ctx.fillText("\u2014 On Expiry Date", padL - 20, 20);
    ctx.fillStyle = "#ff8f1f";
    ctx.fillText("\u2014 On Target Date", vWidth - padR - 122, 20);

    let vBadge = `Current Price: ${pGraphData.spot.toFixed(2)}`;
    ctx.font = "600 13px sans-serif";
    let bW = Math.max(150, ctx.measureText(vBadge).width + 24);
    let bX = Math.min(Math.max(xSpot - (bW / 2), padL + 2), vWidth - padR - bW - 2);
    ctx.fillStyle = "rgba(29, 36, 54, 0.96)";
    ctx.fillRect(bX, 6, bW, 28);
    ctx.fillStyle = "#dce7f7";
    ctx.fillText(vBadge, bX + 12, 24);

    ctx.fillStyle = "#7fa0c8";
    ctx.font = "11px sans-serif";
    for(let i=0; i<=5; i++){
        let xVal = xMin + ((xMax - xMin) * i / 5);
        let px = toX(xVal);
        let txt = xVal.toFixed(0);
        let tw = ctx.measureText(txt).width;
        ctx.fillText(txt, px - (tw / 2), vHeight - 18);
    }

    for(let i=0; i<=5; i++){
        let yVal = yMin + ((yMax - yMin) * i / 5);
        let py = toY(yVal);
        let txt = fnFormatPayoffAxisVal(yVal);
        let tw = ctx.measureText(txt).width;
        ctx.fillText(txt, padL - tw - 8, py + 4);
        ctx.fillText(txt, vWidth - padR + 10, py + 4);
    }

    ctx.save();
    ctx.translate(16, padT + (plotH / 2));
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#8ba8cc";
    ctx.font = "12px sans-serif";
    ctx.fillText("Profit / Loss", -40, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(vWidth - 12, padT + (plotH / 2));
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#8ba8cc";
    ctx.font = "12px sans-serif";
    ctx.fillText("Position Exposure", -54, 0);
    ctx.restore();

    let vSpotProjected = 0;
    let vClosestDiff = Number.MAX_VALUE;
    for(let i=0; i<objSeries.length; i++){
        let d = Math.abs(objSeries[i].x - pGraphData.spot);
        if(d < vClosestDiff){
            vClosestDiff = d;
            vSpotProjected = objSeries[i].target;
        }
    }

    let vLbl = (vSpotProjected >= 0 ? "Projected Profit" : "Projected Loss") + `: ${vSpotProjected.toFixed(2)}`;
    ctx.font = "600 13px sans-serif";
    let cW = Math.max(210, ctx.measureText(vLbl).width + 26);
    let cX = (vWidth / 2) - (cW / 2);
    let cY = vHeight - 32;
    ctx.fillStyle = vSpotProjected >= 0 ? "#0d7a4f" : "#9d1f2f";
    ctx.fillRect(cX, cY, cW, 24);
    ctx.fillStyle = "#ffe7e7";
    ctx.fillText(vLbl, cX + 13, cY + 16);
}

function fnUpdatePayoffGraph(){
    let objData = fnBuildPayoffGraphData();
    gPayoffGraphLastData = objData;
    fnDrawPayoffGraph(objData);
}

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    if(bAppStatus){
        fnConnectDFL();
        fnLoadLoginCred();
        // fnLoadDefQty();
        fnLoadDefFutStrategy();
        fnLoadDefStrategy();
        fnInitStartQty();
        fnLoadTradeSide();
        fnLoadHiddenFlds();
        fnLoadLossRecoveryMultiplier();
        fnLoadMultiplierX();
        fnLoadOptStep();
        fnSetQtyFieldsByQtyMulLossAmt();
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();

        fnLoadNetLimits();
        fnLoadDefSymbol();
        fnLoadDefExpiryMode();

        // fnLoadAllExpiryDate();
        fnLoadCurrentTradePos();
        fnSyncOpenFutureRiskFromStrategy();
        // setInterval(fnGetDelta, 300000);
        fnUpdateOpenPositions();

        fnLoadNetLimits();
        fnRefreshNetLimits();
        fnInitClosedPosDateTimeFilters();
        fnLoadClosedPostions();
        fnRefreshClosedPositionsFromExchange();

        gTodayClsOpt = setInterval(fnChkTodayPosToCls, 900000);
        fnStartHourlyTelegramHeartbeatS2();

        // fnLoadTotalLossAmtQty();
    }
    fnLoadRenkoFeedSettings();
}

function fnLoadDefQty(){
    let objStartQtyBuyM = JSON.parse(localStorage.getItem("StartQtyBuyLS2FOLV"));
    let objStartQtySellM = JSON.parse(localStorage.getItem("StartQtySellLS2FOLV"));
    let objStartQty2 = document.getElementById("txtStartQty2");
    let objStartQty1 = document.getElementById("txtStartQty1");

    if(objStartQtyBuyM === null){
        objStartQty2.value = 1;
        localStorage.setItem("StartQtyBuyLS2FOLV", objStartQty2.value);
    }
    else{
        objStartQty2.value = objStartQtyBuyM;
    }

    if(objStartQtySellM === null){
        objStartQty1.value = 1;
        localStorage.setItem("StartQtySellLS2FOLV", objStartQty1.value);
    }
    else{
        objStartQty1.value = objStartQtySellM;
    }
}

function fnLoadDefFutStrategy(){
    let objFutStrat = JSON.parse(localStorage.getItem("FutStratLS2FOLV"));

    let objFutSL = document.getElementById("txtFutSL");
    let objFutTSL = document.getElementById("txtFutTSL");
    let objFutTP = document.getElementById("txtFutTP");
    let objFutQty = document.getElementById("txtFutQty");

    if(objFutStrat === null || objFutStrat === ""){
        objFutStrat = gCurrFutStrats;
    }
    else{
        gCurrFutStrats = objFutStrat;
    }

    if(gCurrFutStrats?.StratsData?.[0]?.PointsTSL === undefined){
        gCurrFutStrats.StratsData[0]["PointsTSL"] = 0;
        localStorage.setItem("FutStratLS2FOLV", JSON.stringify(gCurrFutStrats));
    }

    objFutSL.value = gCurrFutStrats.StratsData[0]["PointsSL"];
    if(objFutTSL){
        objFutTSL.value = gCurrFutStrats.StratsData[0]["PointsTSL"];
    }
    objFutTP.value = gCurrFutStrats.StratsData[0]["PointsTP"];
    objFutQty.value = gCurrFutStrats.StratsData[0]["StartFutQty"];
}

function fnLoadHiddenFlds(){
    let objHidFlds = JSON.parse(localStorage.getItem("HidFldsLS2FOLV"));
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objYet2Recvr = document.getElementById("txtYet2Recvr");

    let objSwtBrokerage = document.getElementById("swtBrokRecvry");
    let objTxtBrokVal = document.getElementById("txtXBrok2Rec");
    let objChkReLeg = document.getElementById("chkReLegBrok");

    let objchkReLeg1 = document.getElementById("chkReLeg1");
    let objchkReLeg2 = document.getElementById("chkReLeg2");
    let objchkReLeg3 = document.getElementById("chkReLeg3");

    if(objHidFlds === null || objHidFlds === ""){
        objHidFlds = gOtherFlds;
        objBrokAmt.value = objHidFlds[0]["BrokerageAmt"];
        objYet2Recvr.value = objHidFlds[0]["Yet2RecvrAmt"];

        objSwtBrokerage.checked = objHidFlds[0]["SwtBrokRec"]; 
        objTxtBrokVal.value = objHidFlds[0]["BrokX4Profit"];
        objChkReLeg.checked = objHidFlds[0]["ReLegBrok"]; 

        objchkReLeg1.checked = objHidFlds[0]["ReLeg1"]; 
        objchkReLeg2.checked = objHidFlds[0]["ReLeg2"]; 
        objchkReLeg3.checked = objHidFlds[0]["ReLeg3"] || false; 
    }
    else{
        gOtherFlds = objHidFlds;
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];
        objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];

        objSwtBrokerage.checked = gOtherFlds[0]["SwtBrokRec"]; 
        objTxtBrokVal.value = gOtherFlds[0]["BrokX4Profit"];
        objChkReLeg.checked = gOtherFlds[0]["ReLegBrok"]; 

        objchkReLeg1.checked = gOtherFlds[0]["ReLeg1"]; 
        objchkReLeg2.checked = gOtherFlds[0]["ReLeg2"]; 
        objchkReLeg3.checked = gOtherFlds[0]["ReLeg3"] || false; 
    }
}

function fnUpdHidFldSettings(pThisVal, pHidFldParam, pFieldMsg){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gOtherFlds[0][pHidFldParam] = pThisVal;

        localStorage.setItem("HidFldsLS2FOLV", JSON.stringify(gOtherFlds));

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdFutStratSettings(pThisVal, pStratParam, pFieldMsg, pIfUpdFut, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrFutStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("FutStratLS2FOLV", JSON.stringify(gCurrFutStrats));

        if(pIfUpdFut){
            if(pOptionType === "F"){
                fnSyncOpenFutureRiskFromStrategy();
            }
            else if(pCurrPosParam){
                fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam);
            }
        }
        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
        if((gCurrPosLS2FOLV.TradeData[i].Status === "OPEN") && (pOptionType === "F")){
            gCurrPosLS2FOLV.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
            console.log("Params Updated");
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosLS2FOLV);
    localStorage.setItem("CurrPosLS2FOLV", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
}

function fnSyncOpenFutureRiskFromStrategy(){
    gUpdPos = false;

    let vSLPts = fnParsePositiveNumber(gCurrFutStrats?.StratsData?.[0]?.PointsSL, 0);
    let vTPPts = fnParsePositiveNumber(gCurrFutStrats?.StratsData?.[0]?.PointsTP, 0);
    let vTSLPts = Number(gCurrFutStrats?.StratsData?.[0]?.PointsTSL ?? 0);
    if(!Number.isFinite(vTSLPts) || vTSLPts < 0){
        vTSLPts = 0;
    }

    for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
        let objTrade = gCurrPosLS2FOLV.TradeData[i];
        if(objTrade.Status !== "OPEN" || objTrade.OptionType !== "F"){
            continue;
        }

        objTrade.StopLossPts = vSLPts;
        objTrade.TakeProfitPts = vTPPts;
        objTrade.TrailSLPts = vTSLPts;
        objTrade.TakeProfitAmt = 0;

        let vRef = objTrade.TransType === "sell" ? Number(objTrade.SellPrice) : Number(objTrade.BuyPrice);
        if(!Number.isFinite(vRef) || vRef <= 0){
            vRef = objTrade.TransType === "sell" ? Number(objTrade.BuyPrice) : Number(objTrade.SellPrice);
        }
        if(!Number.isFinite(vRef) || vRef <= 0){
            continue;
        }

        if(objTrade.TransType === "sell"){
            objTrade.AmtSL = Number((vRef + vSLPts).toFixed(2));
            objTrade.AmtTP1 = Number((vRef - vTPPts).toFixed(2));
            objTrade.TrailNextTrigger = vTSLPts > 0 ? Number((Number(objTrade.BuyPrice) - vTSLPts).toFixed(2)) : null;
        }
        else{
            objTrade.AmtSL = Number((vRef - vSLPts).toFixed(2));
            objTrade.AmtTP1 = Number((vRef + vTPPts).toFixed(2));
            objTrade.TrailNextTrigger = vTSLPts > 0 ? Number((Number(objTrade.SellPrice) + vTSLPts).toFixed(2)) : null;
        }
    }

    localStorage.setItem("CurrPosLS2FOLV", JSON.stringify(gCurrPosLS2FOLV));
    fnLoadCurrentTradePos();
    fnUpdateOpenPositions();
    gUpdPos = true;
}

function fnDeriveLegSideFromFlags(pHasCE, pHasPE){
    if(pHasCE && pHasPE){
        return "both";
    }
    if(pHasCE){
        return "ce";
    }
    if(pHasPE){
        return "pe";
    }
    return "both";
}

function fnApplyLegacyFlagsFromSelector(objStratRow){
    const vSellAction = (objStratRow.SellAction || "none").toLowerCase();
    const vSellLeg = (objStratRow.SellLegSide || "both").toLowerCase();
    objStratRow.NewSellCE = (vSellAction === "sell") && (vSellLeg === "both" || vSellLeg === "ce");
    objStratRow.NewSellPE = (vSellAction === "sell") && (vSellLeg === "both" || vSellLeg === "pe");

    const vBuyAction = (objStratRow.BuyAction || "none").toLowerCase();
    const vBuyLeg = (objStratRow.BuyLegSide || "both").toLowerCase();
    objStratRow.NewBuyCE = (vBuyAction === "buy") && (vBuyLeg === "both" || vBuyLeg === "ce");
    objStratRow.NewBuyPE = (vBuyAction === "buy") && (vBuyLeg === "both" || vBuyLeg === "pe");
}

function fnUpdateLegSelector(pSection){
    if(!gCurrStrats || !Array.isArray(gCurrStrats.StratsData) || gCurrStrats.StratsData.length === 0){
        return;
    }

    let objRow = gCurrStrats.StratsData[0];
    if(pSection === "sell"){
        let objAction = document.getElementById("ddlAction1");
        let objLegSide = document.getElementById("ddlLegSide1");
        if(objAction && objLegSide){
            objRow.SellAction = objAction.value;
            objRow.SellLegSide = objLegSide.value;
        }
        fnApplySideSwitchToRow1Legs(true);
    }
    else if(pSection === "buy"){
        let objAction = document.getElementById("ddlAction2");
        let objLegSide = document.getElementById("ddlLegSide2");
        if(objAction && objLegSide){
            objRow.BuyAction = objAction.value;
            objRow.BuyLegSide = objLegSide.value;
        }
    }
    else if(pSection === "row3"){
        let objAction = document.getElementById("ddlAction3");
        let objLegSide = document.getElementById("ddlLegSide3");
        if(objAction && objLegSide){
            objRow.Action3 = objAction.value;
            objRow.LegSide3 = objLegSide.value;
        }
    }

    fnApplyLegacyFlagsFromSelector(objRow);
    localStorage.setItem("StrategyLS2FOLV", JSON.stringify(gCurrStrats));
}

function fnLoadDefStrategy(){
    let objStrat = JSON.parse(localStorage.getItem("StrategyLS2FOLV"));

    let objSellAction = document.getElementById("ddlAction1");
    let objSellLegSide = document.getElementById("ddlLegSide1");
    let objSellQty = document.getElementById("txtStartQty1");
    let objNewDelta1 = document.getElementById("txtNewDelta1");
    let objReDelta1 = document.getElementById("txtReDelta1");
    let objDeltaSellTP = document.getElementById("txtDeltaTP1");
    let objDeltaSellSL = document.getElementById("txtDeltaSL1");

    let objBuyAction = document.getElementById("ddlAction2");
    let objBuyLegSide = document.getElementById("ddlLegSide2");
    let objBuyQty = document.getElementById("txtStartQty2");
    let objNewDelta2 = document.getElementById("txtNewDelta2");
    let objReDelta2 = document.getElementById("txtReDelta2");
    let objDeltaBuyTP = document.getElementById("txtDeltaTP2");
    let objDeltaBuySL = document.getElementById("txtDeltaSL2");
    let objAction3 = document.getElementById("ddlAction3");
    let objLegSide3 = document.getElementById("ddlLegSide3");
    let objQty3 = document.getElementById("txtStartQty3");
    let objNewDelta3 = document.getElementById("txtNewDelta3");
    let objReDelta3 = document.getElementById("txtReDelta3");
    let objDeltaTP3 = document.getElementById("txtDeltaTP3");
    let objDeltaSL3 = document.getElementById("txtDeltaSL3");

    if(objStrat === null || objStrat === ""){
        objStrat = gCurrStrats;
    }
    else{
        gCurrStrats = objStrat;
    }

    let objStratRow = objStrat.StratsData[0];

    if(!objStratRow["SellAction"]){
        objStratRow["SellAction"] = (objStratRow["NewSellCE"] || objStratRow["NewSellPE"]) ? "sell" : "none";
    }
    if(!objStratRow["SellLegSide"]){
        objStratRow["SellLegSide"] = fnDeriveLegSideFromFlags(!!objStratRow["NewSellCE"], !!objStratRow["NewSellPE"]);
    }
    if(!objStratRow["BuyAction"]){
        objStratRow["BuyAction"] = (objStratRow["NewBuyCE"] || objStratRow["NewBuyPE"]) ? "buy" : "none";
    }
    if(!objStratRow["BuyLegSide"]){
        objStratRow["BuyLegSide"] = fnDeriveLegSideFromFlags(!!objStratRow["NewBuyCE"], !!objStratRow["NewBuyPE"]);
    }
    if(!objStratRow["Action3"]){
        objStratRow["Action3"] = "buy";
    }
    if(!objStratRow["LegSide3"]){
        objStratRow["LegSide3"] = "both";
    }
    if(objStratRow["StartQty3"] === undefined){
        objStratRow["StartQty3"] = 25;
    }
    if(objStratRow["NewDelta3"] === undefined){
        objStratRow["NewDelta3"] = 0.06;
    }
    if(objStratRow["ReDelta3"] === undefined){
        objStratRow["ReDelta3"] = 0.06;
    }
    if(objStratRow["DeltaTP3"] === undefined){
        objStratRow["DeltaTP3"] = 0.14;
    }
    if(objStratRow["DeltaSL3"] === undefined){
        objStratRow["DeltaSL3"] = 0.03;
    }
    fnApplyLegacyFlagsFromSelector(objStratRow);

    if(objSellAction){
        objSellAction.value = objStratRow["SellAction"];
    }
    if(objSellLegSide){
        objSellLegSide.value = objStratRow["SellLegSide"];
    }
    objSellQty.value = objStratRow["StartQty1"];
    objNewDelta1.value = objStratRow["NewDelta1"];
    objReDelta1.value = objStratRow["ReDelta1"];
    objDeltaSellTP.value = objStratRow["DeltaTP1"];
    objDeltaSellSL.value = objStratRow["DeltaSL1"];

    if(objBuyAction){
        objBuyAction.value = objStratRow["BuyAction"];
    }
    if(objBuyLegSide){
        objBuyLegSide.value = objStratRow["BuyLegSide"];
    }
    objBuyQty.value = objStratRow["StartQty2"];
    objNewDelta2.value = objStratRow["NewDelta2"];
    objReDelta2.value = objStratRow["ReDelta2"];
    objDeltaBuyTP.value = objStratRow["DeltaTP2"];
    objDeltaBuySL.value = objStratRow["DeltaSL2"];

    if(objAction3){
        objAction3.value = objStratRow["Action3"];
    }
    if(objLegSide3){
        objLegSide3.value = objStratRow["LegSide3"];
    }
    if(objQty3){
        objQty3.value = objStratRow["StartQty3"];
    }
    if(objNewDelta3){
        objNewDelta3.value = objStratRow["NewDelta3"];
    }
    if(objReDelta3){
        objReDelta3.value = objStratRow["ReDelta3"];
    }
    if(objDeltaTP3){
        objDeltaTP3.value = objStratRow["DeltaTP3"];
    }
    if(objDeltaSL3){
        objDeltaSL3.value = objStratRow["DeltaSL3"];
    }

    localStorage.setItem("StrategyLS2FOLV", JSON.stringify(objStrat));
}

function fnInitStartQty(){
    let objStartQty = document.getElementById("txtStartQty");
    if(!objStartQty){
        return;
    }

    let vSavedQty = Number(localStorage.getItem("StartQtyNoLS2FOLV"));
    if(Number.isFinite(vSavedQty) && vSavedQty >= 1){
        let vSafeSavedQty = Math.floor(vSavedQty);
        objStartQty.value = vSafeSavedQty;
        fnApplyStartQtyToAll(vSafeSavedQty);
        return;
    }

    let vSeedQty = Number(document.getElementById("txtStartQty1")?.value);
    if(!Number.isFinite(vSeedQty) || vSeedQty < 1){
        vSeedQty = Number(document.getElementById("txtStartQty2")?.value);
    }
    if(!Number.isFinite(vSeedQty) || vSeedQty < 1){
        vSeedQty = Number(document.getElementById("txtStartQty3")?.value);
    }
    if(!Number.isFinite(vSeedQty) || vSeedQty < 1){
        vSeedQty = Number(document.getElementById("txtFutQty")?.value);
    }
    if(!Number.isFinite(vSeedQty) || vSeedQty < 1){
        vSeedQty = 1;
    }

    let vSafeSeedQty = Math.floor(vSeedQty);
    objStartQty.value = vSafeSeedQty;
    localStorage.setItem("StartQtyNoLS2FOLV", vSafeSeedQty);
}

function fnApplyStartQtyToAll(pQty){
    let vSafeQty = Math.max(1, Math.floor(Number(pQty)));

    let objFutQty = document.getElementById("txtFutQty");
    let objStartQty1 = document.getElementById("txtStartQty1");
    let objStartQty2 = document.getElementById("txtStartQty2");
    let objStartQty3 = document.getElementById("txtStartQty3");

    if(objFutQty){
        objFutQty.value = vSafeQty;
    }
    if(objStartQty1){
        objStartQty1.value = vSafeQty;
    }
    if(objStartQty2){
        objStartQty2.value = vSafeQty;
    }
    if(objStartQty3){
        objStartQty3.value = vSafeQty;
    }

    if(gCurrFutStrats?.StratsData?.[0]){
        gCurrFutStrats.StratsData[0]["StartFutQty"] = vSafeQty;
        localStorage.setItem("FutStratLS2FOLV", JSON.stringify(gCurrFutStrats));
    }

    if(gCurrStrats?.StratsData?.[0]){
        gCurrStrats.StratsData[0]["StartQty1"] = vSafeQty;
        gCurrStrats.StratsData[0]["StartQty2"] = vSafeQty;
        gCurrStrats.StratsData[0]["StartQty3"] = vSafeQty;
        localStorage.setItem("StrategyLS2FOLV", JSON.stringify(gCurrStrats));
    }

    localStorage.setItem("StartQtyBuyLS2FOLV", vSafeQty);
    localStorage.setItem("StartQtySellLS2FOLV", vSafeQty);
    localStorage.setItem("StartQtyNoLS2FOLV", vSafeQty);
    localStorage.setItem("QtyMulLS2FOLV", vSafeQty);
}

function fnChangeStartQty(pThisVal){
    const vQtyParsed = Number(pThisVal.value);

    if(!Number.isFinite(vQtyParsed) || vQtyParsed < 1){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        fnApplyStartQtyToAll(1);
    }
    else{
        const vSafeQty = Math.floor(vQtyParsed);
        pThisVal.value = vSafeQty;
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        fnApplyStartQtyToAll(vSafeQty);
    }
}

function fnChangeBuyStartQty(pThisVal){
    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyBuyLS2FOLV", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyBuyLS2FOLV", 1);
    }
    else{
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtyBuyLS2FOLV", pThisVal.value);
        }
    }
}

function fnChangeSellStartQty(pThisVal){
    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellLS2FOLV", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellLS2FOLV", 1);
    }
    else{
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtySellLS2FOLV", pThisVal.value);
        }
    }
}

function fnUpdOptStratSettings(pThis, pThisVal, pStratParam, pFieldMsg, pIfUpdCP, pIfBorS, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input / Select Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("StrategyLS2FOLV", JSON.stringify(gCurrStrats));
    
        if(pIfUpdCP){
            fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam);
        }

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
        if((gCurrPosLS2FOLV.TradeData[i].Status === "OPEN") && (gCurrPosLS2FOLV.TradeData[i].TransType === pIfBorS) && (pOptionType === "")){
            gCurrPosLS2FOLV.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
            console.log("Params Updated");
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosLS2FOLV);
    localStorage.setItem("CurrPosLS2FOLV", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
}

function fnChangeSymbol(pSymbVal){
    localStorage.setItem("SymbLS2FOLV", JSON.stringify(pSymbVal));

    fnLoadDefSymbol();
}

function fnLoadDefSymbol(){
    let objDefSymM = JSON.parse(localStorage.getItem("SymbLS2FOLV"));
    let objSelSymb = document.getElementById("ddlSymbols");

    if(objDefSymM === null){
        objDefSymM = "";
    }

    objSelSymb.value = objDefSymM;
    fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
    let objLotSize = document.getElementById("txtLotSize");

    localStorage.setItem("SymbLS2FOLV", JSON.stringify(pThisVal));

    if(pThisVal === "BTC"){
        objLotSize.value = 0.001;
    }
    else if(pThisVal === "ETH"){
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

function fnLoadNetLimits(){
    const objTotalMargin = document.getElementById("divTotalMargin");
    const objBlockedMargin = document.getElementById("divBlockedMargin");
    const objBalanceMargin = document.getElementById("divBalanceMargin");
    if(!objTotalMargin || !objBlockedMargin || !objBalanceMargin){
        return;
    }

    const objNetLimit = fnGetLsJSON("LS2FO_NetLimit", {});
    const vWalletUSD = Number(objNetLimit?.BalanceUSD);
    const vWalletINR = Number(objNetLimit?.BalanceINR);
    const vTotalMargin = Number.isFinite(vWalletUSD) ? vWalletUSD : (Number.isFinite(vWalletINR) ? vWalletINR : NaN);

    let vBlockedMargin = 0;
    if(gCurrPosLS2FOLV && Array.isArray(gCurrPosLS2FOLV.TradeData) && gCurrPosLS2FOLV.TradeData.length > 0){
        for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
            let objLeg = gCurrPosLS2FOLV.TradeData[i];
            if(!objLeg || objLeg.Status !== "OPEN"){
                continue;
            }
            const vBuyPrice = Number(objLeg.BuyPrice);
            const vSellPrice = Number(objLeg.SellPrice);
            const vLotSize = Number(objLeg.LotSize);
            const vQty = Number(objLeg.LotQty);
            const vCap = fnGetTradeCapital(objLeg.TransType, vBuyPrice, vSellPrice, vLotSize, vQty);
            if(Number.isFinite(vCap)){
                vBlockedMargin += vCap;
            }
        }
    }

    const vAvailMargin = Number.isFinite(vTotalMargin) ? (vTotalMargin - vBlockedMargin) : NaN;
    objTotalMargin.innerText = Number.isFinite(vTotalMargin) ? vTotalMargin.toFixed(2) : "-";
    objBlockedMargin.innerText = Number.isFinite(vBlockedMargin) ? vBlockedMargin.toFixed(2) : "0.00";
    objBalanceMargin.innerText = Number.isFinite(vAvailMargin) ? vAvailMargin.toFixed(2) : "-";
}

async function fnRefreshNetLimits(){
    const objApiKey = document.getElementById("txtUserAPIKey");
    const objApiSecret = document.getElementById("txtAPISecret");
    if(!objApiKey || !objApiSecret || !objApiKey.value || !objApiSecret.value){
        localStorage.removeItem("LS2FO_NetLimit");
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

        const response = await fetch("/liveStrategy2fo/validateLogin", {
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
            localStorage.setItem("LS2FO_NetLimit", JSON.stringify(objBalances));
        }
        else{
            localStorage.removeItem("LS2FO_NetLimit");
        }
    }
    catch(_err){
        // Keep old values on fetch errors.
    }
    fnLoadNetLimits();
}

function fnLoadCurrentTradePos(){
    let objCurrPos = JSON.parse(localStorage.getItem("CurrPosLS2FOLV"));

    gCurrPosLS2FOLV = objCurrPos;

    if(gCurrPosLS2FOLV === null){
        gCurrPosLS2FOLV = { TradeData : []};
    }
    else{
        fnSetSymbolTickerList();
    }
}

function fnLoadClosedPostions(){
    let objClsdPos = JSON.parse(localStorage.getItem("ClsdPosLS2FOLV"));
    gClsdPosLS2FOLV = objClsdPos;

    if(gClsdPosLS2FOLV === null){
        gClsdPosLS2FOLV = { TradeData : []};
    }
    fnLoadTodayTrades();
}

function fnSetSymbolTickerList(){
    if(gCurrPosLS2FOLV.TradeData.length > 0){
        const objSubListArray = [];
        gSubList = [];

        for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
            if(gCurrPosLS2FOLV.TradeData[i].Status === "OPEN"){
                objSubListArray.push(gCurrPosLS2FOLV.TradeData[i].Symbol);
            }
        }
        const setSubList = new Set(objSubListArray);
        gSubList = [...setSubList];
        fnUnSubscribeDFL();
        fnSubscribeDFL();

        clearInterval(gTradeInst);
        gTradeInst = setInterval(fnSaveUpdCurrPos, 15000);
    }
}

function fnChangeStep(){
    fnChangeTradeModeS2("step");
}

function fnLoadOptStep(){
    fnLoadMartiModeS2();
}

function fnLoadMartiModeS2(){
    let objSwtStep = document.getElementById("swtStepDFL");
    let objSwtMarti = document.getElementById("swtMartiDFL");
    if(!objSwtStep){
        return;
    }

    let vMode = (localStorage.getItem("LS2FO_TradeMode") || "").toUpperCase();
    if(vMode === ""){
        let vLegacyMarti = JSON.parse(localStorage.getItem("OptStepLS2FOLV"));
        vMode = (vLegacyMarti === false) ? "MARTI" : "STEP";
    }

    if(objSwtMarti){
        objSwtStep.checked = (vMode === "STEP");
        objSwtMarti.checked = (vMode === "MARTI");
        if(objSwtStep.checked === objSwtMarti.checked){
            objSwtStep.checked = true;
            objSwtMarti.checked = false;
            vMode = "STEP";
        }
        localStorage.setItem("LS2FO_TradeMode", vMode);
        localStorage.setItem("OptStepLS2FOLV", JSON.stringify(objSwtStep.checked));
    }
}

function fnLoadTotalLossAmtQty(){

}

function fnChangeTradeModeS2(pMode){
    let objSwtStep = document.getElementById("swtStepDFL");
    let objSwtMarti = document.getElementById("swtMartiDFL");
    if(!objSwtStep){
        return;
    }
    if(!objSwtMarti){
        localStorage.setItem("LS2FO_TradeMode", objSwtStep.checked ? "STEP" : "MARTI");
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
    localStorage.setItem("LS2FO_TradeMode", vMode);
    localStorage.setItem("OptStepLS2FOLV", JSON.stringify(objSwtStep.checked));
}

function fnApplyQtyToAllTradeInputs(pQty){
    let vSafeQty = Math.max(1, Math.floor(Number(pQty)));
    let objStartQty = document.getElementById("txtStartQty");
    let objFutQty = document.getElementById("txtFutQty");
    let objQty1 = document.getElementById("txtStartQty1");
    let objQty2 = document.getElementById("txtStartQty2");
    let objQty3 = document.getElementById("txtStartQty3");

    if(objStartQty){
        objStartQty.value = vSafeQty;
    }
    if(objFutQty){
        objFutQty.value = vSafeQty;
    }
    if(objQty1){
        objQty1.value = vSafeQty;
    }
    if(objQty2){
        objQty2.value = vSafeQty;
    }
    if(objQty3){
        objQty3.value = vSafeQty;
    }

    if(gCurrFutStrats?.StratsData?.[0]){
        gCurrFutStrats.StratsData[0]["StartFutQty"] = vSafeQty;
        localStorage.setItem("FutStratLS2FOLV", JSON.stringify(gCurrFutStrats));
    }
    if(gCurrStrats?.StratsData?.[0]){
        gCurrStrats.StratsData[0]["StartQty1"] = vSafeQty;
        gCurrStrats.StratsData[0]["StartQty2"] = vSafeQty;
        gCurrStrats.StratsData[0]["StartQty3"] = vSafeQty;
        localStorage.setItem("StrategyLS2FOLV", JSON.stringify(gCurrStrats));
    }
}

function fnSetQtyFieldsByQtyMulLossAmt(){
    let vStartLots = Number(localStorage.getItem("StartQtyNoLS2FOLV"));
    let vQtyMul = Number(localStorage.getItem("QtyMulLS2FOLV"));

    if(!Number.isFinite(vStartLots) || vStartLots < 1){
        vStartLots = 1;
    }
    if(!Number.isFinite(vQtyMul) || vQtyMul < 1){
        vQtyMul = vStartLots;
        localStorage.setItem("QtyMulLS2FOLV", vStartLots);
    }

    fnApplyQtyToAllTradeInputs(vQtyMul);
}

function fnLoadMultiplierX(){
    let objMultiplierXTxt = document.getElementById("txtMultiplierX");
    if(!objMultiplierXTxt){
        return;
    }

    let vSaved = Number(localStorage.getItem("LS2FO_MultiplierX"));
    if(!Number.isFinite(vSaved) || vSaved <= 0){
        vSaved = Number(gOtherFlds?.[0]?.MultiplierX);
    }
    if(!Number.isFinite(vSaved) || vSaved <= 0){
        vSaved = 1.0;
    }

    gMultiplierX = fnParsePositiveNumber(vSaved, 1.0);
    objMultiplierXTxt.value = gMultiplierX;
}

function fnUpdateMultiplierX(pThisVal){
    const vMultiplier = fnParsePositiveNumber(pThisVal.value, 1.0);
    pThisVal.value = vMultiplier;
    gMultiplierX = vMultiplier;
    localStorage.setItem("LS2FO_MultiplierX", String(vMultiplier));

    if(Array.isArray(gOtherFlds) && gOtherFlds[0]){
        gOtherFlds[0]["MultiplierX"] = vMultiplier;
        localStorage.setItem("HidFldsLS2FOLV", JSON.stringify(gOtherFlds));
    }
}

function fnLoadLossRecoveryMultiplier(){
    let objLossRecvPerctTxt = document.getElementById("txtLossRecvPerct");
    if(!objLossRecvPerctTxt){
        return;
    }

    let vSaved = Number(localStorage.getItem("LS2FO_LossRecM"));
    if(!Number.isFinite(vSaved) || vSaved <= 0){
        vSaved = Number(gOtherFlds?.[0]?.LossRecPerct);
    }
    if(!Number.isFinite(vSaved) || vSaved <= 0){
        vSaved = 100;
    }

    gLossRecPerct = fnParsePositiveNumber(vSaved, 100);
    objLossRecvPerctTxt.value = gLossRecPerct;
}

function fnUpdateLossRecPrct(pThisVal){
    const vLossPct = fnParsePositiveNumber(pThisVal.value, 100);
    pThisVal.value = vLossPct;
    gLossRecPerct = vLossPct;
    localStorage.setItem("LS2FO_LossRecM", String(vLossPct));

    if(Array.isArray(gOtherFlds) && gOtherFlds[0]){
        gOtherFlds[0]["LossRecPerct"] = vLossPct;
        localStorage.setItem("HidFldsLS2FOLV", JSON.stringify(gOtherFlds));
    }
}

function fnSetNextTradeQtySettings(pIsFullClose = true){
    if(!pIsFullClose){
        return;
    }

    let vTotLossAmt = Number(gOtherFlds?.[0]?.Yet2RecvrAmt);
    let vOldQtyMul = Number(localStorage.getItem("QtyMulLS2FOLV"));
    let vStartLots = Number(localStorage.getItem("StartQtyNoLS2FOLV"));
    let vMode = String(localStorage.getItem("LS2FO_TradeMode") || "").toUpperCase();
    let bIsMarti = (vMode === "MARTI");
    let bIsStep = !bIsMarti;
    let vX = fnParsePositiveNumber(gMultiplierX, 1.0);
    let vCycleStartLoss = Number(localStorage.getItem("LS2FO_CycleStartLossAmt"));
    let vCycleStartQty = Number(localStorage.getItem("LS2FO_CycleStartQty"));

    if(!Number.isFinite(vStartLots) || vStartLots < 1){
        vStartLots = 1;
    }
    if(!Number.isFinite(vOldQtyMul) || vOldQtyMul < 1){
        vOldQtyMul = vStartLots;
    }
    if(!Number.isFinite(vTotLossAmt)){
        vTotLossAmt = 0;
    }
    if(!Number.isFinite(vCycleStartLoss)){
        vCycleStartLoss = 0;
    }
    if(!Number.isFinite(vCycleStartQty) || vCycleStartQty < 1){
        vCycleStartQty = vOldQtyMul;
    }

    const vStartDeficit = Math.max(0, -vCycleStartLoss);
    const vEndDeficit = Math.max(0, -vTotLossAmt);
    const bRecoveredSome = vEndDeficit < vStartDeficit;
    const bWorsened = vEndDeficit > vStartDeficit;

    let vNextQty = vOldQtyMul;
    if(vEndDeficit <= 0){
        vNextQty = vStartLots;
    }
    else if(bRecoveredSome){
        let vRemainRatio = vStartDeficit > 0 ? (vEndDeficit / vStartDeficit) : 1;
        if(!Number.isFinite(vRemainRatio)){
            vRemainRatio = 1;
        }
        vRemainRatio = Math.max(0, Math.min(1, vRemainRatio));
        vNextQty = Math.ceil(vCycleStartQty * vRemainRatio);
        if(!Number.isFinite(vNextQty) || vNextQty < vStartLots){
            vNextQty = vStartLots;
        }
        if(vNextQty > vCycleStartQty){
            vNextQty = vCycleStartQty;
        }
    }
    else if(bWorsened){
        if(bIsMarti){
            vNextQty = Math.floor(vOldQtyMul * Math.max(2, vX));
        }
        else if(bIsStep){
            vNextQty = Math.floor(vOldQtyMul + Math.max(1, Math.floor(vStartLots * vX)));
        }
    }

    if(!Number.isFinite(vNextQty) || vNextQty < vStartLots){
        vNextQty = vStartLots;
    }

    localStorage.setItem("QtyMulLS2FOLV", String(vNextQty));
    fnApplyQtyToAllTradeInputs(vNextQty);
    if(vNextQty !== vOldQtyMul){
        fnSendTelegramRuntimeAlert(`LiveStrategy2FO\nQty Adjustment\nMode: ${vMode}\nPrev Qty: ${vOldQtyMul}\nNext Qty: ${vNextQty}\nLoss: ${Number(vTotLossAmt || 0).toFixed(2)}\nTime: ${new Date().toLocaleString("en-GB")}`);
    }
}

function fnGetLossRecoveryTargetAmtS2(pYetRecAmt){
    let vYet = Number(pYetRecAmt);
    if(!Number.isFinite(vYet) || vYet >= 0){
        return 0;
    }
    const vX = fnParsePositiveNumber(gMultiplierX, 1.0);
    return Math.abs(vYet) * vX;
}

function fnGetSortedCloseLegs(pLegs){
    return [...(pLegs || [])].sort((a, b) => {
        const vAF = (a?.OptionType === "F") ? 0 : 1;
        const vBF = (b?.OptionType === "F") ? 0 : 1;
        if(vAF !== vBF){
            return vAF - vBF;
        }
        return String(a?.Symbol || "").localeCompare(String(b?.Symbol || ""));
    });
}

function fnFindOpenLegByTradeId(pTradeId){
    if(!gCurrPosLS2FOLV || !Array.isArray(gCurrPosLS2FOLV.TradeData)){
        return null;
    }
    for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
        let objLeg = gCurrPosLS2FOLV.TradeData[i];
        if(objLeg && objLeg.Status === "OPEN" && String(objLeg.TradeID) === String(pTradeId)){
            return objLeg;
        }
    }
    return null;
}

function fnExecCloseLeg(pApiKey, pSecret, pOrderType, pSymbol, pTransType, pOptionType, pLotSize, pLotQty){
    return new Promise((resolve) => {
        let objTgCfg = fnGetTelegramConfig();
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pSecret,
            "Symbol" : pSymbol,
            "TransType" : pTransType,
            "OptionType" : pOptionType,
            "LotSize" : Number(pLotSize),
            "LotQty" : Number(pLotQty),
            "OrderType" : pOrderType,
            "TelegramBotToken" : objTgCfg.botToken,
            "TelegramChatId" : objTgCfg.chatId
        });

        fetch("/liveStrategy2fo/closeLeg", {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        })
        .then(response => response.json())
        .then(objResult => resolve(objResult))
        .catch(() => resolve({ status : "danger", message : "Close API call failed." }));
    });
}

async function fnCloseLegByQtyS2(objLegRef, pCloseQty, pReason = ""){
    if(!objLegRef){
        return { status : "warning", message : "Invalid leg." };
    }

    const vCurrQty = Math.floor(Number(objLegRef.LotQty));
    let vCloseQty = Math.floor(Number(pCloseQty));
    if(!Number.isFinite(vCurrQty) || vCurrQty <= 0){
        return { status : "warning", message : "No open quantity." };
    }
    if(!Number.isFinite(vCloseQty) || vCloseQty <= 0){
        return { status : "warning", message : "Invalid close qty." };
    }
    if(vCloseQty > vCurrQty){
        vCloseQty = vCurrQty;
    }

    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objOrderType = document.getElementById("ddlOrderType");
    let vOrderType = objOrderType ? objOrderType.value : "market_order";
    let objCloseRes = await fnExecCloseLeg(
        objApiKey?.value || "",
        objApiSecret?.value || "",
        vOrderType,
        objLegRef.Symbol,
        objLegRef.TransType,
        objLegRef.OptionType,
        objLegRef.LotSize,
        vCloseQty
    );
    if(objCloseRes.status !== "success"){
        return { status : objCloseRes.status || "danger", message : objCloseRes.message || "Close order failed." };
    }

    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vNowTxt = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    let vClosePx = Number(objCloseRes?.data?.ClosePrice);
    if(!Number.isFinite(vClosePx) || vClosePx <= 0){
        vClosePx = (objLegRef.TransType === "sell") ? Number(objLegRef.BuyPrice) : Number(objLegRef.SellPrice);
    }

    if(!gClsdPosLS2FOLV || !Array.isArray(gClsdPosLS2FOLV.TradeData)){
        gClsdPosLS2FOLV = { TradeData : [] };
    }

    let vBuyClosed = Number(objLegRef.BuyPrice);
    let vSellClosed = Number(objLegRef.SellPrice);
    if(objLegRef.TransType === "sell"){
        vBuyClosed = vClosePx;
    }
    else{
        vSellClosed = vClosePx;
    }

    let objClosedLeg = { ...objLegRef };
    if(vCloseQty < vCurrQty){
        objClosedLeg.TradeID = Date.now() + Math.floor(Math.random() * 1000);
    }
    objClosedLeg.LotQty = vCloseQty;
    objClosedLeg.BuyPrice = vBuyClosed;
    objClosedLeg.SellPrice = vSellClosed;
    objClosedLeg.CloseDT = vNowTxt;
    objClosedLeg.CloseDTVal = vDate.valueOf();
    objClosedLeg.Status = "CLOSED";
    gClsdPosLS2FOLV.TradeData.push(objClosedLeg);

    const vStrikePrice = parseFloat(objClosedLeg.StrikePrice || 0);
    const vLotSize = parseFloat(objClosedLeg.LotSize || 0);
    const vOptionType = objClosedLeg.OptionType || "F";
    const vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vCloseQty, vBuyClosed, vSellClosed, vOptionType);
    const vPL = fnGetTradePL(vBuyClosed, vSellClosed, vLotSize, vCloseQty, vCharges);

    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objYet2Recvr = document.getElementById("txtYet2Recvr");
    let vYet2RecvrAmt = parseFloat(objYet2Recvr?.value);
    if(!Number.isFinite(vYet2RecvrAmt)){
        vYet2RecvrAmt = parseFloat(gOtherFlds?.[0]?.Yet2RecvrAmt);
    }
    if(!Number.isFinite(vYet2RecvrAmt)){
        vYet2RecvrAmt = 0;
    }
    gOtherFlds[0]["Yet2RecvrAmt"] = vYet2RecvrAmt + vPL;
    if(objYet2Recvr){
        objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];
    }

    if(vPL > 0 && objBrokAmt){
        let vBrok = parseFloat(objBrokAmt.value);
        if(!Number.isFinite(vBrok)){
            vBrok = parseFloat(gOtherFlds?.[0]?.BrokerageAmt);
        }
        if(!Number.isFinite(vBrok)){
            vBrok = 0;
        }
        if(vBrok >= vCharges){
            gOtherFlds[0]["BrokerageAmt"] = vBrok - vCharges;
            objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];
        }
    }

    if(vCloseQty >= vCurrQty){
        objLegRef.BuyPrice = vBuyClosed;
        objLegRef.SellPrice = vSellClosed;
        objLegRef.CloseDT = vNowTxt;
        objLegRef.CloseDTVal = vDate.valueOf();
        objLegRef.Status = "CLOSED";
        gCurrPosLS2FOLV.TradeData = gCurrPosLS2FOLV.TradeData.filter(objLeg => String(objLeg.TradeID) !== String(objLegRef.TradeID));
    }
    else{
        objLegRef.LotQty = vCurrQty - vCloseQty;
    }

    localStorage.setItem("CurrPosLS2FOLV", JSON.stringify(gCurrPosLS2FOLV));
    localStorage.setItem("ClsdPosLS2FOLV", JSON.stringify(gClsdPosLS2FOLV));
    localStorage.setItem("HidFldsLS2FOLV", JSON.stringify(gOtherFlds));
    return { status : "success", message : "Leg closed.", closeQty : vCloseQty };
}

async function fnRunClosePlanS2(objPlan, pReason = ""){
    if(gCloseSeqBusy){
        fnGenMessage("Close skipped: previous close sequence is running.", `badge bg-warning`, "spnGenMsg");
        return { status : "warning", message : "Close sequence already in progress." };
    }
    gCloseSeqBusy = true;
    try{
        if(!Array.isArray(objPlan) || objPlan.length === 0){
            return { status : "warning", message : "No close plan." };
        }
        const objSortedPlan = fnGetSortedCloseLegs(objPlan);
        const bCompactTg = fnIsCompactCloseAlertMode();
        const vTotalSteps = objSortedPlan.length;
        let vClosedSteps = 0;
        let vClosedFut = 0;
        let vClosedOpt = 0;
        if(vTotalSteps > 0){
            fnGenMessage(`Close sequence started (${pReason || "manual"}): ${vTotalSteps} leg(s), futures-first.`, `badge bg-info`, "spnGenMsg");
        }
        for(let i=0; i<objSortedPlan.length; i++){
            let objPlanRow = objSortedPlan[i];
            let objOpenLeg = fnFindOpenLegByTradeId(objPlanRow.tradeId);
            if(!objOpenLeg){
                continue;
            }
            let vQtyToClose = Math.floor(Number(objPlanRow.closeQty));
            if(!Number.isFinite(vQtyToClose) || vQtyToClose <= 0){
                continue;
            }
            const vLegType = objOpenLeg.OptionType === "F" ? "Futures" : "Option";
            const vStepNo = i + 1;
            fnGenMessage(`Closing ${vLegType} ${objOpenLeg.Symbol} Qty ${vQtyToClose} (${vStepNo}/${vTotalSteps})...`, `badge bg-secondary`, "spnGenMsg");
            let objRes = await fnCloseLegByQtyS2(objOpenLeg, vQtyToClose, pReason);
            if(objRes.status !== "success"){
                fnGenMessage("Close sequence stopped: " + (objRes.message || "close failed"), `badge bg-warning`, "spnGenMsg");
                fnSendTelegramRuntimeAlert(`LiveStrategy2FO\nClose Failed\nReason: ${pReason || "close"}\nAt: ${vLegType} ${objOpenLeg.Symbol} Qty ${vQtyToClose}\nProgress: ${vClosedSteps}/${vTotalSteps}\nError: ${objRes.message || "close failed"}\nTime: ${new Date().toLocaleString("en-GB")}`);
                return objRes;
            }
            vClosedSteps += 1;
            if(objOpenLeg.OptionType === "F"){
                vClosedFut += 1;
            }
            else{
                vClosedOpt += 1;
            }
            fnGenMessage(`Closed ${vLegType} ${objOpenLeg.Symbol} Qty ${vQtyToClose} (${vStepNo}/${vTotalSteps}).`, `badge bg-success`, "spnGenMsg");
            if(!bCompactTg){
                fnSendTelegramRuntimeAlert(`LiveStrategy2FO\nLeg Closed\nLeg: ${vLegType}\nSymbol: ${objOpenLeg.Symbol}\nQty: ${vQtyToClose}\nStep: ${vStepNo}/${vTotalSteps}\nReason: ${pReason || "close"}\nTime: ${new Date().toLocaleString("en-GB")}`);
            }
        }

        gUpdPos = true;
        fnSetSymbolTickerList();
        fnUpdateOpenPositions();
        fnDispClosedPositions();
        let bHasOpenPos = Array.isArray(gCurrPosLS2FOLV?.TradeData) && gCurrPosLS2FOLV.TradeData.some(objLeg => objLeg.Status === "OPEN");
        if(!bHasOpenPos){
            fnSetNextTradeQtySettings(true);
        }
        fnGenMessage(`Close sequence completed (${pReason || "manual"}).`, `badge bg-success`, "spnGenMsg");
        fnSendTelegramRuntimeAlert(`LiveStrategy2FO\nClose Sequence Completed\nReason: ${pReason || "manual"}\nTotal Legs: ${vTotalSteps}\nClosed Futures: ${vClosedFut}\nClosed Options: ${vClosedOpt}\nTime: ${new Date().toLocaleString("en-GB")}`);
        return { status : "success", message : "Close sequence completed." };
    }
    finally{
        gCloseSeqBusy = false;
    }
}

async function fnTryLossRecoveryPartialCloseS2(){
    if(!gCurrPosLS2FOLV || !Array.isArray(gCurrPosLS2FOLV.TradeData)){
        return false;
    }

    let objOpenLegs = gCurrPosLS2FOLV.TradeData.filter(objLeg => objLeg && objLeg.Status === "OPEN");
    if(objOpenLegs.length === 0){
        return false;
    }

    let objYet2Recvr = document.getElementById("txtYet2Recvr");
    let vYetRecAmt = Number(objYet2Recvr?.value);
    if(!Number.isFinite(vYetRecAmt)){
        vYetRecAmt = Number(gOtherFlds?.[0]?.Yet2RecvrAmt);
    }
    if(!Number.isFinite(vYetRecAmt) || vYetRecAmt >= 0){
        return false;
    }

    const vTarget = fnGetLossRecoveryTargetAmtS2(vYetRecAmt);
    if(!Number.isFinite(vTarget) || vTarget <= 0 || Number(gPL) < vTarget){
        return false;
    }

    const vLossPct = fnParsePositiveNumber(gLossRecPerct, 100);
    if(vLossPct >= 100){
        await fnExitAllPositions("loss-recovery-full");
        return true;
    }

    let objPlan = [];

    for(let i=0; i<objOpenLegs.length; i++){
        const vCurrQty = Math.floor(Number(objOpenLegs[i].LotQty));
        if(!Number.isFinite(vCurrQty) || vCurrQty <= 1){
            continue;
        }

        let vCloseQty = Math.floor((vCurrQty * vLossPct) / 100);
        if(vCloseQty < 1){
            vCloseQty = 1;
        }
        if(vCloseQty >= vCurrQty){
            vCloseQty = vCurrQty - 1;
        }
        if(vCloseQty < 1){
            continue;
        }

        objPlan.push({ tradeId : objOpenLegs[i].TradeID, closeQty : vCloseQty, optionType : objOpenLegs[i].OptionType, symbol : objOpenLegs[i].Symbol });
    }

    if(objPlan.length === 0){
        await fnExitAllPositions("loss-recovery-full-fallback");
        return true;
    }

    let objSeqRes = await fnRunClosePlanS2(objPlan, "loss-recovery-partial");
    if(objSeqRes.status === "success"){
        fnGenMessage("Partial loss-recovery close executed (futures-first).", `badge bg-success`, "spnGenMsg");
        fnSendTelegramRuntimeAlert(`LiveStrategy2FO\nPartial Close\nReason: Loss Recovery\nLegs: ${objPlan.length}\nTime: ${new Date().toLocaleString("en-GB")}`);
        return true;
    }
    return objSeqRes.status === "warning";
}

function fnChkTodayPosToCls(){
    let vTodayDate = new Date();
    let vDDMMYYYY = fnSetDDMMYYYY(vTodayDate);
    let vIsRecExists = false;
    let vLegID = 0;
    let vTransType = "";
    let vOptionType = "";
    let vSymbol = "";

    for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
        if(gCurrPosLS2FOLV.TradeData[i].Expiry === vDDMMYYYY){
            let vDate3PM = new Date();
            let vDate5PM = new Date();
            vDate3PM.setHours(15, 30, 0, 0);
            vDate5PM.setHours(17, 0, 0, 0);

            let v3PM = vDate3PM.getTime();
            let v5PM = vDate5PM.getTime();

            let vState = gCurrPosLS2FOLV.TradeData[i].Status;

            if((vTodayDate.valueOf() > v3PM) && (vTodayDate.valueOf() < v5PM)){
                if(vState === "OPEN"){
                    vLegID = gCurrPosLS2FOLV.TradeData[i].TradeID;
                    vTransType = gCurrPosLS2FOLV.TradeData[i].TransType;
                    vOptionType = gCurrPosLS2FOLV.TradeData[i].OptionType;
                    vSymbol = gCurrPosLS2FOLV.TradeData[i].Symbol;
                    
                    vIsRecExists = true;

                }
            }
        }
    }

    if(vIsRecExists === true){
        void fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
    }

    // console.log(gCurrPosLS2FOLV);
}

//************** Check for Open Position PL Status and close *************//
async function fnSaveUpdCurrPos(){
    if(gSaveUpdBusy){
        return;
    }
    gSaveUpdBusy = true;
    try{
    let vToPosClose = false;
    let vLegID = 0;
    let vTransType = "";
    let vOptionType = "";
    let vSymbol = "";
    let vBrokSwt = document.getElementById("swtBrokRecvry").checked;
    let vBrokAmt = document.getElementById("txtBrok2Rec").value;
    let vBrokXVal = document.getElementById("txtXBrok2Rec").value;
    let vYetRecAmt = parseFloat(document.getElementById("txtYet2Recvr").value);
    let objchkReLeg1 = document.getElementById("chkReLeg1");
    let objchkReLeg2 = document.getElementById("chkReLeg2");
    let objchkReLeg3 = document.getElementById("chkReLeg3");
    let vTotalPL = 0;

    vBrokAmt = parseFloat(vBrokAmt) * parseInt(vBrokXVal);


    if(vYetRecAmt < 0){
        vTotalPL = gPL + vYetRecAmt;
    }
    else{
        vTotalPL = gPL + vYetRecAmt;
    }

    document.getElementById("divNetPL").innerText = (vTotalPL).toFixed(2);

    if(await fnTryLossRecoveryPartialCloseS2()){
        gSaveUpdBusy = false;
        return;
    }

    if((vTotalPL > vBrokAmt) && vBrokSwt){
        console.log("Close All Positions...");
        fnSendTelegramRuntimeAlert(`LiveStrategy2FO\nClose Triggered\nReason: Net Profit Target\nNetPnL: ${Number(vTotalPL || 0).toFixed(2)}\nThreshold: ${Number(vBrokAmt || 0).toFixed(2)}\nTime: ${new Date().toLocaleString("en-GB")}`);
        await fnExitAllPositions("net-profit-close");
    }
    else{
        for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
            if(gCurrPosLS2FOLV.TradeData[i].Status === "OPEN"){
                let vOptionTypeZZ = gCurrPosLS2FOLV.TradeData[i].OptionType;
                let vCurrDelta = parseFloat(gSymbDeltaList[gCurrPosLS2FOLV.TradeData[i].Symbol]);
                let vCurrGamma = parseFloat(gSymbGammaList[gCurrPosLS2FOLV.TradeData[i].Symbol]);
                let vCurrTheta = parseFloat(gSymbThetaList[gCurrPosLS2FOLV.TradeData[i].Symbol]);
                let vCurrVega = parseFloat(gSymbVegaList[gCurrPosLS2FOLV.TradeData[i].Symbol]);

                if(vOptionTypeZZ !== "F"){
                    let vCurrDeltaPos = vCurrDelta;
                    if(!isNaN(vCurrDelta)){
                        if(gCurrPosLS2FOLV.TradeData[i].TransType === "sell"){
                            vCurrDeltaPos = -1 * vCurrDelta;
                        }
                    }
                    if(!isNaN(vCurrDelta)){
                        gCurrPosLS2FOLV.TradeData[i].DeltaC = vCurrDeltaPos;
                    }
                    if(!isNaN(vCurrGamma)){
                        gCurrPosLS2FOLV.TradeData[i].GammaC = vCurrGamma;
                    }
                    if(!isNaN(vCurrTheta)){
                        gCurrPosLS2FOLV.TradeData[i].ThetaC = vCurrTheta;
                    }
                    if(!isNaN(vCurrVega)){
                        gCurrPosLS2FOLV.TradeData[i].VegaC = vCurrVega;
                    }
                }

                let vStrikePrice = gCurrPosLS2FOLV.TradeData[i].StrikePrice;
                let vLotSize = gCurrPosLS2FOLV.TradeData[i].LotSize;
                let vQty = gCurrPosLS2FOLV.TradeData[i].LotQty;
                let vBuyPrice = gCurrPosLS2FOLV.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosLS2FOLV.TradeData[i].SellPrice;
                let vDeltaSL = gCurrPosLS2FOLV.TradeData[i].DeltaSL;
                let vDeltaTP = gCurrPosLS2FOLV.TradeData[i].DeltaTP;

                if(vOptionTypeZZ === "F"){
                    let vCurrPriceF = 0;
                    if(gCurrPosLS2FOLV.TradeData[i].TransType === "sell"){
                        vCurrPriceF = parseFloat(gSymbBRateList[gCurrPosLS2FOLV.TradeData[i].Symbol]);
                        if(Number.isFinite(vCurrPriceF)){
                            gCurrPosLS2FOLV.TradeData[i].BuyPrice = vCurrPriceF;
                        }
                    }
                    else if(gCurrPosLS2FOLV.TradeData[i].TransType === "buy"){
                        vCurrPriceF = parseFloat(gSymbSRateList[gCurrPosLS2FOLV.TradeData[i].Symbol]);
                        if(Number.isFinite(vCurrPriceF)){
                            gCurrPosLS2FOLV.TradeData[i].SellPrice = vCurrPriceF;
                        }
                    }

                    fnInitFutureRiskFields(gCurrPosLS2FOLV.TradeData[i]);
                    if(Number.isFinite(vCurrPriceF) && fnShouldCloseFuturePosition(gCurrPosLS2FOLV.TradeData[i], vCurrPriceF)){
                        vLegID = gCurrPosLS2FOLV.TradeData[i].TradeID;
                        vTransType = gCurrPosLS2FOLV.TradeData[i].TransType;
                        vOptionType = gCurrPosLS2FOLV.TradeData[i].OptionType;
                        vSymbol = gCurrPosLS2FOLV.TradeData[i].Symbol;
                        vToPosClose = true;
                    }
                    continue;
                }

                if(gCurrPosLS2FOLV.TradeData[i].TransType === "sell"){
                    let vCurrPrice = parseFloat(gSymbBRateList[gCurrPosLS2FOLV.TradeData[i].Symbol]);
                    gCurrPosLS2FOLV.TradeData[i].BuyPrice = vCurrPrice;

                    if((Math.abs(vCurrDelta) >= vDeltaSL) || (Math.abs(vCurrDelta) <= vDeltaTP)){
                        vLegID = gCurrPosLS2FOLV.TradeData[i].TradeID;
                        vTransType = gCurrPosLS2FOLV.TradeData[i].TransType;
                        vOptionType = gCurrPosLS2FOLV.TradeData[i].OptionType;
                        vSymbol = gCurrPosLS2FOLV.TradeData[i].Symbol;
                        vToPosClose = true;
                        let vCfgRow = parseInt(gCurrPosLS2FOLV.TradeData[i].CfgRow || 0);
                        if(vCfgRow === 1 && objchkReLeg1.checked){
                            gReLeg = true;
                            gReLegCfgRow = 1;
                        }
                        else if(vCfgRow === 2 && objchkReLeg2.checked){
                            gReLeg = true;
                            gReLegCfgRow = 2;
                        }
                        else if(vCfgRow === 3 && objchkReLeg3 && objchkReLeg3.checked){
                            gReLeg = true;
                            gReLegCfgRow = 3;
                        }
                        else if(vCfgRow === 0 && objchkReLeg1.checked){
                            gReLeg = true;
                            gReLegCfgRow = 1;
                        }
                    }
                }
                else if(gCurrPosLS2FOLV.TradeData[i].TransType === "buy"){
                    let vCurrPrice = parseFloat(gSymbSRateList[gCurrPosLS2FOLV.TradeData[i].Symbol]);
                    gCurrPosLS2FOLV.TradeData[i].SellPrice = vCurrPrice;

                    if((Math.abs(vCurrDelta) <= vDeltaSL) || (Math.abs(vCurrDelta) >= vDeltaTP)){
                        vLegID = gCurrPosLS2FOLV.TradeData[i].TradeID;
                        vTransType = gCurrPosLS2FOLV.TradeData[i].TransType;
                        vOptionType = gCurrPosLS2FOLV.TradeData[i].OptionType;
                        vSymbol = gCurrPosLS2FOLV.TradeData[i].Symbol;
                        vToPosClose = true;
                        let vCfgRow = parseInt(gCurrPosLS2FOLV.TradeData[i].CfgRow || 0);
                        if(vCfgRow === 1 && objchkReLeg1.checked){
                            gReLeg = true;
                            gReLegCfgRow = 1;
                        }
                        else if(vCfgRow === 2 && objchkReLeg2.checked){
                            gReLeg = true;
                            gReLegCfgRow = 2;
                        }
                        else if(vCfgRow === 3 && objchkReLeg3 && objchkReLeg3.checked){
                            gReLeg = true;
                            gReLegCfgRow = 3;
                        }
                        else if(vCfgRow === 0 && objchkReLeg2.checked){
                            gReLeg = true;
                            gReLegCfgRow = 2;
                        }
                    }
                }
            }
        }

        fnUpdateOpenPositions();

        if(vToPosClose){
            // SL/TP hit on any open leg: close all open legs and wait for fresh signal.
            gReLeg = false;
            gReLegCfgRow = 0;
            fnSendTelegramRuntimeAlert(`LiveStrategy2FO\nClose Triggered\nReason: SL/TP hit\nTime: ${new Date().toLocaleString("en-GB")}`);
            await fnExitAllPositions("sl-tp-close");
        }
    }
    }
    finally{
        gSaveUpdBusy = false;
    }
}

async function fnExitAllPositions(pReason = "manual-close-all"){
    if(!gCurrPosLS2FOLV || !Array.isArray(gCurrPosLS2FOLV.TradeData)){
        return { status : "warning", message : "No positions list." };
    }
    let objOpenLegs = gCurrPosLS2FOLV.TradeData.filter(objLeg => objLeg && objLeg.Status === "OPEN");
    if(objOpenLegs.length === 0){
        return { status : "warning", message : "No open positions." };
    }

    let objPlan = objOpenLegs.map((objLeg) => ({
        tradeId : objLeg.TradeID,
        closeQty : Math.max(1, Math.floor(Number(objLeg.LotQty) || 1)),
        optionType : objLeg.OptionType,
        symbol : objLeg.Symbol
    }));
    let objRes = await fnRunClosePlanS2(objPlan, pReason);
    if(objRes.status === "success"){
        let bHasOpenPos = Array.isArray(gCurrPosLS2FOLV?.TradeData) && gCurrPosLS2FOLV.TradeData.some(objLeg => objLeg.Status === "OPEN");
        if(!bHasOpenPos){
            let objChkReLeg = document.getElementById("chkReLegBrok");
            if(objChkReLeg){
                setTimeout(fnExecAllLegs, 900000);
            }
        }
    }
    return objRes;
}

function fnCloseBuyLeg(pTransType, pOptionType){
    let vOptionType = "";
    let vRecExists = false;
    let vLegID = 0;
    let vSymbol = "";

    if(pOptionType === "C"){
        vOptionType = "P";
    }
    else if(pOptionType === "P"){
        vOptionType = "C";
    }

    for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
        if((gCurrPosLS2FOLV.TradeData[i].TransType === "buy") && gCurrPosLS2FOLV.TradeData[i].OptionType === vOptionType){
            vRecExists = true;
            vLegID = gCurrPosLS2FOLV.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosLS2FOLV.TradeData[i].Symbol;
        }
    }

    if(vRecExists){
        fnCloseOptPosition(vLegID, "buy", vOptionType, vSymbol, "CLOSED");
    }
}

function fnGetBuyOpenPosAndClose(pTransType, pOptionType){
    let vToPosClose = false;
    let vLegID = 0;
    let vSymbol = "";

    for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
        if((gCurrPosLS2FOLV.TradeData[i].Status === "OPEN") && (gCurrPosLS2FOLV.TradeData[i].OptionType === pOptionType) && (gCurrPosLS2FOLV.TradeData[i].TransType === "buy")){
            vLegID = gCurrPosLS2FOLV.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosLS2FOLV.TradeData[i].Symbol;
            vToPosClose = true;
        }
    }

    if(vToPosClose){
        fnCloseOptPosition(vLegID, "buy", vOptionType, vSymbol, "CLOSED");
    }
}

function fnRefreshAllOpenBrowser(){
    if(localStorage.getItem("AppLoginEmail") === "kamarthi.anil@gmail.com"){
        // fnClearLocalStorageTemp();

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: '',
            redirect: 'follow'
        };

        fetch("/refreshAllDFL", objRequestOptions)
        .then(objResponse => objResponse.json())
        .then(objResult => {
            if(objResult.status === "success"){

                console.log(objResult);
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "danger"){
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "warning"){
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage("Error to Receive Trade Msg", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            console.log('error: ', error);
            fnGenMessage("Error to Fetch Trade Msg.", `badge bg-danger`, "spnGenMsg");
        });        
    }
}

function fnTest(){
    let vTodayDate = new Date();
    let vDDMMYYYY = fnSetDDMMYYYY(vTodayDate);
    let vDate3PM = new Date();
    let vDate5PM = new Date();

    vDate3PM.setHours(15, 30, 0, 0);
    vDate5PM.setHours(17, 0, 0, 0);

    // Epoch time in milliseconds
    let v3PM = vDate3PM.getTime();
    let v5PM = vDate5PM.getTime();

    console.log(gCurrPosLS2FOLV);
    console.log(vDDMMYYYY);
    console.log(v3PM);
    console.log(v5PM);
    

    // // console.log("Open epoch (ms):", v4PM);
    // // console.log("Close epoch (ms):", v5PM);

    // if((gDateNow.valueOf() > v4PM) && (gDateNow.valueOf() < v5PM)){
    //     console.log("Upded!");
    // }

    // console.log("Now Time: " + gDateNow.valueOf());
}

//************ Update Live Code Here **************//
function fnLoadDefExpiryMode(){
    let objBuyExpiryMode = document.getElementById("ddlExpiryMode2");
    let objSellExpiryMode = document.getElementById("ddlExpiryMode1");
    let objExpiryMode3 = document.getElementById("ddlExpiryMode3");
    let vBuyExpiryMode = JSON.parse(localStorage.getItem("BuyExpiryModeLS2FOLV"));
    let vSellExpiryMode = JSON.parse(localStorage.getItem("SellExpiryModeLS2FOLV"));
    let vExpiryMode3 = JSON.parse(localStorage.getItem("ExpiryMode3LS2FOLV"));
    let objExpiryBuy = document.getElementById("txtExpiry2");
    let objExpirySell = document.getElementById("txtExpiry1");
    let objExpiry3 = document.getElementById("txtExpiry3");

    if(vBuyExpiryMode === null){
        objBuyExpiryMode.value = 1;
    }
    else{
        objBuyExpiryMode.value = vBuyExpiryMode;
    }
    fnLoadExpiryDate(objBuyExpiryMode.value, objExpiryBuy);

    if(vSellExpiryMode === null){
        objSellExpiryMode.value = 1;
    }
    else{
        objSellExpiryMode.value = vSellExpiryMode;
    }
    fnLoadExpiryDate(objSellExpiryMode.value, objExpirySell);

    if(objExpiryMode3 && objExpiry3){
        if(vExpiryMode3 === null){
            objExpiryMode3.value = 1;
        }
        else{
            objExpiryMode3.value = vExpiryMode3;
        }
        fnLoadExpiryDate(objExpiryMode3.value, objExpiry3);
    }
}

async function fnExitAllOpenPositionsByBadge(){
    if(!gCurrPosLS2FOLV || !Array.isArray(gCurrPosLS2FOLV.TradeData)){
        fnGenMessage("No Open Positions to Close.", `badge bg-warning`, "spnGenMsg");
        return;
    }

    const bHasOpenPos = gCurrPosLS2FOLV.TradeData.some(objLeg => objLeg && objLeg.Status === "OPEN");
    if(!bHasOpenPos){
        fnGenMessage("No Open Positions to Close.", `badge bg-warning`, "spnGenMsg");
        return;
    }

    gReLeg = false;
    gReLegCfgRow = 0;
    let objRes = await fnExitAllPositions("badge-close-all");
    if(objRes.status === "success"){
        fnGenMessage("All Open Positions moved to Closed Positions.", `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdateBuyExpiryMode(){
    let objBuyExpiryMode = document.getElementById("ddlExpiryMode2");
    let objExpiryBuy = document.getElementById("txtExpiry2");

    fnLoadExpiryDate(objBuyExpiryMode.value, objExpiryBuy);
    localStorage.setItem("BuyExpiryModeLS2FOLV", JSON.stringify(objBuyExpiryMode.value));
}

function fnUpdateSellExpiryMode(){
    let objSellExpiryMode = document.getElementById("ddlExpiryMode1");
    let objExpirySell = document.getElementById("txtExpiry1");

    fnLoadExpiryDate(objSellExpiryMode.value, objExpirySell);
    localStorage.setItem("SellExpiryModeLS2FOLV", JSON.stringify(objSellExpiryMode.value));
}

function fnUpdateExpiryMode3(){
    let objExpiryMode3 = document.getElementById("ddlExpiryMode3");
    let objExpiry3 = document.getElementById("txtExpiry3");
    if(!objExpiryMode3 || !objExpiry3){
        return;
    }

    fnLoadExpiryDate(objExpiryMode3.value, objExpiry3);
    localStorage.setItem("ExpiryMode3LS2FOLV", JSON.stringify(objExpiryMode3.value));
}

function fnLoadExpiryDate(pExpiryMode, objExpiry){
    let vCurrDate = new Date();
    const vCurrFriday = new Date(vCurrDate);
    const vNextFriday = new Date(vCurrDate);
    const vYear = vCurrDate.getFullYear();
    const vMonth = vCurrDate.getMonth();
    let vLastDayOfMonth = new Date(vYear, vMonth + 1, 0);
    let vLastDayOfNextMonth = new Date(vYear, vMonth + 2, 0);
    let vLastDayOfThirdMonth = new Date(vYear, vMonth + 3, 0);

    if(pExpiryMode === "1"){
        vCurrDate.setDate(vCurrDate.getDate() + 1);

        let vDay = (vCurrDate.getDate()).toString().padStart(2, "0");
        let vMonth = (vCurrDate.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vCurrDate.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiry.value = vExpValTB;
    }
    else if(pExpiryMode === "2"){
        vCurrDate.setDate(vCurrDate.getDate() + 2);

        let vDay = (vCurrDate.getDate()).toString().padStart(2, "0");
        let vMonth = (vCurrDate.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vCurrDate.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiry.value = vExpValTB;
    }
    else if(pExpiryMode === "4"){
        // Weekly expiry is Friday, rolled by Tuesday cutoff (EOD).
        const vCurrDayOfWeek = vCurrDate.getDay();
        const vDaysToNextTuesday = (2 - vCurrDayOfWeek + 7) % 7;
        const vDaysToWeeklyFriday = vDaysToNextTuesday + 3;

        vCurrFriday.setDate(vCurrDate.getDate() + vDaysToWeeklyFriday);
        let vDay = (vCurrFriday.getDate()).toString().padStart(2, "0");
        let vMonth = (vCurrFriday.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vCurrFriday.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiry.value = vExpValTB;
    }
    else if(pExpiryMode === "5"){
        // Bi-weekly expiry is the following Friday after weekly (Tuesday cutoff based).
        const vCurrDayOfWeek = vCurrDate.getDay();
        const vDaysToNextTuesday = (2 - vCurrDayOfWeek + 7) % 7;
        const vDaysToBiWeeklyFriday = vDaysToNextTuesday + 10;

        vNextFriday.setDate(vCurrDate.getDate() + vDaysToBiWeeklyFriday);
        let vDay = (vNextFriday.getDate()).toString().padStart(2, "0");
        let vMonth = (vNextFriday.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vNextFriday.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiry.value = vExpValTB;
    }
    else if(pExpiryMode === "6"){
        while (vLastDayOfMonth.getDay() !== 5) { 
            vLastDayOfMonth.setDate(vLastDayOfMonth.getDate() - 1);
        }
        while (vLastDayOfNextMonth.getDay() !== 5) { 
            vLastDayOfNextMonth.setDate(vLastDayOfNextMonth.getDate() - 1);
        }

        const vCurrDay = vCurrDate.getDate();
        let vDay = (vLastDayOfMonth.getDate()).toString().padStart(2, "0");
        let vMonth = (vLastDayOfMonth.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vLastDayOfMonth.getFullYear() + "-" + vMonth + "-" + vDay;

        if(vCurrDay > 15){
            vDay = (vLastDayOfNextMonth.getDate()).toString().padStart(2, "0");
            vMonth = (vLastDayOfNextMonth.getMonth() + 1).toString().padStart(2, "0");
            vExpValTB = vLastDayOfNextMonth.getFullYear() + "-" + vMonth + "-" + vDay;
        }
        objExpiry.value = vExpValTB;
    }
    else if(pExpiryMode === "7"){
        while (vLastDayOfNextMonth.getDay() !== 5) { 
            vLastDayOfNextMonth.setDate(vLastDayOfNextMonth.getDate() - 1);
        }
        while (vLastDayOfThirdMonth.getDay() !== 5) { 
            vLastDayOfThirdMonth.setDate(vLastDayOfThirdMonth.getDate() - 1);
        }

        const vCurrDay = vCurrDate.getDate();
        let vDay = (vLastDayOfNextMonth.getDate()).toString().padStart(2, "0");
        let vMonth = (vLastDayOfNextMonth.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vLastDayOfNextMonth.getFullYear() + "-" + vMonth + "-" + vDay;

        if(vCurrDay > 15){
            vDay = (vLastDayOfThirdMonth.getDate()).toString().padStart(2, "0");
            vMonth = (vLastDayOfThirdMonth.getMonth() + 1).toString().padStart(2, "0");
            vExpValTB = vLastDayOfThirdMonth.getFullYear() + "-" + vMonth + "-" + vDay;
        }
        objExpiry.value = vExpValTB;
    }
}

function fnSetDDMMYYYY(pDateToConv){
    let vDate = new Date(pDateToConv);
    let vDay = (vDate.getDate()).toString().padStart(2, "0");
    let vMonth = (vDate.getMonth() + 1).toString().padStart(2, "0");
    let vYear = vDate.getFullYear();
    let vRetVal = vDay + "-" + vMonth + "-" + vYear;;

    return vRetVal;
}

function fnExecAllLegs(){
    let objSellAction = document.getElementById("ddlAction1");
    let objBuyAction = document.getElementById("ddlAction2");
    let objAction3 = document.getElementById("ddlAction3");
    let objSellExpDate = document.getElementById("txtExpiry1");
    let objSellQty = document.getElementById("txtStartQty1");
    let objNewDelta1 = document.getElementById("txtNewDelta1");
    let objReDelta1 = document.getElementById("txtReDelta1");
    let objDeltaSellTP = document.getElementById("txtDeltaTP1");
    let objDeltaSellSL = document.getElementById("txtDeltaSL1");

    let objBuyExpDate = document.getElementById("txtExpiry2");
    let objBuyQty = document.getElementById("txtStartQty2");
    let objNewDelta2 = document.getElementById("txtNewDelta2");
    let objReDelta2 = document.getElementById("txtReDelta2");
    let objDeltaBuyTP = document.getElementById("txtDeltaTP2");
    let objDeltaBuySL = document.getElementById("txtDeltaSL2");
    let objExpDate3 = document.getElementById("txtExpiry3");
    let objQty3 = document.getElementById("txtStartQty3");
    let objNewDelta3 = document.getElementById("txtNewDelta3");
    let objReDelta3 = document.getElementById("txtReDelta3");
    let objDeltaTP3 = document.getElementById("txtDeltaTP3");
    let objDeltaSL3 = document.getElementById("txtDeltaSL3");
    let vHasSellSelection = objSellAction && objSellAction.value !== "none";
    let vHasBuySelection = objBuyAction && objBuyAction.value !== "none";
    let vHasSelection3 = objAction3 && objAction3.value !== "none";
    const fnValidateDeltaRules = (pRowNo, pAction, pNewD, pReD, pTPD, pSLD) => {
        let vNew = parseFloat(pNewD);
        let vRe = parseFloat(pReD);
        let vTP = parseFloat(pTPD);
        let vSL = parseFloat(pSLD);
        if(!Number.isFinite(vNew) || !Number.isFinite(vRe) || !Number.isFinite(vTP) || !Number.isFinite(vSL)){
            return { ok: false, msg: `Row ${pRowNo}: Invalid numeric values for New/Re/TP/SL Delta` };
        }

        let vAction = (pAction || "").toLowerCase();
        if(vAction === "buy"){
            if(!(vTP > vNew && vTP > vRe)){
                return { ok: false, msg: `Row ${pRowNo}: for Buy, TP D must be greater than New D and Re D` };
            }
            if(!(vSL < vNew && vSL < vRe)){
                return { ok: false, msg: `Row ${pRowNo}: for Buy, SL D must be less than New D and Re D` };
            }
        }
        else if(vAction === "sell"){
            if(!(vTP < vNew && vTP < vRe)){
                return { ok: false, msg: `Row ${pRowNo}: for Sell, TP D must be less than New D and Re D` };
            }
            if(!(vSL > vNew && vSL > vRe)){
                return { ok: false, msg: `Row ${pRowNo}: for Sell, SL D must be greater than New D and Re D` };
            }
        }
        return { ok: true, msg: "" };
    };

    if(!vHasSellSelection && !vHasBuySelection && !vHasSelection3){
        fnGenMessage("Please select at least one action in Sell/Buy selectors", `badge bg-warning`, "spnGenMsg");
        return;
    }

    if(vHasSellSelection && objSellExpDate.value === ""){
        objSellExpDate.focus();
        fnGenMessage("Please Select Sell Expiry Date", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasBuySelection && objBuyExpDate.value === ""){
        objBuyExpDate.focus();
        fnGenMessage("Please Select Buy Expiry Date", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSelection3 && objExpDate3.value === ""){
        objExpDate3.focus();
        fnGenMessage("Please Select Row 3 Expiry Date", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSellSelection && objSellQty.value === ""){
        objSellQty.focus();
        fnGenMessage("Please Input Sell Qty in Lots", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasBuySelection && objBuyQty.value === ""){
        objBuyQty.focus();
        fnGenMessage("Please Input Buy Qty in Lots", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSelection3 && objQty3.value === ""){
        objQty3.focus();
        fnGenMessage("Please Input Row 3 Qty in Lots", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSellSelection && objNewDelta1.value === ""){
        objNewDelta1.focus();
        fnGenMessage("Please Input New Sell Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasBuySelection && objNewDelta2.value === ""){
        objNewDelta2.focus();
        fnGenMessage("Please Input New Buy Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSelection3 && objNewDelta3.value === ""){
        objNewDelta3.focus();
        fnGenMessage("Please Input New Row 3 Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSellSelection && objReDelta1.value === ""){
        objReDelta1.focus();
        fnGenMessage("Please Input Re-Entry Sell Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasBuySelection && objReDelta2.value === ""){
        objReDelta2.focus();
        fnGenMessage("Please Input Re-Entry Buy Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSelection3 && objReDelta3.value === ""){
        objReDelta3.focus();
        fnGenMessage("Please Input Re-Entry Row 3 Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSellSelection && objDeltaSellTP.value === ""){
        objDeltaSellTP.focus();
        fnGenMessage("Please Input Delta for Sell Legs Take Profit", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasBuySelection && objDeltaBuyTP.value === ""){
        objDeltaBuyTP.focus();
        fnGenMessage("Please Input Delta for Buy Legs Take Profit", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSelection3 && objDeltaTP3.value === ""){
        objDeltaTP3.focus();
        fnGenMessage("Please Input Delta for Row 3 Legs Take Profit", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSellSelection && objDeltaSellSL.value === ""){
        objDeltaSellSL.focus();
        fnGenMessage("Please Input Delta for Sell Legs Stop Loss", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasBuySelection && objDeltaBuySL.value === ""){
        objDeltaBuySL.focus();
        fnGenMessage("Please Input Delta for Buy Legs Stop Loss", `badge bg-warning`, "spnGenMsg");
    }
    else if(vHasSelection3 && objDeltaSL3.value === ""){
        objDeltaSL3.focus();
        fnGenMessage("Please Input Delta for Row 3 Legs Stop Loss", `badge bg-warning`, "spnGenMsg");
    }
    else{
        // Validate all selected rows before execution.
        if(vHasSellSelection){
            let objVal1 = fnValidateDeltaRules(1, objSellAction.value, objNewDelta1.value, objReDelta1.value, objDeltaSellTP.value, objDeltaSellSL.value);
            if(!objVal1.ok){
                fnGenMessage(objVal1.msg, `badge bg-warning`, "spnGenMsg");
                return;
            }
        }
        if(vHasBuySelection){
            let objVal2 = fnValidateDeltaRules(2, objBuyAction.value, objNewDelta2.value, objReDelta2.value, objDeltaBuyTP.value, objDeltaBuySL.value);
            if(!objVal2.ok){
                fnGenMessage(objVal2.msg, `badge bg-warning`, "spnGenMsg");
                return;
            }
        }
        if(vHasSelection3){
            let objVal3 = fnValidateDeltaRules(3, objAction3.value, objNewDelta3.value, objReDelta3.value, objDeltaTP3.value, objDeltaSL3.value);
            if(!objVal3.ok){
                fnGenMessage(objVal3.msg, `badge bg-warning`, "spnGenMsg");
                return;
            }
        }
        fnCheckOptionLeg();
    }
}

async function fnCheckOptionLeg(){
    let objSellAction = document.getElementById("ddlAction1");
    let objSellLegSide = document.getElementById("ddlLegSide1");
    let objBuyAction = document.getElementById("ddlAction2");
    let objBuyLegSide = document.getElementById("ddlLegSide2");
    let objAction3 = document.getElementById("ddlAction3");
    let objLegSide3 = document.getElementById("ddlLegSide3");
    let vIsRecExists = false;
    let objBrokAmt = document.getElementById("txtBrok2Rec");

    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objSymbol = document.getElementById("ddlSymbols");
    let objLotSize = document.getElementById("txtLotSize");
    let objExpiryBuy = document.getElementById("txtExpiry2");
    let objExpirySell = document.getElementById("txtExpiry1");
    let objExpiry3 = document.getElementById("txtExpiry3");
    let objNewDelta1 = document.getElementById("txtNewDelta1");
    let objNewDelta2 = document.getElementById("txtNewDelta2");
    let objStartQty1 = document.getElementById("txtStartQty1");
    let objStartQty2 = document.getElementById("txtStartQty2");
    let objStartQty3 = document.getElementById("txtStartQty3");
    let objOrderType = document.getElementById("ddlOrderType");

    let objReDelta1 = document.getElementById("txtReDelta1");
    let objReDelta2 = document.getElementById("txtReDelta2");
    let objDeltaTP1 = document.getElementById("txtDeltaTP1");
    let objDeltaTP2 = document.getElementById("txtDeltaTP2");
    let objDeltaSL1 = document.getElementById("txtDeltaSL1");
    let objDeltaSL2 = document.getElementById("txtDeltaSL2");
    let objNewDelta3 = document.getElementById("txtNewDelta3");
    let objReDelta3 = document.getElementById("txtReDelta3");
    let objDeltaTP3 = document.getElementById("txtDeltaTP3");
    let objDeltaSL3 = document.getElementById("txtDeltaSL3");

    let vUndrAsst = objSymbol.value;
    let vBuyExpiry = fnSetDDMMYYYY(objExpiryBuy.value);
    let vSellExpiry = fnSetDDMMYYYY(objExpirySell.value);
    let vExpiry3 = fnSetDDMMYYYY(objExpiry3.value);
    let vExpiryNewPos = "";
    let vLotQty = 0;
    let vDeltaNPos, vDeltaRePos, vDeltaTP, vDeltaSL = 0.0;
    let objLegRequests = [];

    const fnPushLegs = (pSource, pAction, pLegSide) => {
        if(!pAction || pAction === "none"){
            return;
        }
        if(pLegSide === "both" || pLegSide === "ce"){
            objLegRequests.push({ Source : pSource, TransType : pAction, OptType : "C" });
        }
        if(pLegSide === "both" || pLegSide === "pe"){
            objLegRequests.push({ Source : pSource, TransType : pAction, OptType : "P" });
        }
    };

    fnPushLegs("sell", objSellAction ? objSellAction.value : "none", objSellLegSide ? objSellLegSide.value : "both");
    fnPushLegs("buy", objBuyAction ? objBuyAction.value : "none", objBuyLegSide ? objBuyLegSide.value : "both");
    fnPushLegs("row3", objAction3 ? objAction3.value : "none", objLegSide3 ? objLegSide3.value : "both");

    for(let k=0; k<objLegRequests.length; k++){
        let vTransType = objLegRequests[k]["TransType"];
        let vOptionType = objLegRequests[k]["OptType"];
        let vSource = objLegRequests[k]["Source"];
        let vTargetExpiry = (vSource === "sell") ? vSellExpiry : ((vSource === "buy") ? vBuyExpiry : vExpiry3);
        let vCfgRow = (vSource === "sell") ? 1 : ((vSource === "buy") ? 2 : 3);
        vIsRecExists = false;

        if(gCurrPosLS2FOLV.TradeData.length > 0){
            for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){

                if((gCurrPosLS2FOLV.TradeData[i].OptionType === vOptionType) && (gCurrPosLS2FOLV.TradeData[i].TransType === vTransType) && (gCurrPosLS2FOLV.TradeData[i].Status === "OPEN") && (gCurrPosLS2FOLV.TradeData[i].Expiry === vTargetExpiry)){
                    vIsRecExists = true;
                }
            }
        }
        if(vIsRecExists === false){
            if(vSource === "sell"){
                vExpiryNewPos = vSellExpiry;
                vLotQty = objStartQty1.value;
                vDeltaNPos = objNewDelta1.value;
                vDeltaRePos = objReDelta1.value;
                vDeltaTP = objDeltaTP1.value;
                vDeltaSL = objDeltaSL1.value;
            }
            else if(vSource === "buy"){
                vExpiryNewPos = vBuyExpiry;
                vLotQty = objStartQty2.value;
                vDeltaNPos = objNewDelta2.value;
                vDeltaRePos = objReDelta2.value;
                vDeltaTP = objDeltaTP2.value;
                vDeltaSL = objDeltaSL2.value;
            }
            else{
                vExpiryNewPos = vExpiry3;
                vLotQty = objStartQty3.value;
                vDeltaNPos = objNewDelta3.value;
                vDeltaRePos = objReDelta3.value;
                vDeltaTP = objDeltaTP3.value;
                vDeltaSL = objDeltaSL3.value;
            }

            let objTradeDtls = await fnExecOptionLeg(objApiKey.value, objApiSecret.value, objOrderType.value, vUndrAsst, vExpiryNewPos, vOptionType, vTransType, objLotSize.value, vLotQty, vDeltaNPos, vDeltaRePos, vDeltaTP, vDeltaSL);

                if(objTradeDtls.status === "success"){
                    let vDate = new Date();
                    let vMonth = vDate.getMonth() + 1;
                    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

                    let vTradeID = objTradeDtls.data.TradeID;
                    let vProductID = objTradeDtls.data.ProductID;
                    let vSymbol = objTradeDtls.data.Symbol;
                    let vUndrAstSymb = objTradeDtls.data.UndrAsstSymb;
                    let vCntrctType = objTradeDtls.data.ContType;
                    let vBuyOrSell = objTradeDtls.data.TransType;
                    let vCorP = objTradeDtls.data.OptionType;
                    let vStrPrice = parseInt(objTradeDtls.data.Strike);
                    let vExpiry = objTradeDtls.data.Expiry;
                    let vLotSize = objTradeDtls.data.LotSize;
                    let vLotQty = objTradeDtls.data.LotQty;
                    let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
                    let vBestSell = parseFloat(objTradeDtls.data.BestBid);
                    let vDelta = objTradeDtls.data.Delta;
                    let vDeltaC = parseFloat(objTradeDtls.data.DeltaC);
                    let vGamma = parseFloat(objTradeDtls.data.Gamma || 0);
                    let vGammaC = parseFloat(objTradeDtls.data.GammaC || objTradeDtls.data.Gamma || 0);
                    let vTheta = parseFloat(objTradeDtls.data.Theta || 0);
                    let vThetaC = parseFloat(objTradeDtls.data.ThetaC || objTradeDtls.data.Theta || 0);
                    let vVega = parseFloat(objTradeDtls.data.Vega || 0);
                    let vVegaC = parseFloat(objTradeDtls.data.VegaC || objTradeDtls.data.Vega || 0);
                    let vDeltaRePos = objTradeDtls.data.DeltaRePos;
                    let vDeltaTP = objTradeDtls.data.DeltaTP;
                    let vDeltaSL = objTradeDtls.data.DeltaSL;
                    let vOpenDTVal = vDate.valueOf();
                    gUpdPos = false;

                    let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : vGamma, GammaC : vGammaC, Theta : vTheta, ThetaC : vThetaC, Vega : vVega, VegaC : vVegaC, DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, CfgRow : vCfgRow, Status : "OPEN" };

                    gCurrPosLS2FOLV.TradeData.push(vExcTradeDtls);
                    let objExcTradeDtls = JSON.stringify(gCurrPosLS2FOLV);

                    localStorage.setItem("CurrPosLS2FOLV", objExcTradeDtls);

                    let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsLS2FOLV", JSON.stringify(gOtherFlds));

                    console.log("Trade Executed");
                    gUpdPos = true;
                    fnSetSymbolTickerList();
                    fnUpdateOpenPositions();
                }
                else{
                    fnGenMessage("Option Leg Open Failed: " + objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
                }
        }
        else{
            fnGenMessage("Same option side already open for selected expiry!", `badge bg-warning`, "spnGenMsg");
        }
    }
}

function fnExecOptionLeg(pApiKey, pSecret, pOrderType, pUndrAsst, pExpiry, pOptionType, pTransType, pLotSize, pLotQty, pDeltaPos, pDeltaRePos, pDeltaTP, pDeltaSL){
    const objPromise = new Promise((resolve, reject) => {
        let objTgCfg = fnGetTelegramConfig();
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pSecret,
            "UndAssetSymbol" : pUndrAsst,
            "Expiry" : pExpiry,
            "OptionType" : pOptionType,
            "TransType" : pTransType,
            "LotSize" : parseFloat(pLotSize),
            "LotQty" : parseFloat(pLotQty),
            "OrderType" : pOrderType,
            "DeltaPos" : pDeltaPos,
            "DeltaRePos" : pDeltaRePos,
            "DeltaTP" : pDeltaTP,
            "DeltaSL" : pDeltaSL,
            "TelegramBotToken" : objTgCfg.botToken,
            "TelegramChatId" : objTgCfg.chatId
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };
        fetch("/liveStrategy2fo/execOptionLeg", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                if(objResult.data === ""){
                    resolve({ "status": objResult.status, "message": objResult.message, "data": "" });
                }
                else if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    resolve({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": objResult.data });
                }
                else{
                    resolve({ "status": objResult.status, "message": objResult.data.response.body.error.code + " Contact Admin!", "data": objResult.data });
                }
            }
            else if(objResult.status === "warning"){
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            resolve({ "status": "danger", "message": "Error At Option Chain. Catch!", "data": "" });
        });
    });
    return objPromise;
}

function fnPreInitTrade(pOptionType, pTransType){
    let vIsRecExists = false;

    fnUpdateBuyExpiryMode();
    fnUpdateSellExpiryMode();

    if(gCurrPosLS2FOLV.TradeData.length > 0){
        for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
            if((gCurrPosLS2FOLV.TradeData[i].OptionType === pOptionType) && (gCurrPosLS2FOLV.TradeData[i].TransType === pTransType) && (gCurrPosLS2FOLV.TradeData[i].Status === "OPEN")){
                vIsRecExists = true;
            }
        }
    }

    if(vIsRecExists === false){
        fnInitTrade(pOptionType, pTransType);
    }
    else{
        fnGenMessage("Trade Message Received but Same Option Type is Already Open!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnGetManualCfgRow(){
    let objCfg = document.getElementById("ddlCfgRow");
    let vRow = parseInt(objCfg ? objCfg.value : "1");
    if(!Number.isFinite(vRow) || vRow < 1 || vRow > 3){
        vRow = 1;
    }
    return vRow;
}

function fnPreInitAutoTradeByCfgRow(pOptionType, pTransType){
    let vRow = fnGetManualCfgRow();
    fnPreInitAutoTrade(pOptionType, pTransType, vRow);
}

function fnGetCfgRowContext(pCfgRow){
    let vRow = parseInt(pCfgRow);
    if(!Number.isFinite(vRow) || vRow < 1 || vRow > 3){
        vRow = 1;
    }

    let objCtx = null;
    if(vRow === 1){
        fnUpdateSellExpiryMode();
        objCtx = {
            rowNo: 1,
            objExpiry: document.getElementById("txtExpiry1"),
            objQty: document.getElementById("txtStartQty1"),
            objNewDelta: document.getElementById("txtNewDelta1"),
            objReDelta: document.getElementById("txtReDelta1"),
            objTP: document.getElementById("txtDeltaTP1"),
            objSL: document.getElementById("txtDeltaSL1")
        };
    }
    else if(vRow === 2){
        fnUpdateBuyExpiryMode();
        objCtx = {
            rowNo: 2,
            objExpiry: document.getElementById("txtExpiry2"),
            objQty: document.getElementById("txtStartQty2"),
            objNewDelta: document.getElementById("txtNewDelta2"),
            objReDelta: document.getElementById("txtReDelta2"),
            objTP: document.getElementById("txtDeltaTP2"),
            objSL: document.getElementById("txtDeltaSL2")
        };
    }
    else{
        fnUpdateExpiryMode3();
        objCtx = {
            rowNo: 3,
            objExpiry: document.getElementById("txtExpiry3"),
            objQty: document.getElementById("txtStartQty3"),
            objNewDelta: document.getElementById("txtNewDelta3"),
            objReDelta: document.getElementById("txtReDelta3"),
            objTP: document.getElementById("txtDeltaTP3"),
            objSL: document.getElementById("txtDeltaSL3")
        };
    }

    return objCtx;
}

async function fnExecuteOptionRow1BySelections(pForcedQty = null){
    let objAction = document.getElementById("ddlAction1");
    let objLegSide = document.getElementById("ddlLegSide1");
    let objExpiry = document.getElementById("txtExpiry1");
    let objQty = document.getElementById("txtStartQty1");
    let objNewDelta = document.getElementById("txtNewDelta1");

    if(!objAction || !objLegSide || !objExpiry || !objQty || !objNewDelta){
        return;
    }
    if(objAction.value === "none"){
        return;
    }
    if(!objExpiry.value || !objQty.value || !objNewDelta.value){
        fnGenMessage("Row 1 option not executed. Please set Expiry/Qty/New D.", `badge bg-warning`, "spnGenMsg");
        return;
    }

    let vExecQty = Number(objQty.value);
    if(Number.isFinite(Number(pForcedQty)) && Number(pForcedQty) > 0){
        vExecQty = Math.max(1, Math.floor(Number(pForcedQty)));
        objQty.value = vExecQty;
    }
    if(!Number.isFinite(vExecQty) || vExecQty <= 0){
        fnGenMessage("Row 1 option not executed. Invalid Qty.", `badge bg-warning`, "spnGenMsg");
        return;
    }

    let objOptTypes = [];
    if(objLegSide.value === "both" || objLegSide.value === "ce"){
        objOptTypes.push("C");
    }
    if(objLegSide.value === "both" || objLegSide.value === "pe"){
        objOptTypes.push("P");
    }

    for(let i=0; i<objOptTypes.length; i++){
        await fnPreInitAutoTrade(objOptTypes[i], objAction.value, 1, vExecQty);
    }
}

function fnHasOpenFuturePosition(){
    if(!gCurrPosLS2FOLV || !Array.isArray(gCurrPosLS2FOLV.TradeData)){
        return false;
    }
    for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
        let objLeg = gCurrPosLS2FOLV.TradeData[i];
        if(objLeg.Status === "OPEN" && objLeg.OptionType === "F"){
            return true;
        }
    }
    return false;
}

function fnInitFutureRiskFields(objTrade){
    if(!objTrade){
        return;
    }

    let vSLPts = fnParsePositiveNumber(objTrade.StopLossPts ?? objTrade.PointsSL, 0);
    let vTPPts = fnParsePositiveNumber(objTrade.TakeProfitPts ?? objTrade.PointsTP, 0);
    let vTSLPts = Number(objTrade.TrailSLPts ?? 0);
    if(!Number.isFinite(vTSLPts) || vTSLPts < 0){
        vTSLPts = 0;
    }

    objTrade.StopLossPts = vSLPts;
    objTrade.TakeProfitPts = vTPPts;
    objTrade.TrailSLPts = vTSLPts;

    let vSellPrice = Number(objTrade.SellPrice);
    let vBuyPrice = Number(objTrade.BuyPrice);
    let vRef = objTrade.TransType === "sell" ? vSellPrice : vBuyPrice;
    if(!Number.isFinite(vRef) || vRef <= 0){
        vRef = Number.isFinite(vSellPrice) && vSellPrice > 0 ? vSellPrice : vBuyPrice;
    }
    if(!Number.isFinite(vRef) || vRef <= 0){
        return;
    }

    if(!Number.isFinite(Number(objTrade.AmtSL))){
        objTrade.AmtSL = objTrade.TransType === "sell"
            ? Number((vRef + vSLPts).toFixed(2))
            : Number((vRef - vSLPts).toFixed(2));
    }
    if(!Number.isFinite(Number(objTrade.AmtTP1))){
        objTrade.AmtTP1 = objTrade.TransType === "sell"
            ? Number((vRef - vTPPts).toFixed(2))
            : Number((vRef + vTPPts).toFixed(2));
    }

    let vTPAmt = Number(objTrade.TakeProfitAmt);
    objTrade.TakeProfitAmt = (Number.isFinite(vTPAmt) && vTPAmt > 0) ? vTPAmt : 0;

    if(vTSLPts > 0 && !Number.isFinite(Number(objTrade.TrailNextTrigger))){
        if(objTrade.TransType === "sell"){
            objTrade.TrailNextTrigger = Number((Number(objTrade.BuyPrice) - vTSLPts).toFixed(2));
        }
        else{
            objTrade.TrailNextTrigger = Number((Number(objTrade.SellPrice) + vTSLPts).toFixed(2));
        }
    }
}

function fnApplyFutureTrailingSL(objTrade, pCurrPrice){
    if(!objTrade){
        return;
    }
    let vTrailPts = Number(objTrade.TrailSLPts);
    let vTrigger = Number(objTrade.TrailNextTrigger);
    let vCurrSL = Number(objTrade.AmtSL);
    let vCurr = Number(pCurrPrice);
    if(!Number.isFinite(vTrailPts) || vTrailPts <= 0 || !Number.isFinite(vTrigger) || !Number.isFinite(vCurrSL) || !Number.isFinite(vCurr)){
        return;
    }

    if(objTrade.TransType === "buy"){
        while(vCurr >= vTrigger){
            vCurrSL += vTrailPts;
            vTrigger += vTrailPts;
        }
    }
    else if(objTrade.TransType === "sell"){
        while(vCurr <= vTrigger){
            vCurrSL -= vTrailPts;
            vTrigger -= vTrailPts;
        }
    }

    objTrade.AmtSL = Number(vCurrSL.toFixed(2));
    objTrade.TrailNextTrigger = Number(vTrigger.toFixed(2));
}

function fnShouldCloseFuturePosition(objTrade, pCurrPrice){
    if(!objTrade){
        return false;
    }

    let vCurr = Number(pCurrPrice);
    let vSL = Number(objTrade.AmtSL);
    let vTP1 = Number(objTrade.AmtTP1);
    let vTPAmt = Number(objTrade.TakeProfitAmt || 0);
    if(!Number.isFinite(vCurr) || !Number.isFinite(vSL) || !Number.isFinite(vTP1)){
        return false;
    }

    fnApplyFutureTrailingSL(objTrade, vCurr);
    vSL = Number(objTrade.AmtSL);

    let vStrikePrice = Number(objTrade.StrikePrice);
    let vLotSize = Number(objTrade.LotSize);
    let vQty = Number(objTrade.LotQty);
    let vBuy = Number(objTrade.BuyPrice);
    let vSell = Number(objTrade.SellPrice);
    let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuy, vSell, "F");
    let vPL = fnGetTradePL(vBuy, vSell, vLotSize, vQty, vCharges);

    if(objTrade.TransType === "buy"){
        if(vCurr <= vSL){
            return true;
        }
        if(vTPAmt > 0 && Number.isFinite(vPL) && vPL >= vTPAmt){
            return true;
        }
        if(vCurr >= vTP1){
            return true;
        }
    }
    else if(objTrade.TransType === "sell"){
        if(vCurr >= vSL){
            return true;
        }
        if(vTPAmt > 0 && Number.isFinite(vPL) && vPL >= vTPAmt){
            return true;
        }
        if(vCurr <= vTP1){
            return true;
        }
    }

    return false;
}

async function fnPreInitAutoTrade(pOptionType, pTransType, pCfgRow, pForcedQty = null){
    let vIsRecExists = false;
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objOrderType = document.getElementById("ddlOrderType");
    let objSymbol = document.getElementById("ddlSymbols");
    let objLotSize = document.getElementById("txtLotSize");

    let vCfgRow = parseInt(pCfgRow);
    if(!Number.isFinite(vCfgRow)){
        vCfgRow = (pTransType === "sell") ? 1 : 2;
    }
    let objCtx = fnGetCfgRowContext(vCfgRow);
    if(!objCtx || !objCtx.objExpiry || !objCtx.objQty || !objCtx.objNewDelta || !objCtx.objReDelta || !objCtx.objTP || !objCtx.objSL){
        fnGenMessage("Invalid row configuration controls.", `badge bg-danger`, "spnGenMsg");
        return;
    }

    let vExpiryNewPos = fnSetDDMMYYYY(objCtx.objExpiry.value);
    let vLotQty = objCtx.objQty.value;
    if(Number.isFinite(Number(pForcedQty)) && Number(pForcedQty) > 0){
        vLotQty = Math.max(1, Math.floor(Number(pForcedQty)));
    }
    let vDeltaNPos = objCtx.objNewDelta.value;
    let vDeltaRePos = objCtx.objReDelta.value;
    let vDeltaTP = objCtx.objTP.value;
    let vDeltaSL = objCtx.objSL.value;

    if(gCurrPosLS2FOLV.TradeData.length > 0){
        for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
            if((gCurrPosLS2FOLV.TradeData[i].OptionType === pOptionType) && (gCurrPosLS2FOLV.TradeData[i].TransType === pTransType) && (gCurrPosLS2FOLV.TradeData[i].Status === "OPEN") && (gCurrPosLS2FOLV.TradeData[i].Expiry === vExpiryNewPos)){
                vIsRecExists = true;
            }
        }
    }

    if(vIsRecExists === false){
        const bCycleStart = !(gCurrPosLS2FOLV && Array.isArray(gCurrPosLS2FOLV.TradeData) && gCurrPosLS2FOLV.TradeData.some(objLeg => objLeg.Status === "OPEN"));
        let vUndrAsst = objSymbol.value;

        let objTradeDtls = await fnExecOptionLeg(objApiKey.value, objApiSecret.value, objOrderType.value, vUndrAsst, vExpiryNewPos, pOptionType, pTransType, objLotSize.value, vLotQty, vDeltaNPos, vDeltaRePos, vDeltaTP, vDeltaSL);

        if(objTradeDtls.status === "success"){
            let vDate = new Date();
            let vMonth = vDate.getMonth() + 1;
            let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

            let vTradeID = objTradeDtls.data.TradeID;
            let vProductID = objTradeDtls.data.ProductID;
            let vSymbol = objTradeDtls.data.Symbol;
            let vUndrAstSymb = objTradeDtls.data.UndrAsstSymb;
            let vCntrctType = objTradeDtls.data.ContType;
            let vBuyOrSell = objTradeDtls.data.TransType;
            let vCorP = objTradeDtls.data.OptionType;
            let vStrPrice = parseInt(objTradeDtls.data.Strike);
            let vExpiry = objTradeDtls.data.Expiry;
            let vLotSize = objTradeDtls.data.LotSize;
            let vLotQty = objTradeDtls.data.LotQty;
            let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
            let vBestSell = parseFloat(objTradeDtls.data.BestBid);
            let vDelta = objTradeDtls.data.Delta;
            let vDeltaC = parseFloat(objTradeDtls.data.DeltaC);
            let vGamma = parseFloat(objTradeDtls.data.Gamma || 0);
            let vGammaC = parseFloat(objTradeDtls.data.GammaC || objTradeDtls.data.Gamma || 0);
            let vTheta = parseFloat(objTradeDtls.data.Theta || 0);
            let vThetaC = parseFloat(objTradeDtls.data.ThetaC || objTradeDtls.data.Theta || 0);
            let vVega = parseFloat(objTradeDtls.data.Vega || 0);
            let vVegaC = parseFloat(objTradeDtls.data.VegaC || objTradeDtls.data.Vega || 0);
            let vDeltaRePos = objTradeDtls.data.DeltaRePos;
            let vDeltaTP = objTradeDtls.data.DeltaTP;
            let vDeltaSL = objTradeDtls.data.DeltaSL;
            let vOpenDTVal = vDate.valueOf();
            gUpdPos = false;

            let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : vGamma, GammaC : vGammaC, Theta : vTheta, ThetaC : vThetaC, Vega : vVega, VegaC : vVegaC, DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, CfgRow : objCtx.rowNo, Status : "OPEN" };

            gCurrPosLS2FOLV.TradeData.push(vExcTradeDtls);
            let objExcTradeDtls = JSON.stringify(gCurrPosLS2FOLV);

            localStorage.setItem("CurrPosLS2FOLV", objExcTradeDtls);

            let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
            gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            localStorage.setItem("HidFldsLS2FOLV", JSON.stringify(gOtherFlds));
            if(bCycleStart){
                localStorage.setItem("LS2FO_CycleStartLossAmt", String(Number(gOtherFlds?.[0]?.Yet2RecvrAmt || 0)));
                localStorage.setItem("LS2FO_CycleStartQty", String(Math.max(1, Math.floor(Number(vLotQty) || 1))));
            }

            console.log("Trade Executed");
            fnSendTelegramRuntimeAlert(`LiveStrategy2FO\nOption Opened\nSymbol: ${vSymbol}\nSide: ${vBuyOrSell}\nQty: ${vLotQty}\nRow: ${objCtx.rowNo}\nTime: ${new Date().toLocaleString("en-GB")}`);

            gUpdPos = true;
            fnSetSymbolTickerList();
            fnUpdateOpenPositions();
        }
        else{
            fnGenMessage("Option Leg Open Failed: " + objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
        }
    }
}

async function fnPreInitAutoFutTrade(pOptionType, pTransType, pOptions = {}){
    if(fnHasOpenFuturePosition()){
        fnGenMessage("Futures position already open. Close it before opening a new one.", `badge bg-warning`, "spnGenMsg");
        return { status : "warning", message : "Futures position already open." };
    }

    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objOrderType = document.getElementById("ddlOrderType");
    let objSymbol = document.getElementById("ddlSymbols");
    let objLotSize = document.getElementById("txtLotSize");
    let objLotQty = document.getElementById("txtFutQty");

    let objPointsTP = document.getElementById("txtFutTP");
    let objPointsSL = document.getElementById("txtFutSL");
    let vPointsTSL = Number(gCurrFutStrats?.StratsData?.[0]?.PointsTSL ?? 0);
    if(!Number.isFinite(vPointsTSL) || vPointsTSL < 0){
        vPointsTSL = 0;
    }

    let vUndrAsst = objSymbol.value + "USD";

    let objTradeDtls = await fnExecFuturesLeg(objApiKey.value, objApiSecret.value, objOrderType.value, vUndrAsst, pOptionType, pTransType, objLotSize.value, objLotQty.value, objPointsTP.value, objPointsSL.value);

    if(objTradeDtls.status === "success"){
        const bCycleStart = !(gCurrPosLS2FOLV && Array.isArray(gCurrPosLS2FOLV.TradeData) && gCurrPosLS2FOLV.TradeData.some(objLeg => objLeg.Status === "OPEN"));
        let vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

        let vTradeID = objTradeDtls.data.TradeID;
        let vProductID = objTradeDtls.data.ProductID;
        let vSymbol = objTradeDtls.data.Symbol;
        let vUndrAstSymb = objTradeDtls.data.UndrAsstSymb;
        let vCntrctType = objTradeDtls.data.ContType;
        let vBuyOrSell = objTradeDtls.data.TransType;
        let vOptType = objTradeDtls.data.OptionType;
        let vStrPrice = parseInt(objTradeDtls.data.Strike);
        let vLotSize = objTradeDtls.data.LotSize;
        let vLotQty = objTradeDtls.data.LotQty;
        let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
        let vBestSell = parseFloat(objTradeDtls.data.BestBid);
        let vDelta = objTradeDtls.data.Delta;
        let vDeltaC = parseFloat(objTradeDtls.data.DeltaC);
        let vPointsTP = objTradeDtls.data.PointsTP;
        let vPointsSL = objTradeDtls.data.PointsSL;
        let vRateTP = objTradeDtls.data.RateTP;
        let vRateSL = objTradeDtls.data.RateSL;
        let vAmtSL = 0;
        let vAmtTP1 = 0;
        let vTrailNextTrigger = null;

        if(vBuyOrSell === "buy"){
            vAmtSL = Number((vBestBuy - Number(vPointsSL)).toFixed(2));
            vAmtTP1 = Number((vBestBuy + Number(vPointsTP)).toFixed(2));
            if(vPointsTSL > 0){
                vTrailNextTrigger = Number((vBestSell + vPointsTSL).toFixed(2));
            }
        }
        else if(vBuyOrSell === "sell"){
            vAmtSL = Number((vBestSell + Number(vPointsSL)).toFixed(2));
            vAmtTP1 = Number((vBestSell - Number(vPointsTP)).toFixed(2));
            if(vPointsTSL > 0){
                vTrailNextTrigger = Number((vBestBuy - vPointsTSL).toFixed(2));
            }
        }

        let vOpenDTVal = vDate.valueOf();
        gUpdPos = false;

        let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vOptType, StrikePrice : vStrPrice, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : 0, GammaC : 0, Theta : 0, ThetaC : 0, Vega : 0, VegaC : 0, PointsTP : vPointsTP, RateTP : vRateTP, PointsSL : vPointsSL, RateSL : vRateSL, StopLossPts : Number(vPointsSL), TakeProfitPts : Number(vPointsTP), TrailSLPts : vPointsTSL, TrailNextTrigger : vTrailNextTrigger, AmtSL : vAmtSL, AmtTP1 : vAmtTP1, TakeProfitAmt : 0, OpenDTVal : vOpenDTVal, Status : "OPEN" };
        fnInitFutureRiskFields(vExcTradeDtls);

        gCurrPosLS2FOLV.TradeData.push(vExcTradeDtls);
        let objExcTradeDtls = JSON.stringify(gCurrPosLS2FOLV);

        localStorage.setItem("CurrPosLS2FOLV", objExcTradeDtls);

        let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vOptType);
        gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

        localStorage.setItem("HidFldsLS2FOLV", JSON.stringify(gOtherFlds));

        if(bCycleStart){
            localStorage.setItem("LS2FO_CycleStartLossAmt", String(Number(gOtherFlds?.[0]?.Yet2RecvrAmt || 0)));
            localStorage.setItem("LS2FO_CycleStartQty", String(Math.max(1, Math.floor(Number(vLotQty) || 1))));
        }

        console.log("Trade Executed");
        fnSendTelegramRuntimeAlert(`LiveStrategy2FO\nFutures Opened\nSymbol: ${vSymbol}\nSide: ${vBuyOrSell}\nQty: ${vLotQty}\nOrderType: ${objOrderType.value}\nTime: ${new Date().toLocaleString("en-GB")}`);
        gUpdPos = true;
        fnSetSymbolTickerList();
        fnUpdateOpenPositions();
        let vExecutedFutQty = Number(vLotQty);
        if(!Number.isFinite(vExecutedFutQty) || vExecutedFutQty <= 0){
            vExecutedFutQty = Math.max(1, Math.floor(Number(objLotQty.value) || 1));
        }

        if(!(pOptions && pOptions.skipOptionRow1 === true)){
            await fnExecuteOptionRow1BySelections(vExecutedFutQty);
        }
        return { status : "success", message : "Futures executed.", filledQty : vExecutedFutQty, data : objTradeDtls.data };
    }
    fnGenMessage("Futures Leg Open Failed: " + objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
    return { status : objTradeDtls.status || "danger", message : objTradeDtls.message || "Futures execution failed." };
}

function fnExecFuturesLeg(pApiKey, pSecret, pOrderType, pUndrAsst, pOptionType, pTransType, pLotSize, pLotQty, pPointsTP, pPointsSL){
    const objPromise = new Promise((resolve, reject) => {
        let objTgCfg = fnGetTelegramConfig();
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pSecret,
            "UndAssetSymbol" : pUndrAsst,
            "OptionType" : pOptionType,
            "TransType" : pTransType,
            "LotSize" : parseFloat(pLotSize),
            "LotQty" : parseFloat(pLotQty),
            "OrderType" : pOrderType,
            "PointsTP" : pPointsTP,
            "PointsSL" : pPointsSL,
            "TelegramBotToken" : objTgCfg.botToken,
            "TelegramChatId" : objTgCfg.chatId
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };
        fetch("/liveStrategy2fo/execFutureLeg", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                if(objResult.data === ""){
                    resolve({ "status": objResult.status, "message": objResult.message, "data": "" });
                }
                else if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    resolve({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": objResult.data });
                }
                else{
                    resolve({ "status": objResult.status, "message": objResult.data.response.body.error.code + " Contact Admin!", "data": objResult.data });
                }
            }
            else if(objResult.status === "warning"){
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            resolve({ "status": "danger", "message": "Error At Option Chain. Catch!", "data": "" });
        });
    });
    return objPromise;
}

function fnPreInitTradeClose(pOptionType, pTransType){
    let vIsRecExists = false;
    let vLegID = 0;
    let vTransType = "";
    let vSymbol = "";
    let vState = "CLOSED";

    if(gCurrPosLS2FOLV.TradeData.length > 0){
        for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
            if((gCurrPosLS2FOLV.TradeData[i].OptionType === pOptionType) && (gCurrPosLS2FOLV.TradeData[i].TransType === pTransType) && (gCurrPosLS2FOLV.TradeData[i].Status === "OPEN")){
                vLegID = gCurrPosLS2FOLV.TradeData[i].TradeID;
                vTransType = gCurrPosLS2FOLV.TradeData[i].TransType;
                vSymbol = gCurrPosLS2FOLV.TradeData[i].Symbol;
                
                vIsRecExists = true;
            }
        }
    }
    //fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `CLOSED`);

    if(vIsRecExists === true){
        // console.log(vLegID);
        // console.log(vTransType);
        // console.log(pOptionType);
        // console.log(vSymbol);
        // console.log(vState);
        fnCloseOptPosition(vLegID, vTransType, pOptionType, vSymbol, vState);
    }
    else{
        fnGenMessage("Trade Message Received but Option is not Open!", `badge bg-warning`, "spnGenMsg");
    }
}

async function fnInitTrade(pOptionType, pTransType){
    // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntLS2FOLV"));
    // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntLS2FOLV"));

    let objApiKey1 = document.getElementById("txtUserAPIKey");
    let objApiSecret1 = document.getElementById("txtAPISecret");

    let objSymbol = document.getElementById("ddlSymbols");
    let objLotSize = document.getElementById("txtLotSize");
    let objBQty = document.getElementById("txtStartQty2");
    let objSQty = document.getElementById("txtStartQty1");
    let objExpiryBuy = document.getElementById("txtExpiry2");
    let objExpirySell = document.getElementById("txtExpiry1");
    let objOrderType = document.getElementById("ddlOrderType");

    let objStrategies = [];

    let vDate = new Date();
    let vOrdId = vDate.valueOf();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    let vExpiryNewPos = "";

    let vBuyExpiry = fnSetDDMMYYYY(objExpiryBuy.value);
    let vSellExpiry = fnSetDDMMYYYY(objExpirySell.value);

    if(pTransType === "sell"){
        vExpiryNewPos = vSellExpiry;
    }
    else if(pTransType === "buy"){
        vExpiryNewPos = vBuyExpiry;
    }

    //{ TransType : "sell", OptionType : "F", DeltaNew : 1.00, DeltaTP : 2.00, DeltaSL : 0.10 },
    
    if(pTransType === "sell"){
        objStrategies = { Strategies : [{ StratID : 1234324, StratName : "S-1", StratModel : [{ TransType : "sell", OptionType : "P", RateNew : 600, RateTP : 550, RateSL : 600, DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }, { TransType : "sell", OptionType : "C", RateNew : 600, RateTP : 550, RateSL : 600, DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }] }] }
    }
    else if(pTransType === "buy"){
        objStrategies = { Strategies : [{ StratID : 1234325, StratName : "S-1", StratModel : [{ TransType : "buy", OptionType : "P", RateNew : 900, RateTP : 1800, RateSL : 850, DeltaNew : 0.50, DeltaTP : 0.65, DeltaSL : 0.35 }, { TransType : "buy", OptionType : "C", RateNew : 900, RateTP : 1800, RateSL : 850, DeltaNew : 0.50, DeltaTP : 0.65, DeltaSL : 0.35 }] }] }
    }

    gUpdPos = false;

    for(let i=0; i<objStrategies.Strategies[0].StratModel.length; i++){
        let vApiKey = "";
        let vApiSecret = "";
        let vUndrAsst = objSymbol.value;
        let vOptionType = objStrategies.Strategies[0].StratModel[i].OptionType;
        let vTransType = objStrategies.Strategies[0].StratModel[i].TransType;
        let vDeltaNPos = objStrategies.Strategies[0].StratModel[i].DeltaNew;
        let vDeltaTP = objStrategies.Strategies[0].StratModel[i].DeltaTP;
        let vDeltaSL = objStrategies.Strategies[0].StratModel[i].DeltaSL;
        let vRateNPos = objStrategies.Strategies[0].StratModel[i].RateNew;
        let vRateTP = objStrategies.Strategies[0].StratModel[i].RateTP;
        let vRateSL = objStrategies.Strategies[0].StratModel[i].RateSL;
        let vClientID = vOrdId + i;

        vApiKey = objApiKey1.value;
        vApiSecret = objApiSecret1.value;
        let vQty = 0;

        if(pTransType === "buy"){
            vQty = objBQty.value;
        }
        else if(pTransType === "sell"){
            vQty = objSQty.value;
        }

        if(objStrategies.Strategies[0].StratModel[i].OptionType === pOptionType){
            let objTradeDtls = await fnExecOption(vApiKey, vApiSecret, vUndrAsst, vExpiryNewPos, vOptionType, vTransType, vRateNPos, vDeltaNPos, objOrderType.value, vQty, vClientID);
            if(objTradeDtls.status === "success"){
                // console.log(objTradeDtls);

                let vProductID = objTradeDtls.data.ProductID;
                let vSymbol = objTradeDtls.data.Symbol;
                let vUndrAstSymb = objTradeDtls.data.UndrAsstSymb;
                let vCntrctType = objTradeDtls.data.ContType;
                let vStrPrice = parseInt(objTradeDtls.data.Strike);
                let vExpiry = objTradeDtls.data.Expiry;
                let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
                let vBestSell = parseFloat(objTradeDtls.data.BestBid);
                let vDelta = parseFloat(objTradeDtls.data.Delta);
                let vVega = parseFloat(objTradeDtls.data.Vega);
                let vGamma = parseFloat(objTradeDtls.data.Gamma);
                let vRho = parseFloat(objTradeDtls.data.Rho);
                let vMarkIV = parseFloat(objTradeDtls.data.MarkIV);
                let vTheta = parseFloat(objTradeDtls.data.Theta);
                
                let vDeltaC = parseFloat(objTradeDtls.data.Delta);
                let vVegaC = parseFloat(objTradeDtls.data.Vega);
                let vGammaC = parseFloat(objTradeDtls.data.Gamma);
                let vRhoC = parseFloat(objTradeDtls.data.Rho);
                let vMarkIVC = parseFloat(objTradeDtls.data.MarkIV);
                let vThetaC = parseFloat(objTradeDtls.data.Theta);
                let vTradeSL = 0;
                let vTradeTP = 0;

                if(vTransType === "sell"){
                    vTradeSL = vBestSell + vRateSL;
                    vTradeTP = vBestSell - vRateTP;

                    // if(pOptionType === "C"){
                    //     objTrdCountCE = objTrdCountCE + 1;
                    //     localStorage.setItem("CETrdCntLS2FOLV", objTrdCountCE);
                    // }
                    // else if(pOptionType === "P"){
                    //     objTrdCountPE = objTrdCountPE + 1;
                    //     localStorage.setItem("PETrdCntLS2FOLV", objTrdCountPE);
                    // }
                }
                else if(vTransType === "buy"){
                    vTradeSL = vBestBuy - vRateSL;
                    vTradeTP = vBestBuy + vRateTP;
                }

                let vExcTradeDtls = { ClientOrderID : vClientID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vTransType, OptionType : vOptionType, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseInt(vQty), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, Vega : vVega, Gamma : vGamma, Rho : vRho, MarkIV : vMarkIV, Theta : vTheta, DeltaC : vDeltaC, VegaC : vVegaC, GammaC : vGammaC, RhoC : vRhoC, MarkIVC : vMarkIVC, ThetaC : vThetaC, OpenDTVal : vOrdId, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, DeltaNP : vDeltaNPos, TradeSL : vTradeSL, TradeTP : vTradeTP, Status : "OPEN" };
                
                gCurrPosLS2FOLV.TradeData.push(vExcTradeDtls);

                let objExcTradeDtls = JSON.stringify(gCurrPosLS2FOLV);

                localStorage.setItem("CurrPosLS2FOLV", objExcTradeDtls);

                gUpdPos = true;
                fnSetSymbolTickerList();
                fnUpdateOpenPositions();

                if(vTransType === "sell"){
                    fnChkOpenBuyPos(vOptionType);
                }
            }
            else if(objTradeDtls.status === "danger"){
                fnGenMessage(objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
            }
        }
        else if(objStrategies.Strategies[0].StratModel[i].OptionType === "F"){
            // console.log("Comming Soon....");
        }
        else{
            // console.log("No Option Type called " + pOptionType);
        }        
    }
}

function fnExecOption(pApiKey, pApiSecret, pUndAsst, pExpiry, pOptionType, pTransType, pRateNPos, pDeltaNPos, pOrderType, pQty, pClientID){
    const objPromise = new Promise((resolve, reject) => {
        let objTgCfg = fnGetTelegramConfig();

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "UndAssetSymbol" : pUndAsst,
            "Expiry" : pExpiry,
            "OptionType" : pOptionType,
            "TransType" : pTransType,
            "RateNPos" : pRateNPos,
            "DeltaNPos" : pDeltaNPos,
            "OrderType" : pOrderType,
            "LotQty" : pQty,
            "ClientID" : pClientID,
            "TelegramBotToken" : objTgCfg.botToken,
            "TelegramChatId" : objTgCfg.chatId
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        // resolve({ "status": "success", "message": "Success", "data": "" });

        fetch("/liveStrategy2fo/execOption", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                if(objResult.data === ""){
                    resolve({ "status": objResult.status, "message": objResult.message, "data": "" });
                }
                else if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    resolve({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": objResult.data });
                }
                else{
                    resolve({ "status": objResult.status, "message": objResult.data.response.body.error.code + " Contact Admin!", "data": objResult.data });
                }
            }
            else if(objResult.status === "warning"){
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            resolve({ "status": "danger", "message": "Error At Option Chain. Catch!", "data": "" });
        });
    });
    return objPromise;
}

function fnChkOpenBuyPos(pOptionType){
    let vRecExists = false;
    let vOptionType = "";

    if(pOptionType === "C"){
        vOptionType = "P";
    }
    else if(pOptionType === "P"){
        vOptionType = "C";
    }

    for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
        let vStatus = gCurrPosLS2FOLV.TradeData[i].Status;
        let vTransType = gCurrPosLS2FOLV.TradeData[i].TransType;
        let vExOptionType = gCurrPosLS2FOLV.TradeData[i].OptionType;

        if(vStatus === "OPEN" && vTransType === "buy" && vExOptionType === vOptionType){
            vRecExists = true;
        }
    }

    if(vRecExists === false){        
        fnInitTrade(vOptionType, "buy");
    }
}

//******** Display's Updated Open Positions *********//
function fnUpdateOpenPositions(){
    if(gUpdPos){
        let objCurrTradeList = document.getElementById("tBodyCurrTrades");
        // console.log(gCurrPosLS2FOLV);
        if(gCurrPosLS2FOLV.TradeData.length === 0){
            objCurrTradeList.innerHTML = '<tr><td colspan="16"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Running Trades Yet</div></td></tr>';
        }
        else{
            let vTempHtml = "";
            let vTotalTrades = 0;
            let vNetPL = 0;
            let vTotalCharges = 0;
            let vTotalCapital = 0;
            let vTotalDelta = 0;
            let vTotalDeltaC = 0;
            let vTotalGamma = 0;
            let vTotalGammaC = 0;
            let vTotalTheta = 0;
            let vTotalThetaC = 0;
            let vTotalVega = 0;
            let vTotalVegaC = 0;

            for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
                let vLegID = gCurrPosLS2FOLV.TradeData[i].TradeID;
                let vDelta = parseFloat(gCurrPosLS2FOLV.TradeData[i].Delta || 0);
                let vDeltaC = parseFloat(gCurrPosLS2FOLV.TradeData[i].DeltaC || gCurrPosLS2FOLV.TradeData[i].Delta || 0);
                let vGamma = parseFloat(gCurrPosLS2FOLV.TradeData[i].Gamma || 0);
                let vGammaC = parseFloat(gCurrPosLS2FOLV.TradeData[i].GammaC || gCurrPosLS2FOLV.TradeData[i].Gamma || 0);
                let vTheta = parseFloat(gCurrPosLS2FOLV.TradeData[i].Theta || 0);
                let vThetaC = parseFloat(gCurrPosLS2FOLV.TradeData[i].ThetaC || gCurrPosLS2FOLV.TradeData[i].Theta || 0);
                let vVega = parseFloat(gCurrPosLS2FOLV.TradeData[i].Vega || 0);
                let vVegaC = parseFloat(gCurrPosLS2FOLV.TradeData[i].VegaC || gCurrPosLS2FOLV.TradeData[i].Vega || 0);

                let vLotSize = gCurrPosLS2FOLV.TradeData[i].LotSize;
                let vQty = gCurrPosLS2FOLV.TradeData[i].LotQty;
                let vOpenDT = gCurrPosLS2FOLV.TradeData[i].OpenDT;
                let vCloseDT = gCurrPosLS2FOLV.TradeData[i].CloseDT;
                let vOptionType = gCurrPosLS2FOLV.TradeData[i].OptionType;
                let vProductID = gCurrPosLS2FOLV.TradeData[i].ProductID;
                let vBuyPrice = gCurrPosLS2FOLV.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosLS2FOLV.TradeData[i].SellPrice;
                let vStatus = gCurrPosLS2FOLV.TradeData[i].Status;
                let vStrikePrice = parseFloat(gCurrPosLS2FOLV.TradeData[i].StrikePrice);
                let vSymbol = gCurrPosLS2FOLV.TradeData[i].Symbol;
                let vTransType = gCurrPosLS2FOLV.TradeData[i].TransType;
                let vUndrAsstSymb = gCurrPosLS2FOLV.TradeData[i].UndrAsstSymb;

                let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionType);
                let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
                if(vStatus === "OPEN"){
                    vTotalTrades += 1;
                    vTotalCharges += parseFloat(vCharges);
                    vNetPL += parseFloat(vPL);
                    vTotalDelta += vDelta;
                    vTotalDeltaC += vDeltaC;
                    vTotalGamma += vGamma;
                    vTotalGammaC += vGammaC;
                    vTotalTheta += vTheta;
                    vTotalThetaC += vThetaC;
                    vTotalVega += vVega;
                    vTotalVegaC += vVegaC;
                }

                if(vCloseDT === undefined){
                    vCloseDT = "-";
                }

                if(vStatus === "OPEN"){
                    vTempHtml += '<tr>';
                    vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye" aria-hidden="true" style="color:green;" title="Close This Leg!" onclick="fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `CLOSED`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vGammaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGamma).toFixed(4) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vThetaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTheta).toFixed(4) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vVegaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVega).toFixed(4) + '</div></td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vSymbol + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vTransType + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vLotSize + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vQty + '</td>';
                    if(vTransType === "sell"){
                        vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap; color:white;text-align:right;"><span class="blink">' + (vBuyPrice).toFixed(2) + '</span></td>';
                        vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vSellPrice).toFixed(2) + '</td>';
                    }
                    else if(vTransType === "buy"){
                        vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vBuyPrice).toFixed(2) + '</td>';
                        vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap; color:white;text-align:right;"><span class="blink">' + (vSellPrice).toFixed(2) + '</span></td>';
                    }
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;color:#ff9a00;">'+ (vPL).toFixed(2) +'</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vOpenDT + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vCloseDT + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vStatus + '</td>';
                    vTempHtml += '</tr>';
                }
                else{
                    vTempHtml += '<tr>';
                    vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye-slash" aria-hidden="true" style="color:red;" title="Re-open This Leg!" onclick="fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `OPEN`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGammaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGamma).toFixed(4) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vThetaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTheta).toFixed(4) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVegaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVega).toFixed(4) + '</div></td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vSymbol + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vTransType + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vLotSize + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vQty + '</td>';
                    vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap;text-align:right; color:grey;">' + (vBuyPrice).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right; color:grey;">' + (vSellPrice).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">'+ (vPL).toFixed(2) +'</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vOpenDT + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vCloseDT + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:right;">' + vStatus + '</td>';
                    vTempHtml += '</tr>';
                }
            }
            vTempHtml += '<tr>';
            vTempHtml += '<td></td>';
            vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vTotalDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalDelta).toFixed(2) + '</div></td>';
            vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vTotalGammaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalGamma).toFixed(4) + '</div></td>';
            vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vTotalThetaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalTheta).toFixed(4) + '</div></td>';
            vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vTotalVegaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalVega).toFixed(4) + '</div></td>';
            vTempHtml += '<td></td><td></td><td></td><td></td><td></td><td></td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">'+ (vTotalCharges).toFixed(2) +'</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">'+ (vNetPL).toFixed(2) +'</td>';
            vTempHtml += '<td></td><td></td><td></td>';
            vTempHtml += '</tr>';
            objCurrTradeList.innerHTML = vTempHtml;
            gPL = vNetPL;
        }
        fnUpdatePayoffGraph();
        fnDispClosedPositions();
    }
}

function fnGetTradeDateTimeValMs(objLeg, pOpenOrClose = "open"){
    if(!objLeg){
        return 0;
    }

    const vRaw = pOpenOrClose === "close"
        ? (objLeg.CloseDTVal ?? objLeg.CloseDT)
        : (objLeg.OpenDTVal ?? objLeg.OpenDT);

    if(typeof vRaw === "number" && Number.isFinite(vRaw)){
        return vRaw;
    }

    const vDt = new Date(vRaw).getTime();
    return Number.isFinite(vDt) ? vDt : 0;
}

function fnGetTradeCapital(pTransType, pBuyPrice, pSellPrice, pLotSize, pQty){
    let vEntryPx = (pTransType === "buy") ? Number(pBuyPrice) : Number(pSellPrice);
    if(!Number.isFinite(vEntryPx) || vEntryPx <= 0){
        vEntryPx = Number(pBuyPrice) > 0 ? Number(pBuyPrice) : Number(pSellPrice);
    }
    let vCap = Number(vEntryPx) * Number(pLotSize) * Number(pQty);
    return Number.isFinite(vCap) ? vCap : 0;
}

function fnLoadTodayTrades(){
    let objTodayTradeList = document.getElementById("tBodyTodayPaperTrades");
    let objHeadPL = document.getElementById("tdHeadPL");
    if(!objTodayTradeList){
        return;
    }

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
        return;
    }

    const objMapClosedById = new Map();
    if(gClsdPosLS2FOLV && Array.isArray(gClsdPosLS2FOLV.TradeData)){
        for(let i=0; i<gClsdPosLS2FOLV.TradeData.length; i++){
            let objLeg = gClsdPosLS2FOLV.TradeData[i];
            if(objLeg && objLeg.TradeID !== undefined){
                objMapClosedById.set(String(objLeg.TradeID), objLeg);
            }
        }
    }
    if(gCurrPosLS2FOLV && Array.isArray(gCurrPosLS2FOLV.TradeData)){
        for(let i=0; i<gCurrPosLS2FOLV.TradeData.length; i++){
            let objLeg = gCurrPosLS2FOLV.TradeData[i];
            if(objLeg && objLeg.Status !== "OPEN" && objLeg.TradeID !== undefined){
                objMapClosedById.set(String(objLeg.TradeID), objLeg);
            }
        }
    }
    const objAllClosedRows = Array.from(objMapClosedById.values());
    objAllClosedRows.sort((a, b) => fnGetTradeDateTimeValMs(a, "open") - fnGetTradeDateTimeValMs(b, "open"));

    if(objAllClosedRows.length === 0){
        const vRow = document.createElement("tr");
        const vCell = document.createElement("td");
        vCell.colSpan = 11;
        vCell.style.textAlign = "center";
        vCell.style.fontWeight = "bold";
        vCell.textContent = "No Closed Trades Yet";
        vRow.appendChild(vCell);
        objTodayTradeList.appendChild(vRow);
        fnSetTextByPL(objHeadPL, 0);
        return;
    }

    let vTotalTrades = 0;
    let vNetProfit = 0;
    let vTotalCharges = 0;
    let vHighCapital = 0;
    let vHasRowsInRange = false;

    for(let i=0; i<objAllClosedRows.length; i++){
        let objLeg = objAllClosedRows[i];
        const vTradeMs = fnGetTradeDateTimeValMs(objLeg, "open");
        if(vTradeMs < vFromMs || vTradeMs > vToMs){
            continue;
        }
        vHasRowsInRange = true;

        let vSymbol = objLeg.Symbol || "-";
        let vTransType = objLeg.TransType || "-";
        let vOptionType = objLeg.OptionType || "";
        let vLotSize = parseFloat(objLeg.LotSize || 0);
        let vQty = parseFloat(objLeg.LotQty || 0);
        let vBuyPrice = parseFloat(objLeg.BuyPrice || 0);
        let vSellPrice = parseFloat(objLeg.SellPrice || 0);
        let vStrikePrice = parseFloat(objLeg.StrikePrice || 0);
        let vOpenDT = objLeg.OpenDT || "-";
        let vCloseDT = objLeg.CloseDT || "-";

        let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionType);
        let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
        let vCapital = fnGetTradeCapital(vTransType, vBuyPrice, vSellPrice, vLotSize, vQty);

        vTotalTrades += 1;
        vTotalCharges += parseFloat(vCharges);
        vNetProfit += parseFloat(vPL);
        if(vCapital > vHighCapital){
            vHighCapital = vCapital;
        }

        const vRow = document.createElement("tr");
        const vCells = [
            vOpenDT,
            vCloseDT,
            vSymbol,
            vTransType,
            vLotSize,
            vQty,
            Number(vBuyPrice).toFixed(2),
            Number(vSellPrice).toFixed(2),
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
}

function fnDispClosedPositions(){
    fnLoadTodayTrades();
}

function fnGetTradeCharges(pIndexPrice, pLotSize, pQty, pBuyPrice, pSellPrice, pOptionType){
    let vEffectiveBrokerage = 0;

    if(pOptionType === "F"){
        let vBuyBrokerage = ((pQty * pLotSize * pBuyPrice) * gFutureBrokerage) / 100;
        let vSellBrokerage = ((pQty * pLotSize * pSellPrice) * gFutureBrokerage) / 100;

        vEffectiveBrokerage = (vBuyBrokerage + vSellBrokerage) * 1.18;
    }
    else{
        let vNotionalFees = (((pQty * 2) * pLotSize * pIndexPrice) * gOptionBrokerage) / 100;

        let vBuyBrokerage = ((pQty * pLotSize * pBuyPrice) * 3.5) / 100;
        let vSellBrokerage = ((pQty * pLotSize * pSellPrice) * 3.5) / 100;
        let vPremiumCapFees = vSellBrokerage + vBuyBrokerage;


        if(vPremiumCapFees < vNotionalFees){
            vEffectiveBrokerage = vPremiumCapFees * 1.18;
        }
        else{
            vEffectiveBrokerage = vNotionalFees * 1.18;
        }
    }

    return vEffectiveBrokerage;
}

function fnGetTradePL(pBuyPrice, pSellPrice, pLotSize, pQty, pCharges){
    let vPL = ((pSellPrice - pBuyPrice) * pLotSize * pQty) - pCharges;

    return vPL;
}

async function fnCloseOptPosition(pLegID, pTransType, pOptionType, pSymbol, pStatus){
    let objOpenLeg = fnFindOpenLegByTradeId(pLegID);
    if(!objOpenLeg){
        return { status : "warning", message : "Open leg not found." };
    }

    let vQty = Math.max(1, Math.floor(Number(objOpenLeg.LotQty) || 1));
    let objRes = await fnRunClosePlanS2([{ tradeId : objOpenLeg.TradeID, closeQty : vQty, optionType : objOpenLeg.OptionType, symbol : objOpenLeg.Symbol }], "single-leg-close");
    if(objRes.status === "success" && gReLeg){
        let vReRow = gReLegCfgRow;
        gReLeg = false;
        gReLegCfgRow = 0;
        fnPreInitAutoTrade(pOptionType, pTransType, vReRow);
    }
    return objRes;
}

function fnGetBestRatesBySymbId(pApiKey, pApiSecret, pSymbol){
    const objPromise = new Promise((resolve, reject) => {

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({ ApiKey : pApiKey, ApiSecret : pApiSecret, Symbol : pSymbol });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/liveStrategy2fo/getBestRatesBySymb", requestOptions)
        .then(response => response.json())
        .then(objResult => {

            if(objResult.status === "success"){
                let vRes = JSON.parse(objResult.data);
                // console.log(vRes);
                // let objBestRates = { BestBuy : vRes.result.quotes.best_ask, BestSell : vRes.result.quotes.best_bid }

                // resolve({ "status": objResult.status, "message": objResult.message, "data": objBestRates });
                resolve({ "status": objResult.status, "message": objResult.message, "data": vRes });
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
            else{
                fnGenMessage("Error in Getting Best Rates Data, Contact Admin!", `badge bg-danger`, "spnGenMsg");
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            // fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error in Getting Option Best Rates...", "data": "" });
        });
    });

    return objPromise;
}

function fnOpenEditModel(pLegID, pLotSize, pQty, pBuyPrice, pSellPrice){
    let objLegID = document.getElementById("hidLegID");
    let objLotSize = document.getElementById("txtEdLotSize");
    let objQty = document.getElementById("txtEdQty");
    let objBuyPrice = document.getElementById("txtEdBuyPrice");
    let objSellPrice = document.getElementById("txtEdSellPrice");

    objLegID.value = pLegID;
    objLotSize.value = pLotSize;
    objQty.value = pQty;
    objBuyPrice.value = pBuyPrice;
    objSellPrice.value = pSellPrice;
    
    $('#mdlLegEditor').modal('show');
}

function fnUpdateOptionLeg(){
    gUpdPos = false;
    let objLegID = document.getElementById("hidLegID");
    let objLotSize = document.getElementById("txtEdLotSize");
    let objQty = document.getElementById("txtEdQty");
    let objBuyPrice = document.getElementById("txtEdBuyPrice");
    let objSellPrice = document.getElementById("txtEdSellPrice");

    if(objLotSize.value === ""){
        fnGenMessage("Please Enter Lot Size!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objQty.value === ""){
        fnGenMessage("Please Enter Quantity!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objBuyPrice.value === ""){
        fnGenMessage("Please Enter Buy Price!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objSellPrice.value === ""){
        fnGenMessage("Please Enter Sell Price!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        let vLegID = String(objLegID.value);
        let bUpdated = false;

        const fnUpdLeg = (objStore) => {
            if(!objStore || !Array.isArray(objStore.TradeData)){
                return false;
            }
            for(let i=0; i<objStore.TradeData.length; i++){
                if(String(objStore.TradeData[i].TradeID) === vLegID){
                    objStore.TradeData[i].LotSize = parseFloat(objLotSize.value);
                    objStore.TradeData[i].LotQty = parseInt(objQty.value);
                    objStore.TradeData[i].BuyPrice = parseFloat(objBuyPrice.value);
                    objStore.TradeData[i].SellPrice = parseFloat(objSellPrice.value);
                    return true;
                }
            }
            return false;
        };

        bUpdated = fnUpdLeg(gCurrPosLS2FOLV) || bUpdated;
        bUpdated = fnUpdLeg(gClsdPosLS2FOLV) || bUpdated;

        localStorage.setItem("CurrPosLS2FOLV", JSON.stringify(gCurrPosLS2FOLV));
        localStorage.setItem("ClsdPosLS2FOLV", JSON.stringify(gClsdPosLS2FOLV));

        if(bUpdated){
            fnLoadCurrentTradePos();
            fnGenMessage("Option Leg Updated!", `badge bg-success`, "spnGenMsg");
            $('#mdlLegEditor').modal('hide');
        }
        else{
            fnGenMessage("Leg not found for update!", `badge bg-warning`, "spnGenMsg");
        }
    }
    gUpdPos = true;
}

function fnDelLeg(pLegID){
    if(confirm("Are You Sure, You Want to Delete This Leg!")){
        gUpdPos = false;

        gSymbBRateList = {};
        gSymbSRateList = {};
        gSymbDeltaList = {};
        gSymbGammaList = {};
        gSymbThetaList = {};
        gSymbVegaList = {};
        // gSymbMarkIVList = {};
        // gSymbRhoList = {};

        let vLegID = String(pLegID);
        let vCurrLen = (gCurrPosLS2FOLV && Array.isArray(gCurrPosLS2FOLV.TradeData)) ? gCurrPosLS2FOLV.TradeData.length : 0;
        let vClsdLen = (gClsdPosLS2FOLV && Array.isArray(gClsdPosLS2FOLV.TradeData)) ? gClsdPosLS2FOLV.TradeData.length : 0;

        if(gCurrPosLS2FOLV && Array.isArray(gCurrPosLS2FOLV.TradeData)){
            gCurrPosLS2FOLV.TradeData = gCurrPosLS2FOLV.TradeData.filter(objLeg => String(objLeg.TradeID) !== vLegID);
        }
        if(gClsdPosLS2FOLV && Array.isArray(gClsdPosLS2FOLV.TradeData)){
            gClsdPosLS2FOLV.TradeData = gClsdPosLS2FOLV.TradeData.filter(objLeg => String(objLeg.TradeID) !== vLegID);
        }

        localStorage.setItem("CurrPosLS2FOLV", JSON.stringify(gCurrPosLS2FOLV));
        localStorage.setItem("ClsdPosLS2FOLV", JSON.stringify(gClsdPosLS2FOLV));

        let bDeleted = ((gCurrPosLS2FOLV.TradeData.length !== vCurrLen) || (gClsdPosLS2FOLV.TradeData.length !== vClsdLen));
        gUpdPos = true;

        if(bDeleted){
            fnSetSymbolTickerList();
            fnUpdateOpenPositions();
        }
        else{
            fnGenMessage("Leg not found for delete!", `badge bg-warning`, "spnGenMsg");
        }
    }
}


function fnClearLocalStorageTemp(){
    fnStopRenkoFeedWS();
    gRenkoPatternSeq = "";
    localStorage.removeItem("CurrPosLS2FOLV");
    localStorage.removeItem("ClsdPosLS2FOLV");
    localStorage.removeItem("NetLimitLS2FOLV");
    gCurrPosLS2FOLV = { TradeData : []};
    // localStorage.removeItem("FutStratLS2FOLV");
    // localStorage.removeItem("StrategyLS2FOLV");
    // localStorage.removeItem("StartQtyBuyLS2FOLV");
    localStorage.removeItem("CETrdCntLS2FOLV");
    localStorage.removeItem("PETrdCntLS2FOLV");
    localStorage.removeItem("LS2FO_LossRecM");
    localStorage.removeItem("LS2FO_MultiplierX");
    localStorage.removeItem("LS2FO_CycleStartLossAmt");
    localStorage.removeItem("LS2FO_CycleStartQty");

    // Reset totals shown in Manual Trader summary.
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objTotPnl = document.getElementById("txtYet2Recvr");
    let objNetPnl = document.getElementById("divNetPL");
    if(objBrokAmt){
        objBrokAmt.value = 0;
    }
    if(objTotPnl){
        objTotPnl.value = 0;
    }
    if(objNetPnl){
        objNetPnl.innerText = "0.00";
    }
    if(Array.isArray(gOtherFlds) && gOtherFlds[0]){
        gOtherFlds[0]["BrokerageAmt"] = 0;
        gOtherFlds[0]["Yet2RecvrAmt"] = 0;
        gOtherFlds[0]["LossRecPerct"] = 100;
        gOtherFlds[0]["MultiplierX"] = 1.0;
        localStorage.setItem("HidFldsLS2FOLV", JSON.stringify(gOtherFlds));
    }
    gLossRecPerct = 100;
    gMultiplierX = 1.0;
    let objLossRecv = document.getElementById("txtLossRecvPerct");
    if(objLossRecv){
        objLossRecv.value = gLossRecPerct;
    }
    let objMultiplierX = document.getElementById("txtMultiplierX");
    if(objMultiplierX){
        objMultiplierX.value = gMultiplierX;
    }
    gPL = 0;

    // fnGetAllStatus();
    console.log("Memory Cleared!!!");
}



//******************* WS Connection and Subscription Fully Updated Version ****************//
function fnConnectDFL(){
    let objSub = document.getElementById("spnSub");
    let vUrl = "wss://socket.india.delta.exchange";
    obj_WS_DFL = new WebSocket(vUrl);

    obj_WS_DFL.onopen = function (){
        fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
        // console.log("WS is Open!");
    }
    obj_WS_DFL.onerror = function (){
        setTimeout(fnSubscribeDFL, 3000);
        console.log("WS Error, Trying to Reconnect.....");
    }
    obj_WS_DFL.onclose = function (){
        if(gForceCloseDFL){
            gForceCloseDFL = false;
            // console.log("WS Disconnected & Closed!!!!!!");
            objSub.className = "badge rounded-pill text-bg-success";
            fnGenMessage("Streaming Stopped & Disconnected!", `badge bg-warning`, "spnGenMsg");
        }
        else{
            fnSubscribeDFL();
            // console.log("Restarting WS....");
        }
    }
    obj_WS_DFL.onmessage = function (pMsg){
        let vTicData = JSON.parse(pMsg.data);

        switch (vTicData.type){
            case "v2/ticker":
                fnUpdateRates(vTicData);
                break;
            case "subscriptions":

                fnGenMessage("Streaming Subscribed and Started!", `badge bg-success`, "spnGenMsg");
                // console.log("Subscribed!!!!!!!");
                objSub.className = "badge rounded-pill text-bg-success blink";
                break;
            case "unsubscribed":

                fnGenMessage("Streaming Unsubscribed!", `badge bg-warning`, "spnGenMsg");
                // console.log("UnSubscribed!!!!!!");
                objSub.className = "badge rounded-pill text-bg-success";
                break;
        }       
    }
}

function fnUpdateRates(pTicData){
    // console.log(pTicData.spot_price);
    gSymbBRateList[pTicData.symbol] = pTicData.quotes.best_ask;
    gSymbSRateList[pTicData.symbol] = pTicData.quotes.best_bid;

    if(pTicData.contract_type !== "perpetual_futures"){
        gSymbDeltaList[pTicData.symbol] = pTicData.greeks.delta;
        gSymbGammaList[pTicData.symbol] = pTicData.greeks.gamma;
        gSymbThetaList[pTicData.symbol] = pTicData.greeks.theta;
        gSymbVegaList[pTicData.symbol] = pTicData.greeks.vega;
        gSpotPrice = pTicData.spot_price;
        // gSymbMarkIVList[pTicData.symbol] = pTicData.quotes.mark_iv;
        // gSymbRhoList[pTicData.symbol] = pTicData.greeks.rho;
    }

    let vNow = Date.now();
    if(vNow - gPayoffGraphRenderTs >= 400){
        gPayoffGraphRenderTs = vNow;
        fnUpdatePayoffGraph();
    }
}

function fnSubscribeDFL(){
    if(obj_WS_DFL === null){
        fnConnectDFL();
        setTimeout(fnSubscribeDFL, 3000);
        // console.log("Connecting WS.....");
    }
    else{
        const vTimer = setInterval(() => {
            if(obj_WS_DFL.readyState === 1){
                clearInterval(vTimer);
                //Write Subscription code here
                let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": gSubList }]}};

                obj_WS_DFL.send(JSON.stringify(vSendData));
                // console.log("Subscribing............");
            }
            else{
                // console.log("Trying to Reconnect...");
                fnConnectDFL();
            }
        }, 3000);
    }
}

function fnUnSubscribeDFL(){
    if(obj_WS_DFL === null){
        fnConnectDFL();
        setTimeout(fnUnSubscribeDFL, 3000);
        // console.log("Already Disconnected, Connecting WS to Unsub.....");
    }
    else{
        const vTimer = setInterval(() => {
            if(obj_WS_DFL.readyState === 1){
                clearInterval(vTimer);
                let vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker" }]}};

                obj_WS_DFL.send(JSON.stringify(vSendData));
                // console.log("UnSubscribing........!!!!!");
            }
            else{
                // console.log("Trying to Reconnect...");
                fnConnectDFL();
            }
        }, 3000);
    }
}

function fnRestartConnDFL(){
    if(obj_WS_DFL !== null){
        obj_WS_DFL.close();
    }
    else{
        // console.log("WS already Disconnected and Reconnecting Now......");       
        fnSubscribeDFL();
    }
}

function fnForceDisconnectDFL(){
    if(obj_WS_DFL !== null){
        gForceCloseDFL = true;
        obj_WS_DFL.close();
    }
    else{
        // console.log("WS already Disconnected!!!!!!");        
    }
}

function fnCheckStatusOSD(){
    console.log(obj_WS_DFL);    
}

function fnAdd2SubList(){
    let objSymbol = document.getElementById("txtRateTest");

    gSubList.push(objSymbol.value);
    console.log(gSubList);
    fnUnSubscribeDFL();
    fnSubscribeDFL();
}

function checkTimeForAlert() {
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour >= 17) {
    alert("It is after 5 PM!");
  }
}
//******************* WS Connection and Subscription Fully Updated Version ****************//

//********** Indicators Sections *************//

//********** Indicators Sections *************//

//********* Delta Experiment ***********//

function fnLoadAllExpiryDate(){
    let objExpiryDay = document.getElementById("txtDayExpiry");
    let objExpiryWeek = document.getElementById("txtWeekExpiry");
    let objExpiryMonth = document.getElementById("txtMonthExpiry");
    let objExpirySell = document.getElementById("txtExpiry1");

    let vCurrDate = new Date();
    let vCurrFriday = new Date(vCurrDate);
    let vYear = vCurrDate.getFullYear();
    let vMonth = vCurrDate.getMonth();
    let vLastDayOfMonth = new Date(vYear, vMonth + 1, 0);
    let vLastDayOfNextMonth = new Date(vYear, vMonth + 2, 0);

    //************** Daily Expiry ***************//
    let vCurrHour = vCurrDate.getHours();

    if(vCurrHour >= 16){
        vCurrDate.setDate(vCurrDate.getDate() + 2);
    }
    else if(vCurrHour >= 0){
        vCurrDate.setDate(vCurrDate.getDate() + 1);
    }

    let vDayD = (vCurrDate.getDate()).toString().padStart(2, "0");
    let vMonthD = (vCurrDate.getMonth() + 1).toString().padStart(2, "0");
    let vExpValD = vCurrDate.getFullYear() + "-" + vMonthD + "-" + vDayD;

    objExpiryDay.value = vExpValD;
    //************** Daily Expiry ***************//

    //************** Weekly Expiry ***************//
    let vCurrDayOfWeek = vCurrDate.getDay();
    let vDaysUntilFriday = 5 - vCurrDayOfWeek;

    if(vCurrDayOfWeek > 3){
        vCurrFriday.setDate(vCurrDate.getDate() + vDaysUntilFriday + 7);
    }
    else{
        vCurrFriday.setDate(vCurrDate.getDate() + vDaysUntilFriday);
    }
    let vDayW = (vCurrFriday.getDate()).toString().padStart(2, "0");
    let vMonthW = (vCurrFriday.getMonth() + 1).toString().padStart(2, "0");
    let vExpValW = vCurrFriday.getFullYear() + "-" + vMonthW + "-" + vDayW;

    objExpiryWeek.value = vExpValW;
    //************** Weekly Expiry ***************//

    //************** Monthly Expiry ***************//
    while (vLastDayOfMonth.getDay() !== 5) { 
        vLastDayOfMonth.setDate(vLastDayOfMonth.getDate() - 1);
    }
    while (vLastDayOfNextMonth.getDay() !== 5) { 
        vLastDayOfNextMonth.setDate(vLastDayOfNextMonth.getDate() - 1);
    }

    let vCurrDay = vCurrDate.getDate();
    let vDayM = (vLastDayOfMonth.getDate()).toString().padStart(2, "0");
    let vMonthM = (vLastDayOfMonth.getMonth() + 1).toString().padStart(2, "0");
    let vExpValM = vLastDayOfMonth.getFullYear() + "-" + vMonthM + "-" + vDayM;

    if(vCurrDay > 17){
        vDay = (vLastDayOfNextMonth.getDate()).toString().padStart(2, "0");
        vMonth = (vLastDayOfNextMonth.getMonth() + 1).toString().padStart(2, "0");
        vExpValM = vLastDayOfNextMonth.getFullYear() + "-" + vMonth + "-" + vDay;
    }

    objExpiryMonth.value = vExpValM;
    objExpirySell.value = vExpValM;
    //************** Monthly Expiry ***************//
}

function fnGetDelta(){
    fnLoadAllExpiryDate();
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objDayExpiry = document.getElementById("txtDayExpiry");
    let objWeekExpiry = document.getElementById("txtWeekExpiry");
    let objMonthExpiry = document.getElementById("txtMonthExpiry");
    let vDayExpiry = fnSetDDMMYYYY(objDayExpiry.value);
    let vWeekExpiry = fnSetDDMMYYYY(objWeekExpiry.value);
    let vMonthExpiry = fnSetDDMMYYYY(objMonthExpiry.value);

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, UndAssetSymbol : "BTC", DayExpiry : vDayExpiry, WeekExpiry : vWeekExpiry, MonthExpiry : vMonthExpiry });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/liveStrategy2fo/getOptChnSDKByAstOptTypExp", requestOptions)
    .then(response => response.json())
    .then(objResult => {

        if(objResult.status === "success"){
            // console.log(objResult);
            const vDate = new Date();
            let vMonth = vDate.getMonth() + 1;
            let vNow = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

            let vCallTotal = objResult.data.DayCall + objResult.data.WeekCall + objResult.data.MonthCall;
            let vPutTotal = objResult.data.DayPut + objResult.data.WeekPut + objResult.data.MonthPut;
            let vDayDirec = "";
            let vWeekDirec = "";
            let vMonthDirec = "";
            let vTotalDirec = "";

            if(objResult.data.DayPut > objResult.data.DayCall){
                vDayDirec = "UP";
            }
            else{
                vDayDirec = "DOWN";
            }

            if(objResult.data.WeekPut > objResult.data.WeekCall){
                vWeekDirec = "UP";
            }
            else{
                vWeekDirec = "DOWN";
            }

            if(objResult.data.MonthPut > objResult.data.MonthCall){
                vMonthDirec = "UP";
            }
            else{
                vMonthDirec = "DOWN";
            }

            if(vPutTotal > vCallTotal){
                vTotalDirec = "UP";
            }
            else{
                vTotalDirec = "DOWN";
            }

            gObjDeltaDirec.push({ Dated : vNow, DayCall : objResult.data.DayCall, DayPut : objResult.data.DayPut, DayDirec : vDayDirec, WeekCall : objResult.data.WeekCall, WeekPut : objResult.data.WeekPut, WeekDirec : vWeekDirec, MonthCall : objResult.data.MonthCall, MonthPut : objResult.data.MonthPut, MonthDirec : vMonthDirec, OADirec : vTotalDirec });

            let objDataStr = JSON.stringify(gObjDeltaDirec);

            localStorage.setItem("IndDeltasDFL", objDataStr);
            fnDisplayDeltaDirec();
            
            // resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){

                fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                // reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                // reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            // reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
        }
        else{
            fnGenMessage("Error in Getting Best Rates Data, Contact Admin!", `badge bg-danger`, "spnGenMsg");
            // reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
        }
    })
    .catch(error => {
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
        // reject({ "status": "danger", "message": "Error in Getting Fut Best Rates...", "data": "" });
    });
}

function fnDisplayDeltaDirec(){
    let objDispDeltas = document.getElementById("tBodyDeltas");
    let objDeltas = JSON.parse(localStorage.getItem("IndDeltasDFL"));

    if (objDeltas === null){
        objDispDeltas.innerHTML = '<tr><td colspan="11"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Deltas Yet</div></td></tr>';
    }
    else{
        let vTempHtml = "";

        for (let i = 0; i < objDeltas.length; i++){
            let vDated = objDeltas[i].Dated;
            let vDayCall = objDeltas[i].DayCall;
            let vDayPut = objDeltas[i].DayPut;
            let vDirecDay = objDeltas[i].DayDirec;
            let vWeekCall = objDeltas[i].WeekCall;
            let vWeekPut = objDeltas[i].WeekPut;
            let vDirecWeek = objDeltas[i].WeekDirec;
            let vMonthCall = objDeltas[i].MonthCall;
            let vMonthPut = objDeltas[i].MonthPut;
            let vDirecMonth = objDeltas[i].MonthDirec;
            let vDirecOA = objDeltas[i].OADirec;

            vTempHtml += '<tr>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vDated + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vDayCall).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vDayPut).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vDirecDay + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vWeekCall).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vWeekPut).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vDirecWeek + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vMonthCall).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vMonthPut).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vDirecMonth + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vDirecOA + '</td>';
            vTempHtml += '</tr>';
        }
        objDispDeltas.innerHTML = vTempHtml;
    }

    // console.log("Delta Directions");
    // console.log(objDeltas);
}






