
let obj_WS_DFL = null;
let gSubList = [];
let gMinReqMargin = 5.00;
let gQtyBuyMultiplierM = 0;
let gQtySellMultiplierM = 0;
let gObjDeltaDirec = [];
let gCurrPosDSSLIVE1 = { TradeData : []};
let gClsdPosDSSLIVE1 = { TradeData : []};
let gTradeInst, gTodayClsOpt = 0;
let gFetchedLivePosRows = [];
let gKillSwitchMode = false;
let gLastMarginSyncKey = "";
let gLastClosedHistSyncKey = "";
let gExchangeClosedOrderRows = [];
let gClosedHistoryLoaded = false;
let gLastAuthErrKey = "";
let gLastAuthErrTs = 0;

let gUpdPos = true;
let gSymbBRateList = {};
let gSymbSRateList = {};
let gSymbDeltaList = {};
let gSymbGammaList = {};
let gSymbThetaList = {};
let gSymbVegaList = {};
let gSpotPrice = 0;
let gPL = 0;
let gPayoffGraphLastData = null;
let gPayoffGraphRenderTs = 0;

// let gSymbMarkIVList = {};
// let gSymbRhoList = {};

let gForceCloseDFL = false;
let gOptionBrokerage = 0.01;
let gFutureBrokerage = 0.05;
let gReLeg = false;
let gClsBuyLeg = false;
let gDeltaNtrlBusy = false;
let gDeltaNtrlLastActionTs = 0;
let gCurrStrats = { StratsData : [{StratID : 1, NewSellCE : true, NewSellPE : true, StartSellQty : 1, NewSellDelta : 0.33, ReSellDelta : 0.33, SellDeltaTP : 0.10, SellDeltaSL : 0.53, NewBuyCE : false, NewBuyPE : false, StartBuyQty : 1, NewBuyDelta : 0.33, ReBuyDelta : 0.33, BuyDeltaTP : 2.0, BuyDeltaSL : 0.0 }]};
let gCurrFutStrats = { StratsData : [{StratID : 11, StartFutQty : 1, PointsSL : 100, PointsTP : 200 }]};
let gOtherFlds = [{ SwtActiveMsgs : false, BrokerageAmt : 0, Yet2RecvrAmt : 0, SwtOpnBuyLegOP : false, SwtOpnBuyLegSS : false, SwtBrokRec : false, BrokX4Profit : 2, ReLegBrok : false, ReLegSell : false, ReLegBuy : false, SwtDeltaNtrl : true, DeltaMinusPM : 0.10, DeltaPlusPM : 0.10, DeltaAdjSide : "BOTH" }];

