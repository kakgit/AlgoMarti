let gRenkoFeedWS = null;
let gRenkoFeedEnabled = false;
let gRenkoFeedForceClose = false;
let gRenkoFeedStepPts = 200;
let gRenkoFeedPriceSource = "mark_price";
let gRenkoFeedAnchor = null;
let gRenkoFeedLastDir = 0;
let gRenkoFeedMaxRows = 300;
let gLastRenkoColorCode = "";
let gManualRenkoTimer = null;
let gManualRenkoTimerEndsAt = 0;

function fnRenkoCcdeStorageKey(pKey){
    return "CCDE_Renko_" + String(pKey || "");
}

function fnRenkoParsePositiveNumber(pVal, pFallback = 0){
    const vNum = Number(pVal);
    return Number.isFinite(vNum) && vNum > 0 ? vNum : pFallback;
}

function fnShouldUseDeltaRenkoFeedForStrategy(){
    return gRenkoFeedEnabled === true;
}

function fnIsCoveredCallRenkoFeedOn(){
    return gRenkoFeedEnabled === true;
}

function fnGetCoveredCallRenkoSignalColor(){
    return gRenkoFeedEnabled === true ? String(gLastRenkoColorCode || "").toUpperCase() : "";
}

function fnHasPendingManualRenkoTimer(){
    return gManualRenkoTimer !== null;
}

function fnGetRenkoFeedSymbol(){
    const vSymbol = String(document.getElementById("ddlCoveredCallSymbol")?.value || "BTC").trim().toUpperCase();
    return vSymbol === "ETH" || vSymbol === "ETHUSD" ? "ETHUSD" : "BTCUSD";
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
    objMeta.innerText = `Symbol: ${fnGetRenkoFeedSymbol()} | Step: ${gRenkoFeedStepPts} | Src: ${gRenkoFeedPriceSource}`;
}

function fnSetRenkoSignalBox(pColorCode){
    const objBox = document.getElementById("spnRenkoSignalBox");
    if(!objBox){
        return;
    }
    const vColorCode = String(pColorCode || "").toUpperCase();
    if(vColorCode === "G"){
        objBox.className = "renko-signal-box renko-signal-green";
        objBox.innerText = "G";
        objBox.title = "Current Renko box: Green";
        return;
    }
    if(vColorCode === "R"){
        objBox.className = "renko-signal-box renko-signal-red";
        objBox.innerText = "R";
        objBox.title = "Current Renko box: Red";
        return;
    }
    objBox.className = "renko-signal-box renko-signal-idle";
    objBox.innerText = "-";
    objBox.title = "Current Renko box color";
}

function fnClearManualRenkoTimer(pReason = ""){
    if(gManualRenkoTimer !== null){
        clearTimeout(gManualRenkoTimer);
        gManualRenkoTimer = null;
    }
    gManualRenkoTimerEndsAt = 0;
    if(pReason){
        fnAppendRenkoFeedMsg(pReason);
    }
}

