
let obj_WS_DFL = null;
let gSubList = [];
let gMinReqMargin = 5.00;
let gQtyBuyMultiplierM = 0;
let gQtySellMultiplierM = 0;
let gObjDeltaDirec = [];
let gCurrPosDSS3FO = { TradeData : []};
let gClsdPosDSS3FO = { TradeData : []};
let gTradeInst, gTodayClsOpt = 0;
let gFastStratInst = 0;
let gFetchedLivePosRows = [];
let gKillSwitchMode = false;
let gLastMarginSyncKey = "";
let gLastClosedHistSyncKey = "";
let gExchangeClosedOrderRows = [];
let gClosedHistoryLoaded = false;
let gLastAuthErrKey = "";
let gLastAuthErrTs = 0;
let gTelegramHeartbeatTimer = null;
let gAppConnDown = false;
let gAppConnDownSince = 0;
let gAppConnDownReason = "";
let gLastTgErrAlertKey = "";
let gLastTgErrAlertTs = 0;
let gLastTgConnAlertTs = 0;
let gFnGenMessageWrapped = false;

let gUpdPos = true;
let gSymbBRateList = {};
let gSymbSRateList = {};
let gSymbDeltaList = {};
let gSymbGammaList = {};
let gSymbThetaList = {};
let gSymbVegaList = {};
let gSymbMarkIVList = {};
let gSpotPrice = 0;
let gPL = 0;
let gPayoffGraphLastData = null;
let gPayoffGraphRenderTs = 0;

// let gSymbMarkIVList = {};
// let gSymbRhoList = {};

let gForceCloseDFL = false;
let gOptionBrokerage = 0.01;
let gFutureBrokerage = 0.05;
const gVegaBaseLots = 1000;
let gReLeg = false;
let gClsBuyLeg = false;
let gSaveUpdBusy = false;
let gDeltaNtrlBusy = false;
let gDeltaNtrlLastActionTs = 0;
let gVegaAdjBusy = false;
let gVegaAdjLastActionTs = 0;
let gVegaAdjHourBucket = "";
let gVegaAdjHourCount = 0;
let gVegaCalStrat = {
    active: false,
    optionType: "P",
    longExpiry: "",
    shortExpiry: "",
    initialExposureVega: 0,
    shortUnitVega: 0,
    initialNetDebit: 0,
    initialMargin: 0,
    maxTheoProfit: 0,
    ivHistory: [],
    lastRiskTs: 0
};
const gVegaCalStateLsKey = "VegaCalStateDSS3FO";
const gVegaCalPausedLsKey = "VegaCalPausedStateDSS3FO";
let gCurrStrats = { StratsData : [{StratID : 1, NewSellCE : false, NewSellPE : true, StartSellQty : 1000, NewSellDelta : 0.17, ReSellDelta : 0.17, SellDeltaTP : 0.09, SellDeltaSL : 0.30, NewBuyCE : false, NewBuyPE : false, StartBuyQty : 1, NewBuyDelta : 0.33, ReBuyDelta : 0.33, BuyDeltaTP : 2.0, BuyDeltaSL : 0.0 }]};
let gCurrFutStrats = { StratsData : [{StratID : 11, StartFutQty : 100, PointsSL : 100, PointsTP : 200 }]};
let gOtherFlds = [{ SwtActiveMsgs : false, BrokerageAmt : 0, SwtBrokRec : false, BrokX4Profit : 2, ReLegBrok : false, ReLegSell : true, ReLegBuy : false, SwtVegaAdj : false, VegaMinusPM : 0.20, VegaPlusPM : 0.20, EntryGammaBufPct : 10, AutoTolLower : 0.20, AutoTolUpper : 0.20 }];

function fnGetDefaultVegaCalState(){
    return {
        active: false,
        optionType: "P",
        longExpiry: "",
        shortExpiry: "",
        initialExposureVega: 0,
        shortUnitVega: 0,
        initialNetDebit: 0,
        initialMargin: 0,
        maxTheoProfit: 0,
        ivHistory: [],
        lastRiskTs: 0
    };
}

function fnSaveVegaCalState(){
    try{
        const objState = {
            active: !!gVegaCalStrat.active,
            optionType: String(gVegaCalStrat.optionType || "P"),
            longExpiry: String(gVegaCalStrat.longExpiry || ""),
            shortExpiry: String(gVegaCalStrat.shortExpiry || ""),
            initialExposureVega: Number(gVegaCalStrat.initialExposureVega || 0),
            shortUnitVega: Number(gVegaCalStrat.shortUnitVega || 0),
            initialNetDebit: Number(gVegaCalStrat.initialNetDebit || 0),
            initialMargin: Number(gVegaCalStrat.initialMargin || 0),
            maxTheoProfit: Number(gVegaCalStrat.maxTheoProfit || 0),
            ivHistory: Array.isArray(gVegaCalStrat.ivHistory) ? gVegaCalStrat.ivHistory.filter(v => Number.isFinite(v)).slice(-500) : [],
            lastRiskTs: Number(gVegaCalStrat.lastRiskTs || 0)
        };
        localStorage.setItem(gVegaCalStateLsKey, JSON.stringify(objState));
    }
    catch(objErr){
        // no-op
    }
}

function fnHasOpenAutoVegaLegs(){
    if(!gCurrPosDSS3FO || !Array.isArray(gCurrPosDSS3FO.TradeData)){
        return false;
    }
    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        const objLeg = gCurrPosDSS3FO.TradeData[i];
        if(objLeg && objLeg.Status === "OPEN" && (objLeg.StrategyRole === "LONG_TERM" || objLeg.StrategyRole === "SHORT_TERM")){
            return true;
        }
    }
    return false;
}

function fnPauseAutoVegaForManual(pNotify){
    if(!gVegaCalStrat.active){
        return false;
    }
    try{
        const objPaused = {
            ...gVegaCalStrat,
            active: true
        };
        localStorage.setItem(gVegaCalPausedLsKey, JSON.stringify(objPaused));
    }
    catch(objErr){
        // no-op
    }
    gVegaCalStrat.active = false;
    fnSaveVegaCalState();
    if(pNotify){
        fnGenMessage("Manual Vega override is ON. Auto Vega strategy paused.", `badge bg-warning`, "spnGenMsg");
    }
    return true;
}

function fnRestoreAutoVegaAfterManual(pNotify){
    let objPaused = null;
    try{
        objPaused = JSON.parse(localStorage.getItem(gVegaCalPausedLsKey));
    }
    catch(objErr){
        objPaused = null;
    }
    if(!objPaused || typeof objPaused !== "object" || objPaused.active !== true){
        return false;
    }
    if(!fnHasOpenAutoVegaLegs()){
        localStorage.removeItem(gVegaCalPausedLsKey);
        return false;
    }

    gVegaCalStrat = {
        ...fnGetDefaultVegaCalState(),
        ...objPaused,
        active: true
    };
    fnSaveVegaCalState();
    localStorage.removeItem(gVegaCalPausedLsKey);
    if(pNotify){
        fnGenMessage("Manual Vega override is OFF. Auto Vega strategy restored.", `badge bg-success`, "spnGenMsg");
    }
    return true;
}

function fnLoadVegaCalState(){
    try{
        const objRaw = JSON.parse(localStorage.getItem(gVegaCalStateLsKey));
        if(!objRaw || typeof objRaw !== "object"){
            gVegaCalStrat = fnGetDefaultVegaCalState();
            return;
        }
        gVegaCalStrat = {
            ...fnGetDefaultVegaCalState(),
            ...objRaw
        };
        gVegaCalStrat.active = !!gVegaCalStrat.active;
        gVegaCalStrat.optionType = (gVegaCalStrat.optionType === "C") ? "C" : "P";
        gVegaCalStrat.ivHistory = Array.isArray(gVegaCalStrat.ivHistory) ? gVegaCalStrat.ivHistory.filter(v => Number.isFinite(v)).slice(-500) : [];

        if(gOtherFlds && gOtherFlds[0] && gOtherFlds[0]["SwtVegaAdj"] === true){
            fnPauseAutoVegaForManual(false);
            return;
        }

        if(gVegaCalStrat.active){
            let bHasAutoLeg = fnHasOpenAutoVegaLegs();
            if(!bHasAutoLeg){
                gVegaCalStrat.active = false;
                fnSaveVegaCalState();
            }
            else{
                fnGenMessage("Auto Vega strategy state restored after refresh.", "badge bg-info", "spnGenMsg");
            }
        }
    }
    catch(objErr){
        gVegaCalStrat = fnGetDefaultVegaCalState();
    }
}

window.addEventListener("DOMContentLoaded", function(){
    fnInitClosedPosDateTimeFilters();
    fnInitOrderTypeSetting();
    fnInitRuntimeTelegramWatchers();
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
    //     fnCallTradeSide();
    // });

    socket.on("refreshAllDFL", () => {
        document.location.reload();
    });

    socket.on("tv-Msg-SSDemo-Open", (pMsg) => {
        let isLsAutoTrader = localStorage.getItem("isAutoTraderDSS3FO");
        let vTraderStatus = localStorage.getItem("lsLoginValidDSS3FO");
        let vCallSide = localStorage.getItem("CallSideSwtDSS3FO");
        let vPutSide = localStorage.getItem("PutSideSwtDSS3FO");
        let objSwtActiveMsgs = document.getElementById("swtActiveMsgs");
        let objMsg = (pMsg);

        // fnChangeSymbol(objMsg.symbolName);

        if(vTraderStatus !== "true"){
            fnGenMessage("Trade signal ignored because Trader is disconnected.", "badge bg-warning", "spnGenMsg");
        }
        else if(isLsAutoTrader !== "true"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
            if((objSwtActiveMsgs.checked) && ((vCallSide === "false") && (objMsg.OptionType === "C") && (objMsg.TransType === "sell") || (vCallSide === "true") && (objMsg.OptionType === "C") && (objMsg.TransType === "buy") || (vPutSide === "false") && (objMsg.OptionType === "P") && (objMsg.TransType === "buy") || (vPutSide === "true") && (objMsg.OptionType === "P") && (objMsg.TransType === "sell"))){
                fnPreInitAutoTrade(objMsg.OptionType, objMsg.TransType);
            }
            else{
                fnGenMessage("Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
            }
        }
    });

    socket.on("tv-Msg-SSDemo-Close", (pMsg) => {
        let objSwtActiveMsgs = document.getElementById("swtActiveMsgs");
        let objMsg = (pMsg);

        if(objSwtActiveMsgs.checked){
            fnPreInitTradeClose(objMsg.OptionType, objMsg.TransType);
        }
    });

    window.addEventListener("offline", function(){
        fnMarkAppDisconnected("Browser offline");
    });
    window.addEventListener("online", function(){
        fnMarkAppReconnected("Browser online");
    });
});

function fnInitOrderTypeSetting(){
    let objOrderType = document.getElementById("ddlOrderType");
    if(!objOrderType){
        return;
    }

    let vSavedOrderType = localStorage.getItem("OrderTypeDSS3FO");
    if(vSavedOrderType === "limit_order" || vSavedOrderType === "market_order"){
        objOrderType.value = vSavedOrderType;
    }
    else{
        localStorage.setItem("OrderTypeDSS3FO", objOrderType.value);
    }

    objOrderType.addEventListener("change", function(){
        localStorage.setItem("OrderTypeDSS3FO", objOrderType.value);
    });
}

function fnCanPlaceLiveOrders(pMsgTarget){
    let vTraderStatus = localStorage.getItem("lsLoginValidDSS3FO");
    let vAutoTrader = localStorage.getItem("isAutoTraderDSS3FO");
    let vMsgTarget = pMsgTarget || "spnGenMsg";

    if(vTraderStatus !== "true"){
        fnGenMessage("Trader is disconnected. Please login Trader first.", "badge bg-warning", vMsgTarget);
        return false;
    }
    if(vAutoTrader !== "true"){
        fnGenMessage("Auto Trader is OFF. Turn it ON to place new orders.", "badge bg-warning", vMsgTarget);
        return false;
    }
    return true;
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
                catch(objErr){
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
    // Send one startup pulse after a short delay.
    setTimeout(() => {
        fnSendHeartbeatToTelegram();
    }, 15000);

    gTelegramHeartbeatTimer = setInterval(() => {
        fnSendHeartbeatToTelegram();
    }, 3600000);
}

function fnSendHeartbeatToTelegram(){
    const vNetPnl = fnGetNetPnlValue();
    const vBrokRec = fnGetBrokerageRecoverValue();
    const vMsg = `strategy3fo\nApp is Up and Running\nNet PnL: ${vNetPnl.toFixed(2)}\nTotal Brokerage to Recvr: ${vBrokRec.toFixed(2)}\nTime: ${new Date().toLocaleString("en-GB")}`;
    fnSendTelegramRuntimeAlert(vMsg);
}

function fnGetNetPnlValue(){
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

function fnGetBrokerageRecoverValue(){
    const objBrok = document.getElementById("txtBrok2Rec");
    const vNum = Number(objBrok?.value || 0);
    return Number.isFinite(vNum) ? vNum : 0;
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
    fnSendTelegramRuntimeAlert(`strategy3fo ERROR\n${vMsg}`);
}

function fnMarkAppDisconnected(pReason){
    const vNow = Date.now();
    if(!gAppConnDown){
        gAppConnDown = true;
        gAppConnDownSince = vNow;
        gAppConnDownReason = String(pReason || "Connection lost");
        if(vNow - gLastTgConnAlertTs > 30000){
            gLastTgConnAlertTs = vNow;
            fnSendTelegramRuntimeAlert(`strategy3fo\nConnection Disconnected\nReason: ${gAppConnDownReason}\nTime: ${new Date(vNow).toLocaleString("en-GB")}`);
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
    const vMsg = `strategy3fo\nConnection Reconnected\nSource: ${String(pSource || "Recovered")}\nDowntime: ${vDownSec}s\nPrevious Reason: ${gAppConnDownReason || "-"}`;
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

    let requestOptions = {
        method: "POST",
        headers: vHeaders,
        body: vAction,
        redirect: "follow"
    };
    fetch("/strategy3fo/sendTelegramAlert", requestOptions).catch(() => {
        // no-op
    });
}

window.addEventListener("resize", function(){
    if(gPayoffGraphLastData){
        fnDrawPayoffGraph(gPayoffGraphLastData);
    }
});

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
    if(!gCurrPosDSS3FO || !Array.isArray(gCurrPosDSS3FO.TradeData)){
        return null;
    }

    let objOpenLegs = gCurrPosDSS3FO.TradeData.filter(objLeg => objLeg && objLeg.Status === "OPEN");
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

function fnFormatDateTimeLocal(pDateVal){
    let vDate = new Date(pDateVal);
    if(Number.isNaN(vDate.getTime())){
        return "";
    }

    let vYYYY = vDate.getFullYear();
    let vMM = String(vDate.getMonth() + 1).padStart(2, "0");
    let vDD = String(vDate.getDate()).padStart(2, "0");
    let vHH = String(vDate.getHours()).padStart(2, "0");
    let vMI = String(vDate.getMinutes()).padStart(2, "0");

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
        let vDt = new Date(pVal);
        if(!Number.isNaN(vDt.getTime())){
            return fnFormatDateTimeLocal(vDt);
        }
    }

    return pDefaultVal;
}

function fnInitClosedPosDateTimeFilters(){
    let objFromDate = document.getElementById("txtClsFromDate");
    let objToDate = document.getElementById("txtClsToDate");
    if(!objFromDate || !objToDate){
        return;
    }

    let objDefaults = fnGetClosedPosDateFilterDefaults();
    let vDefaultFrom = objDefaults.From;
    let vDefaultTo = objDefaults.To;

    let vSavedFrom = localStorage.getItem("ClsFromDateDSS3FO");
    let vSavedTo = localStorage.getItem("ClsToDateDSS3FO");

    let vFromVal = fnNormalizeDateTimeLocal(vSavedFrom, vDefaultFrom);
    let vToVal = fnNormalizeDateTimeLocal(vSavedTo, vDefaultTo);

    objFromDate.value = vFromVal;
    objToDate.value = vToVal;

    localStorage.setItem("ClsFromDateDSS3FO", vFromVal);
    localStorage.setItem("ClsToDateDSS3FO", vToVal);

    objFromDate.addEventListener("change", function(){
        let vNextFrom = fnNormalizeDateTimeLocal(objFromDate.value, vDefaultFrom);
        objFromDate.value = vNextFrom;
        localStorage.setItem("ClsFromDateDSS3FO", vNextFrom);
        fnRefreshClosedPositionsFromExchange();
    });

    objToDate.addEventListener("change", function(){
        let vNextTo = fnNormalizeDateTimeLocal(objToDate.value, vDefaultTo);
        objToDate.value = vNextTo;
        localStorage.setItem("ClsToDateDSS3FO", vNextTo);
        fnRefreshClosedPositionsFromExchange();
    });
}

function fnGetClosedPosDateFilterDefaults(){
    let vNow = new Date();
    let vFirstDay = new Date(vNow.getFullYear(), vNow.getMonth(), 1, 0, 0, 0, 0);
    return {
        From: fnFormatDateTimeLocal(vFirstDay),
        To: fnFormatDateTimeLocal(vNow)
    };
}

function fnSetClosedToDateNow(){
    let objToDate = document.getElementById("txtClsToDate");
    let vNowVal = fnFormatDateTimeLocal(new Date());
    if(objToDate){
        objToDate.value = vNowVal;
    }
    localStorage.setItem("ClsToDateDSS3FO", vNowVal);
}

function fnClearClosedPosDateTimeFilters(){
    let objFromDate = document.getElementById("txtClsFromDate");
    let objToDate = document.getElementById("txtClsToDate");
    if(!objFromDate || !objToDate){
        return;
    }

    let objDefaults = fnGetClosedPosDateFilterDefaults();
    objFromDate.value = objDefaults.From;
    objToDate.value = objDefaults.To;

    localStorage.setItem("ClsFromDateDSS3FO", objDefaults.From);
    localStorage.setItem("ClsToDateDSS3FO", objDefaults.To);
    fnRefreshClosedPositionsFromExchange();
}

function fnGetDateTimeMillisByInputId(pInputId, pFallbackDt){
    let objInput = document.getElementById(pInputId);
    let vRaw = objInput?.value || "";
    let vVal = new Date(vRaw).getTime();
    if(Number.isFinite(vVal) && vVal > 0){
        return vVal;
    }
    return pFallbackDt.getTime();
}

function fnGetFilledOrderHistory(pApiKey, pApiSecret, pStartDT, pEndDT){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "StartDT" : pStartDT,
            "EndDT" : pEndDT
        });

        let requestOptions = {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        };

        fetch("/strategy3fo/getFilledOrderHistory", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            resolve({
                "status": objResult.status,
                "message": objResult.message,
                "data": Array.isArray(objResult.data) ? objResult.data : [],
                "raw": objResult.data
            });
        })
        .catch(error => {
            resolve({ "status": "danger", "message": "Error while fetching closed order history.", "data": [] });
        });
    });
    return objPromise;
}

