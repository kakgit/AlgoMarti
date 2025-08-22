
let userDeltaWS="";
let pTradeInst = 0;

window.addEventListener("DOMContentLoaded", function(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
        fnShowAdminAccessories();
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
        fnGetSetRealTradeStatus();
        fnGetSetDefaultStreaming();
		fnSetDefaultTraderTab();
        fnSetDefaultQty();
        fnLoadPrevQty();
        fnShowClsdOptTrades();
	}

    socket.on("DeltaEmit1", (pMsg) => {
        let objMsg = JSON.parse(pMsg);
        let objLiveMsgs = JSON.parse(localStorage.getItem("msgsDelExc"));
        let vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

        if(objLiveMsgs === null || objLiveMsgs === ""){
            objLiveMsgs = JSON.stringify({ TrdMsgs: [{ MsgId: vDate.valueOf(), MsgDT: vToday, SymbName: objMsg.symbolName, Strategy: objMsg.strategy, Direction: objMsg.direction, IngnorePrevInc: objMsg.ignorePrevIndc }]});
            localStorage.setItem("msgsDelExc", objLiveMsgs);
        }
        else{
            let vTempMsg = { MsgId: vDate.valueOf(), MsgDT: vToday, SymbName: objMsg.symbolName, Strategy: objMsg.strategy, Direction: objMsg.direction, IngnorePrevInc: objMsg.ignorePrevIndc };

            objLiveMsgs.TrdMsgs.push(vTempMsg);
            localStorage.setItem("msgsDelExc", JSON.stringify(objLiveMsgs));
        }

        fnInitFutAutoTrade(objMsg);
    });

    // 2222222222 - Auto Emit Trade
    socket.on("DeltaEmitOpt", (pMsg) => {
        let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

        if((objAppCred !== null) && (objAppCred.IsAdmin)){
            let objMsg = JSON.parse(pMsg);
            let objLiveMsgs = JSON.parse(localStorage.getItem("msgsDelExcOpt"));
            let vDate = new Date();
            let vMonth = vDate.getMonth() + 1;
            let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

            if(objLiveMsgs === null || objLiveMsgs === ""){
                objLiveMsgs = JSON.stringify({ TrdMsgs: [{ MsgId: vDate.valueOf(), MsgDT: vToday, SymbName: objMsg.symbolName, Strategy: objMsg.strategy, Direction: objMsg.direction, OptionType: objMsg.optionType, ClosePrice: objMsg.closePrice, IngnorePrevInc: objMsg.ignorePrevIndc }]});
                localStorage.setItem("msgsDelExcOpt", objLiveMsgs);
            }
            else{
                let vTempMsg = { MsgId: vDate.valueOf(), MsgDT: vToday, SymbName: objMsg.symbolName, Strategy: objMsg.strategy, Direction: objMsg.direction, OptionType: objMsg.optionType, ClosePrice: objMsg.closePrice, IngnorePrevInc: objMsg.ignorePrevIndc };

                objLiveMsgs.TrdMsgs.push(vTempMsg);
                localStorage.setItem("msgsDelExcOpt", JSON.stringify(objLiveMsgs));
            }

            fnInitOptAutoTrade(objMsg);
        }
    });

    // 44444444 - Send Trade to All
    socket.on("DeltaMsgRec1", (pMsg) => {
        let isLsAutoTrader = localStorage.getItem("isDeltaAutoTrader");

        if(isLsAutoTrader === "true"){
            // console.log(pMsg);
            fnAddNewPosition(pMsg.CurrPos, pMsg.OptionType, pMsg.Direction);
        }
        else{
            fnGenMessage("Trade Message Received but Auto Trade is Off!", `badge bg-warning`, "spnGenMsg");
        }
    });
});

function fnSetDefaultQty(){
    let lsStartQty = localStorage.getItem("StartQtyDelta");
    let objTxtStartQty = document.getElementById("txtStartQty");

    if(lsStartQty === null || lsStartQty === "" || lsStartQty === "0"){
        localStorage.setItem("StartQtyDelta", 1);
        objTxtStartQty.value = 1;
    }
    else{
        objTxtStartQty.value = lsStartQty;
    }
}