window.addEventListener("DOMContentLoaded", function(){
    fnInitClosedPosDateTimeFilters();
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
        let isLsAutoTrader = localStorage.getItem("isAutoTraderDSSLIVE1");
        let vCallSide = localStorage.getItem("CallSideSwtDSSLIVE1");
        let vPutSide = localStorage.getItem("PutSideSwtDSSLIVE1");
        let objSwtActiveMsgs = document.getElementById("swtActiveMsgs");
        let objMsg = (pMsg);

        // fnChangeSymbol(objMsg.symbolName);

        if(isLsAutoTrader === "false"){
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
});

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
    if(!gCurrPosDSSLIVE1 || !Array.isArray(gCurrPosDSSLIVE1.TradeData)){
        return null;
    }

    let objOpenLegs = gCurrPosDSSLIVE1.TradeData.filter(objLeg => objLeg && objLeg.Status === "OPEN");
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

    let vSavedFrom = localStorage.getItem("ClsFromDateDSSLIVE1");
    let vSavedTo = localStorage.getItem("ClsToDateDSSLIVE1");

    let vFromVal = fnNormalizeDateTimeLocal(vSavedFrom, vDefaultFrom);
    let vToVal = fnNormalizeDateTimeLocal(vSavedTo, vDefaultTo);

    objFromDate.value = vFromVal;
    objToDate.value = vToVal;

    localStorage.setItem("ClsFromDateDSSLIVE1", vFromVal);
    localStorage.setItem("ClsToDateDSSLIVE1", vToVal);

    objFromDate.addEventListener("change", function(){
        let vNextFrom = fnNormalizeDateTimeLocal(objFromDate.value, vDefaultFrom);
        objFromDate.value = vNextFrom;
        localStorage.setItem("ClsFromDateDSSLIVE1", vNextFrom);
        fnRefreshClosedPositionsFromExchange();
    });

    objToDate.addEventListener("change", function(){
        let vNextTo = fnNormalizeDateTimeLocal(objToDate.value, vDefaultTo);
        objToDate.value = vNextTo;
        localStorage.setItem("ClsToDateDSSLIVE1", vNextTo);
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
    localStorage.setItem("ClsToDateDSSLIVE1", vNowVal);
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

    localStorage.setItem("ClsFromDateDSSLIVE1", objDefaults.From);
    localStorage.setItem("ClsToDateDSSLIVE1", objDefaults.To);
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

        fetch("/liveStrategy1fo/getFilledOrderHistory", requestOptions)
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

        let objResp = await fetch("/liveStrategy1fo/validateLogin", requestOptions);
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
    let objStartQtyBuyM = JSON.parse(localStorage.getItem("StartQtyBuyDSSLIVE1"));
    let objStartQtySellM = JSON.parse(localStorage.getItem("StartQtySellDSSLIVE1"));
    let objStartBuyQty = document.getElementById("txtStartBQty");
    let objStartSellQty = document.getElementById("txtStartSQty");

    if(objStartQtyBuyM === null){
        objStartBuyQty.value = 1;
        localStorage.setItem("StartQtyBuyDSSLIVE1", objStartBuyQty.value);
    }
    else{
        objStartBuyQty.value = objStartQtyBuyM;
    }

    if(objStartQtySellM === null){
        objStartSellQty.value = 1;
        localStorage.setItem("StartQtySellDSSLIVE1", objStartSellQty.value);
    }
    else{
        objStartSellQty.value = objStartQtySellM;
    }
}

function fnLoadDefFutStrategy(){
    let objFutStrat = JSON.parse(localStorage.getItem("FutStratDSSLIVE1"));

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
    let objHidFlds = JSON.parse(localStorage.getItem("HidFldsDSSLIVE1"));
    let objSwtActiveMsgs = document.getElementById("swtActiveMsgs");
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objYet2Recvr = document.getElementById("txtYet2Recvr");

    let objOpnBuyLegOP = document.getElementById("swtOpnBuyLegOP");
    let objOpnBuyLegSS = document.getElementById("swtOpnBuyLegSS");

    let objSwtBrokerage = document.getElementById("swtBrokRecvry");
    let objTxtBrokVal = document.getElementById("txtXBrok2Rec");
    let objChkReLeg = document.getElementById("chkReLegBrok");

    let objChkReLegSell = document.getElementById("chkReLegSell");
    let objChkReLegBuy = document.getElementById("chkReLegBuy");

    let objChkDeltaNeutral = document.getElementById("swtDeltaNeutral");
    let objMinusDeltaPM = document.getElementById("txtMinusDeltaPM");
    let objPlusDeltaPM = document.getElementById("txtPlusDeltaPM");
    let objDeltaAdjSide = document.getElementById("ddlDeltaAdjSide");

    if(objHidFlds === null || objHidFlds === ""){
        objHidFlds = gOtherFlds;
        objSwtActiveMsgs.checked = objHidFlds[0]["SwtActiveMsgs"];
        objBrokAmt.value = objHidFlds[0]["BrokerageAmt"];
        objYet2Recvr.value = objHidFlds[0]["Yet2RecvrAmt"];

        objOpnBuyLegOP.checked = objHidFlds[0]["SwtOpnBuyLegOP"];
        objOpnBuyLegSS.checked = objHidFlds[0]["SwtOpnBuyLegSS"];

        objSwtBrokerage.checked = objHidFlds[0]["SwtBrokRec"]; 
        objTxtBrokVal.value = objHidFlds[0]["BrokX4Profit"];
        objChkReLeg.checked = objHidFlds[0]["ReLegBrok"]; 

        objChkReLegSell.checked = objHidFlds[0]["ReLegSell"]; 
        objChkReLegBuy.checked = objHidFlds[0]["ReLegBuy"]; 

        objChkDeltaNeutral.checked = objHidFlds[0]["SwtDeltaNtrl"]; 
        objMinusDeltaPM.value = objHidFlds[0]["DeltaMinusPM"]; 
        objPlusDeltaPM.value = objHidFlds[0]["DeltaPlusPM"]; 
        if(objDeltaAdjSide){
            objDeltaAdjSide.value = objHidFlds[0]["DeltaAdjSide"] || "BOTH";
        }
    }
    else{
        gOtherFlds = objHidFlds;
        let bUpdatedDefaults = false;
        if(!Number.isFinite(parseFloat(gOtherFlds[0]["DeltaMinusPM"]))){
            gOtherFlds[0]["DeltaMinusPM"] = 0.10;
            bUpdatedDefaults = true;
        }
        if(!Number.isFinite(parseFloat(gOtherFlds[0]["DeltaPlusPM"]))){
            gOtherFlds[0]["DeltaPlusPM"] = 0.10;
            bUpdatedDefaults = true;
        }
        if(!gOtherFlds[0]["DeltaAdjSide"]){
            gOtherFlds[0]["DeltaAdjSide"] = "BOTH";
            bUpdatedDefaults = true;
        }
        if(bUpdatedDefaults){
            localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));
        }
        objSwtActiveMsgs.checked = gOtherFlds[0]["SwtActiveMsgs"];
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];
        objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];

        objOpnBuyLegOP.checked = gOtherFlds[0]["SwtOpnBuyLegOP"];
        objOpnBuyLegSS.checked = gOtherFlds[0]["SwtOpnBuyLegSS"];

        objSwtBrokerage.checked = gOtherFlds[0]["SwtBrokRec"]; 
        objTxtBrokVal.value = gOtherFlds[0]["BrokX4Profit"];
        objChkReLeg.checked = gOtherFlds[0]["ReLegBrok"]; 

        objChkReLegSell.checked = gOtherFlds[0]["ReLegSell"]; 
        objChkReLegBuy.checked = gOtherFlds[0]["ReLegBuy"]; 

        objChkDeltaNeutral.checked = gOtherFlds[0]["SwtDeltaNtrl"]; 
        objMinusDeltaPM.value = gOtherFlds[0]["DeltaMinusPM"]; 
        objPlusDeltaPM.value = gOtherFlds[0]["DeltaPlusPM"]; 
        if(objDeltaAdjSide){
            objDeltaAdjSide.value = gOtherFlds[0]["DeltaAdjSide"] || "BOTH";
        }
    }
}

function fnUpdHidFldSettings(pThisVal, pHidFldParam, pFieldMsg){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gOtherFlds[0][pHidFldParam] = pThisVal;

        localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdFutStratSettings(pThisVal, pStratParam, pFieldMsg, pIfUpdFut, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrFutStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("FutStratDSSLIVE1", JSON.stringify(gCurrFutStrats));

        if(pIfUpdFut){
            fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam);
        }
        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if((gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN") && (pOptionType === "F")){
            gCurrPosDSSLIVE1.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);
    localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
}

function fnLoadDefStrategy(){
    let objStrat = JSON.parse(localStorage.getItem("StrategyDSSLIVE1"));

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

        localStorage.setItem("StrategyDSSLIVE1", JSON.stringify(objStrat));
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
        localStorage.setItem("StartQtyBuyDSSLIVE1", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyBuyDSSLIVE1", 1);
    }
    else{
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtyBuyDSSLIVE1", pThisVal.value);
        }
    }
}

function fnChangeSellStartQty(pThisVal){
    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellDSSLIVE1", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellDSSLIVE1", 1);
    }
    else{
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtySellDSSLIVE1", pThisVal.value);
        }
    }
}

function fnUpdOptStratSettings(pThis, pThisVal, pStratParam, pFieldMsg, pIfUpdCP, pIfBorS, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input / Select Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("StrategyDSSLIVE1", JSON.stringify(gCurrStrats));
    
        if(pIfUpdCP){
            fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam);
        }

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if((gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN") && (gCurrPosDSSLIVE1.TradeData[i].TransType === pIfBorS) && (pOptionType === "")){
            gCurrPosDSSLIVE1.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);
    localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
}