async function fnRefreshClosedPositionsFromExchange(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    if(!objApiKey || !objApiSecret || !objApiKey.value || !objApiSecret.value){
        gExchangeClosedOrderRows = [];
        gClosedHistoryLoaded = false;
        fnDispClosedPositions();
        return;
    }

    let vNow = new Date();
    let vFirstDay = new Date(vNow.getFullYear(), vNow.getMonth(), 1, 0, 0, 0, 0);
    let vStartDT = fnGetDateTimeMillisByInputId("txtClsFromDate", vFirstDay);
    let vEndDT = fnGetDateTimeMillisByInputId("txtClsToDate", vNow);
    if(vEndDT < vStartDT){
        let vTmp = vEndDT;
        vEndDT = vStartDT;
        vStartDT = vTmp;
    }

    let objRet = await fnGetFilledOrderHistory(objApiKey.value, objApiSecret.value, vStartDT, vEndDT);
    if(objRet.status === "success"){
        gExchangeClosedOrderRows = objRet.data;
        gClosedHistoryLoaded = true;
    }
    else{
        fnHandleLiveAuthError(objRet, "spnGenMsg");
        gExchangeClosedOrderRows = [];
        gClosedHistoryLoaded = false;
    }
    fnDispClosedPositions();
}

async function fnCheckLiveApiAuthOnLoad(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    if(!objApiKey || !objApiSecret || !objApiKey.value || !objApiSecret.value){
        return;
    }

    try{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : objApiKey.value,
            "ApiSecret" : objApiSecret.value
        });

        let requestOptions = {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        };

        let objResp = await fetch("/strategy3fo/validateLogin", requestOptions);
        let objResult = await objResp.json();
        if(objResult.status !== "success"){
            fnHandleLiveAuthError(objResult, "spnGenMsg");
            return;
        }
        localStorage.removeItem("DFL_SUPPRESS_STREAM_MSG");
    }
    catch(error){
        // background check only
    }
}

function fnExtractLiveAuthErr(pResult){
    let objPayload = pResult;
    if(objPayload?.data !== undefined){
        objPayload = objPayload.data;
    }
    if(objPayload?.raw !== undefined){
        objPayload = objPayload.raw;
    }

    if(objPayload?.response?.text && typeof objPayload.response.text === "string"){
        try{
            objPayload = JSON.parse(objPayload.response.text);
        }
        catch(objErr){
            // keep original
        }
    }

    if(typeof objPayload === "string"){
        try{
            objPayload = JSON.parse(objPayload);
        }
        catch(objErr){
            objPayload = { message: objPayload };
        }
    }

    let objErrNode = objPayload?.response?.body?.error || objPayload?.error || null;
    return {
        code: objErrNode?.code || objPayload?.code || "",
        clientIp: objErrNode?.context?.client_ip || objPayload?.context?.client_ip || ""
    };
}

function fnHandleLiveAuthError(pResult, pMsgTarget){
    let objErr = fnExtractLiveAuthErr(pResult);
    if(objErr.code !== "ip_not_whitelisted_for_api_key"){
        return;
    }

    let vNow = Date.now();
    let vKey = `${objErr.code}|${objErr.clientIp}`;
    if(vKey === gLastAuthErrKey && (vNow - gLastAuthErrTs) < 30000){
        return;
    }
    gLastAuthErrKey = vKey;
    gLastAuthErrTs = vNow;

    localStorage.setItem("DFL_SUPPRESS_STREAM_MSG", "true");
    let vIPMsg = objErr.clientIp ? (" IP: " + objErr.clientIp) : " IP not available in response.";
    fnGenMessage(objErr.code + vIPMsg, "badge bg-danger", pMsgTarget || "spnGenMsg");
}

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    if(bAppStatus){
        fnConnectDFL();
        fnLoadLoginCred();
        fnCheckLiveApiAuthOnLoad();
        // fnLoadDefQty();
        fnLoadDefFutStrategy();
        fnLoadDefStrategy();
        fnLoadHiddenFlds();
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();

        fnLoadNetLimits();
        fnLoadTradeSide();
        fnLoadDefSymbol();
        fnLoadDefExpiryMode();

        // fnLoadAllExpiryDate();
        fnLoadCurrentTradePos();
        fnLoadVegaCalState();
        // setInterval(fnGetDelta, 300000);
        fnUpdateOpenPositions();

        fnLoadClosedPostions();
        fnRefreshClosedPositionsFromExchange();
        fnRefreshTotalMargin();

        gTodayClsOpt = setInterval(fnChkTodayPosToCls, 900000);

        // fnLoadTotalLossAmtQty();
    }
}

function fnLoadDefQty(){
    let objStartQtyBuyM = JSON.parse(localStorage.getItem("StartQtyBuyDSS3FO"));
    let objStartQtySellM = JSON.parse(localStorage.getItem("StartQtySellDSS3FO"));
    let objStartBuyQty = document.getElementById("txtStartBQty");
    let objStartSellQty = document.getElementById("txtStartSQty");

    if(objStartQtyBuyM === null){
        objStartBuyQty.value = 1;
        localStorage.setItem("StartQtyBuyDSS3FO", objStartBuyQty.value);
    }
    else{
        objStartBuyQty.value = objStartQtyBuyM;
    }

    if(objStartQtySellM === null){
        objStartSellQty.value = 1;
        localStorage.setItem("StartQtySellDSS3FO", objStartSellQty.value);
    }
    else{
        objStartSellQty.value = objStartQtySellM;
    }
}

function fnLoadDefFutStrategy(){
    let objFutStrat = JSON.parse(localStorage.getItem("FutStratDSS3FO"));

    let objFutSL = document.getElementById("txtFutSL");
    let objFutTP = document.getElementById("txtFutTP");
    let objFutQty = document.getElementById("txtFutQty");

    if(objFutStrat === null || objFutStrat === ""){
        objFutStrat = gCurrFutStrats;

        objFutSL.value = objFutStrat.StratsData[0]["PointsSL"];
        objFutTP.value = objFutStrat.StratsData[0]["PointsTP"];
        objFutQty.value = objFutStrat.StratsData[0]["StartFutQty"];
    }
    else{
        gCurrFutStrats = objFutStrat;

        objFutSL.value = gCurrFutStrats.StratsData[0]["PointsSL"];
        objFutTP.value = gCurrFutStrats.StratsData[0]["PointsTP"];
        objFutQty.value = gCurrFutStrats.StratsData[0]["StartFutQty"];
    }
}

function fnLoadHiddenFlds(){
    let objHidFlds = JSON.parse(localStorage.getItem("HidFldsDSS3FO"));
    let objSwtActiveMsgs = document.getElementById("swtActiveMsgs");
    let objBrokAmt = document.getElementById("txtBrok2Rec");

    let objSwtBrokerage = document.getElementById("swtBrokRecvry");
    let objTxtBrokVal = document.getElementById("txtXBrok2Rec");
    let objChkReLeg = document.getElementById("chkReLegBrok");

    let objChkReLegSell = document.getElementById("chkReLegSell");
    let objChkReLegBuy = document.getElementById("chkReLegBuy");

    let objSwtVegaAdjust = document.getElementById("swtVegaAdjust");
    let objMinusVegaPM = document.getElementById("txtMinusVegaPM");
    let objPlusVegaPM = document.getElementById("txtPlusVegaPM");
    let objEntryGammaBufPct = document.getElementById("txtEntryGammaBufPct");
    let objAutoTolLower = document.getElementById("txtAutoTolLower");
    let objAutoTolUpper = document.getElementById("txtAutoTolUpper");

    if(objHidFlds === null || objHidFlds === ""){
        objHidFlds = gOtherFlds;
        objSwtActiveMsgs.checked = objHidFlds[0]["SwtActiveMsgs"];
        objBrokAmt.value = objHidFlds[0]["BrokerageAmt"];

        objSwtBrokerage.checked = objHidFlds[0]["SwtBrokRec"]; 
        objTxtBrokVal.value = objHidFlds[0]["BrokX4Profit"];
        objChkReLeg.checked = objHidFlds[0]["ReLegBrok"]; 

        objChkReLegSell.checked = objHidFlds[0]["ReLegSell"]; 
        objChkReLegBuy.checked = objHidFlds[0]["ReLegBuy"]; 

        if(objSwtVegaAdjust){
            objSwtVegaAdjust.checked = !!objHidFlds[0]["SwtVegaAdj"];
        }
        if(objMinusVegaPM){
            objMinusVegaPM.value = (objHidFlds[0]["VegaMinusPM"] !== undefined) ? objHidFlds[0]["VegaMinusPM"] : 0.20;
        }
        if(objPlusVegaPM){
            objPlusVegaPM.value = (objHidFlds[0]["VegaPlusPM"] !== undefined) ? objHidFlds[0]["VegaPlusPM"] : 0.20;
        }
        if(objEntryGammaBufPct){
            objEntryGammaBufPct.value = (objHidFlds[0]["EntryGammaBufPct"] !== undefined) ? objHidFlds[0]["EntryGammaBufPct"] : 10;
        }
        if(objAutoTolLower){
            objAutoTolLower.value = (objHidFlds[0]["AutoTolLower"] !== undefined) ? objHidFlds[0]["AutoTolLower"] : 0.20;
        }
        if(objAutoTolUpper){
            objAutoTolUpper.value = (objHidFlds[0]["AutoTolUpper"] !== undefined) ? objHidFlds[0]["AutoTolUpper"] : 0.20;
        }
    }
    else{
        gOtherFlds = objHidFlds;
        let bUpdatedDefaults = false;
        if(gOtherFlds[0]["SwtVegaAdj"] === undefined){
            gOtherFlds[0]["SwtVegaAdj"] = false;
            bUpdatedDefaults = true;
        }
        if(gOtherFlds[0]["SwtBrokRec"] === undefined){
            gOtherFlds[0]["SwtBrokRec"] = false;
            bUpdatedDefaults = true;
        }
        if(!Number.isFinite(parseFloat(gOtherFlds[0]["BrokX4Profit"]))){
            gOtherFlds[0]["BrokX4Profit"] = 2;
            bUpdatedDefaults = true;
        }
        if(!Number.isFinite(parseFloat(gOtherFlds[0]["VegaMinusPM"]))){
            gOtherFlds[0]["VegaMinusPM"] = 0.20;
            bUpdatedDefaults = true;
        }
        if(!Number.isFinite(parseFloat(gOtherFlds[0]["VegaPlusPM"]))){
            gOtherFlds[0]["VegaPlusPM"] = 0.20;
            bUpdatedDefaults = true;
        }
        if(!Number.isFinite(parseFloat(gOtherFlds[0]["EntryGammaBufPct"]))){
            gOtherFlds[0]["EntryGammaBufPct"] = 10;
            bUpdatedDefaults = true;
        }
        if(!Number.isFinite(parseFloat(gOtherFlds[0]["AutoTolLower"]))){
            gOtherFlds[0]["AutoTolLower"] = 0.20;
            bUpdatedDefaults = true;
        }
        if(!Number.isFinite(parseFloat(gOtherFlds[0]["AutoTolUpper"]))){
            gOtherFlds[0]["AutoTolUpper"] = 0.20;
            bUpdatedDefaults = true;
        }
        if(bUpdatedDefaults){
            localStorage.setItem("HidFldsDSS3FO", JSON.stringify(gOtherFlds));
        }
        objSwtActiveMsgs.checked = gOtherFlds[0]["SwtActiveMsgs"];
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

        objSwtBrokerage.checked = gOtherFlds[0]["SwtBrokRec"]; 
        objTxtBrokVal.value = gOtherFlds[0]["BrokX4Profit"];
        objChkReLeg.checked = gOtherFlds[0]["ReLegBrok"]; 

        objChkReLegSell.checked = gOtherFlds[0]["ReLegSell"]; 
        objChkReLegBuy.checked = gOtherFlds[0]["ReLegBuy"]; 

        if(objSwtVegaAdjust){
            objSwtVegaAdjust.checked = !!gOtherFlds[0]["SwtVegaAdj"];
        }
        if(objMinusVegaPM){
            objMinusVegaPM.value = gOtherFlds[0]["VegaMinusPM"];
        }
        if(objPlusVegaPM){
            objPlusVegaPM.value = gOtherFlds[0]["VegaPlusPM"];
        }
        if(objEntryGammaBufPct){
            objEntryGammaBufPct.value = gOtherFlds[0]["EntryGammaBufPct"];
        }
        if(objAutoTolLower){
            objAutoTolLower.value = gOtherFlds[0]["AutoTolLower"];
        }
        if(objAutoTolUpper){
            objAutoTolUpper.value = gOtherFlds[0]["AutoTolUpper"];
        }
    }
    fnUpdateVegaAdjustmentDetails();
}

function fnUpdHidFldSettings(pThisVal, pHidFldParam, pFieldMsg){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gOtherFlds[0][pHidFldParam] = pThisVal;
        if(pHidFldParam === "SwtVegaAdj"){
            if(pThisVal === true){
                fnPauseAutoVegaForManual(true);
            }
            else{
                fnRestoreAutoVegaAfterManual(true);
            }
        }

        localStorage.setItem("HidFldsDSS3FO", JSON.stringify(gOtherFlds));

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
        fnUpdateVegaAdjustmentDetails();
    }
}

function fnUpdFutStratSettings(pThisVal, pStratParam, pFieldMsg, pIfUpdFut, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrFutStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("FutStratDSS3FO", JSON.stringify(gCurrFutStrats));

        if(pIfUpdFut){
            fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam);
        }
        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        if((gCurrPosDSS3FO.TradeData[i].Status === "OPEN") && (pOptionType === "F")){
            gCurrPosDSS3FO.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosDSS3FO);
    localStorage.setItem("CurrPosDSS3FO", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
}

function fnLoadDefStrategy(){
    let objStrat = JSON.parse(localStorage.getItem("StrategyDSS3FO"));

    let objNewSellCE = document.getElementById("chkSellCE");
    let objNewSellPE = document.getElementById("chkSellPE");
    let objSellQty = document.getElementById("txtStartSQty");
    let objNewSellDelta = document.getElementById("txtNewSellDelta");
    let objReSellDelta = document.getElementById("txtReSellDelta");
    let objDeltaSellTP = document.getElementById("txtDeltaSellTP");
    let objDeltaSellSL = document.getElementById("txtDeltaSellSL");

    let objNewBuyCE = document.getElementById("chkBuyCE");
    let objNewBuyPE = document.getElementById("chkBuyPE");
    let objBuyQty = document.getElementById("txtStartBQty");
    let objNewBuyDelta = document.getElementById("txtNewBuyDelta");
    let objReBuyDelta = document.getElementById("txtReBuyDelta");
    let objDeltaBuyTP = document.getElementById("txtDeltaBuyTP");
    let objDeltaBuySL = document.getElementById("txtDeltaBuySL");

    if(objStrat === null || objStrat === ""){
        objStrat = gCurrStrats;

        objNewSellCE.checked = objStrat.StratsData[0]["NewSellCE"];
        objNewSellPE.checked = objStrat.StratsData[0]["NewSellPE"];
        objSellQty.value = objStrat.StratsData[0]["StartSellQty"];
        objNewSellDelta.value = objStrat.StratsData[0]["NewSellDelta"];
        objReSellDelta.value = objStrat.StratsData[0]["ReSellDelta"];
        objDeltaSellTP.value = objStrat.StratsData[0]["SellDeltaTP"];
        objDeltaSellSL.value = objStrat.StratsData[0]["SellDeltaSL"];

        objNewBuyCE.checked = objStrat.StratsData[0]["NewBuyCE"];
        objNewBuyPE.checked = objStrat.StratsData[0]["NewBuyPE"];
        objBuyQty.value = objStrat.StratsData[0]["StartBuyQty"];
        objNewBuyDelta.value = objStrat.StratsData[0]["NewBuyDelta"];
        objReBuyDelta.value = objStrat.StratsData[0]["ReBuyDelta"];
        objDeltaBuyTP.value = objStrat.StratsData[0]["BuyDeltaTP"];
        objDeltaBuySL.value = objStrat.StratsData[0]["BuyDeltaSL"];

        localStorage.setItem("StrategyDSS3FO", JSON.stringify(objStrat));
    }
    else{
        gCurrStrats = objStrat;

        objNewSellCE.checked = objStrat.StratsData[0]["NewSellCE"];
        objNewSellPE.checked = objStrat.StratsData[0]["NewSellPE"];
        objSellQty.value = objStrat.StratsData[0]["StartSellQty"];
        objNewSellDelta.value = objStrat.StratsData[0]["NewSellDelta"];
        objReSellDelta.value = objStrat.StratsData[0]["ReSellDelta"];
        objDeltaSellTP.value = objStrat.StratsData[0]["SellDeltaTP"];
        objDeltaSellSL.value = objStrat.StratsData[0]["SellDeltaSL"];

        objNewBuyCE.checked = objStrat.StratsData[0]["NewBuyCE"];
        objNewBuyPE.checked = objStrat.StratsData[0]["NewBuyPE"];
        objBuyQty.value = objStrat.StratsData[0]["StartBuyQty"];
        objNewBuyDelta.value = objStrat.StratsData[0]["NewBuyDelta"];
        objReBuyDelta.value = objStrat.StratsData[0]["ReBuyDelta"];
        objDeltaBuyTP.value = objStrat.StratsData[0]["BuyDeltaTP"];
        objDeltaBuySL.value = objStrat.StratsData[0]["BuyDeltaSL"];
    }
}

function fnChangeBuyStartQty(pThisVal){
    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyBuyDSS3FO", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyBuyDSS3FO", 1);
    }
    else{
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtyBuyDSS3FO", pThisVal.value);
        }
    }
}

function fnChangeSellStartQty(pThisVal){
    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellDSS3FO", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellDSS3FO", 1);
    }
    else{
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtySellDSS3FO", pThisVal.value);
        }
    }
}

function fnUpdOptStratSettings(pThis, pThisVal, pStratParam, pFieldMsg, pIfUpdCP, pIfBorS, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input / Select Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("StrategyDSS3FO", JSON.stringify(gCurrStrats));
    
        if(pIfUpdCP){
            fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam);
        }

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        if((gCurrPosDSS3FO.TradeData[i].Status === "OPEN") && (gCurrPosDSS3FO.TradeData[i].TransType === pIfBorS) && (pOptionType === "")){
            gCurrPosDSS3FO.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosDSS3FO);
    localStorage.setItem("CurrPosDSS3FO", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
}

function fnChangeSymbol(pSymbVal){
    localStorage.setItem("SymbDSS3FO", JSON.stringify(pSymbVal));

    fnLoadDefSymbol();
}