function fnLoadPrevQty(){
    let lsQtyMul = JSON.parse(localStorage.getItem("QtyMulDelta"));
    let lsStartQty = localStorage.getItem("StartQtyDelta");
    let objQty = document.getElementById("txtOptionsQty");

    if(lsQtyMul !== null){
        if(parseInt(lsQtyMul) > parseInt(lsStartQty)){
            objQty.value = lsQtyMul;
        }
        else{
            objQty.value = lsStartQty;
        }
    }
    else{
        objQty.value = lsStartQty;
        localStorage.setItem("QtyMulDelta", objQty.value);
    }
}

function fnGetSetDefaultStreaming(){
    let lsStreaming = localStorage.getItem("IsDeltaOptStreamS");
    let objStreamingCheck = document.getElementById("swtStreaming");

    if(lsStreaming === null || lsStreaming === "" || lsStreaming === "false"){
        objStreamingCheck.checked = false;
    }
    else{
        objStreamingCheck.checked = true;
    }
    fnChkStreamOpt();
}

function fnClearLocalStorageTemp(){
    localStorage.removeItem("msgsDelExc");
    localStorage.removeItem("msgsDelExcOpt");
    localStorage.removeItem("DeltaCurrFutPosiS");
    localStorage.removeItem("DeltaCurrPosiS")
    localStorage.removeItem("StartQtyDelta");
    localStorage.removeItem("QtyMulDelta");
    localStorage.removeItem("DeltaClsdTrdsS");
    // localStorage.removeItem("TotLossAmtR");
    // localStorage.removeItem("TraderTab");
    // clearInterval(vTradeInst);

    // fnSetTodayOptTradeDetails();
    window.location.reload();
    console.log("LocalStorage Cleared!")
}

function fnGetAvailableMargin(){
    alert("Implementation is still pending!");
}

// 1111111111 - Manual Emit Trade
function fnManualEmitOptTrade(pBorS, pCorP){
    let objSymbDDL = document.getElementById("ddlOptionsSymbols");
    let vStrategy = "Strategy-1";
    let objClosePrice = document.getElementById("txtOptionSpotPrice");

    objClosePrice.value = "";

    if(objSymbDDL.value === ""){
        fnGenMessage("Please Select Symbol to Execute Option Trade!", `badge bg-warning`, "spnGenMsg");
        objSymbDDL.focus();
    }
    else{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({ symbolName: objSymbDDL.value, strategy: vStrategy, direction: pBorS, optionType: pCorP, closePrice: objClosePrice.value, ignorePrevIndc: true });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/tv-msg-delta-opt", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            // console.log(objResult);
            if(objResult.status === "success"){
                // console.log(objResult);

                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "danger"){
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "warning"){
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage("Error to Emit Trade for All, Contact Admin!", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            fnGenMessage("Error in Executing Trade for All!", `badge bg-danger`, "spnGenMsg");
        });
    }
}