function fnChangeSymbol(pSymbVal){
    localStorage.setItem("SymbDSSLIVE1", JSON.stringify(pSymbVal));

    fnLoadDefSymbol();
}

function fnLoadDefSymbol(){
    let objDefSymM = JSON.parse(localStorage.getItem("SymbDSSLIVE1"));
    let objSelSymb = document.getElementById("ddlSymbols");

    if(objDefSymM === null){
        objDefSymM = "";
    }

    objSelSymb.value = objDefSymM;
    fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
    let objLotSize = document.getElementById("txtLotSize");

    localStorage.setItem("SymbDSSLIVE1", JSON.stringify(pThisVal));

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
    let objCurrPos = JSON.parse(localStorage.getItem("CurrPosDSSLIVE1"));

    gCurrPosDSSLIVE1 = objCurrPos;

    if(gCurrPosDSSLIVE1 === null){
        gCurrPosDSSLIVE1 = { TradeData : []};
    }
    else{
        fnSetSymbolTickerList();
    }
}

function fnLoadClosedPostions(){
    let objClsdPos = JSON.parse(localStorage.getItem("ClsdPosDSSLIVE1"));
    gClsdPosDSSLIVE1 = objClsdPos;

    if(gClsdPosDSSLIVE1 === null){
        gClsdPosDSSLIVE1 = { TradeData : []};
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

        let objResp = await fetch("/liveStrategy1fo/validateLogin", requestOptions);
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

        fetch("/liveStrategy1fo/getLiveOpenPositions", requestOptions)
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
            for(let j=0; j<gCurrPosDSSLIVE1.TradeData.length; j++){
                let objLeg = gCurrPosDSSLIVE1.TradeData[j];
                if(objLeg.Status === "OPEN" && objLeg.Symbol === vSymbol && objLeg.TransType === vTransType){
                    vRemoved += 1;
                    continue;
                }
                objFiltered.push(objLeg);
            }
            gCurrPosDSSLIVE1.TradeData = objFiltered;
        }

        if(vReplaceExisting){
            let vExists = false;
            for(let j=0; j<gCurrPosDSSLIVE1.TradeData.length; j++){
                let objLeg = gCurrPosDSSLIVE1.TradeData[j];
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
        let vVega = Number(objPos.Vega || 0);

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
            VegaC : vVega,
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

        gCurrPosDSSLIVE1.TradeData.push(vExcTradeDtls);
        vAdded += 1;
    }

    localStorage.setItem("CurrPosDSSLIVE1", JSON.stringify(gCurrPosDSSLIVE1));
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

function fnSetSymbolTickerList(){
    let objOpenLegs = [];
    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if(gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN"){
            objOpenLegs.push(gCurrPosDSSLIVE1.TradeData[i]);
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

    if(gCurrPosDSSLIVE1.TradeData.length > 0){
        const objSubListArray = [];
        gSubList = [];

        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if(gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN"){
                objSubListArray.push(gCurrPosDSSLIVE1.TradeData[i].Symbol);
            }
        }
        const setSubList = new Set(objSubListArray);
        gSubList = [...setSubList];
        fnUnSubscribeDFL();
        fnSubscribeDFL();

        clearInterval(gTradeInst);
        gTradeInst = setInterval(fnSaveUpdCurrPos, 30000);
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

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if(gCurrPosDSSLIVE1.TradeData[i].Expiry === vDDMMYYYY){
            let vDate3PM = new Date();
            let vDate5PM = new Date();
            vDate3PM.setHours(15, 30, 0, 0);
            vDate5PM.setHours(17, 0, 0, 0);

            let v3PM = vDate3PM.getTime();
            let v5PM = vDate5PM.getTime();

            let vState = gCurrPosDSSLIVE1.TradeData[i].Status;

            if((vTodayDate.valueOf() > v3PM) && (vTodayDate.valueOf() < v5PM)){
                if(vState === "OPEN"){
                    vLegID = gCurrPosDSSLIVE1.TradeData[i].TradeID;
                    vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
                    vOptionType = gCurrPosDSSLIVE1.TradeData[i].OptionType;
                    vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
                    
                    vIsRecExists = true;

                }
            }
        }
    }

    if(vIsRecExists === true){
        fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
    }

    // console.log(gCurrPosDSSLIVE1);
}

//************** Check for Open Position PL Status and close *************//
function fnSaveUpdCurrPos(){
    let vToPosClose = false;
    let vLegID = 0;
    let vTransType = "";
    let vOptionType = "";
    let vSymbol = "";
    let vBrokSwt = document.getElementById("swtBrokRecvry").checked;
    let vBrokAmt = document.getElementById("txtBrok2Rec").value;
    let vBrokXVal = document.getElementById("txtXBrok2Rec").value;
    let vYetRecAmt = parseFloat(document.getElementById("txtYet2Recvr").value);
    let objChkReLegSell = document.getElementById("chkReLegSell");
    let objChkReLegBuy = document.getElementById("chkReLegBuy");
    let vTotalPL = 0;

    vBrokAmt = parseFloat(vBrokAmt) * parseInt(vBrokXVal);

    if(vYetRecAmt < 0){
        vTotalPL = gPL + vYetRecAmt;
    }
    else{
        vTotalPL = gPL + vYetRecAmt;
    }

    document.getElementById("divNetPL").innerText = (vTotalPL).toFixed(2);

    if((vTotalPL > vBrokAmt) && vBrokSwt){
        fnExitAllPositions();
    }
    else{
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if(gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN"){
                let vOptionTypeZZ = gCurrPosDSSLIVE1.TradeData[i].OptionType;
                let vCurrDelta = parseFloat(gSymbDeltaList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);
                let vCurrGamma = parseFloat(gSymbGammaList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);
                let vCurrTheta = parseFloat(gSymbThetaList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);
                let vCurrVega = parseFloat(gSymbVegaList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);

                if(vOptionTypeZZ !== "F"){
                    let vCurrDeltaPos = vCurrDelta;
                    if(!isNaN(vCurrDelta)){
                        if(gCurrPosDSSLIVE1.TradeData[i].TransType === "sell"){
                            vCurrDeltaPos = -1 * vCurrDelta;
                        }
                    }
                    if(!isNaN(vCurrDelta)){
                        gCurrPosDSSLIVE1.TradeData[i].DeltaC = vCurrDeltaPos;
                    }
                    if(!isNaN(vCurrGamma)){
                        gCurrPosDSSLIVE1.TradeData[i].GammaC = vCurrGamma;
                    }
                    if(!isNaN(vCurrTheta)){
                        gCurrPosDSSLIVE1.TradeData[i].ThetaC = vCurrTheta;
                    }
                    if(!isNaN(vCurrVega)){
                        gCurrPosDSSLIVE1.TradeData[i].VegaC = vCurrVega;
                    }
                }

                let vStrikePrice = gCurrPosDSSLIVE1.TradeData[i].StrikePrice;
                let vLotSize = gCurrPosDSSLIVE1.TradeData[i].LotSize;
                let vQty = gCurrPosDSSLIVE1.TradeData[i].LotQty;
                let vBuyPrice = gCurrPosDSSLIVE1.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosDSSLIVE1.TradeData[i].SellPrice;
                let vDeltaSL = gCurrPosDSSLIVE1.TradeData[i].DeltaSL;
                let vDeltaTP = gCurrPosDSSLIVE1.TradeData[i].DeltaTP;

                // let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionTypeZZ);
                // let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

                if(gCurrPosDSSLIVE1.TradeData[i].TransType === "sell"){
                    let vCurrPrice = parseFloat(gSymbBRateList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);
                    gCurrPosDSSLIVE1.TradeData[i].BuyPrice = vCurrPrice;

                    if((Math.abs(vCurrDelta) >= vDeltaSL) || (Math.abs(vCurrDelta) <= vDeltaTP)){
                        vLegID = gCurrPosDSSLIVE1.TradeData[i].TradeID;
                        vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
                        vOptionType = gCurrPosDSSLIVE1.TradeData[i].OptionType;
                        vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
                        vToPosClose = true;
                        
                        if(objChkReLegSell.checked){
                            gReLeg = true;
                        }
                    }
                }
                else if(gCurrPosDSSLIVE1.TradeData[i].TransType === "buy"){
                    let vCurrPrice = parseFloat(gSymbSRateList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);
                    gCurrPosDSSLIVE1.TradeData[i].SellPrice = vCurrPrice;

                    if((Math.abs(vCurrDelta) <= vDeltaSL) || (Math.abs(vCurrDelta) >= vDeltaTP)){
                        vLegID = gCurrPosDSSLIVE1.TradeData[i].TradeID;
                        vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
                        vOptionType = gCurrPosDSSLIVE1.TradeData[i].OptionType;
                        vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
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
            // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSSLIVE1"));
            // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSSLIVE1"));

            // if((objTrdCountCE > 1 || objTrdCountPE > 1) && vTransType === "sell"){

            //     fnGetBuyOpenPosAndClose(vTransType, vOptionType);
            // }
            fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
        }
        else{
            fnRunDeltaNeutralFutures();
        }
    }
}

function fnGetOpenFutureLegBySide(pTransType){
    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        let objLeg = gCurrPosDSSLIVE1.TradeData[i];
        if(objLeg.Status === "OPEN" && objLeg.OptionType === "F" && objLeg.TransType === pTransType){
            return objLeg;
        }
    }

    return null;
}

async function fnRunDeltaNeutralFutures(){
    let objSwtDeltaNeutral = document.getElementById("swtDeltaNeutral");
    let objMinusDeltaPM = document.getElementById("txtMinusDeltaPM");
    let objPlusDeltaPM = document.getElementById("txtPlusDeltaPM");
    let objDeltaAdjSide = document.getElementById("ddlDeltaAdjSide");

    if(!objSwtDeltaNeutral || !objSwtDeltaNeutral.checked){
        return;
    }

    let vMinusThreshold = Math.abs(parseFloat(objMinusDeltaPM ? objMinusDeltaPM.value : NaN));
    if(!Number.isFinite(vMinusThreshold)){
        vMinusThreshold = Math.abs(parseFloat(gOtherFlds[0]["DeltaMinusPM"]));
    }
    if(!Number.isFinite(vMinusThreshold) || vMinusThreshold === 0){
        vMinusThreshold = 0.10;
    }

    let vPlusThreshold = Math.abs(parseFloat(objPlusDeltaPM ? objPlusDeltaPM.value : NaN));
    if(!Number.isFinite(vPlusThreshold)){
        vPlusThreshold = Math.abs(parseFloat(gOtherFlds[0]["DeltaPlusPM"]));
    }
    if(!Number.isFinite(vPlusThreshold) || vPlusThreshold === 0){
        vPlusThreshold = 0.10;
    }

    let vDeltaAdjSide = (objDeltaAdjSide ? objDeltaAdjSide.value : (gOtherFlds[0]["DeltaAdjSide"] || "BOTH"));

    let vOptionDelta = 0;
    let vFutureDelta = 0;
    let vOpenOptionCount = 0;

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        let objLeg = gCurrPosDSSLIVE1.TradeData[i];
        if(objLeg.Status !== "OPEN"){
            continue;
        }

        let vDelta = parseFloat(objLeg.DeltaC || objLeg.Delta || 0);
        if(!Number.isFinite(vDelta)){
            continue;
        }

        if(objLeg.OptionType === "F"){
            vFutureDelta += vDelta;
        }
        else{
            vOptionDelta += vDelta;
            vOpenOptionCount += 1;
        }
    }

    if(vOpenOptionCount === 0){
        return;
    }

    let vNetDelta = vOptionDelta + vFutureDelta;
    if(!Number.isFinite(vNetDelta)){
        return;
    }

    vNetDelta = parseFloat(vNetDelta.toFixed(6));
    vMinusThreshold = parseFloat(vMinusThreshold.toFixed(6));
    vPlusThreshold = parseFloat(vPlusThreshold.toFixed(6));

    let vNow = Date.now();
    if(gDeltaNtrlBusy || (vNow - gDeltaNtrlLastActionTs) < 5000){
        return;
    }

    gDeltaNtrlBusy = true;
    try{
        let bNeedsAdjustment = false;
        if(vDeltaAdjSide === "+DELTA"){
            bNeedsAdjustment = (vNetDelta >= vPlusThreshold);
        }
        else if(vDeltaAdjSide === "-DELTA"){
            bNeedsAdjustment = (vNetDelta <= -vMinusThreshold);
        }
        else{
            bNeedsAdjustment = (vNetDelta <= -vMinusThreshold || vNetDelta >= vPlusThreshold);
        }

        if(!bNeedsAdjustment){
            return;
        }

        let vNeedAction = (vNetDelta > 0) ? "sell" : "buy";
        let vOppositeAction = (vNeedAction === "buy") ? "sell" : "buy";
        let objOppFuture = fnGetOpenFutureLegBySide(vOppositeAction);

        if(objOppFuture){
            await fnCloseOptPosition(objOppFuture.TradeID, objOppFuture.TransType, "F", objOppFuture.Symbol, "CLOSED");
        }
        else{
            await fnPreInitAutoFutTrade("F", vNeedAction);
        }

        gDeltaNtrlLastActionTs = Date.now();
    }
    catch (objErr){
    }
    finally{
        gDeltaNtrlBusy = false;
    }
}

function fnExitAllPositions(){
    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    let objChkReLeg = document.getElementById("chkReLegBrok");
    let objYet2Recvr = document.getElementById("txtYet2Recvr");
    let vYet2RecvrAmt = parseFloat(objYet2Recvr.value);

    if(!Number.isFinite(vYet2RecvrAmt)){
        vYet2RecvrAmt = parseFloat(gOtherFlds[0]["Yet2RecvrAmt"]);
        if(!Number.isFinite(vYet2RecvrAmt)){
            vYet2RecvrAmt = 0;
        }
    }

    gUpdPos = false;

    gSymbBRateList = {};
    gSymbSRateList = {};
    gSymbDeltaList = {};
    gSymbGammaList = {};
    gSymbThetaList = {};
    gSymbVegaList = {};

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        let objLeg = gCurrPosDSSLIVE1.TradeData[i];
        let vStrikePrice = parseFloat(objLeg.StrikePrice);
        let vLotSize = parseFloat(objLeg.LotSize);
        let vLotQty = parseFloat(objLeg.LotQty);
        let vBuyPrice = parseFloat(objLeg.BuyPrice);
        let vSellPrice = parseFloat(objLeg.SellPrice);
        let vOptionType = objLeg.OptionType;
        let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vLotQty, vBuyPrice, vSellPrice, vOptionType);
        let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vLotQty, vCharges);

        if(Number.isFinite(vPL)){
            vYet2RecvrAmt += vPL;
        }

        gCurrPosDSSLIVE1.TradeData[i].CloseDT = vToday;
        gCurrPosDSSLIVE1.TradeData[i].Status = "CLOSED";

        gClsdPosDSSLIVE1.TradeData.push(gCurrPosDSSLIVE1.TradeData[i]);
    }

    gOtherFlds[0]["Yet2RecvrAmt"] = vYet2RecvrAmt;
    objYet2Recvr.value = vYet2RecvrAmt;
    localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));

    let objExcTradeDtls = JSON.stringify(gClsdPosDSSLIVE1);
    localStorage.setItem("ClsdPosDSSLIVE1", objExcTradeDtls);

    gCurrPosDSSLIVE1 = { TradeData : []};
    localStorage.removeItem("CurrPosDSSLIVE1");

    document.getElementById("txtBrok2Rec").value = 0;
    fnUpdHidFldSettings(0, "BrokerageAmt", "Brokerage Amount!");
    document.getElementById("txtYet2Recvr").value = 0;
    fnUpdHidFldSettings(0, "Yet2RecvrAmt", "et To Recover Amount!");
    gPL = 0;

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
    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        let objLeg = gCurrPosDSSLIVE1.TradeData[i];
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

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if((gCurrPosDSSLIVE1.TradeData[i].TransType === "buy") && gCurrPosDSSLIVE1.TradeData[i].OptionType === vOptionType){
            vRecExists = true;
            vLegID = gCurrPosDSSLIVE1.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
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

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if((gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN") && (gCurrPosDSSLIVE1.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSLIVE1.TradeData[i].TransType === "buy")){
            vLegID = gCurrPosDSSLIVE1.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
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
    let vBuyExpiryMode = JSON.parse(localStorage.getItem("BuyExpiryModeDSSLIVE1"));
    let vSellExpiryMode = JSON.parse(localStorage.getItem("SellExpiryModeDSSLIVE1"));
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
    localStorage.setItem("BuyExpiryModeDSSLIVE1", JSON.stringify(objBuyExpiryMode.value));
}

function fnUpdateSellExpiryMode(){
    let objSellExpiryMode = document.getElementById("ddlSellExpiryMode");
    let objExpirySell = document.getElementById("txtExpSell");

    fnLoadExpiryDate(objSellExpiryMode.value, objExpirySell);
    localStorage.setItem("SellExpiryModeDSSLIVE1", JSON.stringify(objSellExpiryMode.value));
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

            if(gCurrPosDSSLIVE1.TradeData.length > 0){
                for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){

                    if((gCurrPosDSSLIVE1.TradeData[i].OptionType === vOptionType) && (gCurrPosDSSLIVE1.TradeData[i].TransType === vTransType) && (gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN") && (gCurrPosDSSLIVE1.TradeData[i].Expiry === vTargetExpiry)){
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
                    let vVega = parseFloat(objTradeDtls.data.Vega || 0);
                    let vVegaC = parseFloat(objTradeDtls.data.VegaC || objTradeDtls.data.Vega || 0);
                    let vDeltaRePos = objTradeDtls.data.DeltaRePos;
                    let vDeltaTP = objTradeDtls.data.DeltaTP;
                    let vDeltaSL = objTradeDtls.data.DeltaSL;
                    let vOpenDTVal = vDate.valueOf();
                    gUpdPos = false;

                    let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : vGamma, GammaC : vGammaC, Theta : vTheta, ThetaC : vThetaC, Vega : vVega, VegaC : vVegaC, DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

                    gCurrPosDSSLIVE1.TradeData.push(vExcTradeDtls);
                    let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);

                    localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);

                    let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));

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
            "DeltaSL" : pDeltaSL
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };
        fetch("/liveStrategy1fo/execOptionLeg", requestOptions)
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

    if(gCurrPosDSSLIVE1.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if((gCurrPosDSSLIVE1.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSLIVE1.TradeData[i].TransType === pTransType) && (gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN")){
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

async function fnPreInitAutoTrade(pOptionType, pTransType){
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

    if(gCurrPosDSSLIVE1.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if((gCurrPosDSSLIVE1.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSLIVE1.TradeData[i].TransType === pTransType) && (gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN") && (gCurrPosDSSLIVE1.TradeData[i].Expiry === vExpiryNewPos)){
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
            let vVega = parseFloat(objTradeDtls.data.Vega || 0);
            let vVegaC = parseFloat(objTradeDtls.data.VegaC || objTradeDtls.data.Vega || 0);
            let vDeltaRePos = objTradeDtls.data.DeltaRePos;
            let vDeltaTP = objTradeDtls.data.DeltaTP;
            let vDeltaSL = objTradeDtls.data.DeltaSL;
            let vOpenDTVal = vDate.valueOf();
            gUpdPos = false;

            let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : vGamma, GammaC : vGammaC, Theta : vTheta, ThetaC : vThetaC, Vega : vVega, VegaC : vVegaC, DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

            gCurrPosDSSLIVE1.TradeData.push(vExcTradeDtls);
            let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);

            localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);

            let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
            gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));


            gUpdPos = true;
            fnSetSymbolTickerList();
            fnUpdateOpenPositions();
        }
        else{
            fnGenMessage("Option Leg Open Failed: " + objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
        }
    }
}

async function fnPreInitAutoFutTrade(pOptionType, pTransType){
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
    if(!(parseFloat(objLotQty.value) > 0)){
        fnGenMessage("Invalid futures quantity.", "badge bg-warning", "spnGenMsg");
        return;
    }

    let vUndrAsst = objSymbol.value + "USD";

    let objTradeDtls = await fnExecFuturesLeg(objApiKey.value, objApiSecret.value, objOrderType.value, vUndrAsst, pOptionType, pTransType, objLotSize.value, objLotQty.value, objPointsTP.value, objPointsSL.value);

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

        gCurrPosDSSLIVE1.TradeData.push(vExcTradeDtls);
        let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);

        localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);

        let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vOptType);
        gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

        localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));

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
            "PointsSL" : pPointsSL
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };
        fetch("/liveStrategy1fo/execFutureLeg", requestOptions)
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

    if(gCurrPosDSSLIVE1.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if((gCurrPosDSSLIVE1.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSLIVE1.TradeData[i].TransType === pTransType) && (gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN")){
                vLegID = gCurrPosDSSLIVE1.TradeData[i].TradeID;
                vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
                vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
                
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
    // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSSLIVE1"));
    // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSSLIVE1"));

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
                    //     localStorage.setItem("CETrdCntDSSLIVE1", objTrdCountCE);
                    // }
                    // else if(pOptionType === "P"){
                    //     objTrdCountPE = objTrdCountPE + 1;
                    //     localStorage.setItem("PETrdCntDSSLIVE1", objTrdCountPE);
                    // }
                }
                else if(vTransType === "buy"){
                    vTradeSL = vBestBuy - vRateSL;
                    vTradeTP = vBestBuy + vRateTP;
                }

                let vExcTradeDtls = { ClientOrderID : vClientID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vTransType, OptionType : vOptionType, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseInt(vQty), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, Vega : vVega, Gamma : vGamma, Rho : vRho, MarkIV : vMarkIV, Theta : vTheta, DeltaC : vDeltaC, VegaC : vVegaC, GammaC : vGammaC, RhoC : vRhoC, MarkIVC : vMarkIVC, ThetaC : vThetaC, OpenDTVal : vOrdId, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, DeltaNP : vDeltaNPos, TradeSL : vTradeSL, TradeTP : vTradeTP, Status : "OPEN" };
                
                gCurrPosDSSLIVE1.TradeData.push(vExcTradeDtls);

                let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);

                localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);

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
            "ClientID" : pClientID
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        // resolve({ "status": "success", "message": "Success", "data": "" });

        fetch("/liveStrategy1fo/execOption", requestOptions)
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

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        let vStatus = gCurrPosDSSLIVE1.TradeData[i].Status;
        let vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
        let vExOptionType = gCurrPosDSSLIVE1.TradeData[i].OptionType;

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
        if(gCurrPosDSSLIVE1.TradeData.length === 0){
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

            for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
                if(gCurrPosDSSLIVE1.TradeData[i].Status !== "OPEN"){
                    continue;
                }
                let vLegID = gCurrPosDSSLIVE1.TradeData[i].TradeID;
                let vDelta = parseFloat(gCurrPosDSSLIVE1.TradeData[i].Delta || 0);
                let vDeltaC = parseFloat(gCurrPosDSSLIVE1.TradeData[i].DeltaC || gCurrPosDSSLIVE1.TradeData[i].Delta || 0);
                let vGamma = parseFloat(gCurrPosDSSLIVE1.TradeData[i].Gamma || 0);
                let vGammaC = parseFloat(gCurrPosDSSLIVE1.TradeData[i].GammaC || gCurrPosDSSLIVE1.TradeData[i].Gamma || 0);
                let vTheta = parseFloat(gCurrPosDSSLIVE1.TradeData[i].Theta || 0);
                let vThetaC = parseFloat(gCurrPosDSSLIVE1.TradeData[i].ThetaC || gCurrPosDSSLIVE1.TradeData[i].Theta || 0);
                let vVega = parseFloat(gCurrPosDSSLIVE1.TradeData[i].Vega || 0);
                let vVegaC = parseFloat(gCurrPosDSSLIVE1.TradeData[i].VegaC || gCurrPosDSSLIVE1.TradeData[i].Vega || 0);
                let vLotSize = gCurrPosDSSLIVE1.TradeData[i].LotSize;
                let vQty = gCurrPosDSSLIVE1.TradeData[i].LotQty;
                let vOpenDT = gCurrPosDSSLIVE1.TradeData[i].OpenDT;
                let vCloseDT = gCurrPosDSSLIVE1.TradeData[i].CloseDT;
                let vOptionType = gCurrPosDSSLIVE1.TradeData[i].OptionType;
                let vBuyPrice = gCurrPosDSSLIVE1.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosDSSLIVE1.TradeData[i].SellPrice;
                let vStatus = gCurrPosDSSLIVE1.TradeData[i].Status;
                let vStrikePrice = parseFloat(gCurrPosDSSLIVE1.TradeData[i].StrikePrice);
                let vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
                let vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;

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
        fnDispClosedPositions();
    }
}