function fnLoadDefSymbol(){
    let objDefSymM = JSON.parse(localStorage.getItem("SymbDSS3FO"));
    let objSelSymb = document.getElementById("ddlSymbols");

    if(objDefSymM === null){
        objDefSymM = "";
    }

    objSelSymb.value = objDefSymM;
    fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
    let objLotSize = document.getElementById("txtLotSize");

    localStorage.setItem("SymbDSS3FO", JSON.stringify(pThisVal));

    if(pThisVal === "BTC"){
        objLotSize.value = 0.001;
    }
    else if(pThisVal === "ETH"){
        objLotSize.value = 0.01;
    }
    else{
        objLotSize.value = 0;
    }
}

function fnLoadNetLimits(){
    let objStartBQty = document.getElementById("txtStartBQty");
    let objStartSQty = document.getElementById("txtStartSQty");

    gQtyBuyMultiplierM = objStartBQty.value;
    gQtySellMultiplierM = objStartSQty.value;

    if(gQtyBuyMultiplierM === null || gQtyBuyMultiplierM === ""){
        gQtyBuyMultiplierM = 0;
    }

    if(gQtySellMultiplierM === null || gQtySellMultiplierM === ""){
        gQtySellMultiplierM = 0;
    }
}

function fnLoadCurrentTradePos(){
    let objCurrPos = JSON.parse(localStorage.getItem("CurrPosDSS3FO"));

    gCurrPosDSS3FO = objCurrPos;

    if(gCurrPosDSS3FO === null){
        gCurrPosDSS3FO = { TradeData : []};
    }
    else{
        fnSetSymbolTickerList();
    }
}

function fnLoadClosedPostions(){
    let objClsdPos = JSON.parse(localStorage.getItem("ClsdPosDSS3FO"));
    gClsdPosDSS3FO = objClsdPos;

    if(gClsdPosDSS3FO === null){
        gClsdPosDSS3FO = { TradeData : []};
    }
    else{
        fnDispClosedPositions();
    }
}

function fnSetTotalMarginView(pTotalMargin, pBlockedMargin, pAvailMargin){
    let objTotalMargin = document.getElementById("divTotalMargin");
    let objBlockedMargin = document.getElementById("divBlockedMargin");
    let objBalanceMargin = document.getElementById("divBalanceMargin");
    let vNetAvail = (Number.isFinite(pTotalMargin) && Number.isFinite(pBlockedMargin)) ? (pTotalMargin - pBlockedMargin) : NaN;

    if(objTotalMargin){
        objTotalMargin.innerText = Number.isFinite(pTotalMargin) ? pTotalMargin.toFixed(2) : "-";
    }
    if(objBlockedMargin){
        objBlockedMargin.innerText = Number.isFinite(pBlockedMargin) ? pBlockedMargin.toFixed(2) : "-";
    }
    if(objBalanceMargin){
        objBalanceMargin.innerText = Number.isFinite(vNetAvail) ? vNetAvail.toFixed(2) : "-";
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

async function fnRefreshTotalMargin(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");

    if(!objApiKey || !objApiSecret || !objApiKey.value || !objApiSecret.value){
        fnSetTotalMarginView(NaN, NaN, NaN);
        return;
    }

    try{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : objApiKey.value,
            "ApiSecret" : objApiSecret.value
        });

        let requestOptions = {
            method: "POST",
            headers: vHeaders,
            body: vAction,
            redirect: "follow"
        };

        let objResp = await fetch("/strategy3fo/validateLogin", requestOptions);
        let objResult = await objResp.json();
        if(objResult.status !== "success" || !Array.isArray(objResult.data) || objResult.data.length === 0){
            fnHandleLiveAuthError(objResult, "spnGenMsg");
            fnSetTotalMarginView(NaN, NaN, NaN);
            return;
        }

        let objWalletRows = objResult.data;
        let vTotalMargin = fnPickWalletMetric(objWalletRows, ["total_margin_inr", "total_margin", "balance"]);
        let vBlockedMargin = fnPickWalletMetric(objWalletRows, ["blocked_margin_inr", "blocked_margin"]);
        let vAvailMargin = fnPickWalletMetric(objWalletRows, ["available_balance_inr", "available_balance"]);

        fnSetTotalMarginView(vTotalMargin, vBlockedMargin, vAvailMargin);
    }
    catch(error){
        fnSetTotalMarginView(NaN, NaN, NaN);
    }
}

async function fnOpenFetchLivePosModal(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");

    if(!objApiKey.value || !objApiSecret.value){
        fnGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        return;
    }

    let objRet = await fnGetLiveOpenPositions(objApiKey.value, objApiSecret.value);
    if(objRet.status !== "success"){
        fnGenMessage(objRet.message || "Unable to fetch live positions.", "badge bg-danger", "spnGenMsg");
        return;
    }

    gFetchedLivePosRows = Array.isArray(objRet.data) ? objRet.data : [];
    fnRenderFetchLivePosRows();
    $('#mdlFetchLivePos').modal('show');
}

function fnGetLiveOpenPositions(pApiKey, pApiSecret){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/strategy3fo/getLiveOpenPositions", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
        })
        .catch(error => {
            resolve({ "status": "danger", "message": "Error while fetching live positions.", "data": [] });
        });
    });

    return objPromise;
}

function fnRenderFetchLivePosRows(){
    let objTB = document.getElementById("tBodyFetchLivePos");
    let objSelAll = document.getElementById("chkFetchAllLivePos");
    if(!objTB){
        return;
    }

    if(objSelAll){
        objSelAll.checked = false;
    }

    if(!Array.isArray(gFetchedLivePosRows) || gFetchedLivePosRows.length === 0){
        objTB.innerHTML = '<tr><td colspan="9" style="text-align:center; font-weight:bold;">No live open positions found.</td></tr>';
        return;
    }

    let vHtml = "";
    for(let i=0; i<gFetchedLivePosRows.length; i++){
        let objPos = gFetchedLivePosRows[i];
        vHtml += "<tr>";
        vHtml += '<td style="text-align:center;"><input type="checkbox" class="chkFetchLivePos" data-idx="' + i + '" /></td>';
        vHtml += '<td style="text-align:center;">' + (objPos.Symbol || "-") + "</td>";
        vHtml += '<td style="text-align:center;">' + (objPos.ContType || "-") + "</td>";
        vHtml += '<td style="text-align:center;">' + (objPos.TransType || "-") + "</td>";
        vHtml += '<td style="text-align:right;">' + (Number(objPos.Qty || 0)).toFixed(4) + "</td>";
        vHtml += '<td style="text-align:right;">' + (Number(objPos.EntryPrice || 0)).toFixed(2) + "</td>";
        vHtml += '<td style="text-align:right;">' + (Number(objPos.BestAsk || 0)).toFixed(2) + "</td>";
        vHtml += '<td style="text-align:right;">' + (Number(objPos.BestBid || 0)).toFixed(2) + "</td>";
        vHtml += '<td style="text-align:right;">' + (Number(objPos.UnrealizedPnL || 0)).toFixed(2) + "</td>";
        vHtml += "</tr>";
    }
    objTB.innerHTML = vHtml;
}

function fnToggleSelectAllFetchLivePos(pChecked){
    let objChecks = document.querySelectorAll(".chkFetchLivePos");
    for(let i=0; i<objChecks.length; i++){
        objChecks[i].checked = pChecked;
    }
}

function fnAddSelectedLivePosToLocal(){
    let objChecks = document.querySelectorAll(".chkFetchLivePos:checked");
    if(objChecks.length === 0){
        fnGenMessage("Please select at least one position.", "badge bg-warning", "spnGenMsg");
        return;
    }

    let objSellDeltaInp = document.getElementById("txtNewSellDelta");
    let objBuyDeltaInp = document.getElementById("txtNewBuyDelta");
    let objSellDeltaTPInp = document.getElementById("txtDeltaSellTP");
    let objSellDeltaSLInp = document.getElementById("txtDeltaSellSL");
    let objBuyDeltaTPInp = document.getElementById("txtDeltaBuyTP");
    let objBuyDeltaSLInp = document.getElementById("txtDeltaBuySL");
    let objFutTPInp = document.getElementById("txtFutTP");
    let objFutSLInp = document.getElementById("txtFutSL");
    let objReplaceInp = document.getElementById("chkReplaceExistingLivePos");
    let vReplaceExisting = !!(objReplaceInp && objReplaceInp.checked);
    let vSellDeltaNP = Math.abs(parseFloat(objSellDeltaInp?.value || 0));
    let vBuyDeltaNP = Math.abs(parseFloat(objBuyDeltaInp?.value || 0));
    let vSellDeltaTP = Math.abs(parseFloat(objSellDeltaTPInp?.value || 0));
    let vSellDeltaSL = Math.abs(parseFloat(objSellDeltaSLInp?.value || 0));
    let vBuyDeltaTP = Math.abs(parseFloat(objBuyDeltaTPInp?.value || 0));
    let vBuyDeltaSL = Math.abs(parseFloat(objBuyDeltaSLInp?.value || 0));
    let vFutPointsTP = Math.abs(parseFloat(objFutTPInp?.value || 0));
    let vFutPointsSL = Math.abs(parseFloat(objFutSLInp?.value || 0));
    let vNow = new Date();
    let vMonth = vNow.getMonth() + 1;
    let vToday = vNow.getDate() + "-" + vMonth + "-" + vNow.getFullYear() + " " + vNow.getHours() + ":" + vNow.getMinutes() + ":" + vNow.getSeconds();
    let vAdded = 0;
    let vRemoved = 0;

    gUpdPos = false;

    for(let i=0; i<objChecks.length; i++){
        let vIdx = parseInt(objChecks[i].getAttribute("data-idx"));
        if(!Number.isFinite(vIdx)){
            continue;
        }
        let objPos = gFetchedLivePosRows[vIdx];
        if(!objPos){
            continue;
        }

        let vSymbol = objPos.Symbol || "";
        let vTransType = objPos.TransType || "buy";
        let vOptionType = objPos.OptionType || "F";
        let vEntryDeltaAbs = (vTransType === "sell") ? vSellDeltaNP : vBuyDeltaNP;
        let vDeltaTP = (vTransType === "sell") ? vSellDeltaTP : vBuyDeltaTP;
        let vDeltaSL = (vTransType === "sell") ? vSellDeltaSL : vBuyDeltaSL;

        if(vReplaceExisting){
            let objFiltered = [];
            for(let j=0; j<gCurrPosDSS3FO.TradeData.length; j++){
                let objLeg = gCurrPosDSS3FO.TradeData[j];
                if(objLeg.Status === "OPEN" && objLeg.Symbol === vSymbol && objLeg.TransType === vTransType){
                    vRemoved += 1;
                    continue;
                }
                objFiltered.push(objLeg);
            }
            gCurrPosDSS3FO.TradeData = objFiltered;
        }

        if(vReplaceExisting){
            let vExists = false;
            for(let j=0; j<gCurrPosDSS3FO.TradeData.length; j++){
                let objLeg = gCurrPosDSS3FO.TradeData[j];
                if(objLeg.Status === "OPEN" && objLeg.Symbol === vSymbol && objLeg.TransType === vTransType){
                    vExists = true;
                    break;
                }
            }
            if(vExists){
                continue;
            }
        }

        let vQty = Math.abs(Number(objPos.Qty || 0));
        if(!(vQty > 0)){
            continue;
        }

        let vLotSize = fnGetLotSizeByUnderlying(objPos.UndrAsstSymb, vSymbol);
        let vLotQty = vQty;

        let vSignedEntryDelta = 0;
        if(vOptionType === "C"){
            vSignedEntryDelta = (vTransType === "sell") ? -vEntryDeltaAbs : vEntryDeltaAbs;
        }
        else if(vOptionType === "P"){
            vSignedEntryDelta = (vTransType === "sell") ? vEntryDeltaAbs : -vEntryDeltaAbs;
        }
        else{
            let vFutDeltaAbs = vLotSize * vLotQty;
            vSignedEntryDelta = (vTransType === "sell") ? -vFutDeltaAbs : vFutDeltaAbs;
        }

        let vRawCurrDelta = Number(objPos.Delta || 0);
        let vCurrDelta = Number.isFinite(vRawCurrDelta) ? ((vTransType === "sell") ? (-1 * vRawCurrDelta) : vRawCurrDelta) : vSignedEntryDelta;
        let vGamma = Number(objPos.Gamma || 0);
        let vTheta = Number(objPos.Theta || 0);
        let vRawVega = Number(objPos.Vega || 0);
        let vVega = fnScaleVegaByLots(vRawVega, vLotQty);
        let vVegaC = Number.isFinite(vVega) ? ((vTransType === "sell") ? -1 * Math.abs(vVega) : Math.abs(vVega)) : vVega;

        let vEntry = Number(objPos.EntryPrice || 0);
        let vBestAsk = Number(objPos.BestAsk || 0);
        let vBestBid = Number(objPos.BestBid || 0);
        let vBuyPrice = (vTransType === "buy") ? vEntry : vBestAsk;
        let vSellPrice = (vTransType === "sell") ? vEntry : vBestBid;
        let vPointsTP = 0;
        let vPointsSL = 0;
        let vRateTP = 0;
        let vRateSL = 0;

        if(vOptionType === "F"){
            vPointsTP = vFutPointsTP;
            vPointsSL = vFutPointsSL;
            let vRefPrice = (vTransType === "sell") ? vSellPrice : vBuyPrice;
            if(vTransType === "buy"){
                vRateTP = vRefPrice + vPointsTP;
                vRateSL = vRefPrice - vPointsSL;
            }
            else if(vTransType === "sell"){
                vRateTP = vRefPrice - vPointsTP;
                vRateSL = vRefPrice + vPointsSL;
            }
        }

        let vExpiry = fnToDDMMYYYYSafe(objPos.Expiry || "");
        let vTradeId = Number(objPos.PositionID || (Date.now() + getRandomIntInclusive(10, 999)));
        let vStrike = Number(objPos.Strike || 0);

        let vExcTradeDtls = {
            TradeID : vTradeId,
            ProductID : Number(objPos.ProductID || 0),
            OpenDT : vToday,
            Symbol : vSymbol,
            UndrAsstSymb : objPos.UndrAsstSymb || "",
            ContrctType : objPos.ContType || "",
            TransType : vTransType,
            OptionType : vOptionType,
            StrikePrice : vStrike,
            Expiry : vExpiry,
            LotSize : vLotSize,
            LotQty : vLotQty,
            BuyPrice : Number.isFinite(vBuyPrice) ? vBuyPrice : 0,
            SellPrice : Number.isFinite(vSellPrice) ? vSellPrice : 0,
            Delta : vSignedEntryDelta,
            DeltaC : vCurrDelta,
            Gamma : vGamma,
            GammaC : vGamma,
            Theta : vTheta,
            ThetaC : vTheta,
            Vega : vVega,
            VegaC : vVegaC,
            DeltaNP : vEntryDeltaAbs,
            DeltaTP : vDeltaTP,
            DeltaSL : vDeltaSL,
            PointsTP : vPointsTP,
            PointsSL : vPointsSL,
            RateTP : vRateTP,
            RateSL : vRateSL,
            OpenDTVal : Date.now(),
            Status : "OPEN"
        };

        gCurrPosDSS3FO.TradeData.push(vExcTradeDtls);
        vAdded += 1;
    }

    localStorage.setItem("CurrPosDSS3FO", JSON.stringify(gCurrPosDSS3FO));
    gUpdPos = true;
    fnSetSymbolTickerList();
    fnUpdateOpenPositions();

    if(vAdded > 0 || vRemoved > 0){
        $('#mdlFetchLivePos').modal('hide');
        fnGenMessage(vAdded + " added, " + vRemoved + " replaced.", "badge bg-success", "spnGenMsg");
    }
    else{
        fnGenMessage("No legs were added.", "badge bg-warning", "spnGenMsg");
    }
}

function fnToDDMMYYYYSafe(pDateVal){
    if(!pDateVal){
        return "";
    }
    if(typeof pDateVal === "string" && pDateVal.includes("-")){
        let objParts = pDateVal.split("-");
        if(objParts.length === 3 && objParts[0].length === 4){
            return objParts[2] + "-" + objParts[1] + "-" + objParts[0];
        }
    }
    return fnSetDDMMYYYY(pDateVal);
}

function fnGetLotSizeByUnderlying(pUndSymb, pSymbol){
    let vUnd = (pUndSymb || "").toString().toUpperCase();
    let vSym = (pSymbol || "").toString().toUpperCase();

    if(vUnd === "BTC" || vSym.includes("BTC")){
        return 0.001;
    }
    if(vUnd === "ETH" || vSym.includes("ETH")){
        return 0.01;
    }
    return 1;
}

function fnScaleVegaByLots(pRawVega, pLotQty){
    let vRaw = Number(pRawVega);
    let vQty = Number(pLotQty);
    if(!Number.isFinite(vRaw)){
        return NaN;
    }
    if(!Number.isFinite(vQty) || vQty <= 0){
        vQty = 1;
    }
    return vRaw * (vQty / gVegaBaseLots);
}

function fnSetSymbolTickerList(){
    let objOpenLegs = [];
    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        if(gCurrPosDSS3FO.TradeData[i].Status === "OPEN"){
            objOpenLegs.push(gCurrPosDSS3FO.TradeData[i]);
        }
    }
    let vMarginSyncKey = objOpenLegs.map(objLeg => `${objLeg.TradeID}|${objLeg.Symbol}|${objLeg.TransType}|${objLeg.OptionType}|${objLeg.LotQty}`).sort().join("||");
    if(vMarginSyncKey !== gLastMarginSyncKey){
        gLastMarginSyncKey = vMarginSyncKey;
        fnSetClosedToDateNow();
        fnRefreshTotalMargin();
        if(vMarginSyncKey !== gLastClosedHistSyncKey){
            gLastClosedHistSyncKey = vMarginSyncKey;
            fnRefreshClosedPositionsFromExchange();
        }
    }

    if(objOpenLegs.length > 0){
        const objSubListArray = [];
        gSubList = [];

        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            if(gCurrPosDSS3FO.TradeData[i].Status === "OPEN"){
                objSubListArray.push(gCurrPosDSS3FO.TradeData[i].Symbol);
            }
        }
        const setSubList = new Set(objSubListArray);
        gSubList = [...setSubList];
        fnUnSubscribeDFL();
        fnSubscribeDFL();

        clearInterval(gTradeInst);
        gTradeInst = setInterval(fnSaveUpdCurrPos, 15000);
        clearInterval(gFastStratInst);
        gFastStratInst = setInterval(fnRunFastStrategyChecks, 3000);
    }
    else{
        clearInterval(gFastStratInst);
        gFastStratInst = 0;
    }
}

