
let obj_WS_DFL = null;
let gSubList = [];
let gMinReqMargin = 5.00;
let gQtyBuyMultiplierM = 0;
let gQtySellMultiplierM = 0;
let gObjDeltaDirec = [];
let gCurrPosDSSDV2 = { TradeData : []};
let gClsdPosDSSDV2 = { TradeData : []};
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
let gDeltaNtrlBusy = false;
let gDeltaNtrlLastActionTs = 0;
let gCurrStrats = { StratsData : [{StratID : 1, NewSellCE : true, NewSellPE : true, StartQty1 : 75, NewDelta1 : 0.25, ReDelta1 : 0.25, DeltaTP1 : 0.12, DeltaSL1 : 0.42, NewBuyCE : true, NewBuyPE : true, StartQty2 : 50, NewDelta2 : 0.12, ReDelta2 : 0.12, DeltaTP2 : 0.25, DeltaSL2 : 0.06, StartQty3 : 25, NewDelta3 : 0.06, ReDelta3 : 0.06, DeltaTP3 : 0.14, DeltaSL3 : 0.03, SellAction : "sell", SellLegSide : "both", BuyAction : "buy", BuyLegSide : "both", Action3 : "buy", LegSide3 : "both" }]};
let gCurrFutStrats = { StratsData : [{StratID : 11, StartFutQty : 1, PointsSL : 100, PointsTP : 200 }]};
let gOtherFlds = [{ SwtActiveMsgs : false, BrokerageAmt : 0, Yet2RecvrAmt : 0, SwtBrokRec : false, BrokX4Profit : 2, ReLegBrok : false, ReLeg1 : true, ReLeg2 : true, ReLeg3 : false, SwtDeltaNtrl : true, DeltaMinusPM : 0.10, DeltaPlusPM : 0.10, DeltaAdjSide : "BOTH" }];

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
    //     fnCallTradeSide();
    // });

    socket.on("refreshAllDFL", () => {
        document.location.reload();
    });

    socket.on("tv-Msg-SSDemo-Open", (pMsg) => {
        let isLsAutoTrader = localStorage.getItem("isAutoTraderDSSDV2");
        let vCallSide = localStorage.getItem("CallSideSwtDSSDV2");
        let vPutSide = localStorage.getItem("PutSideSwtDSSDV2");
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
    if(!gCurrPosDSSDV2 || !Array.isArray(gCurrPosDSSDV2.TradeData)){
        return null;
    }

    let objOpenLegs = gCurrPosDSSDV2.TradeData.filter(objLeg => objLeg && objLeg.Status === "OPEN");
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
        fnLoadHiddenFlds();
        fnLoadOptStep();
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

        gTodayClsOpt = setInterval(fnChkTodayPosToCls, 900000);

        // fnLoadTotalLossAmtQty();
    }
}

function fnLoadDefQty(){
    let objStartQtyBuyM = JSON.parse(localStorage.getItem("StartQtyBuyDSSDV2"));
    let objStartQtySellM = JSON.parse(localStorage.getItem("StartQtySellDSSDV2"));
    let objStartQty2 = document.getElementById("txtStartQty2");
    let objStartQty1 = document.getElementById("txtStartQty1");

    if(objStartQtyBuyM === null){
        objStartQty2.value = 1;
        localStorage.setItem("StartQtyBuyDSSDV2", objStartQty2.value);
    }
    else{
        objStartQty2.value = objStartQtyBuyM;
    }

    if(objStartQtySellM === null){
        objStartQty1.value = 1;
        localStorage.setItem("StartQtySellDSSDV2", objStartQty1.value);
    }
    else{
        objStartQty1.value = objStartQtySellM;
    }
}