function fnDispClosedPositions(){
    let objClosedTradeList = document.getElementById("tBodyClosedTrades");
    if(!objClosedTradeList){
        return;
    }

    let objAllClosedRows = [];
    let vUseExchangeRows = gClosedHistoryLoaded;
    if(vUseExchangeRows){
        objAllClosedRows = gExchangeClosedOrderRows;
    }
    else{
        const objMapClosedById = new Map();
        if(gClsdPosDSSLIVE1 && Array.isArray(gClsdPosDSSLIVE1.TradeData)){
            for(let i=0; i<gClsdPosDSSLIVE1.TradeData.length; i++){
                let objLeg = gClsdPosDSSLIVE1.TradeData[i];
                if(objLeg && objLeg.TradeID !== undefined){
                    objMapClosedById.set(String(objLeg.TradeID), objLeg);
                }
            }
        }
        if(gCurrPosDSSLIVE1 && Array.isArray(gCurrPosDSSLIVE1.TradeData)){
            for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
                let objLeg = gCurrPosDSSLIVE1.TradeData[i];
                if(objLeg && objLeg.Status !== "OPEN" && objLeg.TradeID !== undefined){
                    objMapClosedById.set(String(objLeg.TradeID), objLeg);
                }
            }
        }
        objAllClosedRows = Array.from(objMapClosedById.values());
    }

    objAllClosedRows.sort((a, b) => fnGetClosedStartTs(a, vUseExchangeRows) - fnGetClosedStartTs(b, vUseExchangeRows));

    if(objAllClosedRows.length === 0){
        objClosedTradeList.innerHTML = '<tr><td colspan="10"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 32px;">No Closed Trades for Selected Date Range</div></td></tr>';
        return;
    }

    let vTempHtml = "";
    let vTotalCharges = 0;
    let vNetPL = 0;

    for(let i=0; i<objAllClosedRows.length; i++){
        let objLeg = objAllClosedRows[i];

        let vSymbol = vUseExchangeRows ? (objLeg.product_symbol || "-") : (objLeg.Symbol || "-");
        let vTransType = vUseExchangeRows ? (objLeg.side || "-") : (objLeg.TransType || "-");
        let vSideNorm = (vTransType || "").toString().toLowerCase();
        let vSideColor = (vSideNorm === "buy") ? "green" : ((vSideNorm === "sell") ? "red" : "inherit");
        let vLotSize = parseFloat(vUseExchangeRows ? (objLeg?.product?.contract_value || objLeg.contract_value || 0) : (objLeg.LotSize || 0));
        let vQty = parseFloat(vUseExchangeRows ? (objLeg.size || 0) : (objLeg.LotQty || 0));
        let vAvgFillPrice = parseFloat(vUseExchangeRows ? (objLeg.average_fill_price || 0) : 0);
        let vBuyPrice = vUseExchangeRows ? ((vTransType === "buy") ? vAvgFillPrice : 0) : parseFloat(objLeg.BuyPrice || 0);
        let vSellPrice = vUseExchangeRows ? ((vTransType === "sell") ? vAvgFillPrice : 0) : parseFloat(objLeg.SellPrice || 0);
        let vCharges = parseFloat(vUseExchangeRows ? (objLeg.paid_commission || 0) : 0);
        let vPL = parseFloat(vUseExchangeRows ? (objLeg?.meta_data?.pnl || 0) : 0);
        let vOpenDT = vUseExchangeRows ? (objLeg.created_at ? (new Date(objLeg.created_at)).toLocaleString("en-GB") : "-") : (objLeg.OpenDT || "-");
        let vCloseDT = vUseExchangeRows ? (objLeg.updated_at ? (new Date(objLeg.updated_at)).toLocaleString("en-GB") : "-") : (objLeg.CloseDT || "-");

        if(!vUseExchangeRows){
            let vOptionType = objLeg.OptionType || "";
            let vStrikePrice = parseFloat(objLeg.StrikePrice || 0);
            vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionType);
            vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
        }

        vTotalCharges += Number(vCharges || 0);
        vNetPL += Number(vPL || 0);

        vTempHtml += "<tr>";
        vTempHtml += '<td style="text-wrap: nowrap; color:' + vSideColor + '; text-align:center;">' + vOpenDT + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:' + vSideColor + '; text-align:center;">' + vCloseDT + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:' + vSideColor + '; text-align:center;">' + vSymbol + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:' + vSideColor + '; text-align:center;">' + vTransType + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + vLotSize + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + vQty + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + ((vBuyPrice > 0) ? (vBuyPrice).toFixed(2) : "-") + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + ((vSellPrice > 0) ? (vSellPrice).toFixed(2) : "-") + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + (parseFloat(vCharges)).toFixed(2) + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:' + vSideColor + ';">' + (vPL).toFixed(2) + "</td>";
        vTempHtml += "</tr>";
    }

    vTempHtml += '<tr>';
    vTempHtml += '<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>';
    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">' + (vTotalCharges).toFixed(2) + '</td>';
    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">' + (vNetPL).toFixed(2) + "</td>";
    vTempHtml += '</tr>';
    objClosedTradeList.innerHTML = vTempHtml;
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
    let objYet2Recvr = document.getElementById("txtYet2Recvr");

    let vLegLotSize = 0;
    let vLegLotQty = 0;
    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if(gCurrPosDSSLIVE1.TradeData[i].TradeID === pLegID){
            vLegLotSize = parseFloat(gCurrPosDSSLIVE1.TradeData[i].LotSize || 0);
            vLegLotQty = parseFloat(gCurrPosDSSLIVE1.TradeData[i].LotQty || 0);
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

        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if(gCurrPosDSSLIVE1.TradeData[i].TradeID === pLegID){                
                if(pTransType === "sell"){
                    gCurrPosDSSLIVE1.TradeData[i].BuyPrice = vBestRate;
                }
                else if(pTransType === "buy"){
                    gCurrPosDSSLIVE1.TradeData[i].SellPrice = vBestRate;
                }
                gCurrPosDSSLIVE1.TradeData[i].CloseDT = vToday;
                gCurrPosDSSLIVE1.TradeData[i].Status = pStatus;

                vStrikePrice = gCurrPosDSSLIVE1.TradeData[i].StrikePrice;
                vLotSize = gCurrPosDSSLIVE1.TradeData[i].LotSize;
                vLotQty = gCurrPosDSSLIVE1.TradeData[i].LotQty;
                vBuyPrice = gCurrPosDSSLIVE1.TradeData[i].BuyPrice;
                vSellPrice = gCurrPosDSSLIVE1.TradeData[i].SellPrice;
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);
        localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);


        let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vLotQty, vBuyPrice, vSellPrice, pOptionType);
        let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vLotQty, vCharges);

        // console.log(vPL);
        if(pStatus === "CLOSED"){
            let vYet2RecvrAmt = parseFloat(objYet2Recvr.value);
            if(!Number.isFinite(vYet2RecvrAmt)){
                vYet2RecvrAmt = parseFloat(gOtherFlds[0]["Yet2RecvrAmt"]);
                if(!Number.isFinite(vYet2RecvrAmt)){
                    vYet2RecvrAmt = 0;
                }
            }

            gOtherFlds[0]["Yet2RecvrAmt"]  = vYet2RecvrAmt + vPL;
            objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];
            localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));            

            if(vPL > 0){
                if(parseFloat(objBrokAmt.value) >= vCharges){
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) - vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));
                }
            }
            else if(!gKillSwitchMode){
                let objOpnBuyLegOP = document.getElementById("swtOpnBuyLegOP");
                let objOpnBuyLegSS = document.getElementById("swtOpnBuyLegSS");

                if(objOpnBuyLegOP.checked && pTransType === "sell"){
                    let vOptionType = "";

                    if(pOptionType === "C"){
                        vOptionType = "P";
                    }
                    else if(pOptionType === "P"){
                        vOptionType = "C";
                    }
                    fnPreInitAutoTrade(vOptionType, "buy");
                }

                if(objOpnBuyLegSS.checked && pTransType === "sell"){
                    fnPreInitAutoTrade(pOptionType, "buy");
                }
            }
        }
        else{
            //This part is not required in Real code
            // gOtherFlds[0]["Yet2RecvrAmt"]  = parseFloat(objYet2Recvr.value) - vPL;
            // objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];

            // gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            // objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            // localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));
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

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "Symbol" : pSymbol,
            "TransType" : pTransType,
            "OptionType" : pOptionType,
            "LotSize" : pLotSize,
            "LotQty" : pLotQty
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/liveStrategy1fo/closeLeg", requestOptions)
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

        fetch("/liveStrategy1fo/getBestRatesBySymb", requestOptions)
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
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if(gCurrPosDSSLIVE1.TradeData[i].TradeID === parseInt(objLegID.value)){
                gCurrPosDSSLIVE1.TradeData[i].LotSize = parseFloat(objLotSize.value);
                gCurrPosDSSLIVE1.TradeData[i].LotQty = parseInt(objQty.value);
                gCurrPosDSSLIVE1.TradeData[i].BuyPrice = parseFloat(objBuyPrice.value);
                gCurrPosDSSLIVE1.TradeData[i].SellPrice = parseFloat(objSellPrice.value);
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);
        localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);
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

        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if(gCurrPosDSSLIVE1.TradeData[i].TradeID === pLegID){
                vDelRec = i;
            }
        }

        gCurrPosDSSLIVE1.TradeData.splice(vDelRec, 1);

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);
        localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);
        gUpdPos = true;

        fnSetSymbolTickerList();
        fnUpdateOpenPositions();
    }
}