async function fnRunFastStrategyChecks(){
    if(gSaveUpdBusy){
        return;
    }
    try{
        await fnRunVegaAdjustment();
        let vNetPnl = fnParseNum(document.getElementById("divNetPL")?.innerText);
        await fnRunVegaStrategyRiskChecks(vNetPnl);
        fnUpdateVegaAdjustmentDetails();
    }
    catch(objErr){
        console.log("Fast strategy check error", objErr);
    }
}

function fnLoadTotalLossAmtQty(){

}

function fnChkTodayPosToCls(){
    let vTodayDate = new Date();
    let vDDMMYYYY = fnSetDDMMYYYY(vTodayDate);
    let vIsRecExists = false;
    let vLegID = 0;
    let vTransType = "";
    let vOptionType = "";
    let vSymbol = "";

    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        if(gCurrPosDSS3FO.TradeData[i].Expiry === vDDMMYYYY){
            let vDate3PM = new Date();
            let vDate5PM = new Date();
            vDate3PM.setHours(15, 30, 0, 0);
            vDate5PM.setHours(17, 0, 0, 0);

            let v3PM = vDate3PM.getTime();
            let v5PM = vDate5PM.getTime();

            let vState = gCurrPosDSS3FO.TradeData[i].Status;

            if((vTodayDate.valueOf() > v3PM) && (vTodayDate.valueOf() < v5PM)){
                if(vState === "OPEN"){
                    vLegID = gCurrPosDSS3FO.TradeData[i].TradeID;
                    vTransType = gCurrPosDSS3FO.TradeData[i].TransType;
                    vOptionType = gCurrPosDSS3FO.TradeData[i].OptionType;
                    vSymbol = gCurrPosDSS3FO.TradeData[i].Symbol;
                    
                    vIsRecExists = true;

                }
            }
        }
    }

    if(vIsRecExists === true){
        fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
    }

    // console.log(gCurrPosDSS3FO);
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
    let vCloseSwt = document.getElementById("swtBrokRecvry").checked;
    let vCloseXVal = document.getElementById("txtXBrok2Rec").value;
    let vBrokAmt = parseFloat(document.getElementById("txtBrok2Rec")?.value || 0);
    let vCloseAmt = NaN;
    let objChkReLegSell = document.getElementById("chkReLegSell");
    let objChkReLegBuy = document.getElementById("chkReLegBuy");
    let vTotalPL = 0;
    vCloseXVal = parseFloat(vCloseXVal);
    if(Number.isFinite(vCloseXVal) && vCloseXVal > 0 && Number.isFinite(vBrokAmt) && vBrokAmt > 0){
        vCloseAmt = vBrokAmt * vCloseXVal;
    }

    vTotalPL = gPL;

    document.getElementById("divNetPL").innerText = (vTotalPL).toFixed(2);
    let objTotalPL = document.getElementById("divTotalPL");
    if(objTotalPL){
        objTotalPL.innerText = (gPL).toFixed(2);
    }
    await fnRunVegaStrategyRiskChecks(vTotalPL);

    if(vCloseSwt && Number.isFinite(vCloseAmt) && (vTotalPL >= vCloseAmt) && !gVegaCalStrat.active){
        fnExitAllPositions();
    }
    else{
        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            if(gCurrPosDSS3FO.TradeData[i].Status === "OPEN"){
                let vOptionTypeZZ = gCurrPosDSS3FO.TradeData[i].OptionType;
                let vCurrDelta = parseFloat(gSymbDeltaList[gCurrPosDSS3FO.TradeData[i].Symbol]);
                let vCurrGamma = parseFloat(gSymbGammaList[gCurrPosDSS3FO.TradeData[i].Symbol]);
                let vCurrTheta = parseFloat(gSymbThetaList[gCurrPosDSS3FO.TradeData[i].Symbol]);
                let vCurrVega = parseFloat(gSymbVegaList[gCurrPosDSS3FO.TradeData[i].Symbol]);

                if(vOptionTypeZZ !== "F"){
                    let vCurrDeltaPos = vCurrDelta;
                    if(!isNaN(vCurrDelta)){
                        if(gCurrPosDSS3FO.TradeData[i].TransType === "sell"){
                            vCurrDeltaPos = -1 * vCurrDelta;
                        }
                    }
                    if(!isNaN(vCurrDelta)){
                        gCurrPosDSS3FO.TradeData[i].DeltaC = vCurrDeltaPos;
                    }
                    if(!isNaN(vCurrGamma)){
                        gCurrPosDSS3FO.TradeData[i].GammaC = vCurrGamma;
                    }
                    if(!isNaN(vCurrTheta)){
                        gCurrPosDSS3FO.TradeData[i].ThetaC = vCurrTheta;
                    }
                    if(!isNaN(vCurrVega)){
                        let vLegQty = parseFloat(gCurrPosDSS3FO.TradeData[i].LotQty || 0);
                        let vScaledVega = fnScaleVegaByLots(vCurrVega, vLegQty);
                        gCurrPosDSS3FO.TradeData[i].Vega = vScaledVega;
                        let vCurrVegaPos = (gCurrPosDSS3FO.TradeData[i].TransType === "sell") ? -1 * Math.abs(vScaledVega) : Math.abs(vScaledVega);
                        gCurrPosDSS3FO.TradeData[i].VegaC = vCurrVegaPos;
                    }
                }
                else{
                    let vFutDelta = parseFloat(gCurrPosDSS3FO.TradeData[i].Delta);
                    if(!Number.isFinite(vFutDelta)){
                        vFutDelta = (gCurrPosDSS3FO.TradeData[i].TransType === "sell") ? -0.10 : 0.10;
                    }
                    gCurrPosDSS3FO.TradeData[i].DeltaC = vFutDelta;
                }

                let vStrikePrice = gCurrPosDSS3FO.TradeData[i].StrikePrice;
                let vLotSize = gCurrPosDSS3FO.TradeData[i].LotSize;
                let vQty = gCurrPosDSS3FO.TradeData[i].LotQty;
                let vBuyPrice = gCurrPosDSS3FO.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosDSS3FO.TradeData[i].SellPrice;
                let vDeltaSL = gCurrPosDSS3FO.TradeData[i].DeltaSL;
                let vDeltaTP = gCurrPosDSS3FO.TradeData[i].DeltaTP;

                // let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionTypeZZ);
                // let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

                if(gCurrPosDSS3FO.TradeData[i].TransType === "sell"){
                    let vCurrPrice = parseFloat(gSymbBRateList[gCurrPosDSS3FO.TradeData[i].Symbol]);
                    gCurrPosDSS3FO.TradeData[i].BuyPrice = vCurrPrice;

                    if((Math.abs(vCurrDelta) >= vDeltaSL) || (Math.abs(vCurrDelta) <= vDeltaTP)){
                        vLegID = gCurrPosDSS3FO.TradeData[i].TradeID;
                        vTransType = gCurrPosDSS3FO.TradeData[i].TransType;
                        vOptionType = gCurrPosDSS3FO.TradeData[i].OptionType;
                        vSymbol = gCurrPosDSS3FO.TradeData[i].Symbol;
                        vToPosClose = true;
                        
                        if(objChkReLegSell.checked){
                            gReLeg = true;
                        }
                    }
                }
                else if(gCurrPosDSS3FO.TradeData[i].TransType === "buy"){
                    let vCurrPrice = parseFloat(gSymbSRateList[gCurrPosDSS3FO.TradeData[i].Symbol]);
                    gCurrPosDSS3FO.TradeData[i].SellPrice = vCurrPrice;

                    if((Math.abs(vCurrDelta) <= vDeltaSL) || (Math.abs(vCurrDelta) >= vDeltaTP)){
                        vLegID = gCurrPosDSS3FO.TradeData[i].TradeID;
                        vTransType = gCurrPosDSS3FO.TradeData[i].TransType;
                        vOptionType = gCurrPosDSS3FO.TradeData[i].OptionType;
                        vSymbol = gCurrPosDSS3FO.TradeData[i].Symbol;
                        vToPosClose = true;

                        if(objChkReLegBuy.checked){
                            gReLeg = true;
                        }
                    }
                }
            }
        }

        fnUpdateOpenPositions();

        if(vToPosClose){
            // if(gClsBuyLeg && vTransType === "sell"){
            //     gClsBuyLeg = false;
            //     fnCloseBuyLeg(vTransType, vOptionType);
            // }
            // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSS3FO"));
            // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSS3FO"));

            // if((objTrdCountCE > 1 || objTrdCountPE > 1) && vTransType === "sell"){

            //     fnGetBuyOpenPosAndClose(vTransType, vOptionType);
            // }
            await fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
        }
        else{
            await fnRunVegaAdjustment();
        }
    }
    }
    finally{
        gSaveUpdBusy = false;
    }
}

function fnGetVegaAdjHourKey(){
    const vNow = new Date();
    const y = vNow.getFullYear();
    const m = String(vNow.getMonth() + 1).padStart(2, "0");
    const d = String(vNow.getDate()).padStart(2, "0");
    const h = String(vNow.getHours()).padStart(2, "0");
    return `${y}${m}${d}${h}`;
}

function fnParseNum(pVal){
    let vNum = Number(String(pVal ?? "").replace(/,/g, "").trim());
    return Number.isFinite(vNum) ? vNum : 0;
}

function fnGetDaysToExpiry(pExpiryDDMMYYYY){
    if(!pExpiryDDMMYYYY || typeof pExpiryDDMMYYYY !== "string"){
        return 999;
    }
    let objParts = pExpiryDDMMYYYY.split("-");
    if(objParts.length !== 3){
        return 999;
    }
    let vDay = parseInt(objParts[0], 10);
    let vMonth = parseInt(objParts[1], 10);
    let vYear = parseInt(objParts[2], 10);
    if(!Number.isFinite(vDay) || !Number.isFinite(vMonth) || !Number.isFinite(vYear)){
        return 999;
    }
    let vExp = new Date(vYear, vMonth - 1, vDay, 23, 59, 59, 999).valueOf();
    let vNow = Date.now();
    let vDiff = vExp - vNow;
    return Math.ceil(vDiff / (24 * 60 * 60 * 1000));
}

function fnComputeNetVega(){
    let vNetVega = 0;
    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        let objLeg = gCurrPosDSS3FO.TradeData[i];
        if(objLeg.Status !== "OPEN" || objLeg.OptionType === "F"){
            continue;
        }
        let vVega = parseFloat(objLeg.VegaC);
        if(Number.isFinite(vVega)){
            vNetVega += vVega;
        }
    }
    return vNetVega;
}

function fnUpdateVegaAdjustmentDetails(){
    let objActive = document.getElementById("spnVegaAdjActive");
    let objOptType = document.getElementById("spnVegaAdjOptType");
    let objNet = document.getElementById("spnVegaAdjNetVega");
    let objBand = document.getElementById("spnVegaAdjBand");
    let objInit = document.getElementById("spnVegaAdjInitExp");
    let objDev = document.getElementById("spnVegaAdjDev");
    let objUnit = document.getElementById("spnVegaAdjUnit");
    let objNeed = document.getElementById("spnVegaAdjNeed");
    let objAction = document.getElementById("spnVegaAdjAction");
    let objQty = document.getElementById("spnVegaAdjQty");
    if(!objActive || !objOptType || !objNet || !objBand || !objInit || !objDev || !objUnit || !objNeed || !objAction || !objQty){
        return;
    }

    let objSwtVegaAdjust = document.getElementById("swtVegaAdjust");
    let bManualOverride = !!(objSwtVegaAdjust && objSwtVegaAdjust.checked);
    let bAutoActive = !!gVegaCalStrat.active && !bManualOverride;

    let vNetVega = fnComputeNetVega();
    if(!Number.isFinite(vNetVega)){
        vNetVega = 0;
    }

    let objAutoTol = fnGetAutoVegaTolerances();
    let vTolLower = objAutoTol.lower;
    let vTolUpper = objAutoTol.upper;
    let vInitExp = 0;
    let vShortUnit = Math.abs(fnParseNum(gVegaCalStrat.shortUnitVega));
    if(bAutoActive){
        vInitExp = Math.abs(fnParseNum(gVegaCalStrat.initialExposureVega));
    }

    let bNeedAdjust = (vNetVega <= (-vTolLower) || vNetVega >= vTolUpper);
    let vDeviation = 0;
    if(vNetVega > vTolUpper){
        vDeviation = vNetVega - vTolUpper;
    }
    else if(vNetVega < -vTolLower){
        vDeviation = (-vTolLower) - vNetVega;
    }
    let vAction = "-";
    let vReqQty = 0;
    if(bNeedAdjust){
        vAction = (vNetVega > 0) ? "SELL SHORT LEG" : "BUY SHORT LEG";
        if(vShortUnit > 0){
            vReqQty = Math.max(1, Math.ceil(Math.abs(vNetVega) / vShortUnit));
        }
    }

    objActive.innerText = bAutoActive ? "YES" : (bManualOverride ? "NO (MANUAL OVERRIDE)" : "NO");
    objOptType.innerText = bAutoActive ? (gVegaCalStrat.optionType || "-") : "-";
    objNet.innerText = vNetVega.toFixed(4);
    objBand.innerText = `-${vTolLower.toFixed(4)} / +${vTolUpper.toFixed(4)}`;
    objInit.innerText = bAutoActive ? vInitExp.toFixed(4) : "-";
    objDev.innerText = vDeviation.toFixed(4);
    objUnit.innerText = vShortUnit > 0 ? vShortUnit.toFixed(4) : "-";
    objNeed.innerText = bNeedAdjust ? "YES" : "NO";
    objAction.innerText = vAction;
    objQty.innerText = String(vReqQty);
}

function fnGetCurrentAvgIV(){
    let vIvSum = 0;
    let vIvCount = 0;
    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        let objLeg = gCurrPosDSS3FO.TradeData[i];
        if(objLeg.Status !== "OPEN" || objLeg.OptionType === "F"){
            continue;
        }
        let vIv = fnParseNum(gSymbMarkIVList[objLeg.Symbol]);
        if(vIv > 0){
            vIvSum += vIv;
            vIvCount += 1;
        }
    }
    if(vIvCount === 0){
        return NaN;
    }
    return vIvSum / vIvCount;
}

function fnPercentile10(pArr){
    if(!Array.isArray(pArr) || pArr.length === 0){
        return NaN;
    }
    let objVals = pArr.filter(v => Number.isFinite(v)).slice().sort((a, b) => a - b);
    if(objVals.length === 0){
        return NaN;
    }
    let idx = Math.max(0, Math.floor((objVals.length - 1) * 0.10));
    return objVals[idx];
}

function fnGetVegaSellOptionType(){
    let objSellPE = document.getElementById("chkSellPE");
    let objSellCE = document.getElementById("chkSellCE");
    let bSellPE = !!(objSellPE && objSellPE.checked);
    let bSellCE = !!(objSellCE && objSellCE.checked);

    if(bSellPE && !bSellCE){
        return "P";
    }
    if(bSellCE && !bSellPE){
        return "C";
    }
    if(bSellPE && bSellCE){
        let vOpenSellPE = 0;
        let vOpenSellCE = 0;
        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            let objLeg = gCurrPosDSS3FO.TradeData[i];
            if(objLeg.Status !== "OPEN" || objLeg.TransType !== "sell"){
                continue;
            }
            if(objLeg.OptionType === "P"){
                vOpenSellPE += 1;
            }
            else if(objLeg.OptionType === "C"){
                vOpenSellCE += 1;
            }
        }
        return (vOpenSellPE <= vOpenSellCE) ? "P" : "C";
    }

    return "P";
}

function fnGetAutoVegaEntryDelta(pTransType){
    const objSellDelta = document.getElementById("txtNewSellDelta");
    const objBuyDelta = document.getElementById("txtNewBuyDelta");
    let vDelta = NaN;

    if(pTransType === "sell"){
        vDelta = parseFloat(objSellDelta?.value);
    }
    else{
        vDelta = parseFloat(objBuyDelta?.value);
    }
    if(!Number.isFinite(vDelta) || vDelta <= 0){
        vDelta = 0.50;
    }
    return vDelta;
}

function fnGetEntryGammaBufferPct(){
    const objGammaBuf = document.getElementById("txtEntryGammaBufPct");
    let vPct = parseFloat(objGammaBuf?.value);
    if(!Number.isFinite(vPct)){
        vPct = parseFloat(gOtherFlds?.[0]?.["EntryGammaBufPct"]);
    }
    if(!Number.isFinite(vPct) || vPct < 0){
        vPct = 10;
    }
    return vPct;
}

function fnGetAutoVegaTolerances(){
    const objTolLower = document.getElementById("txtAutoTolLower");
    const objTolUpper = document.getElementById("txtAutoTolUpper");
    let vLower = Math.abs(parseFloat(objTolLower?.value));
    let vUpper = Math.abs(parseFloat(objTolUpper?.value));

    if(!Number.isFinite(vLower) || vLower <= 0){
        vLower = Math.abs(parseFloat(gOtherFlds?.[0]?.["AutoTolLower"]));
    }
    if(!Number.isFinite(vUpper) || vUpper <= 0){
        vUpper = Math.abs(parseFloat(gOtherFlds?.[0]?.["AutoTolUpper"]));
    }
    if(!Number.isFinite(vLower) || vLower <= 0){
        vLower = 0.20;
    }
    if(!Number.isFinite(vUpper) || vUpper <= 0){
        vUpper = 0.20;
    }
    return { lower: vLower, upper: vUpper };
}