function fnLoadDefFutStrategy(){
    let objFutStrat = JSON.parse(localStorage.getItem("FutStratDSSDV2"));

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
    let objHidFlds = JSON.parse(localStorage.getItem("HidFldsDSSDV2"));
    let objSwtActiveMsgs = document.getElementById("swtActiveMsgs");
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objYet2Recvr = document.getElementById("txtYet2Recvr");

    let objSwtBrokerage = document.getElementById("swtBrokRecvry");
    let objTxtBrokVal = document.getElementById("txtXBrok2Rec");
    let objChkReLeg = document.getElementById("chkReLegBrok");

    let objchkReLeg1 = document.getElementById("chkReLeg1");
    let objchkReLeg2 = document.getElementById("chkReLeg2");
    let objchkReLeg3 = document.getElementById("chkReLeg3");

    let objChkDeltaNeutral = document.getElementById("swtDeltaNeutral");
    let objMinusDeltaPM = document.getElementById("txtMinusDeltaPM");
    let objPlusDeltaPM = document.getElementById("txtPlusDeltaPM");
    let objDeltaAdjSide = document.getElementById("ddlDeltaAdjSide");

    if(objHidFlds === null || objHidFlds === ""){
        objHidFlds = gOtherFlds;
        objSwtActiveMsgs.checked = objHidFlds[0]["SwtActiveMsgs"];
        objBrokAmt.value = objHidFlds[0]["BrokerageAmt"];
        objYet2Recvr.value = objHidFlds[0]["Yet2RecvrAmt"];

        objSwtBrokerage.checked = objHidFlds[0]["SwtBrokRec"]; 
        objTxtBrokVal.value = objHidFlds[0]["BrokX4Profit"];
        objChkReLeg.checked = objHidFlds[0]["ReLegBrok"]; 

        objchkReLeg1.checked = objHidFlds[0]["ReLeg1"]; 
        objchkReLeg2.checked = objHidFlds[0]["ReLeg2"]; 
        objchkReLeg3.checked = objHidFlds[0]["ReLeg3"] || false; 

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
            localStorage.setItem("HidFldsDSSDV2", JSON.stringify(gOtherFlds));
        }
        objSwtActiveMsgs.checked = gOtherFlds[0]["SwtActiveMsgs"];
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];
        objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];

        objSwtBrokerage.checked = gOtherFlds[0]["SwtBrokRec"]; 
        objTxtBrokVal.value = gOtherFlds[0]["BrokX4Profit"];
        objChkReLeg.checked = gOtherFlds[0]["ReLegBrok"]; 

        objchkReLeg1.checked = gOtherFlds[0]["ReLeg1"]; 
        objchkReLeg2.checked = gOtherFlds[0]["ReLeg2"]; 
        objchkReLeg3.checked = gOtherFlds[0]["ReLeg3"] || false; 

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

        localStorage.setItem("HidFldsDSSDV2", JSON.stringify(gOtherFlds));

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdFutStratSettings(pThisVal, pStratParam, pFieldMsg, pIfUpdFut, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrFutStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("FutStratDSSDV2", JSON.stringify(gCurrFutStrats));

        if(pIfUpdFut){
            fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam);
        }
        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
        if((gCurrPosDSSDV2.TradeData[i].Status === "OPEN") && (pOptionType === "F")){
            gCurrPosDSSDV2.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
            console.log("Params Updated");
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosDSSDV2);
    localStorage.setItem("CurrPosDSSDV2", objExcTradeDtls);
    fnLoadCurrentTradePos();

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
    localStorage.setItem("StrategyDSSDV2", JSON.stringify(gCurrStrats));
}

function fnLoadDefStrategy(){
    let objStrat = JSON.parse(localStorage.getItem("StrategyDSSDV2"));

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

    localStorage.setItem("StrategyDSSDV2", JSON.stringify(objStrat));
}

function fnChangeBuyStartQty(pThisVal){
    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyBuyDSSDV2", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyBuyDSSDV2", 1);
    }
    else{
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtyBuyDSSDV2", pThisVal.value);
        }
    }
}

function fnChangeSellStartQty(pThisVal){
    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellDSSDV2", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellDSSDV2", 1);
    }
    else{
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtySellDSSDV2", pThisVal.value);
        }
    }
}

function fnUpdOptStratSettings(pThis, pThisVal, pStratParam, pFieldMsg, pIfUpdCP, pIfBorS, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input / Select Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("StrategyDSSDV2", JSON.stringify(gCurrStrats));
    
        if(pIfUpdCP){
            fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam);
        }

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
        if((gCurrPosDSSDV2.TradeData[i].Status === "OPEN") && (gCurrPosDSSDV2.TradeData[i].TransType === pIfBorS) && (pOptionType === "")){
            gCurrPosDSSDV2.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
            console.log("Params Updated");
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosDSSDV2);
    localStorage.setItem("CurrPosDSSDV2", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
}

function fnChangeSymbol(pSymbVal){
    localStorage.setItem("SymbDSSDV2", JSON.stringify(pSymbVal));

    fnLoadDefSymbol();
}