function fnClearLocalStorageTemp(){
    localStorage.removeItem("CurrPosDSSLIVE1");
    localStorage.removeItem("ClsdPosDSSLIVE1");
    localStorage.setItem("QtyMulDSSLIVE1", 0);
    localStorage.removeItem("NetLimitDSSLIVE1");
    gCurrPosDSSLIVE1 = { TradeData : []};
    // localStorage.removeItem("FutStratDSSLIVE1");
    // localStorage.removeItem("StrategyDSSLIVE1");
    // localStorage.removeItem("StartQtyBuyDSSLIVE1");
    localStorage.removeItem("CETrdCntDSSLIVE1");
    localStorage.removeItem("PETrdCntDSSLIVE1");

    // fnGetAllStatus();
    fnResetBrokPnlFields();
    gLastMarginSyncKey = "";
    gLastClosedHistSyncKey = "";
    fnRefreshTotalMargin();
    fnRefreshClosedPositionsFromExchange();
}

function fnResetBrokPnlFields(){
    fnUpdHidFldSettings(0.00, 'BrokerageAmt', 'Brokerage Amount Reset!');
    fnUpdHidFldSettings(0.00, 'Yet2RecvrAmt', 'Yet 2 Recover Amount Reset!');

    document.getElementById("txtBrok2Rec").value = 0.00;
    document.getElementById("txtYet2Recvr").value = 0.00;
}