async function fnRunVegaAdjustment(){
    let objSwtVegaAdjust = document.getElementById("swtVegaAdjust");
    let bManualOverride = !!(objSwtVegaAdjust && objSwtVegaAdjust.checked);
    if(bManualOverride && gVegaCalStrat.active){
        fnPauseAutoVegaForManual(false);
    }

    if(gVegaCalStrat.active && !bManualOverride){
        return await fnRunVegaCalendarRebalance();
    }

    let objMinusVegaPM = document.getElementById("txtMinusVegaPM");
    let objPlusVegaPM = document.getElementById("txtPlusVegaPM");

    if(!bManualOverride){
        return;
    }

    let vMinusThreshold = Math.abs(parseFloat(objMinusVegaPM ? objMinusVegaPM.value : NaN));
    if(!Number.isFinite(vMinusThreshold)){
        vMinusThreshold = Math.abs(parseFloat(gOtherFlds[0]["VegaMinusPM"]));
    }
    if(!Number.isFinite(vMinusThreshold) || vMinusThreshold === 0){
        vMinusThreshold = 0.20;
    }

    let vPlusThreshold = Math.abs(parseFloat(objPlusVegaPM ? objPlusVegaPM.value : NaN));
    if(!Number.isFinite(vPlusThreshold)){
        vPlusThreshold = Math.abs(parseFloat(gOtherFlds[0]["VegaPlusPM"]));
    }
    if(!Number.isFinite(vPlusThreshold) || vPlusThreshold === 0){
        vPlusThreshold = 0.20;
    }

    const vHysteresisBand = 0.00;
    const vCooldownMs = 5000;
    const vMaxAdjustPerHour = 8;

    let vNetVega = 0;
    let vOpenOptionCount = 0;
    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        let objLeg = gCurrPosDSS3FO.TradeData[i];
        if(objLeg.Status !== "OPEN" || objLeg.OptionType === "F"){
            continue;
        }
        let vVega = parseFloat(objLeg.VegaC);
        if(!Number.isFinite(vVega)){
            let vRawVega = parseFloat(objLeg.Vega || 0);
            if(Number.isFinite(vRawVega)){
                let vScaledVega = fnScaleVegaByLots(vRawVega, parseFloat(objLeg.LotQty || 0));
                vVega = (objLeg.TransType === "sell") ? -1 * Math.abs(vScaledVega) : Math.abs(vScaledVega);
            }
        }
        if(!Number.isFinite(vVega)){
            continue;
        }
        vNetVega += vVega;
        vOpenOptionCount += 1;
    }

    if(vOpenOptionCount === 0){
        return;
    }

    let vNow = Date.now();
    if(gVegaAdjBusy || (vNow - gVegaAdjLastActionTs) < vCooldownMs){
        return;
    }

    let vHourKey = fnGetVegaAdjHourKey();
    if(vHourKey !== gVegaAdjHourBucket){
        gVegaAdjHourBucket = vHourKey;
        gVegaAdjHourCount = 0;
    }
    if(gVegaAdjHourCount >= vMaxAdjustPerHour){
        return;
    }

    let bNeedsAdjustment = false;
    if(vNetVega >= (vPlusThreshold + vHysteresisBand)){
        bNeedsAdjustment = true;
    }
    else if(vNetVega <= (-vMinusThreshold - vHysteresisBand)){
        bNeedsAdjustment = true;
    }

    if(!bNeedsAdjustment){
        return;
    }

    gVegaAdjBusy = true;
    try{
        let vOptType = fnGetVegaSellOptionType();
        let bExecOk = await fnPreInitAutoTrade(vOptType, "sell", true);
        if(bExecOk){
            gVegaAdjHourCount += 1;
            gVegaAdjLastActionTs = Date.now();
            fnGenMessage(`Vega adjust executed: NetVega ${vNetVega.toFixed(4)} | SELL ${vOptType}`, "badge bg-info", "spnGenMsg");
        }
        else{
            fnGenMessage(`Vega adjust skipped: NetVega ${vNetVega.toFixed(4)} | SELL ${vOptType}`, "badge bg-warning", "spnGenMsg");
        }
    }
    catch(objErr){
        console.log("Vega Adjustment Error", objErr);
    }
    finally{
        gVegaAdjBusy = false;
    }
}

async function fnPlaceCustomOptionLeg(pInput){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objOrderType = document.getElementById("ddlOrderType");
    let objSymbol = document.getElementById("ddlSymbols");
    let objLotSize = document.getElementById("txtLotSize");
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    if(!objApiKey.value || !objApiSecret.value){
        fnGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        return null;
    }

    let vOptionType = pInput.optionType;
    let vTransType = pInput.transType;
    let vExpiry = pInput.expiry;
    let vQty = Number(pInput.qty || 0);
    if(!(vQty > 0)){
        return null;
    }

    let objTradeDtls = await fnExecOptionLeg(
        objApiKey.value,
        objApiSecret.value,
        objOrderType.value,
        objSymbol.value,
        vExpiry,
        vOptionType,
        vTransType,
        objLotSize.value,
        vQty,
        (pInput.deltaPos ?? 0.50),
        (pInput.deltaRePos ?? 0.50),
        (pInput.deltaTP ?? 0.20),
        (pInput.deltaSL ?? 0.80)
    );

    if(objTradeDtls.status !== "success"){
        fnGenMessage("Option Leg Open Failed: " + (objTradeDtls.message || "Unknown"), `badge bg-${objTradeDtls.status || "danger"}`, "spnGenMsg");
        return null;
    }

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
    let vVegaRaw = parseFloat(objTradeDtls.data.Vega || 0);
    let vVega = fnScaleVegaByLots(vVegaRaw, parseFloat(vLotQty || 0));
    let vVegaC = (vBuyOrSell === "sell") ? -1 * Math.abs(vVega) : Math.abs(vVega);
    let vDeltaRePos = objTradeDtls.data.DeltaRePos;
    let vDeltaTP = objTradeDtls.data.DeltaTP;
    let vDeltaSL = objTradeDtls.data.DeltaSL;
    let vOpenDTVal = vDate.valueOf();

    let vExcTradeDtls = {
        TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb,
        ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : objTradeDtls.data.Expiry,
        LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC,
        Gamma : vGamma, GammaC : vGammaC, Theta : vTheta, ThetaC : vThetaC, Vega : vVega, VegaC : vVegaC,
        DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, Status : "OPEN",
        StrategyRole : pInput.strategyRole || ""
    };

    gUpdPos = false;
    gCurrPosDSS3FO.TradeData.push(vExcTradeDtls);
    localStorage.setItem("CurrPosDSS3FO", JSON.stringify(gCurrPosDSS3FO));
    let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value || 0) + vCharges;
    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];
    localStorage.setItem("HidFldsDSS3FO", JSON.stringify(gOtherFlds));
    gUpdPos = true;
    fnSetSymbolTickerList();
    fnUpdateOpenPositions();
    return vExcTradeDtls;
}

async function fnStartVegaCalendarStrategy(pOptionType){
    if(!fnCanPlaceLiveOrders("spnGenMsg")){
        return;
    }

    if(gVegaCalStrat.active){
        fnGenMessage("Vega strategy already active.", "badge bg-warning", "spnGenMsg");
        return;
    }

    // Disable legacy brokerage auto-close while Vega strategy is active.
    let objSwtBrok = document.getElementById("swtBrokRecvry");
    if(objSwtBrok && objSwtBrok.checked){
        objSwtBrok.checked = false;
        gOtherFlds[0]["SwtBrokRec"] = false;
        localStorage.setItem("HidFldsDSS3FO", JSON.stringify(gOtherFlds));
    }

    fnUpdateBuyExpiryMode();
    fnUpdateSellExpiryMode();

    let objExpiryBuy = document.getElementById("txtExpBuy");
    let objExpirySell = document.getElementById("txtExpSell");
    let objStartBuyQty = document.getElementById("txtStartBQty");
    let objMaxTheo = document.getElementById("txtMaxTheoProfit");
    let vNewBuyDelta = fnGetAutoVegaEntryDelta("buy");
    let vNewSellDelta = fnGetAutoVegaEntryDelta("sell");
    let vLongExpiry = fnSetDDMMYYYY(objExpiryBuy.value);
    let vShortExpiry = fnSetDDMMYYYY(objExpirySell.value);
    let vLongQty = Math.max(1, parseInt(objStartBuyQty.value || "1", 10));

    let objLong = await fnPlaceCustomOptionLeg({
        optionType: pOptionType,
        transType: "buy",
        expiry: vLongExpiry,
        qty: vLongQty,
        deltaPos: vNewBuyDelta,
        deltaRePos: vNewBuyDelta,
        deltaTP: 2.0,
        deltaSL: 0.0,
        strategyRole: "LONG_TERM"
    });
    if(!objLong){
        return;
    }

    let objShortFirst = await fnPlaceCustomOptionLeg({
        optionType: pOptionType,
        transType: "sell",
        expiry: vShortExpiry,
        qty: 1,
        deltaPos: vNewSellDelta,
        deltaRePos: vNewSellDelta,
        deltaTP: 0.20,
        deltaSL: 0.80,
        strategyRole: "SHORT_TERM"
    });
    if(!objShortFirst){
        return;
    }

    let vLongVegaAbs = Math.abs(fnParseNum(objLong.VegaC));
    let vShortUnitAbs = Math.abs(fnParseNum(objShortFirst.VegaC));
    let vReqShortQty = 1;
    let vReqShortQtyVega = 1;
    let vReqShortQtyGamma = 0;
    let vGammaBufPct = fnGetEntryGammaBufferPct();
    let vGammaBufMult = 1 + (vGammaBufPct / 100);
    let vLongGammaAbs = Math.abs(fnParseNum(objLong.GammaC || objLong.Gamma));
    let vShortGammaUnitAbs = Math.abs(fnParseNum(objShortFirst.GammaC || objShortFirst.Gamma));
    if(vShortUnitAbs > 0){
        vReqShortQtyVega = Math.max(1, Math.ceil(vLongVegaAbs / vShortUnitAbs));
    }
    vReqShortQty = vReqShortQtyVega;
    if(vLongGammaAbs > 0 && vShortGammaUnitAbs > 0){
        vReqShortQtyGamma = Math.max(1, Math.floor((vLongQty * vLongGammaAbs * vGammaBufMult) / vShortGammaUnitAbs));
        vReqShortQty = Math.max(1, Math.min(vReqShortQtyVega, vReqShortQtyGamma));
    }
    let vMoreShort = vReqShortQty - 1;
    if(vMoreShort > 0){
        await fnPlaceCustomOptionLeg({
            optionType: pOptionType,
            transType: "sell",
            expiry: vShortExpiry,
            qty: vMoreShort,
            deltaPos: vNewSellDelta,
            deltaRePos: vNewSellDelta,
            deltaTP: 0.20,
            deltaSL: 0.80,
            strategyRole: "SHORT_TERM"
        });
    }

    let vCurrentNetVega = fnComputeNetVega();
    let vDebit = 0;
    let objOpenLegs = gCurrPosDSS3FO.TradeData.filter(x => x.Status === "OPEN");
    for(let i=0; i<objOpenLegs.length; i++){
        let x = objOpenLegs[i];
        let vUnits = fnParseNum(x.LotSize) * fnParseNum(x.LotQty);
        if((x.StrategyRole || "") === "LONG_TERM" || (x.StrategyRole || "") === "SHORT_TERM"){
            if(x.TransType === "buy"){
                vDebit += fnParseNum(x.BuyPrice) * vUnits;
            }
            else if(x.TransType === "sell"){
                vDebit -= fnParseNum(x.SellPrice) * vUnits;
            }
        }
    }

    gVegaCalStrat.active = true;
    gVegaCalStrat.optionType = pOptionType;
    gVegaCalStrat.longExpiry = vLongExpiry;
    gVegaCalStrat.shortExpiry = vShortExpiry;
    gVegaCalStrat.shortUnitVega = vShortUnitAbs;
    gVegaCalStrat.initialExposureVega = Math.max(vLongVegaAbs, Math.abs(vCurrentNetVega));
    gVegaCalStrat.initialNetDebit = Math.abs(vDebit);
    gVegaCalStrat.initialMargin = Math.max(0, fnParseNum(document.getElementById("divBlockedMargin")?.innerText));
    gVegaCalStrat.maxTheoProfit = Math.max(0, fnParseNum(objMaxTheo ? objMaxTheo.value : 0));
    gVegaCalStrat.ivHistory = [];
    gVegaCalStrat.lastRiskTs = 0;
    fnSaveVegaCalState();

    let vStartMsg = `Vega Strategy Started (${pOptionType}). LongQty=${vLongQty}, ShortQty=${vReqShortQty}`;
    if(vReqShortQtyGamma > 0){
        vStartMsg += ` [VegaQty=${vReqShortQtyVega}, GammaCapQty=${vReqShortQtyGamma}, GammaBuf=${vGammaBufPct}%]`;
    }
    fnGenMessage(vStartMsg, "badge bg-success", "spnGenMsg");
    await fnRunVegaAdjustment();
}

async function fnRunVegaCalendarRebalance(){
    if(!gVegaCalStrat.active){
        return;
    }
    if(!fnCanPlaceLiveOrders("spnGenMsg")){
        return;
    }

    let objTol = fnGetAutoVegaTolerances();
    let vTolLower = objTol.lower;
    let vTolUpper = objTol.upper;
    let vNetVega = fnComputeNetVega();
    if(vNetVega > -vTolLower && vNetVega < vTolUpper){
        return;
    }

    let vNow = Date.now();
    const vCooldownMs = 5000;
    if(gVegaAdjBusy || (vNow - gVegaAdjLastActionTs) < vCooldownMs){
        return;
    }

    let vShortUnitAbs = Math.abs(fnParseNum(gVegaCalStrat.shortUnitVega));
    if(!(vShortUnitAbs > 0)){
        return;
    }

    let vNeedQty = Math.max(1, Math.ceil(Math.abs(vNetVega) / vShortUnitAbs));
    let vSide = (vNetVega > 0) ? "sell" : "buy";
    if(vSide === "sell"){
        let vGammaBufPct = fnGetEntryGammaBufferPct();
        let vGammaBufMult = 1 + (vGammaBufPct / 100);
        let vLongGammaBudget = 0;
        let vShortGammaUsed = 0;
        let vShortGammaUnitAbs = 0;

        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            let objLeg = gCurrPosDSS3FO.TradeData[i];
            if(objLeg.Status !== "OPEN" || objLeg.OptionType === "F"){
                continue;
            }
            let vLegQty = Math.max(0, fnParseNum(objLeg.LotQty));
            let vLegGammaUnit = Math.abs(fnParseNum(objLeg.GammaC || objLeg.Gamma));
            if(!(vLegQty > 0) || !(vLegGammaUnit > 0)){
                continue;
            }

            if(objLeg.TransType === "buy"){
                vLongGammaBudget += (vLegGammaUnit * vLegQty);
            }
            else if(objLeg.TransType === "sell"){
                vShortGammaUsed += (vLegGammaUnit * vLegQty);
                if((objLeg.OptionType === gVegaCalStrat.optionType) && (objLeg.StrategyRole === "SHORT_TERM") && !(vShortGammaUnitAbs > 0)){
                    vShortGammaUnitAbs = vLegGammaUnit;
                }
            }
        }

        if(!(vShortGammaUnitAbs > 0)){
            for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
                let objLeg = gCurrPosDSS3FO.TradeData[i];
                if(objLeg.Status !== "OPEN" || objLeg.OptionType !== gVegaCalStrat.optionType || objLeg.TransType !== "sell"){
                    continue;
                }
                let vLegGammaUnit = Math.abs(fnParseNum(objLeg.GammaC || objLeg.Gamma));
                if(vLegGammaUnit > 0){
                    vShortGammaUnitAbs = vLegGammaUnit;
                    break;
                }
            }
        }

        if(vLongGammaBudget > 0 && vShortGammaUnitAbs > 0){
            let vMaxShortGamma = vLongGammaBudget * vGammaBufMult;
            let vGammaRemain = vMaxShortGamma - vShortGammaUsed;
            let vMaxAddQtyGamma = Math.floor(vGammaRemain / vShortGammaUnitAbs);
            if(vMaxAddQtyGamma <= 0){
                fnGenMessage(`Vega rebalance skipped by gamma cap (Buf ${vGammaBufPct}%).`, "badge bg-warning", "spnGenMsg");
                return;
            }
            vNeedQty = Math.max(1, Math.min(vNeedQty, vMaxAddQtyGamma));
        }
    }
    let vEntryDelta = fnGetAutoVegaEntryDelta(vSide);
    gVegaAdjBusy = true;
    try{
        let objNewLeg = await fnPlaceCustomOptionLeg({
            optionType: gVegaCalStrat.optionType,
            transType: vSide,
            expiry: gVegaCalStrat.shortExpiry,
            qty: vNeedQty,
            deltaPos: vEntryDelta,
            deltaRePos: vEntryDelta,
            deltaTP: 0.20,
            deltaSL: 0.80,
            strategyRole: "SHORT_TERM"
        });
        if(objNewLeg){
            gVegaAdjLastActionTs = Date.now();
            fnGenMessage(`Vega rebalance: NetVega ${vNetVega.toFixed(4)} -> ${vSide.toUpperCase()} ${vNeedQty}`, "badge bg-info", "spnGenMsg");
        }
    }
    finally{
        gVegaAdjBusy = false;
    }
}

async function fnRunVegaStrategyRiskChecks(pNetPnl){
    if(!gVegaCalStrat.active){
        return;
    }
    let vNow = Date.now();
    if(vNow - gVegaCalStrat.lastRiskTs < 3000){
        return;
    }
    gVegaCalStrat.lastRiskTs = vNow;

    let vNetPnl = fnParseNum(pNetPnl);
    let vBrokAmt = fnParseNum(document.getElementById("txtBrok2Rec")?.value);
    let objCloseSwt = document.getElementById("swtBrokRecvry");
    let objCloseX = document.getElementById("txtXBrok2Rec");
    let vCloseSwtOn = !!(objCloseSwt && objCloseSwt.checked);
    let vCloseX = fnParseNum(objCloseX?.value);
    let vCloseAmt = NaN;
    if(!vCloseSwtOn){
        return;
    }
    if(vCloseSwtOn && Number.isFinite(vCloseX) && vCloseX > 0 && vBrokAmt > 0){
        vCloseAmt = vBrokAmt * vCloseX;
    }

    let vCurrIv = fnGetCurrentAvgIV();
    if(Number.isFinite(vCurrIv) && vCurrIv > 0){
        gVegaCalStrat.ivHistory.push(vCurrIv);
        if(gVegaCalStrat.ivHistory.length > 500){
            gVegaCalStrat.ivHistory.shift();
        }
    }

    let vReason = "";
    if(vCloseSwtOn && Number.isFinite(vCloseAmt) && vNetPnl >= vCloseAmt){
        vReason = `TP: ${vCloseX}x brokerage`;
    }
    else if(gVegaCalStrat.maxTheoProfit > 0 && vNetPnl >= (0.70 * gVegaCalStrat.maxTheoProfit)){
        vReason = "TP: 70% max-theo";
    }
    else if(gVegaCalStrat.initialNetDebit > 0 && vNetPnl <= (-0.25 * gVegaCalStrat.initialNetDebit)){
        vReason = "SL: -25% initial debit";
    }
    else{
        let vP10 = fnPercentile10(gVegaCalStrat.ivHistory);
        if(Number.isFinite(vCurrIv) && Number.isFinite(vP10) && gVegaCalStrat.ivHistory.length >= 40 && vCurrIv < vP10){
            vReason = "IV Stop: below 10th percentile";
        }
    }

    if(!vReason){
        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            let objLeg = gCurrPosDSS3FO.TradeData[i];
            if(objLeg.Status !== "OPEN" || objLeg.StrategyRole !== "SHORT_TERM"){
                continue;
            }
            let vDte = fnGetDaysToExpiry(objLeg.Expiry);
            if(vDte <= 2){
                vReason = "Time Exit: short leg <= 2 DTE";
                break;
            }
        }
    }

    if(vReason){
        gVegaCalStrat.active = false;
        fnSaveVegaCalState();
        fnGenMessage(`Vega Strategy Exit: ${vReason}`, "badge bg-warning", "spnGenMsg");
        fnExitAllPositions();
    }
}