function fnSetManualRenkoSignalColor(pColorCode){
    const vColorCode = String(pColorCode || "").toUpperCase();
    gLastRenkoColorCode = vColorCode === "R" || vColorCode === "G" ? vColorCode : "";
    fnSetRenkoSignalBox(gLastRenkoColorCode);
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

function fnBuildStandardRenkoBricks(pMark, pStep, pAnchor, pLastDir, pMaxBricks = 50){
    const vMark = Number(pMark);
    const vStep = Number(pStep);
    let vAnchor = Number(pAnchor);
    let vLastDir = Number(pLastDir);
    let vGuard = 0;
    const objBricks = [];

    if(!Number.isFinite(vMark) || !Number.isFinite(vStep) || vStep <= 0 || !Number.isFinite(vAnchor)){
        return { Bricks: objBricks, Anchor: vAnchor, LastDir: vLastDir };
    }

    while(vGuard < pMaxBricks){
        const vDiff = vMark - vAnchor;
        let vDir = 0;

        if(vLastDir === 0){
            if(vDiff >= vStep){
                vDir = 1;
            }
            else if(vDiff <= -vStep){
                vDir = -1;
            }
            else{
                break;
            }
        }
        else if(vLastDir === 1){
            if(vDiff >= vStep){
                vDir = 1;
            }
            else if(vDiff <= -(2 * vStep)){
                vDir = -1;
            }
            else{
                break;
            }
        }
        else{
            if(vDiff <= -vStep){
                vDir = -1;
            }
            else if(vDiff >= (2 * vStep)){
                vDir = 1;
            }
            else{
                break;
            }
        }

        const vOpen = vAnchor;
        const vClose = vOpen + (vDir * vStep);
        objBricks.push({ Open: vOpen, Close: vClose });
        vAnchor = vClose;
        vLastDir = vDir;
        vGuard += 1;
    }

    return { Bricks: objBricks, Anchor: vAnchor, LastDir: vLastDir };
}

function fnUpdateRenkoColorTransition(pOpen, pClose){
    const vOpen = Number(pOpen);
    const vClose = Number(pClose);
    if(!Number.isFinite(vOpen) || !Number.isFinite(vClose) || vOpen === vClose){
        return { ColorCode: "", Transition: "" };
    }

    const vColorCode = vClose > vOpen ? "G" : "R";
    let vTransition = "";
    if(vColorCode === "G" && gLastRenkoColorCode === "R"){
        vTransition = "R2G";
        fnAppendRenkoFeedMsg(`[delta] First GREEN after RED | Close: ${vClose.toFixed(2)}`);
    }
    else if(vColorCode === "R" && gLastRenkoColorCode === "G"){
        vTransition = "G2R";
        fnAppendRenkoFeedMsg(`[delta] First RED after GREEN | Close: ${vClose.toFixed(2)}`);
    }

    gLastRenkoColorCode = vColorCode;
    fnSetRenkoSignalBox(vColorCode);
    if(vColorCode !== "R" && fnHasPendingManualRenkoTimer()){
        fnClearManualRenkoTimer("[delta] Live signal turned non-RED. Pending manual RED timer cancelled.");
    }
    return { ColorCode: vColorCode, Transition: vTransition };
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

function fnResetRenkoFeedStateForSettingChange(){
    gRenkoFeedAnchor = null;
    gRenkoFeedLastDir = 0;
    gLastRenkoColorCode = "";
    fnClearManualRenkoTimer();
}

function fnUpdateRenkoFeedStep(pThis){
    const vParsed = Math.floor(fnRenkoParsePositiveNumber(pThis?.value, 200));
    gRenkoFeedStepPts = (Number.isFinite(vParsed) && vParsed > 0) ? vParsed : 200;
    if(pThis){
        pThis.value = gRenkoFeedStepPts;
    }
    localStorage.setItem(fnRenkoCcdeStorageKey("FeedStepPts"), String(gRenkoFeedStepPts));
    fnResetRenkoFeedStateForSettingChange();
    fnSetRenkoFeedMeta();
    fnAppendRenkoFeedMsg(`Step updated to ${gRenkoFeedStepPts} points.`);
}

function fnUpdateRenkoFeedPriceSource(pThis){
    const vSel = String(pThis?.value || "mark_price");
    const objAllowed = ["mark_price", "spot_price", "best_bid", "best_ask"];
    gRenkoFeedPriceSource = objAllowed.includes(vSel) ? vSel : "mark_price";
    localStorage.setItem(fnRenkoCcdeStorageKey("FeedPriceSrc"), gRenkoFeedPriceSource);
    fnResetRenkoFeedStateForSettingChange();
    fnSetRenkoFeedMeta();
    fnAppendRenkoFeedMsg(`Price source changed to ${gRenkoFeedPriceSource}. Anchor reset.`);
}

function fnGetTradeSideSwitch(){
    return "both";
}

async function fnExecuteCoveredCallRenkoTrade(pSide){
    const vSide = String(pSide || "").toLowerCase();
    if(vSide !== "buy" && vSide !== "sell"){
        return;
    }
    if(vSide !== "sell"){
        fnAppendRenkoFeedMsg(`[delta] ${vSide.toUpperCase()} direction change detected. No option entry action for non-RED signal.`);
        return;
    }
    if(!fnHasCoveredCallAutoTraderEnabled()){
        fnAppendRenkoFeedMsg("[delta] RED direction change detected but Covered Call Auto Trader is OFF.");
        return;
    }
    if(typeof fnHandleCoveredCallRenkoRedOptionEntry === "function"){
        fnAppendRenkoFeedMsg("[delta] RED direction change detected. Preparing futures/options entry.");
        await fnHandleCoveredCallRenkoRedOptionEntry();
        return;
    }
    fnAppendRenkoFeedMsg("[delta] RED direction change detected but Covered Call Renko option handler is unavailable.");
}

async function fnRunManualRenkoRedTimer(){
    gManualRenkoTimer = null;
    gManualRenkoTimerEndsAt = 0;

    if(!gRenkoFeedEnabled){
        fnAppendRenkoFeedMsg("[manual] RED timer skipped because Delta Renko Feed is OFF.");
        return;
    }
    if(String(gLastRenkoColorCode || "").toUpperCase() !== "R"){
        fnAppendRenkoFeedMsg("[manual] RED timer skipped because current signal is no longer RED.");
        return;
    }
    if(fnGetCoveredCallOpenOptionTrades().length > 0){
        fnAppendRenkoFeedMsg("[manual] RED timer finished but option position already exists.");
        return;
    }
    if(typeof fnHandleCoveredCallRenkoRedOptionEntry !== "function"){
        fnAppendRenkoFeedMsg("[manual] RED timer finished but Renko option-entry handler is unavailable.");
        return;
    }

    fnAppendRenkoFeedMsg("[manual] RED timer finished. Preparing futures/options entry.");
    try{
        await fnHandleCoveredCallRenkoRedOptionEntry();
    }
    catch(pErr){
        const vMsg = String(pErr?.message || pErr || "Unknown error");
        fnAppendRenkoFeedMsg(`[manual] RED timer entry failed: ${vMsg}`);
    }
}

function fnArmManualRenkoRedTimer(){
    if(!gRenkoFeedEnabled){
        fnAppendRenkoFeedMsg("[manual] Turn ON Delta Renko Feed to use manual Renko trigger.");
        return;
    }

    if(gManualRenkoTimer !== null){
        clearTimeout(gManualRenkoTimer);
        gManualRenkoTimer = null;
    }

    fnSetManualRenkoSignalColor("R");
    gManualRenkoTimerEndsAt = Date.now() + 10000;
    fnAppendRenkoFeedMsg("[manual] RED selected. Waiting 10 seconds before checking option entry.");
    gManualRenkoTimer = setTimeout(() => {
        void fnRunManualRenkoRedTimer();
    }, 10000);
}

function fnToggleManualRenkoSignalBox(){
    if(!gRenkoFeedEnabled){
        fnAppendRenkoFeedMsg("[manual] Delta Renko Feed is OFF. Manual signal toggle ignored.");
        return;
    }

    const vCurrent = String(gLastRenkoColorCode || "").toUpperCase();
    if(vCurrent === "R"){
        fnSetManualRenkoSignalColor("G");
        fnClearManualRenkoTimer("[manual] GREEN selected. Pending RED timer cancelled.");
        return;
    }

    fnArmManualRenkoRedTimer();
}

async function fnProcessRenkoSignal(pRenkoMsg, pSource = "delta"){
    const vOpen = Number(pRenkoMsg?.Open);
    const vClose = Number(pRenkoMsg?.Close);
    if(!Number.isFinite(vOpen) || !Number.isFinite(vClose) || vOpen === vClose){
        return;
    }

    const objBoxState = fnUpdateRenkoColorTransition(vOpen, vClose);
    const vColorCode = vClose > vOpen ? "G" : "R";

    let vSide = "";
    if(objBoxState?.Transition === "R2G"){
        vSide = "buy";
    }
    else if(objBoxState?.Transition === "G2R"){
        vSide = "sell";
    }
    if(vSide === ""){
        fnAppendRenkoFeedMsg(`[${pSource}] ${vColorCode} skipped. No direction-change event for step validation (Event:${objBoxState?.Transition || "NONE"}).`);
        return;
    }

    const vSideSwt = fnGetTradeSideSwitch();
    if(vSideSwt === "buy"){
        vSide = vSide === "buy" ? "buy" : "";
    }
    else if(vSideSwt === "sell"){
        vSide = vSide === "sell" ? "sell" : "";
    }
    if(vSide === ""){
        fnAppendRenkoFeedMsg(`[${pSource}] ${vColorCode} skipped by trade-side switch.`);
        return;
    }

    if(fnGetCoveredCallOpenOptionTrades().length > 0){
        fnAppendRenkoFeedMsg(`[${pSource}] ${vColorCode} direction change found but Covered Call option position is open.`);
        return;
    }

    await fnExecuteCoveredCallRenkoTrade(vSide);
}

function fnGetRenkoFeedTickerPrice(pTicData){
    const vMark = Number(pTicData?.mark_price || 0);
    const vSpot = Number(pTicData?.spot_price || pTicData?.index_price || 0);
    const vBid = Number(pTicData?.quotes?.best_bid || pTicData?.best_bid || 0);
    const vAsk = Number(pTicData?.quotes?.best_ask || pTicData?.best_ask || 0);

    if(gRenkoFeedPriceSource === "spot_price"){
        return Number.isFinite(vSpot) && vSpot > 0 ? vSpot : vMark;
    }
    if(gRenkoFeedPriceSource === "best_bid"){
        return Number.isFinite(vBid) && vBid > 0 ? vBid : vMark;
    }
    if(gRenkoFeedPriceSource === "best_ask"){
        return Number.isFinite(vAsk) && vAsk > 0 ? vAsk : vMark;
    }
    return vMark;
}

function fnGetSyntheticRenkoOHLC(pOpen, pClose){
    const vOpen = Number(pOpen);
    const vClose = Number(pClose);
    return { Open: vOpen, High: Math.max(vOpen, vClose), Low: Math.min(vOpen, vClose), Close: vClose };
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
        gRenkoFeedLastDir = 0;
        fnAppendRenkoFeedMsg(`Anchor set @ ${gRenkoFeedAnchor.toFixed(2)} (${fnGetRenkoFeedSymbol()})`);
        return;
    }

    const objBuild = fnBuildStandardRenkoBricks(vMark, gRenkoFeedStepPts, gRenkoFeedAnchor, gRenkoFeedLastDir, 25);
    gRenkoFeedAnchor = objBuild.Anchor;
    gRenkoFeedLastDir = objBuild.LastDir;
    for(let i = 0; i < objBuild.Bricks.length; i += 1){
        const objOHLC = fnGetSyntheticRenkoOHLC(objBuild.Bricks[i].Open, objBuild.Bricks[i].Close);
        const objRenkoMsg = { Indc: 1, Open: objOHLC.Open, High: objOHLC.High, Low: objOHLC.Low, Close: objOHLC.Close };
        fnAppendRenkoFeedMsg(`[delta] O:${objOHLC.Open.toFixed(2)} H:${objOHLC.High.toFixed(2)} L:${objOHLC.Low.toFixed(2)} C:${objOHLC.Close.toFixed(2)} V:${vVolTxt}`);
        if(fnShouldUseDeltaRenkoFeedForStrategy()){
            await fnProcessRenkoSignal(objRenkoMsg, "delta");
        }
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
        objRenkoWS.send(JSON.stringify({ type: "subscribe", payload: { channels: [{ name: "v2/ticker", symbols: [vSymbol] }] } }));
        gRenkoFeedAnchor = null;
        gRenkoFeedLastDir = 0;
        gLastRenkoColorCode = "";
        fnSetRenkoSignalBox("");
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
        if(vData?.type !== "v2/ticker"){
            return;
        }
        const vVol = fnGetTickerVolumeFromWSData(vData);
        if(Array.isArray(vData.result) && vData.result.length > 0){
            const vTick = { ...vData.result[0] };
            if(Number.isFinite(vVol)){
                vTick.volume = vVol;
            }
            void fnHandleRenkoFeedTicker(vTick);
            return;
        }
        if(Number.isFinite(vVol)){
            vData.volume = vVol;
        }
        void fnHandleRenkoFeedTicker(vData);
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
    fnClearManualRenkoTimer();
    if(gRenkoFeedWS !== null){
        try{
            gRenkoFeedWS.close();
        }
        catch(_err){}
        gRenkoFeedWS = null;
    }
    fnSetRenkoFeedStatus("OFF", "bg-secondary");
    fnSetRenkoSignalBox("");
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
    localStorage.setItem(fnRenkoCcdeStorageKey("FeedEnabled"), JSON.stringify(gRenkoFeedEnabled));
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
    const vEnabled = JSON.parse(localStorage.getItem(fnRenkoCcdeStorageKey("FeedEnabled")) || "false");
    const vStepLs = Math.floor(fnRenkoParsePositiveNumber(localStorage.getItem(fnRenkoCcdeStorageKey("FeedStepPts")), 200));
    const vSrcLs = String(localStorage.getItem(fnRenkoCcdeStorageKey("FeedPriceSrc")) || "mark_price");
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
    gRenkoFeedLastDir = 0;
    fnSetRenkoFeedMeta();
    fnSetRenkoFeedStatus(gRenkoFeedEnabled ? "ON" : "OFF", gRenkoFeedEnabled ? "bg-success" : "bg-secondary");
    fnSetRenkoSignalBox(gRenkoFeedEnabled ? gLastRenkoColorCode : "");
    if(gRenkoFeedEnabled){
        fnStartRenkoFeedWS();
    }
}

function fnBindRenkoCoveredCallSymbolChange(){
    const objSymbol = document.getElementById("ddlCoveredCallSymbol");
    if(!objSymbol || objSymbol.dataset.ccdeRenkoBound === "true"){
        return;
    }
    objSymbol.addEventListener("change", function(){
        gRenkoFeedAnchor = null;
        gRenkoFeedLastDir = 0;
        gLastRenkoColorCode = "";
        fnClearManualRenkoTimer("[delta] Symbol changed. Pending manual RED timer cancelled.");
        fnSetRenkoSignalBox("");
        fnSetRenkoFeedMeta();
        if(gRenkoFeedEnabled){
            fnRestartRenkoFeedWS();
        }
    });
    objSymbol.dataset.ccdeRenkoBound = "true";
}

window.addEventListener("DOMContentLoaded", function(){
    fnBindRenkoCoveredCallSymbolChange();
    fnLoadRenkoFeedSettings();
});