//******************* WS Connection and Subscription Fully Updated Version ****************//
function fnConnectDFL(){
    let objSub = document.getElementById("spnSub");
    let vUrl = "wss://socket.india.delta.exchange";
    obj_WS_DFL = new WebSocket(vUrl);

    obj_WS_DFL.onopen = function (){
        if(!fnSuppressStreamStatusMsgs()){
            fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
        }
        // console.log("WS is Open!");
    }
    obj_WS_DFL.onerror = function (){
        setTimeout(fnSubscribeDFL, 3000);
    }
    obj_WS_DFL.onclose = function (){
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

    localStorage.setItem("CallSideSwtDSSLIVE1", objCallSideVal.value);
}

function fnPutTradeSide(){
    let objPutSideVal = document["frmSide"]["rdoPutTradeSide"];

    localStorage.setItem("PutSideSwtDSSLIVE1", objPutSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("CallSideSwtDSSLIVE1") === null){
        localStorage.setItem("CallSideSwtDSSLIVE1", "-1");
    }
    let lsCallSideSwitchS = localStorage.getItem("CallSideSwtDSSLIVE1");
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


    if(localStorage.getItem("PutSideSwtDSSLIVE1") === null){
        localStorage.setItem("PutSideSwtDSSLIVE1", "-1");
    }
    let lsPutSideSwitchS = localStorage.getItem("PutSideSwtDSSLIVE1");
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

    fetch("/liveStrategy1fo/getOptChnSDKByAstOptTypExp", requestOptions)
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