async function fnRunDeltaNeutralFutures(){
    // Strategy3FO is Vega-neutral only. Delta-neutral futures hedging is disabled.
    return;
}

function fnExitAllPositions(){
    gVegaCalStrat.active = false;
    fnSaveVegaCalState();
    localStorage.removeItem(gVegaCalPausedLsKey);
    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    let objChkReLeg = document.getElementById("chkReLegBrok");

    gUpdPos = false;

    gSymbBRateList = {};
    gSymbSRateList = {};
    gSymbDeltaList = {};
    gSymbGammaList = {};
    gSymbThetaList = {};
    gSymbVegaList = {};

    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        let objLeg = gCurrPosDSS3FO.TradeData[i];
        let vStrikePrice = parseFloat(objLeg.StrikePrice);
        let vLotSize = parseFloat(objLeg.LotSize);
        let vLotQty = parseFloat(objLeg.LotQty);
        let vBuyPrice = parseFloat(objLeg.BuyPrice);
        let vSellPrice = parseFloat(objLeg.SellPrice);
        let vOptionType = objLeg.OptionType;
        let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vLotQty, vBuyPrice, vSellPrice, vOptionType);
        let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vLotQty, vCharges);

        gCurrPosDSS3FO.TradeData[i].CloseDT = vToday;
        gCurrPosDSS3FO.TradeData[i].Status = "CLOSED";

        gClsdPosDSS3FO.TradeData.push(gCurrPosDSS3FO.TradeData[i]);
    }

    let objExcTradeDtls = JSON.stringify(gClsdPosDSS3FO);
    localStorage.setItem("ClsdPosDSS3FO", objExcTradeDtls);

    gCurrPosDSS3FO = { TradeData : []};
    localStorage.removeItem("CurrPosDSS3FO");

    document.getElementById("txtBrok2Rec").value = 0;
    fnUpdHidFldSettings(0, "BrokerageAmt", "Brokerage Amount!");
    gPL = 0;
    let objTotalPL = document.getElementById("divTotalPL");
    if(objTotalPL){
        objTotalPL.innerText = "0.00";
    }

    gUpdPos = true;
    fnSetSymbolTickerList();
    fnUpdateOpenPositions();
    fnDispClosedPositions();

    if(objChkReLeg){
        setTimeout(fnExecAllLegs, 900000);
    }
}

async function fnKillSwitchCloseAll(){
    if(gKillSwitchMode){
        fnGenMessage("Kill switch already in progress.", "badge bg-warning", "spnGenMsg");
        return;
    }

    let objOpenLegs = [];
    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        let objLeg = gCurrPosDSS3FO.TradeData[i];
        if(objLeg.Status === "OPEN"){
            objOpenLegs.push({
                TradeID: objLeg.TradeID,
                TransType: objLeg.TransType,
                OptionType: objLeg.OptionType,
                Symbol: objLeg.Symbol
            });
        }
    }

    if(objOpenLegs.length === 0){
        fnGenMessage("No open legs to close.", "badge bg-warning", "spnGenMsg");
        return;
    }

    if(!confirm("Kill switch: close all open live legs now?")){
        return;
    }

    gKillSwitchMode = true;
    gReLeg = false;

    let vClosed = 0;
    try{
        for(let i=0; i<objOpenLegs.length; i++){
            let objLeg = objOpenLegs[i];
            await fnCloseOptPosition(objLeg.TradeID, objLeg.TransType, objLeg.OptionType, objLeg.Symbol, "CLOSED");
            vClosed += 1;
        }
        fnGenMessage("Kill switch executed. Closed legs: " + vClosed, "badge bg-success", "spnGenMsg");
    }
    catch(objErr){
        fnGenMessage("Kill switch error: " + objErr.message, "badge bg-danger", "spnGenMsg");
    }
    finally{
        gKillSwitchMode = false;
    }
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

    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        if((gCurrPosDSS3FO.TradeData[i].TransType === "buy") && gCurrPosDSS3FO.TradeData[i].OptionType === vOptionType){
            vRecExists = true;
            vLegID = gCurrPosDSS3FO.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosDSS3FO.TradeData[i].Symbol;
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

    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        if((gCurrPosDSS3FO.TradeData[i].Status === "OPEN") && (gCurrPosDSS3FO.TradeData[i].OptionType === pOptionType) && (gCurrPosDSS3FO.TradeData[i].TransType === "buy")){
            vLegID = gCurrPosDSS3FO.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosDSS3FO.TradeData[i].Symbol;
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
            fnGenMessage("Error to Fetch Trade Msg.", `badge bg-danger`, "spnGenMsg");
        });        
    }
}

//************ Update Live Code Here **************//
function fnLoadDefExpiryMode(){
    let objBuyExpiryMode = document.getElementById("ddlBuyExpiryMode");
    let objSellExpiryMode = document.getElementById("ddlSellExpiryMode");
    let vBuyExpiryMode = JSON.parse(localStorage.getItem("BuyExpiryModeDSS3FO"));
    let vSellExpiryMode = JSON.parse(localStorage.getItem("SellExpiryModeDSS3FO"));
    let objExpiryBuy = document.getElementById("txtExpBuy");
    let objExpirySell = document.getElementById("txtExpSell");

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
}

function fnUpdateBuyExpiryMode(){
    let objBuyExpiryMode = document.getElementById("ddlBuyExpiryMode");
    let objExpiryBuy = document.getElementById("txtExpBuy");

    fnLoadExpiryDate(objBuyExpiryMode.value, objExpiryBuy);
    localStorage.setItem("BuyExpiryModeDSS3FO", JSON.stringify(objBuyExpiryMode.value));
}

