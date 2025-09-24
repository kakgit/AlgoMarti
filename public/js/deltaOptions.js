let objDeltaWS = null;
let gCurrPos = { TradeData : []};
let gHighDelta = 0.60;
let gLowDelta = 0.45;
let gMinDelta = 0.30;
let gExpiryLoop = 0;
let gPorC = "";
let gAmtSL = 0;
let gBrokerage = 0.015;
let gLeverage = 10;
let gSubList = [];
let gUnSubList = [];
let gSymbBRateList = {};
let gPauseCurrPosUpd = false;

window.addEventListener("DOMContentLoaded", function(){
	fnGetAllStatus();

});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
		fnLoadDefQty();
		fnFillEpiryDates();
		// fnLoadLossRecoveryMultiplier();
		fnLoadCurrentTradePos();
		// // UNCOMMENT for LIVE TRADING in DEMO
		// fnSubscribe();
		// fnSubscribeInterval();
		// // UNCOMMENT for LIVE TRADING in DEMO
		fnSetInitOptTrdDtls();
		// fnLoadSlTp();
		// fnLoadTodayTrades();

		fnLoadTradeSide();
	}
}

function fnFillEpiryDates(){
	let objExpiry = document.getElementById("selExpiry");

    objExpiry.innerHTML += "<option value='140925'>14-09-2025</option>";
    objExpiry.innerHTML += "<option value='150925'>15-09-2025</option>";
    objExpiry.innerHTML += "<option value='160925'>16-09-2025</option>";
    objExpiry.innerHTML += "<option value='190925'>19-09-2025</option>";
    objExpiry.innerHTML += "<option value='260925'>26-09-2025</option>";
}

