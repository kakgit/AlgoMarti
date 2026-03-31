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
let gRenkoFeedStepPts = 100;
let gRenkoFeedPriceSource = "mark_price";
let gRenkoFeedAnchor = null;
let gRenkoFeedMaxRows = 300;
let gRenkoPatternSeq = "";
let gRenkoPatternMaxLen = 0;

window.addEventListener("DOMContentLoaded", function(){
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
        let isLsAutoTrader = localStorage.getItem("isDFSDAutoTrader");
        let vTradeSide = localStorage.getItem("DFSD_TradeSideSwtS");

    	if(pMsg.Indc === parseInt(objIncType.value)){
	        if(isLsAutoTrader === "false"){
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

    socket.on("cdlOHLC", (pMsg) => {
    	if(pMsg.Indc === parseInt(objIncType.value)){
    		console.log(pMsg);
	        // fnCloseManualFutures(pMsg.TransType);
    	}
    });

    socket.on("tv-AutoTrade", (pMsg) => {
    	localStorage.setItem("isDFSDAutoTrader", pMsg.AutoTrade);
    	fnGetSetAutoTraderStatus();
    });
});

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

function fnShouldUseDeltaRenkoFeedForStrategy(){
    return gRenkoFeedEnabled === true;
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
    return pSide === "sell" ? "DFSD_RenkoSellPatterns" : "DFSD_RenkoBuyPatterns";
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

    const vLegacy = String(localStorage.getItem("DFSD_RenkoPatterns") || "");
    if(vLegacy.trim() !== ""){
        if(!localStorage.getItem("DFSD_RenkoBuyPatterns")){
            localStorage.setItem("DFSD_RenkoBuyPatterns", vLegacy);
        }
        localStorage.removeItem("DFSD_RenkoPatterns");
    }

    if(!localStorage.getItem("DFSD_RenkoBuyPatterns")){
        localStorage.setItem("DFSD_RenkoBuyPatterns", "GGR");
    }
    if(!localStorage.getItem("DFSD_RenkoSellPatterns")){
        localStorage.setItem("DFSD_RenkoSellPatterns", "");
    }

    fnSetConfiguredRenkoPatterns("buy", fnGetConfiguredRenkoPatterns("buy"));
    fnSetConfiguredRenkoPatterns("sell", fnGetConfiguredRenkoPatterns("sell"));

    if(objBuyTxt){
        objBuyTxt.value = localStorage.getItem("DFSD_RenkoBuyPatterns") || "";
    }
    if(objSellTxt){
        objSellTxt.value = localStorage.getItem("DFSD_RenkoSellPatterns") || "";
    }
}

function fnUpdateRenkoFeedStep(pThis){
    const vParsed = Math.floor(fnParsePositiveNumber(pThis?.value, 100));
    gRenkoFeedStepPts = (Number.isFinite(vParsed) && vParsed > 0) ? vParsed : 100;
    if(pThis){
        pThis.value = gRenkoFeedStepPts;
    }
    localStorage.setItem("DFSD_RenkoFeedStepPts", String(gRenkoFeedStepPts));
    gRenkoFeedAnchor = null;
    fnSetRenkoFeedMeta();
    fnAppendRenkoFeedMsg(`Step updated to ${gRenkoFeedStepPts} points.`);
}

function fnUpdateRenkoFeedPriceSource(pThis){
    const vSel = String(pThis?.value || "mark_price");
    const objAllowed = ["mark_price", "spot_price", "best_bid", "best_ask"];
    gRenkoFeedPriceSource = objAllowed.includes(vSel) ? vSel : "mark_price";
    localStorage.setItem("DFSD_RenkoFeedPriceSrc", gRenkoFeedPriceSource);
    gRenkoFeedAnchor = null;
    fnSetRenkoFeedMeta();
    fnAppendRenkoFeedMsg(`Price source changed to ${gRenkoFeedPriceSource}. Anchor reset.`);
}

function fnGetTradeSideSwitch(){
    const vTradeSide = String(localStorage.getItem("DFSD_TradeSideSwtS") || "-1");
    if(vTradeSide === "true"){
        return "buy";
    }
    if(vTradeSide === "false"){
        return "sell";
    }
    return "both";
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
    const vAuto = String(localStorage.getItem("isDFSDAutoTrader") || "false");
    if(vAuto !== "true"){
        fnAppendRenkoFeedMsg(`[${pSource}] ${vColorCode} matched ${vSide.toUpperCase()} ${vMatchTxt} but Auto Trader is OFF.`);
        return;
    }

    fnAppendRenkoFeedMsg(`[${pSource}] Pattern ${vMatchTxt} hit on ${vColorCode}. Executing ${vSide.toUpperCase()}.`);
    fnGenMessage(`Renko ${vSide.toUpperCase()} pattern matched (${vMatchTxt})`, "badge bg-info", "spnGenMsg");
    await fnInitiateManualFutures(vSide);
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
            Indc: Number(document.getElementById("ddlIndicatorType")?.value || 0),
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
    localStorage.setItem("DFSD_RenkoFeedEnabled", JSON.stringify(gRenkoFeedEnabled));
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
    const vEnabled = JSON.parse(localStorage.getItem("DFSD_RenkoFeedEnabled") || "false");
    const vStepLs = Math.floor(fnParsePositiveNumber(localStorage.getItem("DFSD_RenkoFeedStepPts"), 100));
    const vSrcLs = String(localStorage.getItem("DFSD_RenkoFeedPriceSrc") || "mark_price");
    const objAllowed = ["mark_price", "spot_price", "best_bid", "best_ask"];

    gRenkoFeedStepPts = (Number.isFinite(vStepLs) && vStepLs > 0) ? vStepLs : 100;
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

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
		fnLoadDefSymbol();
        fnLoadIndicatorType();
		fnLoadMarti();
		fnLoadYetToRec();
		fnLoadDefQty();
		fnLoadLossRecoveryMultiplier();
		fnLoadCurrentTradePos();
		// UNCOMMENT for LIVE TRADING in DEMO
		fnSubscribe();
		// fnGetHistoricalOHLC();
		// fnSubscribeInterval();
		// UNCOMMENT for LIVE TRADING in DEMO
		fnSetInitFutTrdDtls();
		fnLoadSlTp();
		fnLoadTodayTrades();
		fnLoadTradeCounter();

		fnLoadTradeSide();
	}
    fnLoadRenkoFeedSettings();
}

function fnLoadDefSymbol(){
	let objDefSymM = fnGetLsJSON("DFSD_DefSymbFut", null);
	let objSelSymb = document.getElementById("ddlFuturesSymbols");

	if(objDefSymM === null || objDefSymM === ""){
		objDefSymM = "BTCUSD";
	}

	objSelSymb.value = objDefSymM;
	fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
	let objLotSize = document.getElementById("txtLotSize");

	localStorage.setItem("DFSD_DefSymbFut", JSON.stringify(pThisVal));

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

function fnLoadDefQty(){
	let objStartQtyM = fnGetLsJSON("DFSD_StartQtyNo", null);
	let objQtyMul = fnGetLsJSON("DFSD_QtyMul", null);

    let objQty = document.getElementById("txtFuturesQty");
    let objStartQty = document.getElementById("txtStartQty");

    if(objQtyMul === null || objQtyMul < 1 || objQtyMul < objStartQtyM){
	    if(objStartQtyM === null){
	    	objStartQty.value = 100;
	    	objQty.value = 100;
	    	localStorage.setItem("DFSD_StartQtyNo", objStartQty.value);
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
}

function fnLoadLossRecoveryMultiplier(){
	let objLossRecM = fnGetLsJSON("DFSD_LossRecM", null);
	let objProfitMultiX = fnGetLsJSON("DFSD_MultiplierX", null);

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
    localStorage.setItem("DFSD_IndicatorType", pIndicator);
}

function fnLoadIndicatorType(){
    const objDdlIndicator = document.getElementById("ddlIndicatorType");
    if(!objDdlIndicator){
        return;
    }

    const vIndicatorType = localStorage.getItem("DFSD_IndicatorType") || "Indicator-1";
    objDdlIndicator.value = vIndicatorType;
}

function fnUpdateLossRecPrct(pThisVal){
	const vLossPct = fnParsePositiveNumber(pThisVal.value, 100);
    pThisVal.value = vLossPct;
	localStorage.setItem("DFSD_LossRecM", vLossPct);
	gLossRecPerct = vLossPct;
}

function fnUpdateMultiplierX(pThisVal){
	const vMultiplier = fnParsePositiveNumber(pThisVal.value, 1.0);
    pThisVal.value = vMultiplier;
	localStorage.setItem("DFSD_MultiplierX", vMultiplier);
	gMultiplierX = vMultiplier;
}

function fnLoadTradeCounter(){
	let objCounterSwtM = JSON.parse(localStorage.getItem("DFSD_CounterSwt"));
	let objCounterSwt = document.getElementById("swtTradeCounter");

	if(objCounterSwtM){
		objCounterSwt.checked = true;
	}
	else{
		objCounterSwt.checked = false;
	}
}

function fnLoadMarti(){
    let objSwtStep = document.getElementById("swtMartingale");
    let objSwtMarti = document.getElementById("swtMarti");
    if(!objSwtStep){
        return;
    }

    let vMode = (localStorage.getItem("DFSD_TradeMode") || "").toUpperCase();
    if(vMode === ""){
        let vLegacyMarti = JSON.parse(localStorage.getItem("DFSD_Marti"));
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
        localStorage.setItem("DFSD_TradeMode", vMode);
        localStorage.setItem("DFSD_Marti", JSON.stringify(objSwtMarti.checked));
    }
    else{
        objSwtStep.checked = (vMode === "MARTI");
        localStorage.setItem("DFSD_Marti", JSON.stringify(objSwtStep.checked));
    }
}

function fnLoadYetToRec(){
    let vYet2RecM = JSON.parse(localStorage.getItem("DFSD_Yet2Rec"));
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
		localStorage.setItem("DFSD_Yet2Rec", true);
	}
	else{
		localStorage.setItem("DFSD_Yet2Rec", false);
	}
}

function fnUpdateTrdSwtCounter(){
	let objCounterSwt = document.getElementById("swtTradeCounter");

	if(objCounterSwt.checked){
		localStorage.setItem("DFSD_CounterSwt", true);
	}
	else{
		localStorage.setItem("DFSD_CounterSwt", false);
	}
}

function fnChangeStartQty(pThisVal){
    let objQty = document.getElementById("txtFuturesQty");
    const vQtyParsed = Number(pThisVal.value);

    if(!Number.isFinite(vQtyParsed) || vQtyParsed < 1){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("DFSD_StartQtyNo", 1);
    }
    else{
        const vSafeQty = Math.floor(vQtyParsed);
        pThisVal.value = vSafeQty;
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("DFSD_StartQtyNo", vSafeQty);

        // if(confirm("Are You Sure You want to change the Quantity?")){
            objQty.value = vSafeQty;
            localStorage.setItem("DFSD_QtyMul", vSafeQty);
        // }
    }
}

function fnLoadCurrentTradePos(){
    let objCurrPos = fnGetLsJSON("DFSD_CurrFutPos", null);

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
        // console.log("WS is Open!");
    }
    objDeltaWS.onerror = function (){
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
	            fnGenMessage("Streaming Subscribed and Started!", `badge bg-success`, "spnGenMsg");
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
    let isLsAutoTrader = localStorage.getItem("isDFSDAutoTrader");
    // let vTradeSide = localStorage.getItem("DFSD_TradeSideSwtS");

    if(isLsAutoTrader === "false"){
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

		gCharges = fnGetTradeCharges(gOrderDT, vCurrDT, gLotSize, gQty, gBuyPrice, gSellPrice, gByorSl);
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

		gCharges = fnGetTradeCharges(gOrderDT, vCurrDT, gLotSize, gQty, gBuyPrice, gSellPrice, gByorSl);
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

function fnGetY2RTargetAmt(){
    const objSwtYet2Rec = document.getElementById("swtYetToRec");
    if(!objSwtYet2Rec?.checked){
        return 0;
    }
    const vTotLossAmt = Number(localStorage.getItem("DFSD_TotLossAmt"));
    if(!Number.isFinite(vTotLossAmt) || vTotLossAmt >= 0){
        return 0;
    }
    const vX = fnParsePositiveNumber(gMultiplierX, 1.0);
    return Math.abs(vTotLossAmt) * vX;
}

function fnCheckBuySLTP(pCurrPrice){
	let objSwtYet2Rec = document.getElementById("swtYetToRec");
    let vTotLossAmt = JSON.parse(localStorage.getItem("DFSD_TotLossAmt"));
    let vNewProfit = Math.abs(parseFloat(localStorage.getItem("DFSD_TotLossAmt")) * parseFloat(gMultiplierX));
	let objCounterSwt = document.getElementById("swtTradeCounter");
	let objBrkRec = document.getElementById("tdHeadBrkRec");
    const vMode = String(localStorage.getItem("DFSD_TradeMode") || "").toUpperCase();
    const bIsMarti = (vMode === "MARTI");

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
    const vY2RTarget = fnGetY2RTargetAmt();
    if(objSwtYet2Rec?.checked && vY2RTarget > 0 && Number(gPL) >= vY2RTarget){
        fnCloseManualFutures(gByorSl);
        return;
    }

	if(pCurrPrice <= gAmtSL){
		fnCloseManualFutures(gByorSl);
	}
    else if(bIsMarti && (parseFloat(vTotLossAmt) < 0) && (parseFloat(gPL) >= parseFloat(vNewProfit))){
        if(fnParsePositiveNumber(gLossRecPerct, 100) >= 100 || Number(gCurrPos?.TradeData?.[0]?.Qty || 0) <= 1){
            fnCloseManualFutures(gByorSl);
        }
        else{
            fnClosePrctTrade();
        }
    }
	else if((parseFloat(vTotLossAmt) < 0) && (parseFloat(gPL) > parseFloat(vNewProfit)) && (parseInt(gQty) > 10)){
		// console.log("50 Profit Taken.............");
		if(objSwtYet2Rec.checked){
			fnClosePrctTrade();
		}
	}
	// else if(parseFloat(gPL) >= vBrokTotLossRec){
	// 	fnCloseManualFutures(gByorSl);
	// }
	else if(gTimeDiff < gMaxTradeTime){
		// console.log("Timer Ending...");
		if(objCounterSwt.checked){
			fnCloseManualFutures(gByorSl);
		}
	}
	else if((parseFloat(gAmtTP) > 0) && (parseFloat(gPL) >= parseFloat(gAmtTP))){
		// console.log("TP Hit");
		fnCloseManualFutures(gByorSl);
	}
	else if(parseFloat(pCurrPrice) >= parseFloat(gAmtTP1)){
		// console.log("TP1 Hit");
		if(g50Perc1Time){
			g50Perc1Time = false;
			fnClosePrctTrade();
		}
	}
	else{
		// console.log("Buy Trade is Still ON");
	}
}

function fnCheckSellSLTP(pCurrPrice){
	let objSwtYet2Rec = document.getElementById("swtYetToRec");
    let vTotLossAmt = JSON.parse(localStorage.getItem("DFSD_TotLossAmt"));
    let vNewProfit = Math.abs(parseFloat(localStorage.getItem("DFSD_TotLossAmt")) * parseFloat(gMultiplierX));
	let objCounterSwt = document.getElementById("swtTradeCounter");
	let objBrkRec = document.getElementById("tdHeadBrkRec");
    const vMode = String(localStorage.getItem("DFSD_TradeMode") || "").toUpperCase();
    const bIsMarti = (vMode === "MARTI");

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
    const vY2RTarget = fnGetY2RTargetAmt();
    if(objSwtYet2Rec?.checked && vY2RTarget > 0 && Number(gPL) >= vY2RTarget){
        fnCloseManualFutures(gByorSl);
        return;
    }

	if(pCurrPrice >= gAmtSL){
		// console.log("SL Hit");
		fnCloseManualFutures(gByorSl);
	}
    else if(bIsMarti && (parseFloat(vTotLossAmt) < 0) && (parseFloat(gPL) >= parseFloat(vNewProfit))){
        if(fnParsePositiveNumber(gLossRecPerct, 100) >= 100 || Number(gCurrPos?.TradeData?.[0]?.Qty || 0) <= 1){
            fnCloseManualFutures(gByorSl);
        }
        else{
            fnClosePrctTrade();
        }
    }
	else if((parseFloat(vTotLossAmt) < 0) && (parseFloat(gPL) > parseFloat(vNewProfit)) && (parseInt(gQty) > 10)){
		// console.log("50 Profit Taken.............");
		if(objSwtYet2Rec.checked){
			fnClosePrctTrade();
		}
	}
	// else if(parseFloat(gPL) >= vBrokTotLossRec){
	// 	fnCloseManualFutures(gByorSl);
	// }
	else if(gTimeDiff < gMaxTradeTime){
		// console.log("Timer Ending...");
		if(objCounterSwt.checked){
			fnCloseManualFutures(gByorSl);
		}
	}
	else if((parseFloat(gAmtTP) > 0) && (parseFloat(gPL) >= parseFloat(gAmtTP))){
		// console.log("TP Hit");
		fnCloseManualFutures(gByorSl);
	}
	else if(parseFloat(pCurrPrice) <= parseFloat(gAmtTP1)){
		// console.log("TP Hit");
		if(g50Perc1Time){
			g50Perc1Time = false;
			fnClosePrctTrade();
		}
	}
	else{
		// console.log("Sell Trade is Still ON");
	}
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
        localStorage.setItem("DFSD_CurrFutPos", JSON.stringify(gCurrPos));
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
        localStorage.setItem("DFSD_CurrFutPos", JSON.stringify(gCurrPos));
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

function fnLoadSlTp(){
    let objCurrSlTp = fnGetLsJSON("DFSD_CurrFutSlTp", null);
    let objTxtSL = document.getElementById("txtPointsSL");
    let objTxtTSL = document.getElementById("txtPointsTSL");
    let objTxtTP1 = document.getElementById("txtPointsTP1");
    let objTxtTP = document.getElementById("txtAmountTP") || document.getElementById("txtPointsTP");

    if(!objTxtSL || !objTxtTSL || !objTxtTP1 || !objTxtTP){
        return;
    }

    if(objCurrSlTp === null){
    	let objSlTp = { PointSL : 200, PointTSL : 0, PointTP1 : 300, AmountTP : 1000 };
    	localStorage.setItem("DFSD_CurrFutSlTp", JSON.stringify(objSlTp));
    	objTxtSL.value = 200;
    	objTxtTSL.value = 0;
    	objTxtTP1.value = 300;
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
    const vTP1 = fnParsePositiveNumber(objTxtTP1.value, 300);
    const vTPAmt = fnParsePositiveNumber(objTxtTP.value, 1000);
    objTxtSL.value = vSL;
    objTxtTSL.value = vTSL;
    objTxtTP1.value = vTP1;
    objTxtTP.value = vTPAmt;

    let objSlTp = { PointSL : vSL, PointTSL : vTSL, PointTP1 : vTP1, AmountTP : vTPAmt };
    localStorage.setItem("DFSD_CurrFutSlTp", JSON.stringify(objSlTp));
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
        localStorage.setItem("DFSD_CurrFutPos", JSON.stringify(gCurrPos));
    }

    fnGenMessage("Updated SL / T-SL / TP!", `badge bg-success`, "spnGenMsg");    
}

async function fnInitiateManualFutures(pTransType){
    let isLsAutoTrader = localStorage.getItem("isDFSDAutoTrader");

    let objCurrPos = fnGetLsJSON("DFSD_CurrFutPos", null);

    if(isLsAutoTrader === "true"){
	    if (objCurrPos === null){
	        let objBestRates = await fnGetFutBestRates();

	        if(objBestRates.status === "success"){
	            let vDate = new Date();
	            let vOrdId = vDate.valueOf();
	            let vMonth = vDate.getMonth() + 1;
	            let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

	            let objFutDDL = document.getElementById("ddlFuturesSymbols");
			    let objQty = document.getElementById("txtFuturesQty");
			    let objLotSize = document.getElementById("txtLotSize");
			    let vSLPoints = fnParsePositiveNumber(document.getElementById("txtPointsSL").value, NaN);
			    let vTSLPoints = fnParsePositiveNumber(document.getElementById("txtPointsTSL").value, 0);
			    let vTPPoints1 = fnParsePositiveNumber(document.getElementById("txtPointsTP1").value, NaN);
			    let objTPAmount = document.getElementById("txtAmountTP") || document.getElementById("txtPointsTP");
			    let vTPAmount = fnParsePositiveNumber(objTPAmount ? objTPAmount.value : NaN, 0);
                let vQty = fnParsePositiveNumber(objQty.value, NaN);
			    let vBestBuy = parseFloat(objBestRates.data.BestBuy);
			    let vBestSell = parseFloat(objBestRates.data.BestSell);

                if(!Number.isFinite(vSLPoints) || !Number.isFinite(vTPPoints1) || !Number.isFinite(vQty)){
                    fnGenMessage("Please provide valid Qty / SL / TP values before opening trade.", `badge bg-warning`, "spnGenMsg");
                    return;
                }
                objQty.value = Math.floor(vQty);
                const vCycleStartLoss = Number(localStorage.getItem("DFSD_TotLossAmt"));
                const vSafeCycleStartLoss = Number.isFinite(vCycleStartLoss) ? vCycleStartLoss : 0;
                const vCycleStartQty = Math.max(1, Math.floor(vQty));
				
				gByorSl = pTransType;

				if(gByorSl === "buy"){
	                gAmtSL = (vBestBuy - vSLPoints).toFixed(2);
	                gAmtTP1 = (vBestBuy + vTPPoints1).toFixed(2);
	                gAmtTP = Number.isFinite(vTPAmount) ? vTPAmount : 0;
				}
				else if(gByorSl === "sell"){
	                gAmtSL = (vBestBuy + vSLPoints).toFixed(2);
	                gAmtTP1 = (vBestBuy - vTPPoints1).toFixed(2);
	                gAmtTP = Number.isFinite(vTPAmount) ? vTPAmount : 0;
				}
				else{
					gAmtSL = 0;
					gAmtTP1 = 0;				
					gAmtTP = 0;				
				}

                let vTrailNextTrigger = null;
                if(vTSLPoints > 0){
                    if(pTransType === "buy"){
                        vTrailNextTrigger = Number((vBestSell + vTSLPoints).toFixed(2));
                    }
                    else if(pTransType === "sell"){
                        vTrailNextTrigger = Number((vBestBuy - vTSLPoints).toFixed(2));
                    }
                }
	            let vExcTradeDtls = { TradeData: [{ OrderID : vOrdId, OpenDT : vToday, FutSymbol : objFutDDL.value, TransType : pTransType, LotSize : objLotSize.value, Qty : objQty.value, BuyPrice : vBestBuy, SellPrice : vBestSell, AmtSL : gAmtSL, AmtTP1 : gAmtTP1, AmtTP : gAmtTP, StopLossPts: vSLPoints, TrailSLPts: vTSLPoints, TrailNextTrigger: vTrailNextTrigger, TakeProfitAmt : vTPAmount, OpenDTVal : vOrdId }] };
	            let objExcTradeDtls = JSON.stringify(vExcTradeDtls);
	            gCurrPos = vExcTradeDtls;

	            localStorage.setItem("DFSD_CurrFutPos", objExcTradeDtls);
				localStorage.setItem("DFSD_QtyMul", objQty.value);
                localStorage.setItem("DFSD_CycleStartLossAmt", String(vSafeCycleStartLoss));
                localStorage.setItem("DFSD_CycleStartQty", String(vCycleStartQty));
		    	g50Perc1Time = true;

	            fnSetInitFutTrdDtls();
	            fnSubscribe();

	            fnGenMessage(objBestRates.message, `badge bg-${objBestRates.status}`, "spnGenMsg");
	            document.getElementById("spnLossTrd").className = "badge rounded-pill text-bg-success";

	            // console.log("Trade Executed....................");
	        }
	        else{
	            fnGenMessage(objBestRates.message, `badge bg-${objBestRates.status}`, "spnGenMsg");
	        }
	    }
	    else{
	        fnGenMessage("Close the Open Position to Execute New Trade!", `badge bg-warning`, "spnGenMsg");
	    }
    }
    else{
	        fnGenMessage("Trade not Executed, Auto Trade is Off!", `badge bg-warning`, "spnGenMsg");
    }
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
        gOrderDT = gCurrPos.TradeData[0].OrderID;

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
		gCharges = fnGetTradeCharges(gOrderDT, vCurrDT, gLotSize, gQty, gBuyPrice, gSellPrice, gByorSl);
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

async function fnCloseManualFutures(pTransType){
	if(gCurrPos === null){
        fnGenMessage("No Open Position to Close!", `badge bg-warning`, "spnGenMsg");		
	}
	else if(gCurrPos.TradeData[0].TransType !== pTransType){
        fnGenMessage("No " + pTransType + " Position to Close!", `badge bg-warning`, "spnGenMsg");		
	}
	else{
		let objClsTrd = await fnInnitiateClsFutTrade(0);
		if(objClsTrd.status === "success"){
            fnSetInitFutTrdDtls();
		    fnLoadTodayTrades();

            fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
		}
		else{
            fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
		}
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

async function fnClosePrctTrade(){
    try{
        if (gCurrPos === null){
            fnGenMessage("No Open Positions to Close 50% Qty!", `badge bg-warning`, "spnGenMsg");
        }
        else{
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
			    fnLoadTodayTrades();
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
}

async function fnInnitiateClsFutTrade(pQty){
    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    const vCurrQty = Number(gCurrPos.TradeData[0].Qty);
    const vCloseQty = Number(pQty);
    if(Number.isNaN(vCloseQty) || vCloseQty < 0 || vCloseQty > vCurrQty){
        return { "status": "warning", "message": "Invalid quantity requested for close.", "data": "" };
    }
    let vToCntuQty = vCurrQty - vCloseQty;

    let objBestRates = await fnGetFutBestRates();
	if(objBestRates.status === "success"){
		// UNCOMMENT for LIVE TRADE in DEMO
	    let vBestBuy = parseFloat(objBestRates.data.BestBuy);
	    let vBestSell = parseFloat(objBestRates.data.BestSell);
		// UNCOMMENT for LIVE TRADE in DEMO

		// // COMMENT for LIVE TRADE in DEMO
		// let vBestBuy = gBuyPrice;
		// let vBestSell = gSellPrice;
		// // COMMENT for LIVE TRADE in DEMO

	    gCurrPos.TradeData[0].CloseDT = vToday;

	    if(gByorSl === "buy"){
	    	gCurrPos.TradeData[0].SellPrice = vBestSell;
	    }
	    else if(gByorSl === "sell"){
	    	gCurrPos.TradeData[0].BuyPrice = vBestBuy;
	    }

	    gCurrPos.TradeData[0].CloseDTVal = vDate.valueOf();

	    if(vCloseQty !== 0){
		    gCurrPos.TradeData[0].Qty = vCloseQty;
		    let vCapital = fnGetTradeCapital(gByorSl, gCurrPos.TradeData[0].BuyPrice, gCurrPos.TradeData[0].SellPrice, gCurrPos.TradeData[0].LotSize, vCloseQty);
		    gCurrPos.TradeData[0].Capital = vCapital;
		    let vCharges = fnGetTradeCharges(gCurrPos.TradeData[0].OrderID, vDate.valueOf(), gCurrPos.TradeData[0].LotSize, vCloseQty, gCurrPos.TradeData[0].BuyPrice, gCurrPos.TradeData[0].SellPrice, gByorSl);
		    gCurrPos.TradeData[0].Charges = vCharges;
		    let vTradePL = fnGetTradePL(gCurrPos.TradeData[0].SellPrice, gCurrPos.TradeData[0].BuyPrice, gCurrPos.TradeData[0].LotSize, vCloseQty, vCharges);
		    gCurrPos.TradeData[0].ProfitLoss = vTradePL;

	        gOldPLAmt = JSON.parse(localStorage.getItem("DFSD_TotLossAmt"));
	        gNewPLAmt = vTradePL;
	    	let vTotNewPL = gOldPLAmt + gNewPLAmt;
	    	localStorage.setItem("DFSD_OldPLAmt", gOldPLAmt);
	    	localStorage.setItem("DFSD_NewPLAmt", gNewPLAmt);
	    	localStorage.setItem("DFSD_TotLossAmt", vTotNewPL);
	    }
	    else{
	    	gOldPLAmt = JSON.parse(localStorage.getItem("DFSD_TotLossAmt"));
	    	gNewPLAmt = gPL;
	    	let vTotNewPL = gOldPLAmt + gNewPLAmt;
	    	localStorage.setItem("DFSD_OldPLAmt", gOldPLAmt);
	    	localStorage.setItem("DFSD_NewPLAmt", gNewPLAmt);
	    	localStorage.setItem("DFSD_TotLossAmt", vTotNewPL);
	    }
	}
	else{

	}
	const objClsTrd = new Promise((resolve, reject) => {
	    let objTodayTrades = JSON.parse(localStorage.getItem("DFSD_TrdBkFut"));

	    if(objTodayTrades === null){
	        localStorage.setItem("DFSD_TrdBkFut", JSON.stringify(gCurrPos));
	    }
	    else{
	        let vExistingData = objTodayTrades;
	        vExistingData.TradeData.push(gCurrPos.TradeData[0]);
	        localStorage.setItem("DFSD_TrdBkFut", JSON.stringify(vExistingData));
	    }

	    if(vCloseQty === 0){
		    localStorage.removeItem("DFSD_CurrFutPos");
		    gCurrPos = null;
            fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
	    }
	    else{
	    	if(vToCntuQty === 0){
			    localStorage.removeItem("DFSD_CurrFutPos");

			    gCurrPos = null;
	    	}
	    	else{
	            gCurrPos.TradeData[0].Qty = vToCntuQty;
	            localStorage.setItem("DFSD_CurrFutPos", JSON.stringify(gCurrPos));	    	
	    	}
	    }

        const bIsFullClose = (vCloseQty === 0 || vToCntuQty === 0);
	    fnSetNextOptTradeSettings(bIsFullClose);

        document.getElementById("spnLossTrd").className = "badge rounded-pill text-bg-danger";

	    // fnGenMessage("Trade Closed", `badge bg-success`, "spnGenMsg");
        resolve({ "status": "success", "message": "Future Paper Trade Closed Successfully!", "data": "" });
    });
    clearInterval(gTimerID);

    return objClsTrd;
}

//************* Yet To Recover Adjustment **************//
function fnSetNextOptTradeSettings(pIsFullClose = true){
	if(!pIsFullClose){
        return;
    }
    let objQty = document.getElementById("txtFuturesQty");
	let vTotLossAmt = Number(localStorage.getItem("DFSD_TotLossAmt"));

    let vOldQtyMul = Number(JSON.parse(localStorage.getItem("DFSD_QtyMul")));
    let vStartLots = Number(JSON.parse(localStorage.getItem("DFSD_StartQtyNo")));
    const vMode = String(localStorage.getItem("DFSD_TradeMode") || "").toUpperCase();
    const bIsMarti = (vMode === "MARTI");
    const bIsStep = !bIsMarti;
    let vCycleStartLoss = Number(localStorage.getItem("DFSD_CycleStartLossAmt"));
    let vCycleStartQty = Number(localStorage.getItem("DFSD_CycleStartQty"));

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
        vCycleStartLoss = Number(localStorage.getItem("DFSD_OldPLAmt"));
        if(!Number.isFinite(vCycleStartLoss)){
            vCycleStartLoss = 0;
        }
    }
    if(!Number.isFinite(vCycleStartQty) || vCycleStartQty < 1){
        vCycleStartQty = vOldQtyMul;
    }
    if(!Number.isFinite(vCycleStartQty) || vCycleStartQty < 1){
        vCycleStartQty = vStartLots;
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
            vNextQty = Math.floor(vOldQtyMul * 2);
        }
        else if(bIsStep){
            vNextQty = Math.floor(vOldQtyMul + vStartLots);
        }
    }
    else{
        vNextQty = vOldQtyMul;
    }

    if(!Number.isFinite(vNextQty) || vNextQty < vStartLots){
        vNextQty = vStartLots;
    }
    localStorage.setItem("DFSD_QtyMul", vNextQty);
    objQty.value = vNextQty;
}

function fnChangeTradeMode(pMode){
    let objSwtStep = document.getElementById("swtMartingale");
    let objSwtMarti = document.getElementById("swtMarti");
    if(!objSwtStep){
        return;
    }

    if(!objSwtMarti){
        localStorage.setItem("DFSD_Marti", JSON.stringify(objSwtStep.checked));
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
    localStorage.setItem("DFSD_TradeMode", vMode);
    localStorage.setItem("DFSD_Marti", JSON.stringify(objSwtMarti.checked));
}

function fnChangeMartingale(){
    fnChangeTradeMode("step");
}

function fnSetLotsByQtyMulLossAmt(){
    let vStartLots = JSON.parse(localStorage.getItem("DFSD_StartQtyNo"));
    let vQtyMul = JSON.parse(localStorage.getItem("DFSD_QtyMul"));
    let objOptQty = document.getElementById("txtFuturesQty");
    let vTotLossAmt = JSON.parse(localStorage.getItem("DFSD_TotLossAmt"));
    
    if (vQtyMul === null || vQtyMul === "") {
        localStorage.setItem("DFSD_QtyMul", vStartLots);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
    
    if (vTotLossAmt === null || vTotLossAmt === "" || vTotLossAmt === 0) {
        localStorage.setItem("DFSD_QtyMul", vStartLots);
        localStorage.setItem("DFSD_TotLossAmt", 0);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
}

// function fnTest(){
// 	console.log("Total Loss in Momory: " + localStorage.getItem("DFSD_TotLossAmt"));
// 	console.log("gPL: " + gPL);
// }

function fnTest(){
	console.log(localStorage.getItem("DFSD_TrdBkFut"));
}

function fnDeleteThisTrade(pOrderID){
   	let objTradeBook = fnGetLsJSON("DFSD_TrdBkFut", null);
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
        localStorage.setItem("DFSD_TrdBkFut", objExcTradeDtls);
        fnLoadTodayTrades();
   	}
}

function fnLoadTodayTrades(){
    let objTodayTradeList = document.getElementById("tBodyTodayPaperTrades");
   	let objTradeBook = fnGetLsJSON("DFSD_TrdBkFut", null);
    let objHeadPL = document.getElementById("tdHeadPL");
    let objYtRL = document.getElementById("spnYtRL");
    objTodayTradeList.innerHTML = "";
    
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
        objYtRL.innerText = fnGetLsNumber("DFSD_TotLossAmt", 0).toFixed(2);
    }
    else{
        let vTotalTrades = 0;
        let vNetProfit = 0;
        let vTotalCharges = 0;
        let vHighCapital = 0;

		for (let i = 0; i < objTradeBook.TradeData.length; i++){
            const vTrade = objTradeBook.TradeData[i];
			let vCharges = fnGetTradeCharges(vTrade.OpenDTVal, vTrade.CloseDTVal, vTrade.LotSize, vTrade.Qty, vTrade.BuyPrice, vTrade.SellPrice, vTrade.TransType);
    		let vCapital = fnGetTradeCapital(vTrade.TransType, vTrade.BuyPrice, vTrade.SellPrice, vTrade.LotSize, vTrade.Qty);
    		let vPL = fnGetTradePL(vTrade.SellPrice, vTrade.BuyPrice, vTrade.LotSize, vTrade.Qty, vCharges);
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
        objYtRL.innerText = fnGetLsNumber("DFSD_TotLossAmt", 0).toFixed(2);
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
    fnStopRenkoFeedWS();
    gRenkoPatternSeq = "";
    localStorage.removeItem("DFSD_CurrFutPos");
	localStorage.removeItem("DFSD_TrdBkFut");
	localStorage.removeItem("DFSD_StartQtyNo");
	localStorage.removeItem("DFSD_Marti");
    localStorage.removeItem("DFSD_TradeMode");
    localStorage.removeItem("DFSD_RenkoFeedEnabled");
    localStorage.removeItem("DFSD_RenkoFeedStepPts");
    localStorage.removeItem("DFSD_RenkoFeedPriceSrc");
    localStorage.removeItem("DFSD_RenkoBuyPatterns");
    localStorage.removeItem("DFSD_RenkoSellPatterns");
    localStorage.removeItem("DFSD_RenkoPatterns");
    localStorage.removeItem("DFSD_CycleStartLossAmt");
    localStorage.removeItem("DFSD_CycleStartQty");
	localStorage.setItem("DFSD_QtyMul", 0);
	localStorage.setItem("DFSD_TotLossAmt", 0);
	localStorage.removeItem("DFSD_CurrFutSlTp");
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

    if(localStorage.getItem("DFSD_CurrFutPos") === null)
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

    localStorage.setItem("DFSD_TradeSideSwtS", objTradeSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("DFSD_TradeSideSwtS") === null){
        localStorage.setItem("DFSD_TradeSideSwtS", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("DFSD_TradeSideSwtS");
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