function fnUpdateSellExpiryMode(){
    let objSellExpiryMode = document.getElementById("ddlSellExpiryMode");
    let objExpirySell = document.getElementById("txtExpSell");

    fnLoadExpiryDate(objSellExpiryMode.value, objExpirySell);
    localStorage.setItem("SellExpiryModeDSS3FO", JSON.stringify(objSellExpiryMode.value));
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
        // Weekly expiry is Friday.
        // If today is Tuesday, roll to next week's Friday before placing orders.
        const vCurrDayOfWeek = vCurrDate.getDay();
        let vDaysToWeeklyFriday = (5 - vCurrDayOfWeek + 7) % 7;
        if(vCurrDayOfWeek === 2){
            vDaysToWeeklyFriday += 7;
        }

        vCurrFriday.setDate(vCurrDate.getDate() + vDaysToWeeklyFriday);
        let vDay = (vCurrFriday.getDate()).toString().padStart(2, "0");
        let vMonth = (vCurrFriday.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vCurrFriday.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiry.value = vExpValTB;
    }
    else if(pExpiryMode === "5"){
        // Bi-weekly expiry is the following Friday after weekly.
        // Keep Tuesday roll behavior consistent with weekly logic.
        const vCurrDayOfWeek = vCurrDate.getDay();
        let vDaysToBiWeeklyFriday = ((5 - vCurrDayOfWeek + 7) % 7) + 7;
        if(vCurrDayOfWeek === 2){
            vDaysToBiWeeklyFriday += 7;
        }

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
    let objSellExpDate = document.getElementById("txtExpSell");
    let objSellQty = document.getElementById("txtStartSQty");
    let objNewSellDelta = document.getElementById("txtNewSellDelta");
    let objReSellDelta = document.getElementById("txtReSellDelta");
    let objDeltaSellTP = document.getElementById("txtDeltaSellTP");
    let objDeltaSellSL = document.getElementById("txtDeltaSellSL");

    let objBuyExpDate = document.getElementById("txtExpBuy");
    let objBuyQty = document.getElementById("txtStartBQty");
    let objNewBuyDelta = document.getElementById("txtNewBuyDelta");
    let objReBuyDelta = document.getElementById("txtReBuyDelta");
    let objDeltaBuyTP = document.getElementById("txtDeltaBuyTP");
    let objDeltaBuySL = document.getElementById("txtDeltaBuySL");

    if(objSellExpDate.value === ""){
        objSellExpDate.focus();
        fnGenMessage("Please Select Sell Expiry Date", `badge bg-warning`, "spnGenMsg");
    }
    else if(objBuyExpDate.value === ""){
        objBuyExpDate.focus();
        fnGenMessage("Please Select Buy Expiry Date", `badge bg-warning`, "spnGenMsg");
    }
    else if(objSellQty.value === ""){
        objSellQty.focus();
        fnGenMessage("Please Input Sell Qty in Lots", `badge bg-warning`, "spnGenMsg");
    }
    else if(objBuyQty.value === ""){
        objBuyQty.focus();
        fnGenMessage("Please Input Buy Qty in Lots", `badge bg-warning`, "spnGenMsg");
    }
    else if(objNewSellDelta.value === ""){
        objNewSellDelta.focus();
        fnGenMessage("Please Input New Sell Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(objNewBuyDelta.value === ""){
        objNewBuyDelta.focus();
        fnGenMessage("Please Input New Buy Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(objReSellDelta.value === ""){
        objReSellDelta.focus();
        fnGenMessage("Please Input Re-Entry Sell Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(objReBuyDelta.value === ""){
        objReBuyDelta.focus();
        fnGenMessage("Please Input Re-Entry Buy Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(objDeltaSellTP.value === ""){
        objDeltaSellTP.focus();
        fnGenMessage("Please Input Delta for Sell Legs Take Profit", `badge bg-warning`, "spnGenMsg");
    }
    else if(objDeltaBuyTP.value === ""){
        objDeltaBuyTP.focus();
        fnGenMessage("Please Input Delta for Buy Legs Take Profit", `badge bg-warning`, "spnGenMsg");
    }
    else if(objDeltaSellSL.value === ""){
        objDeltaSellSL.focus();
        fnGenMessage("Please Input Delta for Sell Legs Stop Loss", `badge bg-warning`, "spnGenMsg");
    }
    else if(objDeltaBuySL.value === ""){
        objDeltaBuySL.focus();
        fnGenMessage("Please Input Delta for Buy Legs Stop Loss", `badge bg-warning`, "spnGenMsg");
    }
    else{
        fnCheckOptionLeg();
    }
}

async function fnCheckOptionLeg(){
    if(!fnCanPlaceLiveOrders("spnGenMsg")){
        return;
    }

    fnUpdateBuyExpiryMode();
    fnUpdateSellExpiryMode();

    let objChkIds = [{ ID : 'chkSellCE', TransType : 'sell', OptType : 'C' }, { ID : 'chkSellPE', TransType : 'sell', OptType : 'P' }, { ID : 'chkBuyCE', TransType : 'buy', OptType : 'C' }, { ID : 'chkBuyPE', TransType : 'buy', OptType : 'P' }];
    let vIsRecExists = false;
    let objBrokAmt = document.getElementById("txtBrok2Rec");

    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objSymbol = document.getElementById("ddlSymbols");
    let objLotSize = document.getElementById("txtLotSize");
    let objExpiryBuy = document.getElementById("txtExpBuy");
    let objExpirySell = document.getElementById("txtExpSell");
    let objNewSellDelta = document.getElementById("txtNewSellDelta");
    let objNewBuyDelta = document.getElementById("txtNewBuyDelta");
    let objStartSellQty = document.getElementById("txtStartSQty");
    let objStartBuyQty = document.getElementById("txtStartBQty");
    let objOrderType = document.getElementById("ddlOrderType");

    let objReSellDelta = document.getElementById("txtReSellDelta");
    let objReBuyDelta = document.getElementById("txtReBuyDelta");
    let objSellDeltaTP = document.getElementById("txtDeltaSellTP");
    let objBuyDeltaTP = document.getElementById("txtDeltaBuyTP");
    let objSellDeltaSL = document.getElementById("txtDeltaSellSL");
    let objBuyDeltaSL = document.getElementById("txtDeltaBuySL");

    let vUndrAsst = objSymbol.value;
    let vBuyExpiry = fnSetDDMMYYYY(objExpiryBuy.value);
    let vSellExpiry = fnSetDDMMYYYY(objExpirySell.value);
    let vExpiryNewPos = "";
    let vLotQty = 0;
    let vDeltaNPos, vDeltaRePos, vDeltaTP, vDeltaSL = 0.0;

    for(let k=0; k<objChkIds.length; k++){
        let vTransType = objChkIds[k]["TransType"];
        let vOptionType = objChkIds[k]["OptType"];
        let objChk = document.getElementById(objChkIds[k]["ID"]);
        let vTargetExpiry = (vTransType === "sell") ? vSellExpiry : vBuyExpiry;

        if(objChk.checked){
            vIsRecExists = false;

            if(gCurrPosDSS3FO.TradeData.length > 0){
                for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){

                    if((gCurrPosDSS3FO.TradeData[i].OptionType === vOptionType) && (gCurrPosDSS3FO.TradeData[i].TransType === vTransType) && (gCurrPosDSS3FO.TradeData[i].Status === "OPEN") && (gCurrPosDSS3FO.TradeData[i].Expiry === vTargetExpiry)){
                        vIsRecExists = true;
                    }
                }
            }
            if(vIsRecExists === false){
                // console.log(objChkIds[k]["TransType"] + "-" + objChkIds[k]["OptType"]);
                if(vTransType === "sell"){
                    vExpiryNewPos = vSellExpiry;
                    vLotQty = objStartSellQty.value;
                    vDeltaNPos = objNewSellDelta.value;
                    vDeltaRePos = objReSellDelta.value;
                    vDeltaTP = objSellDeltaTP.value;
                    vDeltaSL = objSellDeltaSL.value;
                }
                else if(vTransType === "buy"){
                    vExpiryNewPos = vBuyExpiry;
                    vLotQty = objStartBuyQty.value;
                    vDeltaNPos = objNewBuyDelta.value;
                    vDeltaRePos = objReBuyDelta.value;
                    vDeltaTP = objBuyDeltaTP.value;
                    vDeltaSL = objBuyDeltaSL.value;
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
                    let vVegaRaw = parseFloat(objTradeDtls.data.Vega || 0);
                    let vVega = fnScaleVegaByLots(vVegaRaw, parseFloat(vLotQty || 0));
                    let vVegaC = (vBuyOrSell === "sell") ? -1 * Math.abs(vVega) : Math.abs(vVega);
                    let vDeltaRePos = objTradeDtls.data.DeltaRePos;
                    let vDeltaTP = objTradeDtls.data.DeltaTP;
                    let vDeltaSL = objTradeDtls.data.DeltaSL;
                    let vOpenDTVal = vDate.valueOf();
                    gUpdPos = false;

                    let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : vGamma, GammaC : vGammaC, Theta : vTheta, ThetaC : vThetaC, Vega : vVega, VegaC : vVegaC, DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

                    gCurrPosDSS3FO.TradeData.push(vExcTradeDtls);
                    let objExcTradeDtls = JSON.stringify(gCurrPosDSS3FO);

                    localStorage.setItem("CurrPosDSS3FO", objExcTradeDtls);

                    let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsDSS3FO", JSON.stringify(gOtherFlds));

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
}

function fnExecOptionLeg(pApiKey, pSecret, pOrderType, pUndrAsst, pExpiry, pOptionType, pTransType, pLotSize, pLotQty, pDeltaPos, pDeltaRePos, pDeltaTP, pDeltaSL){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objTgCfg = fnGetTelegramConfig();
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
        fetch("/strategy3fo/execOptionLeg", requestOptions)
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

    if(gCurrPosDSS3FO.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            if((gCurrPosDSS3FO.TradeData[i].OptionType === pOptionType) && (gCurrPosDSS3FO.TradeData[i].TransType === pTransType) && (gCurrPosDSS3FO.TradeData[i].Status === "OPEN")){
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

async function fnPreInitAutoTrade(pOptionType, pTransType, pAllowDuplicate){
    if(!fnCanPlaceLiveOrders("spnGenMsg")){
        return false;
    }
    let bAllowDuplicate = !!pAllowDuplicate;

    let vIsRecExists = false;
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let vExpiryNewPos = "";

    fnUpdateBuyExpiryMode();
    fnUpdateSellExpiryMode();

    let objExpiryBuy = document.getElementById("txtExpBuy");
    let objExpirySell = document.getElementById("txtExpSell");
    let vBuyExpiry = fnSetDDMMYYYY(objExpiryBuy.value);
    let vSellExpiry = fnSetDDMMYYYY(objExpirySell.value);

    if(pTransType === "sell"){
        vExpiryNewPos = vSellExpiry;
    }
    else if(pTransType === "buy"){
        vExpiryNewPos = vBuyExpiry;
    }

    if(!bAllowDuplicate && gCurrPosDSS3FO.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            if((gCurrPosDSS3FO.TradeData[i].OptionType === pOptionType) && (gCurrPosDSS3FO.TradeData[i].TransType === pTransType) && (gCurrPosDSS3FO.TradeData[i].Status === "OPEN") && (gCurrPosDSS3FO.TradeData[i].Expiry === vExpiryNewPos)){
                vIsRecExists = true;
            }
        }
    }

    if(vIsRecExists === false){
        let objApiKey = document.getElementById("txtUserAPIKey");
        let objApiSecret = document.getElementById("txtAPISecret");
        let objOrderType = document.getElementById("ddlOrderType");
        let objSymbol = document.getElementById("ddlSymbols");
        let objLotSize = document.getElementById("txtLotSize");
        let objStartSellQty = document.getElementById("txtStartSQty");
        let objStartBuyQty = document.getElementById("txtStartBQty");
        let objNewSellDelta = document.getElementById("txtNewSellDelta");
        let objNewBuyDelta = document.getElementById("txtNewBuyDelta");

        let objReSellDelta = document.getElementById("txtReSellDelta");
        let objReBuyDelta = document.getElementById("txtReBuyDelta");
        let objSellDeltaTP = document.getElementById("txtDeltaSellTP");
        let objBuyDeltaTP = document.getElementById("txtDeltaBuyTP");
        let objSellDeltaSL = document.getElementById("txtDeltaSellSL");
        let objBuyDeltaSL = document.getElementById("txtDeltaBuySL");

        let vUndrAsst = objSymbol.value;
        let vLotQty = 0;
        let vDeltaNPos, vDeltaRePos, vDeltaTP, vDeltaSL = 0.0;

        // console.log(objChkIds[k]["TransType"] + "-" + objChkIds[k]["OptType"]);
        if(pTransType === "sell"){
            vExpiryNewPos = vSellExpiry;
            vLotQty = objStartSellQty.value;
            vDeltaNPos = objNewSellDelta.value;
            vDeltaRePos = objReSellDelta.value;
            vDeltaTP = objSellDeltaTP.value;
            vDeltaSL = objSellDeltaSL.value;
        }
        else if(pTransType === "buy"){
            vExpiryNewPos = vBuyExpiry;
            vLotQty = objStartBuyQty.value;
            vDeltaNPos = objNewBuyDelta.value;
            vDeltaRePos = objReBuyDelta.value;
            vDeltaTP = objBuyDeltaTP.value;
            vDeltaSL = objBuyDeltaSL.value;
        }

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
            let vVegaRaw = parseFloat(objTradeDtls.data.Vega || 0);
            let vVega = fnScaleVegaByLots(vVegaRaw, parseFloat(vLotQty || 0));
            let vVegaC = (vBuyOrSell === "sell") ? -1 * Math.abs(vVega) : Math.abs(vVega);
            let vDeltaRePos = objTradeDtls.data.DeltaRePos;
            let vDeltaTP = objTradeDtls.data.DeltaTP;
            let vDeltaSL = objTradeDtls.data.DeltaSL;
            let vOpenDTVal = vDate.valueOf();
            gUpdPos = false;

            let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : vGamma, GammaC : vGammaC, Theta : vTheta, ThetaC : vThetaC, Vega : vVega, VegaC : vVegaC, DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

            gCurrPosDSS3FO.TradeData.push(vExcTradeDtls);
            let objExcTradeDtls = JSON.stringify(gCurrPosDSS3FO);

            localStorage.setItem("CurrPosDSS3FO", objExcTradeDtls);

            let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
            gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            localStorage.setItem("HidFldsDSS3FO", JSON.stringify(gOtherFlds));


            gUpdPos = true;
            fnSetSymbolTickerList();
            fnUpdateOpenPositions();
            return true;
        }
        else{
            fnGenMessage("Option Leg Open Failed: " + objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
            return false;
        }
    }
    else{
        fnGenMessage("Same option side already open for selected expiry!", `badge bg-warning`, "spnGenMsg");
        return false;
    }

    return false;
}

async function fnPreInitAutoFutTrade(pOptionType, pTransType, pQtyOverride){
    if(!fnCanPlaceLiveOrders("spnGenMsg")){
        return;
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

    if(!objApiKey.value || !objApiSecret.value){
        fnGenMessage("Please login with API credentials first.", "badge bg-warning", "spnGenMsg");
        return;
    }
    if(!objSymbol.value){
        fnGenMessage("Please select symbol first.", "badge bg-warning", "spnGenMsg");
        return;
    }
    if(!(parseFloat(objLotSize.value) > 0)){
        fnGenMessage("Invalid lot size for futures order.", "badge bg-warning", "spnGenMsg");
        return;
    }
    let vQtyToUse = (Number.isFinite(Number(pQtyOverride)) && Number(pQtyOverride) > 0) ? Number(pQtyOverride) : parseFloat(objLotQty.value);
    if(!(vQtyToUse > 0)){
        fnGenMessage("Invalid futures quantity.", "badge bg-warning", "spnGenMsg");
        return;
    }

    let vUndrAsst = objSymbol.value + "USD";
    let vRetryProgressTimer = null;
    if(objOrderType.value === "limit_order"){
        let vRetryAttempt = 0;
        fnGenMessage(`Futures ${pTransType.toUpperCase()} limit in progress: retry 0/5`, "badge bg-info", "spnGenMsg");
        vRetryProgressTimer = setInterval(() => {
            vRetryAttempt += 1;
            if(vRetryAttempt > 5){
                vRetryAttempt = 5;
            }
            fnGenMessage(`Futures ${pTransType.toUpperCase()} limit in progress: retry ${vRetryAttempt}/5`, "badge bg-info", "spnGenMsg");
        }, 8000);
    }

    let objTradeDtls = null;
    try{
        objTradeDtls = await fnExecFuturesLeg(objApiKey.value, objApiSecret.value, objOrderType.value, vUndrAsst, pOptionType, pTransType, objLotSize.value, vQtyToUse, objPointsTP.value, objPointsSL.value);
    }
    finally{
        if(vRetryProgressTimer !== null){
            clearInterval(vRetryProgressTimer);
        }
    }

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
        let vOptType = objTradeDtls.data.OptionType;
        let vStrPrice = parseInt(objTradeDtls.data.Strike);
        let vLotSize = objTradeDtls.data.LotSize;
        let vLotQty = objTradeDtls.data.LotQty;
        let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
        let vBestSell = parseFloat(objTradeDtls.data.BestBid);
        let vDeltaAbs = 0.10;
        let vDelta = (pTransType === "sell") ? -vDeltaAbs : vDeltaAbs;
        let vDeltaC = vDelta;
        let vPointsTP = objTradeDtls.data.PointsTP;
        let vPointsSL = objTradeDtls.data.PointsSL;
        let vRateTP = objTradeDtls.data.RateTP;
        let vRateSL = objTradeDtls.data.RateSL;
        let vOpenDTVal = vDate.valueOf();
        gUpdPos = false;

        let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vOptType, StrikePrice : vStrPrice, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : 0, GammaC : 0, Theta : 0, ThetaC : 0, Vega : 0, VegaC : 0, PointsTP : vPointsTP, RateTP : vRateTP, PointsSL : vPointsSL, RateSL : vRateSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

        gCurrPosDSS3FO.TradeData.push(vExcTradeDtls);
        let objExcTradeDtls = JSON.stringify(gCurrPosDSS3FO);

        localStorage.setItem("CurrPosDSS3FO", objExcTradeDtls);

        let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vOptType);
        gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

        localStorage.setItem("HidFldsDSS3FO", JSON.stringify(gOtherFlds));

        gUpdPos = true;
        fnSetSymbolTickerList();
        fnUpdateOpenPositions();
    }
    else{
        fnGenMessage("Futures Leg Open Failed: " + (objTradeDtls.message || "Unknown error"), `badge bg-${objTradeDtls.status || "danger"}`, "spnGenMsg");
    }
}

function fnExecFuturesLeg(pApiKey, pSecret, pOrderType, pUndrAsst, pOptionType, pTransType, pLotSize, pLotQty, pPointsTP, pPointsSL){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objTgCfg = fnGetTelegramConfig();
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
        fetch("/strategy3fo/execFutureLeg", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                let vErrCode = "";
                let vClientIP = "";

                if(objResult.data && objResult.data.response && objResult.data.response.body && objResult.data.response.body.error){
                    vErrCode = objResult.data.response.body.error.code || "";
                    vClientIP = objResult.data.response.body.error.context?.client_ip || "";
                }
                else if(objResult.data && objResult.data.response && typeof objResult.data.response.text === "string"){
                    try{
                        let objErrJson = JSON.parse(objResult.data.response.text);
                        vErrCode = objErrJson?.error?.code || "";
                        vClientIP = objErrJson?.error?.context?.client_ip || "";
                    }
                    catch(objErr){
                        vErrCode = "";
                    }
                }

                if(vErrCode === "ip_not_whitelisted_for_api_key"){
                    resolve({ "status": objResult.status, "message": vErrCode + (vClientIP ? (" IP: " + vClientIP) : ""), "data": objResult.data });
                }
                else if(vErrCode){
                    resolve({ "status": objResult.status, "message": vErrCode + " Contact Admin!", "data": objResult.data });
                }
                else{
                    resolve({ "status": objResult.status, "message": objResult.message || "Error while placing futures order.", "data": objResult.data || "" });
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

    if(gCurrPosDSS3FO.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            if((gCurrPosDSS3FO.TradeData[i].OptionType === pOptionType) && (gCurrPosDSS3FO.TradeData[i].TransType === pTransType) && (gCurrPosDSS3FO.TradeData[i].Status === "OPEN")){
                vLegID = gCurrPosDSS3FO.TradeData[i].TradeID;
                vTransType = gCurrPosDSS3FO.TradeData[i].TransType;
                vSymbol = gCurrPosDSS3FO.TradeData[i].Symbol;
                
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
    // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSS3FO"));
    // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSS3FO"));

    let objApiKey1 = document.getElementById("txtUserAPIKey");
    let objApiSecret1 = document.getElementById("txtAPISecret");

    let objSymbol = document.getElementById("ddlSymbols");
    let objLotSize = document.getElementById("txtLotSize");
    let objBQty = document.getElementById("txtStartBQty");
    let objSQty = document.getElementById("txtStartSQty");
    let objExpiryBuy = document.getElementById("txtExpBuy");
    let objExpirySell = document.getElementById("txtExpSell");
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
                let vVegaRaw = parseFloat(objTradeDtls.data.Vega);
                let vVega = fnScaleVegaByLots(vVegaRaw, parseFloat(vQty || 0));
                let vGamma = parseFloat(objTradeDtls.data.Gamma);
                let vRho = parseFloat(objTradeDtls.data.Rho);
                let vMarkIV = parseFloat(objTradeDtls.data.MarkIV);
                let vTheta = parseFloat(objTradeDtls.data.Theta);
                
                let vDeltaC = parseFloat(objTradeDtls.data.Delta);
                let vVegaC = (vTransType === "sell") ? -1 * Math.abs(vVega) : Math.abs(vVega);
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
                    //     localStorage.setItem("CETrdCntDSS3FO", objTrdCountCE);
                    // }
                    // else if(pOptionType === "P"){
                    //     objTrdCountPE = objTrdCountPE + 1;
                    //     localStorage.setItem("PETrdCntDSS3FO", objTrdCountPE);
                    // }
                }
                else if(vTransType === "buy"){
                    vTradeSL = vBestBuy - vRateSL;
                    vTradeTP = vBestBuy + vRateTP;
                }

                let vExcTradeDtls = { ClientOrderID : vClientID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vTransType, OptionType : vOptionType, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseInt(vQty), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, Vega : vVega, Gamma : vGamma, Rho : vRho, MarkIV : vMarkIV, Theta : vTheta, DeltaC : vDeltaC, VegaC : vVegaC, GammaC : vGammaC, RhoC : vRhoC, MarkIVC : vMarkIVC, ThetaC : vThetaC, OpenDTVal : vOrdId, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, DeltaNP : vDeltaNPos, TradeSL : vTradeSL, TradeTP : vTradeTP, Status : "OPEN" };
                
                gCurrPosDSS3FO.TradeData.push(vExcTradeDtls);

                let objExcTradeDtls = JSON.stringify(gCurrPosDSS3FO);

                localStorage.setItem("CurrPosDSS3FO", objExcTradeDtls);

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

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objTgCfg = fnGetTelegramConfig();
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

        fetch("/strategy3fo/execOption", requestOptions)
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

    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        let vStatus = gCurrPosDSS3FO.TradeData[i].Status;
        let vTransType = gCurrPosDSS3FO.TradeData[i].TransType;
        let vExOptionType = gCurrPosDSS3FO.TradeData[i].OptionType;

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
        if(gCurrPosDSS3FO.TradeData.length === 0){
            objCurrTradeList.innerHTML = '<tr><td colspan="16"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Running Trades Yet</div></td></tr>';
        }
        else{
            let vTempHtml = "";
            let vNetPL = 0;
            let vTotalCharges = 0;
            let vTotalDelta = 0;
            let vTotalDeltaC = 0;
            let vTotalGamma = 0;
            let vTotalGammaC = 0;
            let vTotalTheta = 0;
            let vTotalThetaC = 0;
            let vTotalVega = 0;
            let vTotalVegaC = 0;

            for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
                if(gCurrPosDSS3FO.TradeData[i].Status !== "OPEN"){
                    continue;
                }
                let vLegID = gCurrPosDSS3FO.TradeData[i].TradeID;
                let vDelta = parseFloat(gCurrPosDSS3FO.TradeData[i].Delta || 0);
                let vDeltaC = parseFloat(gCurrPosDSS3FO.TradeData[i].DeltaC || gCurrPosDSS3FO.TradeData[i].Delta || 0);
                let vGamma = parseFloat(gCurrPosDSS3FO.TradeData[i].Gamma || 0);
                let vGammaC = parseFloat(gCurrPosDSS3FO.TradeData[i].GammaC || gCurrPosDSS3FO.TradeData[i].Gamma || 0);
                let vTheta = parseFloat(gCurrPosDSS3FO.TradeData[i].Theta || 0);
                let vThetaC = parseFloat(gCurrPosDSS3FO.TradeData[i].ThetaC || gCurrPosDSS3FO.TradeData[i].Theta || 0);
                let vVega = parseFloat(gCurrPosDSS3FO.TradeData[i].Vega || 0);
                let vVegaC = parseFloat(gCurrPosDSS3FO.TradeData[i].VegaC || gCurrPosDSS3FO.TradeData[i].Vega || 0);
                let vLotSize = gCurrPosDSS3FO.TradeData[i].LotSize;
                let vQty = gCurrPosDSS3FO.TradeData[i].LotQty;
                let vOpenDT = gCurrPosDSS3FO.TradeData[i].OpenDT;
                let vCloseDT = gCurrPosDSS3FO.TradeData[i].CloseDT;
                let vOptionType = gCurrPosDSS3FO.TradeData[i].OptionType;
                let vBuyPrice = gCurrPosDSS3FO.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosDSS3FO.TradeData[i].SellPrice;
                let vStatus = gCurrPosDSS3FO.TradeData[i].Status;
                let vStrikePrice = parseFloat(gCurrPosDSS3FO.TradeData[i].StrikePrice);
                let vSymbol = gCurrPosDSS3FO.TradeData[i].Symbol;
                let vTransType = gCurrPosDSS3FO.TradeData[i].TransType;

                let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionType);
                let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
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

                if(vCloseDT === undefined){
                    vCloseDT = "-";
                }

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
        fnUpdateVegaAdjustmentDetails();
        fnDispClosedPositions();
    }
}

function fnDispClosedPositions(){
    let objClosedTradeList = document.getElementById("tBodyClosedTrades");
    if(!objClosedTradeList){
        return;
    }

    const objMapClosedById = new Map();

    if(gClsdPosDSS3FO && Array.isArray(gClsdPosDSS3FO.TradeData)){
        for(let i=0; i<gClsdPosDSS3FO.TradeData.length; i++){
            let objLeg = gClsdPosDSS3FO.TradeData[i];
            if(objLeg && objLeg.TradeID !== undefined){
                objMapClosedById.set(String(objLeg.TradeID), objLeg);
            }
        }
    }

    if(gCurrPosDSS3FO && Array.isArray(gCurrPosDSS3FO.TradeData)){
        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            let objLeg = gCurrPosDSS3FO.TradeData[i];
            if(objLeg && objLeg.Status !== "OPEN" && objLeg.TradeID !== undefined){
                objMapClosedById.set(String(objLeg.TradeID), objLeg);
            }
        }
    }

    const objAllClosedRows = Array.from(objMapClosedById.values());

    if(objAllClosedRows.length === 0){
        objClosedTradeList.innerHTML = '<tr><td colspan="16"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 32px;">No Closed Trades Yet</div></td></tr>';
        return;
    }

    let vTempHtml = "";
    let vTotalTrades = 0;
    let vTotalCharges = 0;
    let vNetPL = 0;
    let vTotalDelta = 0;
    let vTotalDeltaC = 0;
    let vTotalGamma = 0;
    let vTotalGammaC = 0;
    let vTotalTheta = 0;
    let vTotalThetaC = 0;
    let vTotalVega = 0;
    let vTotalVegaC = 0;

    for(let i=0; i<objAllClosedRows.length; i++){
        let objLeg = objAllClosedRows[i];

        let vLegID = objLeg.TradeID;
        let vStatus = objLeg.Status || "CLOSED";
        let vDelta = parseFloat(objLeg.Delta || 0);
        let vDeltaC = parseFloat(objLeg.DeltaC || objLeg.Delta || 0);
        let vGamma = parseFloat(objLeg.Gamma || 0);
        let vGammaC = parseFloat(objLeg.GammaC || objLeg.Gamma || 0);
        let vTheta = parseFloat(objLeg.Theta || 0);
        let vThetaC = parseFloat(objLeg.ThetaC || objLeg.Theta || 0);
        let vVega = parseFloat(objLeg.Vega || 0);
        let vVegaC = parseFloat(objLeg.VegaC || objLeg.Vega || 0);
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

        vTempHtml += "<tr>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:center;"><i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
        vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + "</div></td>";
        vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGammaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGamma).toFixed(4) + "</div></td>";
        vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vThetaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTheta).toFixed(4) + "</div></td>";
        vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVegaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVega).toFixed(4) + "</div></td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vSymbol + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vTransType + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vLotSize + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vQty + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (vBuyPrice).toFixed(2) + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (vSellPrice).toFixed(2) + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (parseFloat(vCharges)).toFixed(2) + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (vPL).toFixed(2) + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vOpenDT + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vCloseDT + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:right;">' + vStatus + "</td>";
        vTempHtml += "</tr>";
    }

    vTempHtml += '<tr>';
    vTempHtml += '<td></td>';
    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalDelta).toFixed(2) + '</div></td>';
    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalGammaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalGamma).toFixed(4) + '</div></td>';
    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalThetaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalTheta).toFixed(4) + '</div></td>';
    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalVegaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalVega).toFixed(4) + '</div></td>';
    vTempHtml += '<td></td><td></td><td></td><td></td><td></td><td></td>';
    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">' + (vTotalCharges).toFixed(2) + '</td>';
    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">' + (vNetPL).toFixed(2) + "</td>";
    vTempHtml += '<td></td><td></td><td></td>';
    vTempHtml += '</tr>';
    objClosedTradeList.innerHTML = vTempHtml;
}

function fnRenderStrategyScorecard(pRows, pUseExchangeRows){
    const objStats = fnBuildStrategyStats(pRows, pUseExchangeRows);
    fnSetScoreCell("scTotalTrades", objStats.totalTrades.toString());
    fnSetScoreCell("scWinRate", objStats.winRate.toFixed(2) + "%");
    fnSetScoreCell("scNetPnl", objStats.netPnl.toFixed(2));
    fnSetScoreCell("scGrossProfit", objStats.grossProfit.toFixed(2));
    fnSetScoreCell("scGrossLoss", objStats.grossLoss.toFixed(2));
    fnSetScoreCell("scProfitFactor", objStats.profitFactorTxt);
    fnSetScoreCell("scExpectancy", objStats.expectancy.toFixed(2));
    fnSetScoreCell("scAvgWin", objStats.avgWin.toFixed(2));
    fnSetScoreCell("scAvgLoss", objStats.avgLoss.toFixed(2));
    fnSetScoreCell("scMaxDD", objStats.maxDrawdown.toFixed(2));
    fnSetScoreCell("scMaxLossTrade", objStats.maxLossTrade.toFixed(2));
    fnSetScoreCell("scMaxWinTrade", objStats.maxWinTrade.toFixed(2));
    fnSetScoreCell("scLoseStreak", objStats.longestLosingStreak.toString());
    fnSetScoreCell("scWorstDay", objStats.worstDayPnl.toFixed(2));
    fnSetScoreCell("scWorstDayDate", objStats.worstDayDate || "-");
}

function fnSetScoreCell(pId, pVal){
    let objCell = document.getElementById(pId);
    if(objCell){
        objCell.innerText = pVal;
    }
}

function fnBuildStrategyStats(pRows, pUseExchangeRows){
    let objStats = {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        netPnl: 0,
        grossProfit: 0,
        grossLoss: 0,
        avgWin: 0,
        avgLoss: 0,
        expectancy: 0,
        winRate: 0,
        maxDrawdown: 0,
        maxLossTrade: 0,
        maxWinTrade: 0,
        longestLosingStreak: 0,
        worstDayPnl: 0,
        worstDayDate: "",
        profitFactorTxt: "0.00"
    };

    if(!Array.isArray(pRows) || pRows.length === 0){
        return objStats;
    }

    const objTradeRows = [];
    const objDayPnL = {};
    let vCumPnl = 0;
    let vPeak = 0;
    let vCurrLoseStreak = 0;
    let vMaxLoseStreak = 0;

    for(let i=0; i<pRows.length; i++){
        let objLeg = pRows[i];
        let vPnl = fnGetClosedRowPnl(objLeg, pUseExchangeRows);
        let vCloseTs = fnGetClosedEndTs(objLeg, pUseExchangeRows);
        let vCloseDate = fnGetClosedDayKey(vCloseTs);

        objTradeRows.push({ pnl: vPnl, closeTs: vCloseTs, closeDate: vCloseDate });
    }

    objTradeRows.sort((a, b) => a.closeTs - b.closeTs);
    objStats.totalTrades = objTradeRows.length;

    for(let i=0; i<objTradeRows.length; i++){
        let vPnl = Number(objTradeRows[i].pnl || 0);
        let vDay = objTradeRows[i].closeDate;

        objStats.netPnl += vPnl;
        if(vPnl > 0){
            objStats.wins += 1;
            objStats.grossProfit += vPnl;
            vCurrLoseStreak = 0;
        }
        else if(vPnl < 0){
            objStats.losses += 1;
            objStats.grossLoss += Math.abs(vPnl);
            vCurrLoseStreak += 1;
            if(vCurrLoseStreak > vMaxLoseStreak){
                vMaxLoseStreak = vCurrLoseStreak;
            }
        }
        else{
            vCurrLoseStreak = 0;
        }

        if(vPnl < objStats.maxLossTrade){
            objStats.maxLossTrade = vPnl;
        }
        if(vPnl > objStats.maxWinTrade){
            objStats.maxWinTrade = vPnl;
        }

        vCumPnl += vPnl;
        if(vCumPnl > vPeak){
            vPeak = vCumPnl;
        }
        let vDD = vPeak - vCumPnl;
        if(vDD > objStats.maxDrawdown){
            objStats.maxDrawdown = vDD;
        }

        if(!objDayPnL[vDay]){
            objDayPnL[vDay] = 0;
        }
        objDayPnL[vDay] += vPnl;
    }

    objStats.longestLosingStreak = vMaxLoseStreak;
    objStats.avgWin = (objStats.wins > 0) ? (objStats.grossProfit / objStats.wins) : 0;
    objStats.avgLoss = (objStats.losses > 0) ? (objStats.grossLoss / objStats.losses) : 0;
    objStats.expectancy = (objStats.totalTrades > 0) ? (objStats.netPnl / objStats.totalTrades) : 0;
    objStats.winRate = (objStats.totalTrades > 0) ? ((objStats.wins / objStats.totalTrades) * 100) : 0;
    objStats.profitFactorTxt = (objStats.grossLoss > 0) ? (objStats.grossProfit / objStats.grossLoss).toFixed(2) : (objStats.grossProfit > 0 ? "INF" : "0.00");

    let vWorstDay = 0;
    let vWorstDayDate = "";
    Object.keys(objDayPnL).forEach((vDay) => {
        if(vWorstDayDate === "" || objDayPnL[vDay] < vWorstDay){
            vWorstDay = objDayPnL[vDay];
            vWorstDayDate = vDay;
        }
    });
    objStats.worstDayPnl = vWorstDay;
    objStats.worstDayDate = vWorstDayDate;

    return objStats;
}

function fnGetClosedRowPnl(pLeg, pUseExchangeRows){
    if(pUseExchangeRows){
        return Number(pLeg?.meta_data?.pnl || 0);
    }

    let vOptionType = pLeg.OptionType || "";
    let vStrikePrice = parseFloat(pLeg.StrikePrice || 0);
    let vLotSize = parseFloat(pLeg.LotSize || 0);
    let vQty = parseFloat(pLeg.LotQty || 0);
    let vBuyPrice = parseFloat(pLeg.BuyPrice || 0);
    let vSellPrice = parseFloat(pLeg.SellPrice || 0);
    let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionType);
    return fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
}

function fnGetClosedEndTs(pLeg, pUseExchangeRows){
    if(pUseExchangeRows){
        let vTs = new Date(pLeg?.updated_at || pLeg?.created_at || "").getTime();
        return Number.isFinite(vTs) ? vTs : 0;
    }

    let vCloseDT = (pLeg?.CloseDT || pLeg?.OpenDT || "").toString().trim();
    if(vCloseDT === ""){
        return 0;
    }
    let vTs = new Date(vCloseDT).getTime();
    if(Number.isFinite(vTs)){
        return vTs;
    }

    let objParts = vCloseDT.split(" ");
    let objDate = (objParts[0] || "").split("-");
    let objTime = (objParts[1] || "00:00:00").split(":");
    if(objDate.length < 3){
        return 0;
    }
    let vDD = Number(objDate[0]);
    let vMM = Number(objDate[1]) - 1;
    let vYYYY = Number(objDate[2]);
    let vHH = Number(objTime[0] || 0);
    let vMI = Number(objTime[1] || 0);
    let vSS = Number(objTime[2] || 0);
    let vTs2 = new Date(vYYYY, vMM, vDD, vHH, vMI, vSS).getTime();
    return Number.isFinite(vTs2) ? vTs2 : 0;
}

function fnGetClosedDayKey(pTs){
    let vDate = new Date(Number(pTs || 0));
    if(Number.isNaN(vDate.getTime())){
        return "Unknown";
    }
    let vYYYY = vDate.getFullYear();
    let vMM = String(vDate.getMonth() + 1).padStart(2, "0");
    let vDD = String(vDate.getDate()).padStart(2, "0");
    return `${vYYYY}-${vMM}-${vDD}`;
}

function fnGetClosedStartTs(pLeg, pUseExchangeRows){
    if(pUseExchangeRows){
        let vTs = new Date(pLeg?.created_at || "").getTime();
        return Number.isFinite(vTs) ? vTs : 0;
    }

    let vOpenDT = (pLeg?.OpenDT || "").toString().trim();
    if(vOpenDT === ""){
        return 0;
    }

    let objParts = vOpenDT.split(" ");
    let objDate = (objParts[0] || "").split("-");
    let objTime = (objParts[1] || "00:00:00").split(":");
    if(objDate.length < 3){
        let vDirect = new Date(vOpenDT).getTime();
        return Number.isFinite(vDirect) ? vDirect : 0;
    }

    let vDD = Number(objDate[0]);
    let vMM = Number(objDate[1]) - 1;
    let vYYYY = Number(objDate[2]);
    let vHH = Number(objTime[0] || 0);
    let vMI = Number(objTime[1] || 0);
    let vSS = Number(objTime[2] || 0);
    let vTs = new Date(vYYYY, vMM, vDD, vHH, vMI, vSS).getTime();

    return Number.isFinite(vTs) ? vTs : 0;
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
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objBrokAmt = document.getElementById("txtBrok2Rec");

    let vLegLotSize = 0;
    let vLegLotQty = 0;
    for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
        if(gCurrPosDSS3FO.TradeData[i].TradeID === pLegID){
            vLegLotSize = parseFloat(gCurrPosDSS3FO.TradeData[i].LotSize || 0);
            vLegLotQty = parseFloat(gCurrPosDSS3FO.TradeData[i].LotQty || 0);
            break;
        }
    }

    let vBestRate = 0;
    let objCloseRes = await fnCloseLiveLeg(objApiKey.value, objApiSecret.value, pSymbol, pTransType, pOptionType, vLegLotSize, vLegLotQty);
    if(objCloseRes.status === "success"){
        vBestRate = parseFloat(objCloseRes.data.ClosePrice || 0);
    }

    if(!(vBestRate > 0)){
        let objBestRates = await fnGetBestRatesBySymbId(objApiKey.value, objApiSecret.value, pSymbol);
        if(objBestRates.status === "success"){
            if(pTransType === "sell"){
                vBestRate = parseFloat(objBestRates.data.result.quotes.best_ask);
            }
            else if(pTransType === "buy"){
                vBestRate = parseFloat(objBestRates.data.result.quotes.best_bid);
            }
        }
    }
    
    if(vBestRate > 0){
        let vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

        let vStrikePrice = 0;
        let vLotSize = 0;
        let vLotQty = 0;
        let vBuyPrice = 0;
        let vSellPrice = 0;

        gUpdPos = false;

        gSymbBRateList = {};
        gSymbSRateList = {};
        gSymbDeltaList = {};
        gSymbGammaList = {};
        gSymbThetaList = {};
        gSymbVegaList = {};

        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            if(gCurrPosDSS3FO.TradeData[i].TradeID === pLegID){                
                if(pTransType === "sell"){
                    gCurrPosDSS3FO.TradeData[i].BuyPrice = vBestRate;
                }
                else if(pTransType === "buy"){
                    gCurrPosDSS3FO.TradeData[i].SellPrice = vBestRate;
                }
                gCurrPosDSS3FO.TradeData[i].CloseDT = vToday;
                gCurrPosDSS3FO.TradeData[i].Status = pStatus;

                vStrikePrice = gCurrPosDSS3FO.TradeData[i].StrikePrice;
                vLotSize = gCurrPosDSS3FO.TradeData[i].LotSize;
                vLotQty = gCurrPosDSS3FO.TradeData[i].LotQty;
                vBuyPrice = gCurrPosDSS3FO.TradeData[i].BuyPrice;
                vSellPrice = gCurrPosDSS3FO.TradeData[i].SellPrice;
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDSS3FO);
        localStorage.setItem("CurrPosDSS3FO", objExcTradeDtls);


        let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vLotQty, vBuyPrice, vSellPrice, pOptionType);
        let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vLotQty, vCharges);

        // console.log(vPL);
        if(pStatus === "CLOSED"){
            if(vPL > 0){
                if(parseFloat(objBrokAmt.value) >= vCharges){
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) - vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsDSS3FO", JSON.stringify(gOtherFlds));
                }
            }
            else if(!gKillSwitchMode){
                // Intentionally no auto-open buy-leg action on sell SL.
            }
        }
        else{
            //This part is not required in Real code
            // gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            // objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            // localStorage.setItem("HidFldsDSS3FO", JSON.stringify(gOtherFlds));
        }


        gUpdPos = true;
        fnSetSymbolTickerList();
        fnUpdateOpenPositions();

        if(gReLeg && !gKillSwitchMode){
            gReLeg = false;
            fnPreInitAutoTrade(pOptionType, pTransType);
        }
    }
    else{
        fnGenMessage("Unable to close leg: no executable price.", "badge bg-danger", "spnGenMsg");
    }
}