function fnLoadDefQty(){
	let objStartQtyM = JSON.parse(localStorage.getItem("StartQtyNoDeltaOpt"));
	let objQtyMul = JSON.parse(localStorage.getItem("QtyMulDeltaOpt"));

    let objQty = document.getElementById("txtQty");
    let objStartQty = document.getElementById("txtStartQty");

    if(objQtyMul === null || objQtyMul < 1 || objQtyMul < objStartQtyM){
	    if(objStartQtyM === null){
	    	objStartQty.value = 100;
	    	objQty.value = 100;
	    	localStorage.setItem("StartQtyNoDeltaOpt", objStartQty.value);
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

function fnChangeStartQty(pThisVal){
    let objQty = document.getElementById("txtQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaOpt", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaOpt", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyNoDeltaOpt", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objQty.value = pThisVal.value;
            localStorage.setItem("QtyMulDeltaOpt", pThisVal.value);
        }
    }
}

function fnLoadCurrentTradePos(){
    let objCurrPos = JSON.parse(localStorage.getItem("DeltaCurrOptPosiS"));

    gCurrPos = objCurrPos;

    if(gCurrPos === null){
        gCurrPos = { TradeData : []};
    }
}

function fnConnectWS(){
    let vUrl = "wss://socket.india.delta.exchange";
    objDeltaWS = new WebSocket(vUrl);

    objDeltaWS.onopen = function (){
        // let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": ["BTCUSD"] }]}};

        // objDeltaWS.send(JSON.stringify(vSendData));
        // console.log("Conn Started......");
        fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
    }
    objDeltaWS.onclose = function (){

		objDeltaWS = null;
		// objBestBuy.value = "";
		// objBestSell.value = "";

        console.log("Conn Closed....");
        fnGenMessage("Streaming Connection Closed!", `badge bg-danger`, "spnGenMsg");
    }
    objDeltaWS.onerror = function (){
        console.log("Conn Error");
    }
	objDeltaWS.onmessage = function (pMsg){
        let vTicData = JSON.parse(pMsg.data);

		console.log(vTicData);
		switch (vTicData.type){
			case "v2/ticker":
				// console.log(vTicData);
				fnGetRates(vTicData);
				break;
			case "subscriptions":

	            fnGenMessage("Streaming Subscribed and Started!", `badge bg-success`, "spnGenMsg");
				break;
			case "unsubscribed":

	            fnGenMessage("Streaming Unsubscribed!", `badge bg-warning`, "spnGenMsg");
				break;
		}
	}
}

function fnCloseWS(){
	if(objDeltaWS !== null){
		objDeltaWS.close();
	}
	else{
		console.log("There is no Open WS Connection!")
	}
}

function fnSubscribe(){
	if(objDeltaWS === null){
		fnConnectWS();
		// console.log("WS is looping to Connect.....");
		setTimeout(fnSubscribe, 3000);
	}
	else{
	    let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": gSubList }]}};
		// console.log("Subscribing to Channel....");
	    objDeltaWS.send(JSON.stringify(vSendData));
	}
}

function fnUnsubscribe(){
	if(objDeltaWS === null){
	    fnGenMessage("Already Streaming is Unsubscribed & Disconnected!", `badge bg-warning`, "spnGenMsg");
	}
	else{
	    let vSendData = {};

        if(gUnSubList.length > 0){
            vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": gSubList }]}};
        }
        else{
            vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker" }]}};
        }
        

	    objDeltaWS.send(JSON.stringify(vSendData));
	}
}

function fnSubscribeInterval(){
    setInterval(fnSubscribe, 60000);
    setInterval(fnUpdateCurrPos, 5000);
}

function fnGetRates(pTicData){
    document.getElementById(pTicData.symbol).innerHTML = '<span class="blink">' + parseFloat(pTicData.quotes.best_ask).toFixed(2); + '</span>';

    gSymbBRateList[pTicData.symbol] = pTicData.quotes.best_ask;
}

async function fnInitiateManualOption(pOptionType){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objSymbDDL = document.getElementById("ddlSymbols");
    let objDelta = document.getElementById("txtDelta");
    let objPremium = document.getElementById("txtPremium");

    try{
        let vExpiry = await fnGetExpiryM();

        console.log(vExpiry);
        let objOptChnData = await fnGetOptChnByAstOptTypeExp(objApiKey.value, objApiSecret.value, objSymbDDL.value, pOptionType, vExpiry);
        if(objOptChnData.status === "success"){
            let objResData = { OptData: []};

            if(pOptionType === "C"){
                for(let i=0; i<objOptChnData.data.result.length; i++){
                    if((parseFloat(objOptChnData.data.result[i].greeks.delta) <= parseFloat(objDelta.value)) && (parseFloat(objOptChnData.data.result[i].quotes.best_bid) > parseFloat(objPremium.value))){
                        objResData.OptData.push(objOptChnData.data.result[i]);
                    }
                }
            }
            else if(pOptionType === "P"){
                for(let i=0; i<objOptChnData.data.result.length; i++){
                    if((parseFloat(objOptChnData.data.result[i].greeks.delta) >= -(parseFloat(objDelta.value))) && (parseFloat(objOptChnData.data.result[i].quotes.best_bid) > parseFloat(objPremium.value))){
                        objResData.OptData.push(objOptChnData.data.result[i]);
                    }
                }
            }
            else{
                console.log("No Option Type Received!!");
            }

            if(objResData.OptData.length === 0){
                gExpiryLoop = 1;
                console.log("No Data");
                setTimeout(fnInitiateManualOption, 3000, pOptionType);
            }
            else{
                gExpiryLoop = 0;

                let objBestRates = await fnGetBestRatesBySymbId(objApiKey.value, objApiSecret.value, objResData.OptData[0].symbol);
                if(objBestRates.status === "success"){
                    let objLotSize = document.getElementById("txtLotSize");
                    let objQty = document.getElementById("txtQty");

                    let vDate = new Date();
                    let vOrdId = vDate.valueOf();
                    let vMonth = vDate.getMonth() + 1;
                    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
                    let vSLPercent = parseFloat(document.getElementById("txtStopLoss").value);
                    let vSymbol = objBestRates.data.result.symbol;
                    let vBestBuy = parseFloat(objBestRates.data.result.quotes.best_ask);
                    let vBestSell = parseFloat(objBestRates.data.result.quotes.best_bid);
                    let vStrPrice = objBestRates.data.result.strike_price;
                    let vUndrAsstSymb = objBestRates.data.result.underlying_asset_symbol;
                    gPorC = pOptionType;
                    gAmtSL = vBestSell + ((vBestSell * vSLPercent) / 100);

                    // console.log(objBestRates);
                    // console.log(objBestRates.data.result.symbol);
                    // console.log("gAmtSL: " + gAmtSL);

                    let vExcTradeDtls = { OpenDTVal : vOrdId, OpenDT : vToday, Symbol : vSymbol, OptionType : gPorC, UndrAsstSymb : vUndrAsstSymb, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseFloat(objQty.value), BuyPrice : vBestBuy, SellPrice : vBestSell, SLPercent: vSLPercent, AmtSL : gAmtSL };

                    gCurrPos.TradeData.push(vExcTradeDtls);

                    let objExcTradeDtls = JSON.stringify(gCurrPos);
                    // gCurrPos = vExcTradeDtls;

                    localStorage.setItem("DeltaCurrOptPosiS", objExcTradeDtls);
                    localStorage.setItem("QtyMulDeltaOpt", objQty.value);

                    fnSetInitOptTrdDtls();

                    fnGenMessage(objBestRates.message, `badge bg-${objBestRates.status}`, "spnGenMsg");
                }
                else{
                    fnGenMessage(objOptChnData.message, `badge bg-${objOptChnData.status}`, "spnGenMsg");
                }
            }
        }
        else{
            fnGenMessage(objOptChnData.message, `badge bg-${objOptChnData.status}`, "spnGenMsg");
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-danger`, "spnGenMsg");
    }        
}

function fnSetInitOptTrdDtls(){
    let objCurrTradeList = document.getElementById("tBodyCurrTrades");

    if (gCurrPos.TradeData.length === 0) {
        objCurrTradeList.innerHTML = '<div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Running Trades Yet</div>';
    }
    else{
        let vTempHtml = "";
        let vTotalTrades = 0;
        let vNetProfit = 0;
        let vTotalCharges = 0;
        let vHighCapital = 0;
        gSubList = [];

        for(let i=0; i<gCurrPos.TradeData.length; i++){
            let vOpenDT = gCurrPos.TradeData[i].OpenDT;
            let vIndexPrice = parseFloat(gCurrPos.TradeData[i].StrikePrice);
            let vLotSize = gCurrPos.TradeData[i].LotSize;
            let vQty = gCurrPos.TradeData[i].Qty;
            let vBuyPrice = gCurrPos.TradeData[i].BuyPrice;
            let vSellPrice = gCurrPos.TradeData[i].SellPrice;

            let vCharges = fnGetTradeCharges(vIndexPrice, vLotSize, vQty, vBuyPrice, vSellPrice);
            let vCapital = fnGetTradeCapital(vSellPrice, vLotSize, vQty);
            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);;

            vTempHtml += '<tr>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vOpenDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + gCurrPos.TradeData[i].Symbol + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vLotSize + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vQty + '</td>';
            vTempHtml += '<td id="'+ gCurrPos.TradeData[i].Symbol +'" style="text-wrap: nowrap; color:green;text-align:right;"><span class="blink">' + (vBuyPrice).toFixed(2) + '</span></td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vSellPrice).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:orange;text-align:right;">' + (parseFloat(vCapital)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:orange;text-align:right;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">'+ (vPL).toFixed(2) +'</td>';
            vTempHtml += '</tr>';

            gSubList.push(gCurrPos.TradeData[i].Symbol);

            gSymbBRateList[gCurrPos.TradeData[i].Symbol] = vBuyPrice;
        }        
        objCurrTradeList.innerHTML = vTempHtml;
    }

    // console.log(gCurrPos);
    // console.log(gSubList);
    // console.log(gSymbBRateList);
}

async function fnUpdateCurrPos(){
    // console.log(gSymbBRateList['C-BTC-116400-150925']);
    let vIsRecDeleted = false;
    let vRecId = 0;

    if((gCurrPos.TradeData.length > 0) && (gPauseCurrPosUpd === false)){
        for(let i=0; i<gCurrPos.TradeData.length; i++){
            let vSymbol = gCurrPos.TradeData[i].Symbol;
            let vBuyPrice = parseFloat(gSymbBRateList[gCurrPos.TradeData[i].Symbol]);
            let vAmtSL = gCurrPos.TradeData[i].AmtSL;
            let vQty = gCurrPos.TradeData[i].Qty;

            gCurrPos.TradeData[i].BuyPrice = vBuyPrice;

            if(vBuyPrice <= vAmtSL){
                gPauseCurrPosUpd = true;
                let objClsTrd = await fnClsOptFullLeg(gCurrPos.TradeData[i]);
                if(objClsTrd.status === "success"){
                    vIsRecDeleted = true;
                    vRecId = i;                    
                }
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPos);
        localStorage.setItem("DeltaCurrOptPosiS", objExcTradeDtls);

        if(vIsRecDeleted === true){
            gCurrPos.TradeData.pop(vRecId);
            localStorage.setItem("DeltaCurrOptPosiS", JSON.stringify(gCurrPos));
            console.log("Deleted Successfully!");
            fnLoadCurrentTradePos();
        }

        fnSetInitOptTrdDtls();
        console.log("Streaming.......");
    }
}

async function fnCloseManualOption(pOptType){
    console.log(gCurrPos);
    // if(gCurrPos.TradeData.length > 0){
    //     let isRecToDel = false;
    //     let vSymbId = 0;

    //     for(let i=0; i<gCurrPos.TradeData.length; i++){
    //         if(gCurrPos.TradeData[i].OptionType === pOptType){
    //             isRecToDel = true;
    //             vSymbId = gCurrPos.TradeData[i].Symbol;
    //         }
    //     }

    //     if(isRecToDel){
    //         let objClsTrd = await fnInnitiateClsOptTrade(0, vSymbId);
    //         if(objClsTrd.status === "success"){

    //             fnSetInitOptTrdDtls();
    //             //fnLoadTodayTrades();
    //             fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
    //         }
    //     }
    //     else{
    //         fnGenMessage("No Position to Close!", `badge bg-warning`, "spnGenMsg");      
    //     }
    // }
    // else{
    //     fnGenMessage("No Open Position to Close!", `badge bg-warning`, "spnGenMsg");        
    // }
}

function fnClsOptFullLeg(objData){
    const objClsTrd = new Promise((resolve, reject) => {

        let vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

        objData.CloseDT = vToday;
        objData.CloseDTVal = vDate.valueOf();

        let vCharges = fnGetTradeCharges(objData.StrikePrice, objData.LotSize, objData.Qty, objData.BuyPrice, objData.SellPrice);
        let vCapital = fnGetTradeCapital(objData.SellPrice, objData.LotSize, objData.Qty);
        let vPL = fnGetTradePL(objData.BuyPrice, objData.SellPrice, objData.LotSize, objData.Qty, vCharges);;

        objData.Charges = vCharges;
        objData.Capital = vCapital;
        objData.PL = vPL;

        let objClsdRec = { OpenDT: objData.OpenDT, OpenDTVal: objData.OpenDTVal, CloseDT: objData.CloseDT, CloseDTVal: objData.CloseDTVal, Symbol: objData.Symbol, UndrAsstSymb: objData.UndrAsstSymb, StrikePrice: objData.StrikePrice, OptionType: objData.OptionType, Expiry: objData.Expiry, BuyPrice: objData.BuyPrice, SellPrice: objData.SellPrice, LotSize: objData.LotSize, Qty: objData.Qty, Capital: objData.Capital, Charges: objData.Charges, PL: objData.PL }

        let objTodayTrades = JSON.parse(localStorage.getItem("TrdBkOpt"));
        if(objTodayTrades === null){
            let vNewTradeBook = { TradeBook : [ objClsdRec ]}
            localStorage.setItem("TrdBkOpt", JSON.stringify(vNewTradeBook));
        }
        else{
            // console.log(objTodayTrades)
            let vExistingData = objTodayTrades;
            vExistingData.TradeBook.push(objClsdRec);
            localStorage.setItem("TrdBkOpt", JSON.stringify(vExistingData));
        }

        console.log(localStorage.getItem("TrdBkOpt"));

        resolve({ "status": "success", "message": "Option Paper Trade Closed Successfully!", "data": "" });
    });
    return objClsTrd;
}

function fnGetOptChnByAstOptTypeExp(pApiKey, pApiSecret, pUndAssetSymb, pOptionType, pOtionExpiry){
    const objPromise = new Promise((resolve, reject) => {

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "UndAssetSymbol" : pUndAssetSymb,
            "OptionType" : pOptionType,
            "OptionExpiry" : pOtionExpiry
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaExcOpt/getOptChnSDKByAstOptTypExp", requestOptions)
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

function fnGetExpiryM(){
    let objDateM = JSON.parse(localStorage.getItem("OptExpDeltaM"));
    let vDate = null;

    if(objDateM === null){
        vDate = new Date();
    }
    else{
        vDate = new Date(objDateM);

    }
    
    let objNewDate = vDate;

    // console.log("objNewDate: " + objNewDate);

    if(gExpiryLoop > 0){
        objNewDate = new Date(vDate.setDate(vDate.getDate() + 1));
        // console.log("objNewDate: " + objNewDate);
    }

    let vDay = (objNewDate.getDate()).toString().padStart(2, "0");
    let vMonth = (objNewDate.getMonth() + 1).toString().padStart(2, "0");
    let vYear = objNewDate.getFullYear();
    let vRetVal = vDay + "-" + vMonth + "-" + vYear;;

    // if(objDateM === null){
        vRetVal = vDay + "-" + vMonth + "-" + vYear;
        localStorage.setItem("OptExpDeltaM", JSON.stringify(objNewDate));
    // }
    // else{
    //     vRetVal = vDay + "-" + vMonth + "-" + vYear;
    //     localStorage.setItem("OptExpDeltaM", JSON.stringify(vRetVal));
    // }

    return vRetVal;
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

        fetch("/deltaExcOpt/getBestRatesBySymb", requestOptions)
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
            reject({ "status": "danger", "message": "Error in Getting Option Best Rates...", "data": "" });
        });
    });

    return objPromise;
}

async function getOptionsData(pApiKey, pApiSecret, pUndAssetSymb, pOptionType, pOtionExpiry){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objSymbDDL = document.getElementById("ddlSymbols");
    let objSpotPrice = document.getElementById("txtSpotPrice");
    let objExpiryDate = document.getElementById("selExpiry");

    try{
	    let objOptionChain = await fnGetOptionChain(objApiKey.value, objApiSecret.value, "objSpotPriceByProd.data.result.underlying_asset_symbol", "objExpiryDate.value", "objMsg.optionType");
	    if(objOptionChain.status === "success"){
            let vCallOITotal = 0;
            let vPutOITotal = 0;
            let vCallOIChgTotal = 0;
            let vPutOIChgTotal = 0;

            console.log(objOptionChain);
            console.log(objOptionChain.data.result.length);
            for(let i=0; i<objOptionChain.data.result.length; i++){
                if(objOptionChain.data.result[i].contract_type === "put_options"){
                    vPutOITotal += parseFloat(objOptionChain.data.result[i].oi_value_usd);
                    vPutOIChgTotal += parseFloat(objOptionChain.data.result[i].oi_change_usd_6h);
                }
                else if(objOptionChain.data.result[i].contract_type === "call_options"){
                    vCallOITotal += parseFloat(objOptionChain.data.result[i].oi_value_usd);
                    vCallOIChgTotal += parseFloat(objOptionChain.data.result[i].oi_change_usd_6h);
                }
            }
        console.log("Call: " + (vCallOITotal).toFixed(2));                
        console.log("Put: " + (vPutOITotal).toFixed(2));                
        console.log("Call Chg: " + (vCallOIChgTotal).toFixed(2));                
        console.log("Put Chg: " + (vPutOIChgTotal).toFixed(2));                

	    }
        else{
            fnGenMessage(objOptionChain.message, `badge bg-${objOptionChain.status}`, "spnGenMsg");
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-danger`, "spnGenMsg");
    }
}

function fnGetTradeCharges(pIndexPrice, pLotSize, pQty, pBuyPrice, pSellPrice){
    let vNotionalFees = (((pQty * 2) * pLotSize * pIndexPrice) * gBrokerage) / 100;

    let vBuyBrokerage = ((pQty * pLotSize * pBuyPrice) * 5) / 100;
    let vSellBrokerage = ((pQty * pLotSize * pSellPrice) * 5) / 100;
    let vPremiumCapFees = vSellBrokerage + vBuyBrokerage;

    let vEffectiveBrokerage = 0;

    if(vPremiumCapFees < vNotionalFees){
        vEffectiveBrokerage = vPremiumCapFees * 1.18;
    }
    else{
        vEffectiveBrokerage = vNotionalFees * 1.18;
    }

    return vEffectiveBrokerage;
}

function fnGetTradeCapital(pSellPrice, pLotSize, pQty){
    let vTotalCapital = 0;
    
    vTotalCapital = (pSellPrice * pLotSize * pQty) * 6;
    
    return vTotalCapital;
}

function fnGetTradePL(pBuyPrice, pSellPrice, pLotSize, pQty, pCharges){
    let vPL = ((pSellPrice - pBuyPrice) * pLotSize * pQty) - pCharges;

    return vPL;
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

        fetch("/deltaExcOpt/getOptionChainSDK", requestOptions)
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



function fnClearLocalStorageTemp(){
    localStorage.removeItem("DeltaCurrOptPosiS");
	localStorage.removeItem("TrdBkOpt");
	localStorage.removeItem("StartQtyNoDeltaOpt");
	localStorage.setItem("QtyMulDeltaOpt", 0);
    localStorage.removeItem("OptExpDeltaM");
	// localStorage.setItem("TotLossAmtDeltaOpt", 0);
    // clearInterval(gTimerID);

	fnGetAllStatus();
    console.log("Memory Cleared!!!!");
}


//********** Indicators Sections *************//

function fnTradeSide(){
    let objTradeSideVal = document["frmSide"]["rdoTradeSide"];

    localStorage.setItem("TradeSideOptSwtS", objTradeSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("TradeSideOptSwtS") === null){
        localStorage.setItem("TradeSideOptSwtS", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("TradeSideOptSwtS");
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


function fnTest(){
    console.log(gSymbBRateList);
}