function fnLoadDefSymbol(){
    let objDefSymM = JSON.parse(localStorage.getItem("SymbDSSDV2"));
    let objSelSymb = document.getElementById("ddlSymbols");

    if(objDefSymM === null){
        objDefSymM = "";
    }

    objSelSymb.value = objDefSymM;
    fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
    let objLotSize = document.getElementById("txtLotSize");

    localStorage.setItem("SymbDSSDV2", JSON.stringify(pThisVal));

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
    let objStartBQty = document.getElementById("txtStartQty2");
    let objStartSQty = document.getElementById("txtStartQty1");

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
    let objCurrPos = JSON.parse(localStorage.getItem("CurrPosDSSDV2"));

    gCurrPosDSSDV2 = objCurrPos;

    if(gCurrPosDSSDV2 === null){
        gCurrPosDSSDV2 = { TradeData : []};
    }
    else{
        fnSetSymbolTickerList();
    }
}

function fnLoadClosedPostions(){
    let objClsdPos = JSON.parse(localStorage.getItem("ClsdPosDSSDV2"));
    gClsdPosDSSDV2 = objClsdPos;

    if(gClsdPosDSSDV2 === null){
        gClsdPosDSSDV2 = { TradeData : []};
    }
    else{
        fnDispClosedPositions();
    }
}