function fnCloseLiveLeg(pApiKey, pApiSecret, pSymbol, pTransType, pOptionType, pLotSize, pLotQty){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");
        let objOrderType = document.getElementById("ddlOrderType");
        let vOrderType = objOrderType?.value || "market_order";

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "Symbol" : pSymbol,
            "TransType" : pTransType,
            "OptionType" : pOptionType,
            "LotSize" : pLotSize,
            "LotQty" : pLotQty,
            "OrderType" : vOrderType
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/strategy3fo/closeLeg", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
        })
        .catch(error => {
            resolve({ "status": "danger", "message": "Error at close leg.", "data": "" });
        });
    });

    return objPromise;
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

        fetch("/strategy3fo/getBestRatesBySymb", requestOptions)
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
        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            if(gCurrPosDSS3FO.TradeData[i].TradeID === parseInt(objLegID.value)){
                gCurrPosDSS3FO.TradeData[i].LotSize = parseFloat(objLotSize.value);
                gCurrPosDSS3FO.TradeData[i].LotQty = parseInt(objQty.value);
                gCurrPosDSS3FO.TradeData[i].BuyPrice = parseFloat(objBuyPrice.value);
                gCurrPosDSS3FO.TradeData[i].SellPrice = parseFloat(objSellPrice.value);
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDSS3FO);
        localStorage.setItem("CurrPosDSS3FO", objExcTradeDtls);
        fnLoadCurrentTradePos();
        fnGenMessage("Option Leg Updated!", `badge bg-success`, "spnGenMsg");
        $('#mdlLegEditor').modal('hide');
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

        let vDelRec = null;

        for(let i=0; i<gCurrPosDSS3FO.TradeData.length; i++){
            if(gCurrPosDSS3FO.TradeData[i].TradeID === pLegID){
                vDelRec = i;
            }
        }

        gCurrPosDSS3FO.TradeData.splice(vDelRec, 1);

        let objExcTradeDtls = JSON.stringify(gCurrPosDSS3FO);
        localStorage.setItem("CurrPosDSS3FO", objExcTradeDtls);
        gUpdPos = true;

        fnSetSymbolTickerList();
        fnUpdateOpenPositions();
    }
}

function fnClearLocalStorageTemp(){
    localStorage.removeItem("CurrPosDSS3FO");
    localStorage.removeItem("ClsdPosDSS3FO");
    localStorage.setItem("QtyMulDSS3FO", 0);
    localStorage.removeItem("NetLimitDSS3FO");
    gCurrPosDSS3FO = { TradeData : []};
    // localStorage.removeItem("FutStratDSS3FO");
    // localStorage.removeItem("StrategyDSS3FO");
    // localStorage.removeItem("StartQtyBuyDSS3FO");
    localStorage.removeItem("CETrdCntDSS3FO");
    localStorage.removeItem("PETrdCntDSS3FO");
    localStorage.removeItem(gVegaCalStateLsKey);
    localStorage.removeItem(gVegaCalPausedLsKey);
    gVegaCalStrat = fnGetDefaultVegaCalState();

    // fnGetAllStatus();
    fnResetBrokPnlFields();
    gLastMarginSyncKey = "";
    gLastClosedHistSyncKey = "";
    fnRefreshTotalMargin();
    fnRefreshClosedPositionsFromExchange();
}

function fnResetBrokPnlFields(){
    fnUpdHidFldSettings(0.00, 'BrokerageAmt', 'Brokerage Amount Reset!');

    document.getElementById("txtBrok2Rec").value = 0.00;
    let objTotalPL = document.getElementById("divTotalPL");
    if(objTotalPL){
        objTotalPL.innerText = "0.00";
    }
    document.getElementById("divNetPL").innerText = "0.00";
}

//******************* WS Connection and Subscription Fully Updated Version ****************//
function fnConnectDFL(){
    let objSub = document.getElementById("spnSub");
    let vUrl = "wss://socket.india.delta.exchange";
    obj_WS_DFL = new WebSocket(vUrl);

    obj_WS_DFL.onopen = function (){
        fnMarkAppReconnected("WebSocket open");
        if(!fnSuppressStreamStatusMsgs()){
            fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
        }
        // console.log("WS is Open!");
    }
    obj_WS_DFL.onerror = function (){
        fnMarkAppDisconnected("WebSocket error");
        setTimeout(fnSubscribeDFL, 3000);
    }
    obj_WS_DFL.onclose = function (){
        fnMarkAppDisconnected("WebSocket closed");
        if(gForceCloseDFL){
            gForceCloseDFL = false;
            // console.log("WS Disconnected & Closed!!!!!!");
            objSub.className = "badge rounded-pill text-bg-success";
            if(!fnSuppressStreamStatusMsgs()){
                fnGenMessage("Streaming Stopped & Disconnected!", `badge bg-warning`, "spnGenMsg");
            }
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

                if(!fnSuppressStreamStatusMsgs()){
                    fnGenMessage("Streaming Subscribed and Started!", `badge bg-success`, "spnGenMsg");
                }
                // console.log("Subscribed!!!!!!!");
                objSub.className = "badge rounded-pill text-bg-success blink";
                break;
            case "unsubscribed":

                if(!fnSuppressStreamStatusMsgs()){
                    fnGenMessage("Streaming Unsubscribed!", `badge bg-warning`, "spnGenMsg");
                }
                // console.log("UnSubscribed!!!!!!");
                objSub.className = "badge rounded-pill text-bg-success";
                break;
        }       
    }
}

function fnSuppressStreamStatusMsgs(){
    return localStorage.getItem("DFL_SUPPRESS_STREAM_MSG") === "true";
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
        if(pTicData.quotes && Number.isFinite(Number(pTicData.quotes.mark_iv))){
            gSymbMarkIVList[pTicData.symbol] = Number(pTicData.quotes.mark_iv);
        }
        gSpotPrice = pTicData.spot_price;
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
}

function fnAdd2SubList(){
    let objSymbol = document.getElementById("txtRateTest");

    gSubList.push(objSymbol.value);
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

function fnCallTradeSide(){
    let objCallSideVal = document["frmSide"]["rdoCallTradeSide"];

    localStorage.setItem("CallSideSwtDSS3FO", objCallSideVal.value);
}

function fnPutTradeSide(){
    let objPutSideVal = document["frmSide"]["rdoPutTradeSide"];

    localStorage.setItem("PutSideSwtDSS3FO", objPutSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("CallSideSwtDSS3FO") === null){
        localStorage.setItem("CallSideSwtDSS3FO", "-1");
    }
    let lsCallSideSwitchS = localStorage.getItem("CallSideSwtDSS3FO");
    let objCallSideVal = document["frmSide"]["rdoCallTradeSide"];

    if(lsCallSideSwitchS === "true"){
        objCallSideVal.value = true;
    }
    else if(lsCallSideSwitchS === "false"){
        objCallSideVal.value = false;
    }
    else{
        objCallSideVal.value = -1;
    }


    if(localStorage.getItem("PutSideSwtDSS3FO") === null){
        localStorage.setItem("PutSideSwtDSS3FO", "-1");
    }
    let lsPutSideSwitchS = localStorage.getItem("PutSideSwtDSS3FO");
    let objPutSideVal = document["frmSide"]["rdoPutTradeSide"];

    if(lsPutSideSwitchS === "true"){
        objPutSideVal.value = true;
    }
    else if(lsPutSideSwitchS === "false"){
        objPutSideVal.value = false;
    }
    else{
        objPutSideVal.value = -1;
    }
}

//********** Indicators Sections *************//

//********* Delta Experiment ***********//

function fnLoadAllExpiryDate(){
    let objExpiryDay = document.getElementById("txtDayExpiry");
    let objExpiryWeek = document.getElementById("txtWeekExpiry");
    let objExpiryMonth = document.getElementById("txtMonthExpiry");
    let objExpirySell = document.getElementById("txtExpSell");

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

    fetch("/strategy3fo/getOptChnSDKByAstOptTypExp", requestOptions)
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