// 3333333333 - Manual Emit Trade
async function fnInitOptAutoTrade(objMsg){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objSymbDDL = document.getElementById("ddlOptionsSymbols");
    let objSpotPrice = document.getElementById("txtOptionSpotPrice");
    let objExpiryDate = document.getElementById("txtOptionExpiry");

    try{
        objSymbDDL.value = objMsg.symbolName;
        objSpotPrice.value = objMsg.closePrice;

        let objSpotPriceByProd = await fnGetSpotPriceByProd(objApiKey.value, objApiSecret.value, objSymbDDL.value);

        if(objSpotPriceByProd.status === "success"){

            objSpotPrice.value = (parseFloat(objSpotPriceByProd.data.result.spot_price)).toFixed(2);

            let objOptionChain = await fnGetOptionChain(objApiKey.value, objApiSecret.value, objSpotPriceByProd.data.result.underlying_asset_symbol, objExpiryDate.value, objMsg.optionType);

            // console.log(objSpotPriceByProd);
            if(objOptionChain.status === "success"){
                let objCurrPos = null;
                // console.log(objOptionChain);
                if(objMsg.optionType === "PE"){
                    for(let i=0; i< objOptionChain.data.result.length; i++){
                        if((parseInt(objOptionChain.data.result[i].strike_price) < parseInt(objSpotPrice.value)) && (parseInt(objOptionChain.data.result[i].strike_price) > (parseInt(objSpotPrice.value) - 500)) && (parseInt(objOptionChain.data.result[i].quotes.best_bid) > 500)){
                            // console.log("Length: " + objOptionChain.data.result.length);
                            objCurrPos = objOptionChain.data.result[i];
                            // console.log(objOptionChain.data.result[i]);
                        }
                    }
                }
                else{
                    for(let i=0; i< objOptionChain.data.result.length; i++){
                        if((parseInt(objOptionChain.data.result[i].strike_price) > parseInt(objSpotPrice.value)) && (parseInt(objOptionChain.data.result[i].strike_price) < (parseInt(objSpotPrice.value) + 500)) && (parseInt(objOptionChain.data.result[i].quotes.best_bid) > 500)){
                            objCurrPos = objOptionChain.data.result[i];
                            // console.log(objOptionChain.data.result[i]);
                        }
                    }
                }
                fnEmitTrade4All(objCurrPos, objMsg.optionType, objMsg.direction);
                // console.log(objCurrPos);
                fnGenMessage(objOptionChain.message, `badge bg-${objOptionChain.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage(objOptionChain.message, `badge bg-${objOptionChain.status}`, "spnGenMsg");
            }
        }
        else{
            fnGenMessage(objSpotPriceByProd.message, `badge bg-${objSpotPriceByProd.status}`, "spnGenMsg");
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

// 44444444 - Send Trade to All
function fnEmitTrade4All(objCurrPos, pOptionType, pDirection){
    socket.emit("DeltaMsgAll1", { CurrPos: objCurrPos, OptionType: pOptionType, Direction: pDirection });
}

// 66666666 - Check if stream is ON
function fnChkStreamOpt(){
    let objStreamingCheck = document.getElementById("swtStreaming");
    let objCurrPositions = JSON.parse(localStorage.getItem("DeltaCurrPosiS"));

    if(objStreamingCheck.checked){
        clearInterval(pTradeInst);
        console.clear();
        localStorage.setItem("IsDeltaOptStreamS", "true");
        if(objCurrPositions !== null){
            pTradeInst = setInterval(fnGetTimerBasedRates, 5000);
        }
    }
    else{
        localStorage.setItem("IsDeltaOptStreamS", "false");
        // if(userDeltaWS !== ""){
        //     fnCloseWS();
        // }
    }
    fnShowCurrOpenPosList();
}

// 5555555 - Add new Position to Curr Live Positions
function fnAddNewPosition(objNewPos, pCorP, pBorS){
    let objCurrPositions = JSON.parse(localStorage.getItem("DeltaCurrPosiS"));
    let objLotSize = document.getElementById("txtOptionLotSize");
    let objQty = document.getElementById("txtOptionsQty");
    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

    if(objNewPos !== null){
        if(objCurrPositions === null){
            objCurrPositions = JSON.stringify({ OpenPos: [{ TradeID: vDate.valueOf(), DT: vToday, CorP: pCorP, BorS: pBorS, ContractType: objNewPos.contract_type, ProductID: objNewPos.product_id, BuyPrice: objNewPos.quotes.best_ask, SellPrice: objNewPos.quotes.best_bid, StrikePrice: objNewPos.strike_price, Symbol: objNewPos.symbol, UndAstSymbol: objNewPos.underlying_asset_symbol, LotSize: parseFloat(objLotSize.value), Quantity: parseInt(objQty.value) }]});
            localStorage.setItem("DeltaCurrPosiS", objCurrPositions);
        }
        else{
            let vTempData = { TradeID: vDate.valueOf(), DT: vToday, CorP: pCorP, BorS: pBorS, ContractType: objNewPos.contract_type, ProductID: objNewPos.product_id, BuyPrice: objNewPos.quotes.best_ask, SellPrice: objNewPos.quotes.best_bid, StrikePrice: objNewPos.strike_price, Symbol: objNewPos.symbol, UndAstSymbol: objNewPos.underlying_asset_symbol, LotSize: parseFloat(objLotSize.value), Quantity: parseInt(objQty.value) };        
            objCurrPositions.OpenPos.push(vTempData);
            localStorage.setItem("DeltaCurrPosiS", JSON.stringify(objCurrPositions));
        }

        // console.log(JSON.parse(localStorage.getItem("DeltaCurrPosiS")));

        //Temporary for checking, change later
        objQty.value = parseInt(objQty.value) * 2;
        localStorage.setItem("QtyMulDelta", objQty.value);        
    }
    else{
        fnGenMessage("No Position Available Above 1000 $", `badge bg-warning`, "spnGenMsg");
    }
    fnChkStreamOpt();
}

// 77777777 - Show Current Open Positions List
function fnShowCurrOpenPosList(){
    let objOpenTrades = JSON.parse(localStorage.getItem("DeltaCurrPosiS"));
    let objCurrTradeBody = document.getElementById("tBodyCurrOpenTrades");
    let objSymbList = [];

    if (objOpenTrades === null) {
        objCurrTradeBody.innerHTML = '<span style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Open Positions</span>';
    }
    else{
        let vTempHtml = "";
        let vNetProfit = 0;
        let vNoOfTrades = 0;
        let vInvestment = 0;
        let vCharges = 0;
        let vTotalCharges = 0;

        for (let i = 0; i < objOpenTrades.OpenPos.length; i++){
            let vBuyPrice = parseFloat(objOpenTrades.OpenPos[i].BuyPrice);
            let vSellPrice = parseFloat(objOpenTrades.OpenPos[i].SellPrice);
            let vLotSize = objOpenTrades.OpenPos[i].LotSize;
            let vQty = objOpenTrades.OpenPos[i].Quantity;
            let vSymbolName = objOpenTrades.OpenPos[i].Symbol;
            let vCapital = 0;

            vTempHtml += '<tr>';

            vTempHtml += '<td style="text-wrap: nowrap;" onclick=\'fnDeleteThisTrade(' + objOpenTrades.OpenPos[i].TradeID + ');\'>' + objOpenTrades.OpenPos[i].DT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + objOpenTrades.OpenPos[i].Symbol + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + objOpenTrades.OpenPos[i].StrikePrice + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + objOpenTrades.OpenPos[i].BorS + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vQty + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + (vBuyPrice).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vSellPrice).toFixed(2) + '</td>';

            if(objOpenTrades.OpenPos[i].BorS === "SELL"){
                vCapital = (vLotSize * vQty * vSellPrice) * 0.75;
            }
            else{
                vCapital = vLotSize * vQty * vBuyPrice;
            }

            // if(vCapital > vInvestment){
            //     vInvestment = vCapital;
            // }

            let vBuyBrok = fnReturnBrokerage(vQty, vLotSize, objOpenTrades.OpenPos[i].StrikePrice, vBuyPrice); //((vLotSize * vQty * vBuyPrice) * 1)/100;
            let vSellBrok = fnReturnBrokerage(vQty, vLotSize, objOpenTrades.OpenPos[i].StrikePrice, vSellPrice); //((vLotSize * vQty * vSellPrice) * 1)/100;
            let vCharges = (vBuyBrok + vSellBrok);
            let vTradePL = ((vSellPrice - vBuyPrice) * vLotSize * vQty) - vCharges;

            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vCharges).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vCapital).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;text-align:right;">' + (vTradePL).toFixed(2) + '</td>';

            vNoOfTrades += 1;
            vTotalCharges += vCharges;
            vNetProfit += vTradePL;
            vInvestment += vCapital;

            vTempHtml += '</tr>';

            objSymbList.push(vSymbolName);
        }
        vTempHtml += '<tr><td>Total Trades</td><td>'+ vNoOfTrades +'</td><td colspan="5"></td><td Style="text-align:right;font-weight:bold;color:red;">'+ (vTotalCharges).toFixed(2) +'</td><td Style="text-align:right;font-weight:bold;color:orange;">'+ (vInvestment).toFixed(2) +'</td><td style="font-weight:bold;text-align:right;color:orange;">' + (vNetProfit).toFixed(2) + '</td></tr>';

        objCurrTradeBody.innerHTML = vTempHtml;
    }
    localStorage.setItem("DeltaSymbolsList", JSON.stringify(objSymbList));
}

function fnReturnBrokerage(pQty, pLotSize, pStrikePrice, pBuyPrice){
    let vNotionalVal = ((parseInt(pQty) * parseFloat(pLotSize) * parseFloat(pStrikePrice)) * 0.03)/100;
    let vPremiumCap = ((parseInt(pQty) * parseFloat(pLotSize) * parseFloat(pBuyPrice)) * 10)/100;
    let vEffectiveFee = 0;

     if(vNotionalVal < vPremiumCap){
        vEffectiveFee = vNotionalVal;
     }
     else{
        vEffectiveFee = vPremiumCap;
     }

    return parseFloat(vEffectiveFee) * 1.18;
}

async function fnGetTimerBasedRates(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objSymbList = JSON.parse(localStorage.getItem("DeltaSymbolsList"));

    // if(userDeltaWS !== ""){
    //     fnCloseWS();
    // }
    // console.clear();

    try{
        for(let i=0; i<objSymbList.length; i++){
            let objProdDetsBySym = await fnGetProdBySymbol(objApiKey.value, objApiSecret.value, objSymbList[i]);

            if(objProdDetsBySym.status === "success"){

                // console.log(objProdDetsBySym);
                fnUpdCurrPosLocStrge(objProdDetsBySym.data.result);
            }
            else{
                fnGenMessage(objSpotPriceByProd.message, `badge bg-${objSpotPriceByProd.status}`, "spnGenMsg");
            }
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

async function fnInitCloseAllPositions(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objSymbList = JSON.parse(localStorage.getItem("DeltaSymbolsList"));

    try{
        for(let i=0; i<objSymbList.length; i++){
            let objProdDetsBySym = await fnGetProdBySymbol(objApiKey.value, objApiSecret.value, objSymbList[i]);

            if(objProdDetsBySym.status === "success"){
                fnClsCurrPosLocStrge(objProdDetsBySym.data.result);
            }
            else{
                fnGenMessage(objSpotPriceByProd.message, `badge bg-${objSpotPriceByProd.status}`, "spnGenMsg");
            }
        }
        localStorage.removeItem("DeltaCurrPosiS");

        fnShowCurrOpenPosList();
        fnShowClsdOptTrades();
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

function fnGetProdBySymbol(pApiKey, pApiSecret, pSymbol){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "Symbol" : pSymbol
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };
        fetch("/deltaExc/getProdBySymbol", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    reject({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": objResult.data });
                }
                else{
                    reject({ "status": objResult.status, "message": objResult.data.response.body.error.code + " Contact Admin!", "data": objResult.data });
                }
            }
            else if(objResult.status === "warning"){
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            reject({ "status": "danger", "message": "Error At getProdBySymbol. JS Catch!", "data": "" });
        });
    });

    return objPromise;
}

function fnStartStreaming(){
    if(userDeltaWS !== ""){
        fnCloseWS();
    }
    console.clear();
    let objSymbList = JSON.parse(localStorage.getItem("DeltaSymbolsList"));
    // console.log(objSymbList);

    let vUrl = "wss://socket.india.delta.exchange";
    userDeltaWS = new WebSocket(vUrl);

    userDeltaWS.onopen = function (){
        let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": objSymbList }]}};

        userDeltaWS.send(JSON.stringify(vSendData));
        console.log("Conn Stated");
    }
    userDeltaWS.onclose = function (){
        console.log("Conn Ended");
    }
    userDeltaWS.onerror = function (){
        console.log("Conn Error");
    }
    userDeltaWS.onmessage = function (pMsg){
        let vTicData = JSON.parse(pMsg.data);

        switch (vTicData.type) {
            case "v2/ticker":
                fnUpdCurrPosLocStrge(vTicData);
                break;
            case "heartbeat":
                console.log("Heart Beats");
                break;
            case "pong":
                console.log("Heart Pings");
                break;
        }
    }
}

function fnUpdCurrPosLocStrge(pTicData){
    let objOpenTrades = JSON.parse(localStorage.getItem("DeltaCurrPosiS"));

    // console.log("At Upd Curr Pos: ");
    // console.log(pTicData);
    // console.log(objOpenTrades);

    for (let i = 0; i < objOpenTrades.OpenPos.length; i++){
        if(pTicData.product_id === objOpenTrades.OpenPos[i].ProductID){
            if(objOpenTrades.OpenPos[i].BorS === "SELL"){
                objOpenTrades.OpenPos[i].BuyPrice = pTicData.quotes.best_bid;
            }
            else{
                objOpenTrades.OpenPos[i].SellPrice = pTicData.quotes.best_ask;
            }
        }
    }
    localStorage.setItem("DeltaCurrPosiS", JSON.stringify(objOpenTrades));
    fnShowCurrOpenPosList();
}

function fnClsCurrPosLocStrge(pTicData){
    let objOpenTrades = JSON.parse(localStorage.getItem("DeltaCurrPosiS"));
    let objTodayTrades = JSON.parse(localStorage.getItem("DeltaClsdTrdsS"));

    const vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

    for (let i = 0; i < objOpenTrades.OpenPos.length; i++){
        if(pTicData.product_id === objOpenTrades.OpenPos[i].ProductID){
            if(objOpenTrades.OpenPos[i].BorS === "SELL"){
                objOpenTrades.OpenPos[i].BuyPrice = pTicData.quotes.best_bid;
            }
            else{
                objOpenTrades.OpenPos[i].SellPrice = pTicData.quotes.best_ask;
            }

            let vPL = ((parseFloat(objOpenTrades.OpenPos[i].SellPrice) - parseFloat(objOpenTrades.OpenPos[i].BuyPrice)) * parseInt(objOpenTrades.OpenPos[i].Quantity) * parseFloat(objOpenTrades.OpenPos[i].LotSize));
            let vBuyBrok = fnReturnBrokerage(parseInt(objOpenTrades.OpenPos[i].Quantity), objOpenTrades.OpenPos[i].LotSize, objOpenTrades.OpenPos[i].StrikePrice, objOpenTrades.OpenPos[i].BuyPrice);
            let vSellBrok = fnReturnBrokerage(parseInt(objOpenTrades.OpenPos[i].Quantity), objOpenTrades.OpenPos[i].LotSize, objOpenTrades.OpenPos[i].StrikePrice, objOpenTrades.OpenPos[i].SellPrice);
            let vCharges = (vBuyBrok + vSellBrok).toFixed(3);

            if(objTodayTrades === null){
                objTodayTrades = {TradeList: []};
            }

            objTodayTrades.TradeList.push({ TradeID: objOpenTrades.OpenPos[i].TradeID, Symbol: objOpenTrades.OpenPos[i].Symbol, Strike: objOpenTrades.OpenPos[i].StrikePrice, OptionType: objOpenTrades.OpenPos[i].CorP, Direction: objOpenTrades.OpenPos[i].BorS, Quantity: objOpenTrades.OpenPos[i].Quantity, LotSize: objOpenTrades.OpenPos[i].LotSize, BuyPrice: objOpenTrades.OpenPos[i].BuyPrice, SellPrice: objOpenTrades.OpenPos[i].SellPrice, ProfitLoss: vPL, Charges: vCharges, EntryDT: objOpenTrades.OpenPos[i].DT, ExitDT: vToday, ContractType: objOpenTrades.OpenPos[i].ContractType });
        }
    }
    localStorage.setItem("DeltaClsdTrdsS", JSON.stringify(objTodayTrades));
}

function fnShowClsdOptTrades(){
    let objTodayTrades = JSON.parse(localStorage.getItem("DeltaClsdTrdsS"));
    let objTodayTradeList = document.getElementById("tBodyClsdOptPaperTrades");

    if (objTodayTrades == null) {
        objTodayTradeList.innerHTML = '<div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Trades Yet</div>';
    }
    else{
        let vTempHtml = "";
        let vNetProfit = 0;
        let vNoOfTrades = 0;
        let vCharges = 0;
        let vInvestment = 0;
        let vCapital = 0;

        for (let i = 0; i < objTodayTrades.TradeList.length; i++) {
            let vLotSize = objTodayTrades.TradeList[i].LotSize;
            let vQty = objTodayTrades.TradeList[i].Quantity;
            let vBuyPrice = objTodayTrades.TradeList[i].BuyPrice;
            let vSellPrice = objTodayTrades.TradeList[i].SellPrice;

            vTempHtml += '<tr>';
            //vTempHtml += '<td>' + objTodayTrades.TradeList[i].TradeID + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;" onclick=\'fnDeleteThisTrade(' + objTodayTrades.TradeList[i].TradeID + ');\'>' + objTodayTrades.TradeList[i].EntryDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + objTodayTrades.TradeList[i].ExitDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + objTodayTrades.TradeList[i].Symbol + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + objTodayTrades.TradeList[i].Strike + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + objTodayTrades.TradeList[i].Direction + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vQty + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + (parseFloat(vBuyPrice)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (parseFloat(vSellPrice)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (parseFloat(objTodayTrades.TradeList[i].Charges)).toFixed(2) + '</td>';

            if(objTodayTrades.TradeList[i].BorS === "SELL"){
                vCapital = (vLotSize * vQty * vSellPrice) * 0.75;
            }
            else{
                vCapital = vLotSize * vQty * vBuyPrice;
            }

            if(vCapital > vInvestment){
                vInvestment = vCapital;
            }

            vCharges += parseFloat(objTodayTrades.TradeList[i].Charges);
            let vTradePL = parseFloat(objTodayTrades.TradeList[i].ProfitLoss) - parseFloat(objTodayTrades.TradeList[i].Charges);

            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vCapital).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;text-align:right;">' + (vTradePL).toFixed(2) + '</td>';

            vNetProfit += vTradePL;
            vNoOfTrades += 1;
            vTempHtml += '</tr>';
        }
        vTempHtml += '<tr><td>Total Trades</td><td>'+ vNoOfTrades +'</td><td colspan="6"></td><td Style="text-align:right;font-weight:bold;color:red;">'+ (vCharges).toFixed(3) +'</td><td Style="text-align:right;font-weight:bold;color:orange;">'+ (vInvestment).toFixed(2) +'</td><td style="font-weight:bold;text-align:right;color:orange;">' + (vNetProfit).toFixed(2) + '</td></tr>';

        objTodayTradeList.innerHTML = vTempHtml;

    }
}

function fnChangeStartQty(pThisVal){

    let objOptQty = document.getElementById("txtOptionsQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Lot No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyDelta", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Lot No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyDelta", 1);
    }
    else{
        fnGenMessage("Start With Quantity is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyDelta", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objOptQty.value = pThisVal.value;
            localStorage.setItem("QtyMulDelta", pThisVal.value);
        }
    }
}

function fnGetSpotPriceByProd(pApiKey, pApiSecret, pSelSymbol){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "Symbol" : pSelSymbol
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };
        fetch("/deltaExc/getSpotPriceByProd", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    reject({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": objResult.data });
                }
                else{
                    reject({ "status": objResult.status, "message": objResult.data.response.body.error.code + " Contact Admin!", "data": objResult.data });
                }
            }
            else if(objResult.status === "warning"){
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            reject({ "status": "danger", "message": "Error At Spot Price. Catch!", "data": "" });
        });
    });

    return objPromise;
}

function fnGetOptionChain(pApiKey, pApiSecret, pUndAssetSymb, pOtionExpiry, pOptionType){
    const objPromise = new Promise((resolve, reject) => {

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "UndAssetSymbol" : pUndAssetSymb,
            "OptionExpiry" : pOtionExpiry,
            "OptionType" : pOptionType
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaExc/getOptionChainSDK", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                // console.log(objResult);

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    reject({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": objResult.data });
                }
                else{
                    reject({ "status": objResult.status, "message": objResult.data.response.body.error.code + " Contact Admin!", "data": objResult.data });
                }
            }
            else if(objResult.status === "warning"){
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            reject({ "status": "danger", "message": "Error At Option Chain. Catch!", "data": "" });
        });
    });
    return objPromise;
}

async function fnInitFutAutoTrade(objMsg){
    try{
        let isLsAutoTrader = localStorage.getItem("isDeltaAutoTrader");

        if(isLsAutoTrader === "false"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
            let objCurrPos = JSON.parse(localStorage.getItem("DeltaCurrFutPosiS"));
            let vTradeSide = localStorage.getItem("DeltaFutTradeSideSwtS");

            if(objCurrPos === null || objCurrPos === ""){
                console.log("New Order Placed");
            }
            else{
                console.log("Position is already Open");
            }
            // console.log(objCurrPos);
            fnGenMessage("Futures Order Placed!", "badge bg-success", "spnGenMsg");
        }
        // console.log(objMsg);
    }
    catch(err){
            fnGenMessage("Error in Placing Futures Order!", "badge bg-danger", "spnGenMsg");
    }
}

async function fnGetSelSymbolData(pThisVal){
    try{
        let objSymData = await fnExecSelSymbData(pThisVal);
        if(objSymData.status === "success"){

            fnGenMessage(objSymData.message, `badge bg-${objSymData.status}`, "spnGenMsg");   
        }
        else{
            fnGenMessage(objSymData.message, `badge bg-${objSymData.status}`, "spnGenMsg");   
        }
    }
    catch(err) {
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

function fnGetUserWalletSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getUserWalletSDK", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            // console.log(objResult);

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
            fnGenMessage("Error in getting Wallet Information, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error to Fetch Wallet Details!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnGetLeverageSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getLeverageSDK", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            // console.log(objResult);

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
            fnGenMessage("Error in getting Product Leverage Information, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error to Fetch Leverage Details!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnSetLeverageSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/setLeverageSDK", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            // console.log(objResult);

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
            fnGenMessage("Error in Changing Leverage!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error to Set Leverage!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnPlaceLimitOrderSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/placeLimitOrderSDK", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            // console.log(objResult);

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
            fnGenMessage("Error in Placing Order!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error in Placing Limit Order!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnPlaceSLTPLimitOrderSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/placeSLTPLimitOrderSDK", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            // console.log(objResult);

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
            fnGenMessage("Error in Placing SLTP Order!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error in Placing SLTP Limit Order!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnCancelOrderSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/cancelOrderSDK", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            // console.log(objResult);

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
            fnGenMessage("Error in Changing Product Leverage!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error in Changing Leverage!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnStartWS(){
	let objBestBid = document.getElementById("lblBuyPrice");
	let objBestAsk = document.getElementById("lblSellPrice");
    let objInv = document.getElementById("txtInvestment");
    let objQty = document.getElementById("txtFuturesQty");
    let objLeverage = document.getElementById("txtLeverage");
    let objContractVal = document.getElementById("hidContactValue");

    let vUrl = "wss://socket.india.delta.exchange";

    userDeltaWS = new WebSocket(vUrl);

	userDeltaWS.onopen = function (){
		let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": ["C-BTC-96500-090525", "P-BTC-96500-090525"] }]}};

		// userDeltaWS.send(JSON.stringify({"type": "enable_heartbeat"}));
		userDeltaWS.send(JSON.stringify(vSendData));
        //vTradeInst = setInterval(function () { userDeltaWS.send(JSON.stringify({"type": "ping"})); }, 35000);

		console.log("Conn Stated");
	}
	userDeltaWS.onclose = function (){
        //clearInterval(vTradeInst);
		console.log("Conn Ended");
	}
	userDeltaWS.onerror = function (){
		console.log("Conn Error");
	}
	userDeltaWS.onmessage = function (pMsg){
		let vTicData = JSON.parse(pMsg.data);

		switch (vTicData.type) {
			case "v2/ticker":
				// objBestBid.innerText = (parseInt(vTicData.close)).toFixed(2);
				// objBestAsk.innerText = (parseInt(vTicData.spot_price)).toFixed(2);
				// objBestBid.innerText = (parseInt(vTicData.quotes.best_ask)).toFixed(2);
				// objBestAsk.innerText = (parseInt(vTicData.quotes.best_bid)).toFixed(2);

                // objInv.value = ((parseFloat(objBestBid.innerText) * parseFloat(objContractVal.value) * parseFloat(objQty.value)) / parseFloat(objLeverage.value)).toFixed(2);
				break;
			case "heartbeat":
				console.log("Heart Beats");
				break;
			case "pong":
				console.log("Heart Pings");
				break;
		}
		console.log(vTicData);
	}
}

function fnCloseWS(){
	userDeltaWS.close();
}

function fnTestWalletAPI(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getTestWalletAPI", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            // console.log(JSON.parse(objResult.data));

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
            fnGenMessage("Error to Get Wallet Info, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
    });
}

function fnSetLeverageAPI(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/setLeverageAPI", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            // console.log(JSON.parse(objResult.data));

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
            fnGenMessage("Error to Set Leverage JS, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
    });
}

function fnTestGetAllOrderAPI(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getTestGetAllOrderAPI", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            // console.log(JSON.parse(objResult.data));

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
            fnGenMessage("Error in Login, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
    });
}

function fnGetCurrPriceByProd(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getCurrPriceByProd", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){
            // console.log(objResult);
            // console.log("Spot Price: " + objResult.data.result.spot_price);
            // console.log("Best BP: " + objResult.data.result.quotes.best_ask);
            // console.log("Best SP: " + objResult.data.result.quotes.best_bid);

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
            fnGenMessage("Error in Getting Current Price by Product!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error in Getting Price!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnGetProductsList(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getProductsList", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){
            // console.log(objResult);

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
            fnGenMessage("Error in Getting Current Price by Product!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error in Getting Price!", `badge bg-danger`, "spnGenMsg");
    });
}