function fnSetSymbolTickerList(){
    if(gCurrPosDSSDV2.TradeData.length > 0){
        const objSubListArray = [];
        gSubList = [];

        for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
            if(gCurrPosDSSDV2.TradeData[i].Status === "OPEN"){
                objSubListArray.push(gCurrPosDSSDV2.TradeData[i].Symbol);
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
    // let vStepM = JSON.parse(localStorage.getItem("OptStepDSSDV2"));
    let objSwtStep = document.getElementById("swtStepDFL");

    localStorage.setItem("OptStepDSSDV2", JSON.stringify(objSwtStep.checked));
    // alert(objSwtStep.checked);
}

function fnLoadOptStep(){
    let vStepM = JSON.parse(localStorage.getItem("OptStepDSSDV2"));
    let objSwtStep = document.getElementById("swtStepDFL");

    if(vStepM){
        objSwtStep.checked = true;
    }
    else{
        objSwtStep.checked = false;
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

    for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
        if(gCurrPosDSSDV2.TradeData[i].Expiry === vDDMMYYYY){
            let vDate3PM = new Date();
            let vDate5PM = new Date();
            vDate3PM.setHours(15, 30, 0, 0);
            vDate5PM.setHours(17, 0, 0, 0);

            let v3PM = vDate3PM.getTime();
            let v5PM = vDate5PM.getTime();

            let vState = gCurrPosDSSDV2.TradeData[i].Status;

            if((vTodayDate.valueOf() > v3PM) && (vTodayDate.valueOf() < v5PM)){
                if(vState === "OPEN"){
                    vLegID = gCurrPosDSSDV2.TradeData[i].TradeID;
                    vTransType = gCurrPosDSSDV2.TradeData[i].TransType;
                    vOptionType = gCurrPosDSSDV2.TradeData[i].OptionType;
                    vSymbol = gCurrPosDSSDV2.TradeData[i].Symbol;
                    
                    vIsRecExists = true;

                }
            }
        }
    }

    if(vIsRecExists === true){
        fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
    }

    // console.log(gCurrPosDSSDV2);
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
        console.log("Close All Positions...");
        fnExitAllPositions();
    }
    else{
        for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
            if(gCurrPosDSSDV2.TradeData[i].Status === "OPEN"){
                let vOptionTypeZZ = gCurrPosDSSDV2.TradeData[i].OptionType;
                let vCurrDelta = parseFloat(gSymbDeltaList[gCurrPosDSSDV2.TradeData[i].Symbol]);
                let vCurrGamma = parseFloat(gSymbGammaList[gCurrPosDSSDV2.TradeData[i].Symbol]);
                let vCurrTheta = parseFloat(gSymbThetaList[gCurrPosDSSDV2.TradeData[i].Symbol]);
                let vCurrVega = parseFloat(gSymbVegaList[gCurrPosDSSDV2.TradeData[i].Symbol]);

                if(vOptionTypeZZ !== "F"){
                    let vCurrDeltaPos = vCurrDelta;
                    if(!isNaN(vCurrDelta)){
                        if(gCurrPosDSSDV2.TradeData[i].TransType === "sell"){
                            vCurrDeltaPos = -1 * vCurrDelta;
                        }
                    }
                    if(!isNaN(vCurrDelta)){
                        gCurrPosDSSDV2.TradeData[i].DeltaC = vCurrDeltaPos;
                    }
                    if(!isNaN(vCurrGamma)){
                        gCurrPosDSSDV2.TradeData[i].GammaC = vCurrGamma;
                    }
                    if(!isNaN(vCurrTheta)){
                        gCurrPosDSSDV2.TradeData[i].ThetaC = vCurrTheta;
                    }
                    if(!isNaN(vCurrVega)){
                        gCurrPosDSSDV2.TradeData[i].VegaC = vCurrVega;
                    }
                }

                let vStrikePrice = gCurrPosDSSDV2.TradeData[i].StrikePrice;
                let vLotSize = gCurrPosDSSDV2.TradeData[i].LotSize;
                let vQty = gCurrPosDSSDV2.TradeData[i].LotQty;
                let vBuyPrice = gCurrPosDSSDV2.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosDSSDV2.TradeData[i].SellPrice;
                let vDeltaSL = gCurrPosDSSDV2.TradeData[i].DeltaSL;
                let vDeltaTP = gCurrPosDSSDV2.TradeData[i].DeltaTP;

                // let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionTypeZZ);
                // let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

                if(gCurrPosDSSDV2.TradeData[i].TransType === "sell"){
                    let vCurrPrice = parseFloat(gSymbBRateList[gCurrPosDSSDV2.TradeData[i].Symbol]);
                    gCurrPosDSSDV2.TradeData[i].BuyPrice = vCurrPrice;

                    if((Math.abs(vCurrDelta) >= vDeltaSL) || (Math.abs(vCurrDelta) <= vDeltaTP)){
                        vLegID = gCurrPosDSSDV2.TradeData[i].TradeID;
                        vTransType = gCurrPosDSSDV2.TradeData[i].TransType;
                        vOptionType = gCurrPosDSSDV2.TradeData[i].OptionType;
                        vSymbol = gCurrPosDSSDV2.TradeData[i].Symbol;
                        vToPosClose = true;
                        let vCfgRow = parseInt(gCurrPosDSSDV2.TradeData[i].CfgRow || 0);
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
                else if(gCurrPosDSSDV2.TradeData[i].TransType === "buy"){
                    let vCurrPrice = parseFloat(gSymbSRateList[gCurrPosDSSDV2.TradeData[i].Symbol]);
                    gCurrPosDSSDV2.TradeData[i].SellPrice = vCurrPrice;

                    if((Math.abs(vCurrDelta) <= vDeltaSL) || (Math.abs(vCurrDelta) >= vDeltaTP)){
                        vLegID = gCurrPosDSSDV2.TradeData[i].TradeID;
                        vTransType = gCurrPosDSSDV2.TradeData[i].TransType;
                        vOptionType = gCurrPosDSSDV2.TradeData[i].OptionType;
                        vSymbol = gCurrPosDSSDV2.TradeData[i].Symbol;
                        vToPosClose = true;
                        let vCfgRow = parseInt(gCurrPosDSSDV2.TradeData[i].CfgRow || 0);
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
            // if(gClsBuyLeg && vTransType === "sell"){
            //     gClsBuyLeg = false;
            //     fnCloseBuyLeg(vTransType, vOptionType);
            // }
            // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSSDV2"));
            // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSSDV2"));

            // if((objTrdCountCE > 1 || objTrdCountPE > 1) && vTransType === "sell"){

            //     fnGetBuyOpenPosAndClose(vTransType, vOptionType);
            // }
            await fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
        }
        else{
            await fnRunDeltaNeutralFutures();
        }
    }
    }
    finally{
        gSaveUpdBusy = false;
    }
}

function fnGetOpenFutureLegBySide(pTransType){
    for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
        let objLeg = gCurrPosDSSDV2.TradeData[i];
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

    for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
        let objLeg = gCurrPosDSSDV2.TradeData[i];
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
        console.log("Delta Neutral Error", objErr);
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

    for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
        let objLeg = gCurrPosDSSDV2.TradeData[i];
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

        gCurrPosDSSDV2.TradeData[i].CloseDT = vToday;
        gCurrPosDSSDV2.TradeData[i].Status = "CLOSED";

        gClsdPosDSSDV2.TradeData.push(gCurrPosDSSDV2.TradeData[i]);
    }

    gOtherFlds[0]["Yet2RecvrAmt"] = vYet2RecvrAmt;
    objYet2Recvr.value = vYet2RecvrAmt;
    localStorage.setItem("HidFldsDSSDV2", JSON.stringify(gOtherFlds));

    let objExcTradeDtls = JSON.stringify(gClsdPosDSSDV2);
    localStorage.setItem("ClsdPosDSSDV2", objExcTradeDtls);

    gCurrPosDSSDV2 = { TradeData : []};
    localStorage.removeItem("CurrPosDSSDV2");

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

    for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
        if((gCurrPosDSSDV2.TradeData[i].TransType === "buy") && gCurrPosDSSDV2.TradeData[i].OptionType === vOptionType){
            vRecExists = true;
            vLegID = gCurrPosDSSDV2.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosDSSDV2.TradeData[i].Symbol;
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

    for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
        if((gCurrPosDSSDV2.TradeData[i].Status === "OPEN") && (gCurrPosDSSDV2.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSDV2.TradeData[i].TransType === "buy")){
            vLegID = gCurrPosDSSDV2.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosDSSDV2.TradeData[i].Symbol;
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

    console.log(gCurrPosDSSDV2);
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
    let vBuyExpiryMode = JSON.parse(localStorage.getItem("BuyExpiryModeDSSDV2"));
    let vSellExpiryMode = JSON.parse(localStorage.getItem("SellExpiryModeDSSDV2"));
    let vExpiryMode3 = JSON.parse(localStorage.getItem("ExpiryMode3DSSDV2"));
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

function fnUpdateBuyExpiryMode(){
    let objBuyExpiryMode = document.getElementById("ddlExpiryMode2");
    let objExpiryBuy = document.getElementById("txtExpiry2");

    fnLoadExpiryDate(objBuyExpiryMode.value, objExpiryBuy);
    localStorage.setItem("BuyExpiryModeDSSDV2", JSON.stringify(objBuyExpiryMode.value));
}

function fnUpdateSellExpiryMode(){
    let objSellExpiryMode = document.getElementById("ddlExpiryMode1");
    let objExpirySell = document.getElementById("txtExpiry1");

    fnLoadExpiryDate(objSellExpiryMode.value, objExpirySell);
    localStorage.setItem("SellExpiryModeDSSDV2", JSON.stringify(objSellExpiryMode.value));
}

function fnUpdateExpiryMode3(){
    let objExpiryMode3 = document.getElementById("ddlExpiryMode3");
    let objExpiry3 = document.getElementById("txtExpiry3");
    if(!objExpiryMode3 || !objExpiry3){
        return;
    }

    fnLoadExpiryDate(objExpiryMode3.value, objExpiry3);
    localStorage.setItem("ExpiryMode3DSSDV2", JSON.stringify(objExpiryMode3.value));
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

        if(gCurrPosDSSDV2.TradeData.length > 0){
            for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){

                if((gCurrPosDSSDV2.TradeData[i].OptionType === vOptionType) && (gCurrPosDSSDV2.TradeData[i].TransType === vTransType) && (gCurrPosDSSDV2.TradeData[i].Status === "OPEN") && (gCurrPosDSSDV2.TradeData[i].Expiry === vTargetExpiry)){
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

                    gCurrPosDSSDV2.TradeData.push(vExcTradeDtls);
                    let objExcTradeDtls = JSON.stringify(gCurrPosDSSDV2);

                    localStorage.setItem("CurrPosDSSDV2", objExcTradeDtls);

                    let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsDSSDV2", JSON.stringify(gOtherFlds));

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
        fetch("/strategy2fo/execOptionLeg", requestOptions)
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

    if(gCurrPosDSSDV2.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
            if((gCurrPosDSSDV2.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSDV2.TradeData[i].TransType === pTransType) && (gCurrPosDSSDV2.TradeData[i].Status === "OPEN")){
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

async function fnPreInitAutoTrade(pOptionType, pTransType, pCfgRow){
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
    let vDeltaNPos = objCtx.objNewDelta.value;
    let vDeltaRePos = objCtx.objReDelta.value;
    let vDeltaTP = objCtx.objTP.value;
    let vDeltaSL = objCtx.objSL.value;

    if(gCurrPosDSSDV2.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
            if((gCurrPosDSSDV2.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSDV2.TradeData[i].TransType === pTransType) && (gCurrPosDSSDV2.TradeData[i].Status === "OPEN") && (gCurrPosDSSDV2.TradeData[i].Expiry === vExpiryNewPos)){
                vIsRecExists = true;
            }
        }
    }

    if(vIsRecExists === false){
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

            gCurrPosDSSDV2.TradeData.push(vExcTradeDtls);
            let objExcTradeDtls = JSON.stringify(gCurrPosDSSDV2);

            localStorage.setItem("CurrPosDSSDV2", objExcTradeDtls);

            let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
            gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            localStorage.setItem("HidFldsDSSDV2", JSON.stringify(gOtherFlds));

            console.log("Trade Executed");

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
        let vDelta = objTradeDtls.data.Delta;
        let vDeltaC = parseFloat(objTradeDtls.data.DeltaC);
        let vPointsTP = objTradeDtls.data.PointsTP;
        let vPointsSL = objTradeDtls.data.PointsSL;
        let vRateTP = objTradeDtls.data.RateTP;
        let vRateSL = objTradeDtls.data.RateSL;
        let vOpenDTVal = vDate.valueOf();
        gUpdPos = false;

        let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vOptType, StrikePrice : vStrPrice, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : 0, GammaC : 0, Theta : 0, ThetaC : 0, Vega : 0, VegaC : 0, PointsTP : vPointsTP, RateTP : vRateTP, PointsSL : vPointsSL, RateSL : vRateSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

        gCurrPosDSSDV2.TradeData.push(vExcTradeDtls);
        let objExcTradeDtls = JSON.stringify(gCurrPosDSSDV2);

        localStorage.setItem("CurrPosDSSDV2", objExcTradeDtls);

        let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vOptType);
        gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

        localStorage.setItem("HidFldsDSSDV2", JSON.stringify(gOtherFlds));

        console.log("Trade Executed");
        gUpdPos = true;
        fnSetSymbolTickerList();
        fnUpdateOpenPositions();
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
        fetch("/strategy2fo/execFutureLeg", requestOptions)
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

    if(gCurrPosDSSDV2.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
            if((gCurrPosDSSDV2.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSDV2.TradeData[i].TransType === pTransType) && (gCurrPosDSSDV2.TradeData[i].Status === "OPEN")){
                vLegID = gCurrPosDSSDV2.TradeData[i].TradeID;
                vTransType = gCurrPosDSSDV2.TradeData[i].TransType;
                vSymbol = gCurrPosDSSDV2.TradeData[i].Symbol;
                
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
    // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSSDV2"));
    // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSSDV2"));

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
                    //     localStorage.setItem("CETrdCntDSSDV2", objTrdCountCE);
                    // }
                    // else if(pOptionType === "P"){
                    //     objTrdCountPE = objTrdCountPE + 1;
                    //     localStorage.setItem("PETrdCntDSSDV2", objTrdCountPE);
                    // }
                }
                else if(vTransType === "buy"){
                    vTradeSL = vBestBuy - vRateSL;
                    vTradeTP = vBestBuy + vRateTP;
                }

                let vExcTradeDtls = { ClientOrderID : vClientID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vTransType, OptionType : vOptionType, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseInt(vQty), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, Vega : vVega, Gamma : vGamma, Rho : vRho, MarkIV : vMarkIV, Theta : vTheta, DeltaC : vDeltaC, VegaC : vVegaC, GammaC : vGammaC, RhoC : vRhoC, MarkIVC : vMarkIVC, ThetaC : vThetaC, OpenDTVal : vOrdId, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, DeltaNP : vDeltaNPos, TradeSL : vTradeSL, TradeTP : vTradeTP, Status : "OPEN" };
                
                gCurrPosDSSDV2.TradeData.push(vExcTradeDtls);

                let objExcTradeDtls = JSON.stringify(gCurrPosDSSDV2);

                localStorage.setItem("CurrPosDSSDV2", objExcTradeDtls);

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

        fetch("/strategy2fo/execOption", requestOptions)
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

    for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
        let vStatus = gCurrPosDSSDV2.TradeData[i].Status;
        let vTransType = gCurrPosDSSDV2.TradeData[i].TransType;
        let vExOptionType = gCurrPosDSSDV2.TradeData[i].OptionType;

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
        // console.log(gCurrPosDSSDV2);
        if(gCurrPosDSSDV2.TradeData.length === 0){
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

            for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
                let vLegID = gCurrPosDSSDV2.TradeData[i].TradeID;
                let vDelta = parseFloat(gCurrPosDSSDV2.TradeData[i].Delta || 0);
                let vDeltaC = parseFloat(gCurrPosDSSDV2.TradeData[i].DeltaC || gCurrPosDSSDV2.TradeData[i].Delta || 0);
                let vGamma = parseFloat(gCurrPosDSSDV2.TradeData[i].Gamma || 0);
                let vGammaC = parseFloat(gCurrPosDSSDV2.TradeData[i].GammaC || gCurrPosDSSDV2.TradeData[i].Gamma || 0);
                let vTheta = parseFloat(gCurrPosDSSDV2.TradeData[i].Theta || 0);
                let vThetaC = parseFloat(gCurrPosDSSDV2.TradeData[i].ThetaC || gCurrPosDSSDV2.TradeData[i].Theta || 0);
                let vVega = parseFloat(gCurrPosDSSDV2.TradeData[i].Vega || 0);
                let vVegaC = parseFloat(gCurrPosDSSDV2.TradeData[i].VegaC || gCurrPosDSSDV2.TradeData[i].Vega || 0);

                let vLotSize = gCurrPosDSSDV2.TradeData[i].LotSize;
                let vQty = gCurrPosDSSDV2.TradeData[i].LotQty;
                let vOpenDT = gCurrPosDSSDV2.TradeData[i].OpenDT;
                let vCloseDT = gCurrPosDSSDV2.TradeData[i].CloseDT;
                let vOptionType = gCurrPosDSSDV2.TradeData[i].OptionType;
                let vProductID = gCurrPosDSSDV2.TradeData[i].ProductID;
                let vBuyPrice = gCurrPosDSSDV2.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosDSSDV2.TradeData[i].SellPrice;
                let vStatus = gCurrPosDSSDV2.TradeData[i].Status;
                let vStrikePrice = parseFloat(gCurrPosDSSDV2.TradeData[i].StrikePrice);
                let vSymbol = gCurrPosDSSDV2.TradeData[i].Symbol;
                let vTransType = gCurrPosDSSDV2.TradeData[i].TransType;
                let vUndrAsstSymb = gCurrPosDSSDV2.TradeData[i].UndrAsstSymb;

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

function fnDispClosedPositions(){
    let objClosedTradeList = document.getElementById("tBodyClosedTrades");
    if(!objClosedTradeList){
        return;
    }

    const objMapClosedById = new Map();

    if(gClsdPosDSSDV2 && Array.isArray(gClsdPosDSSDV2.TradeData)){
        for(let i=0; i<gClsdPosDSSDV2.TradeData.length; i++){
            let objLeg = gClsdPosDSSDV2.TradeData[i];
            if(objLeg && objLeg.TradeID !== undefined){
                objMapClosedById.set(String(objLeg.TradeID), objLeg);
            }
        }
    }

    if(gCurrPosDSSDV2 && Array.isArray(gCurrPosDSSDV2.TradeData)){
        for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
            let objLeg = gCurrPosDSSDV2.TradeData[i];
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
    let objStepSwt = document.getElementById("swtStepDFL");
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objYet2Recvr = document.getElementById("txtYet2Recvr");

    let objBestRates = await fnGetBestRatesBySymbId(objApiKey.value, objApiSecret.value, pSymbol);
    
    if(objBestRates.status === "success"){
        let vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    
        let vBestRate = 0;

        if(pTransType === "sell"){
            vBestRate = parseFloat(objBestRates.data.result.quotes.best_ask);
        }
        else if(pTransType === "buy"){
            vBestRate = parseFloat(objBestRates.data.result.quotes.best_bid);
        }

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

        for(let i=0; i<gCurrPosDSSDV2.TradeData.length; i++){
            if(gCurrPosDSSDV2.TradeData[i].TradeID === pLegID){                
                if(pTransType === "sell"){
                    gCurrPosDSSDV2.TradeData[i].BuyPrice = vBestRate;
                }
                else if(pTransType === "buy"){
                    gCurrPosDSSDV2.TradeData[i].SellPrice = vBestRate;
                }
                gCurrPosDSSDV2.TradeData[i].CloseDT = vToday;
                gCurrPosDSSDV2.TradeData[i].Status = pStatus;

                vStrikePrice = gCurrPosDSSDV2.TradeData[i].StrikePrice;
                vLotSize = gCurrPosDSSDV2.TradeData[i].LotSize;
                vLotQty = gCurrPosDSSDV2.TradeData[i].LotQty;
                vBuyPrice = gCurrPosDSSDV2.TradeData[i].BuyPrice;
                vSellPrice = gCurrPosDSSDV2.TradeData[i].SellPrice;
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSDV2);
        localStorage.setItem("CurrPosDSSDV2", objExcTradeDtls);


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
            localStorage.setItem("HidFldsDSSDV2", JSON.stringify(gOtherFlds));            

            if(vPL > 0){
                if(parseFloat(objBrokAmt.value) >= vCharges){
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) - vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsDSSDV2", JSON.stringify(gOtherFlds));
                }
            }
            else{
                // No auto open-buy-leg-on-sell-SL behavior in Strategy2FO.
            }
        }
        else{
            //This part is not required in Real code
            // gOtherFlds[0]["Yet2RecvrAmt"]  = parseFloat(objYet2Recvr.value) - vPL;
            // objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];

            // gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            // objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            // localStorage.setItem("HidFldsDSSDV2", JSON.stringify(gOtherFlds));
        }

        console.log("Position Closed!");

        gUpdPos = true;
        fnSetSymbolTickerList();
        fnUpdateOpenPositions();

        if(gReLeg){
            let vReRow = gReLegCfgRow;
            gReLeg = false;
            gReLegCfgRow = 0;
            fnPreInitAutoTrade(pOptionType, pTransType, vReRow);
        }
    }
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

        fetch("/strategy2fo/getBestRatesBySymb", requestOptions)
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

        bUpdated = fnUpdLeg(gCurrPosDSSDV2) || bUpdated;
        bUpdated = fnUpdLeg(gClsdPosDSSDV2) || bUpdated;

        localStorage.setItem("CurrPosDSSDV2", JSON.stringify(gCurrPosDSSDV2));
        localStorage.setItem("ClsdPosDSSDV2", JSON.stringify(gClsdPosDSSDV2));

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
        let vCurrLen = (gCurrPosDSSDV2 && Array.isArray(gCurrPosDSSDV2.TradeData)) ? gCurrPosDSSDV2.TradeData.length : 0;
        let vClsdLen = (gClsdPosDSSDV2 && Array.isArray(gClsdPosDSSDV2.TradeData)) ? gClsdPosDSSDV2.TradeData.length : 0;

        if(gCurrPosDSSDV2 && Array.isArray(gCurrPosDSSDV2.TradeData)){
            gCurrPosDSSDV2.TradeData = gCurrPosDSSDV2.TradeData.filter(objLeg => String(objLeg.TradeID) !== vLegID);
        }
        if(gClsdPosDSSDV2 && Array.isArray(gClsdPosDSSDV2.TradeData)){
            gClsdPosDSSDV2.TradeData = gClsdPosDSSDV2.TradeData.filter(objLeg => String(objLeg.TradeID) !== vLegID);
        }

        localStorage.setItem("CurrPosDSSDV2", JSON.stringify(gCurrPosDSSDV2));
        localStorage.setItem("ClsdPosDSSDV2", JSON.stringify(gClsdPosDSSDV2));

        let bDeleted = ((gCurrPosDSSDV2.TradeData.length !== vCurrLen) || (gClsdPosDSSDV2.TradeData.length !== vClsdLen));
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
    localStorage.removeItem("CurrPosDSSDV2");
    localStorage.removeItem("ClsdPosDSSDV2");
    localStorage.setItem("QtyMulDSSDV2", 0);
    localStorage.removeItem("NetLimitDSSDV2");
    gCurrPosDSSDV2 = { TradeData : []};
    // localStorage.removeItem("FutStratDSSDV2");
    // localStorage.removeItem("StrategyDSSDV2");
    // localStorage.removeItem("StartQtyBuyDSSDV2");
    localStorage.removeItem("CETrdCntDSSDV2");
    localStorage.removeItem("PETrdCntDSSDV2");

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

function fnCallTradeSide(){
    let objCallSideVal = document["frmSide"]["rdoCallTradeSide"];

    localStorage.setItem("CallSideSwtDSSDV2", objCallSideVal.value);
}

function fnPutTradeSide(){
    let objPutSideVal = document["frmSide"]["rdoPutTradeSide"];

    localStorage.setItem("PutSideSwtDSSDV2", objPutSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("CallSideSwtDSSDV2") === null){
        localStorage.setItem("CallSideSwtDSSDV2", "-1");
    }
    let lsCallSideSwitchS = localStorage.getItem("CallSideSwtDSSDV2");
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


    if(localStorage.getItem("PutSideSwtDSSDV2") === null){
        localStorage.setItem("PutSideSwtDSSDV2", "-1");
    }
    let lsPutSideSwitchS = localStorage.getItem("PutSideSwtDSSDV2");
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

    fetch("/strategy2fo/getOptChnSDKByAstOptTypExp", requestOptions)
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




