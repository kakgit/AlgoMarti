
let objDeltaWS = null;
let objStrikeWS = null;
let gByorSl = "";
let gCurrPosOSD = { TradeData : []};
let gBuyPrice, gSellPrice, gLotSize, gQty, gAmtSL, gAmtTP, gCharges, gCapital, gOrderDT = 0;
let gBrokerage = 0.05;
let gMaxTradeTime = 15;
let gLeverage = 160;
let gTimerID = 0;
let gTimeDiff = 900;
let gLossRecPerct = 50;
let gMultiplierX = 2.0;
let gOldPLAmt = 0;
let gNewPLAmt = 0;
let gPL = 0;
let gHisCandleMins = 1; //Eg: 1, 3, 5, 15, 30
let gSubInterval = 0;
let gManualSubIntvl = 0;
let	gManClsStrikeConn = false;

window.addEventListener("DOMContentLoaded", function(){
	fnGetAllStatus();

    socket.on("CdlEmaTrend", (pMsg) => {
        let objTradeSideVal = document["frmSide"]["rdoTradeSide"];
        let objJson = JSON.parse(pMsg);

        if(objJson.Direc === "UP"){
            objTradeSideVal.value = true;
        }
        else if(objJson.Direc === "DN"){
            objTradeSideVal.value = false;
        }
        else{
            objTradeSideVal.value = -1;
        }
        fnTradeSide();
    });

    socket.on("tv-btcusd-exec", (pMsg) => {
        let isLsAutoTrader = localStorage.getItem("isDeltaAutoTrader");
        let vTradeSide = localStorage.getItem("TradeSideSwtS");

        // console.log(vTradeSide);

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
    });

    socket.on("tv-btcusd-close", (pMsg) => {
        fnCloseManualFutures(pMsg.TransType);
    });
});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
		fnLoadDefSymbol();
		fnLoadDefExpiry();
		fnLoadDefDelta();
		fnLoadMarti();
		fnLoadMultiLeg();
		fnLoadDefQty();
		fnLoadLossRecoveryMultiplier();
		fnLoadCurrentTradePos();
		// // UNCOMMENT for LIVE TRADING in DEMO
		// fnSubscribe();
		// // fnGetHistoricalOHLC();
		// fnSubscribeInterval();
		// // UNCOMMENT for LIVE TRADING in DEMO
		fnUpdateOpenPositions();
		fnLoadSlTp();
		fnLoadTodayTrades();

		fnLoadTradeSide();
	}
}

function fnLoadDefSymbol(){
	let objDefSymM = JSON.parse(localStorage.getItem("DeltaSymbOSD"));
	let objSelSymb = document.getElementById("ddlSymbols");

	if(objDefSymM === null){
		objDefSymM = "";
	}

	objSelSymb.value = objDefSymM;
	fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
	let objLotSize = document.getElementById("txtLotSize");

	localStorage.setItem("DeltaSymbOSD", JSON.stringify(pThisVal));

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

function fnLoadDefExpiry(){
	let objExpiry = document.getElementById("txtExpDate");

	let vCurrDate = new Date();
	let vCurrHour = vCurrDate.getHours();

	// if(vCurrHour > 12 && vCurrHour <= 23){
	if(vCurrHour > 2){
		vCurrDate.setDate(vCurrDate.getDate() + 1);		
	}

    let vDay = (vCurrDate.getDate()).toString().padStart(2, "0");
    let vMonth = (vCurrDate.getMonth() + 1).toString().padStart(2, "0");
	let vExpValTB = vCurrDate.getFullYear() + "-" + vMonth + "-" + vDay;

	objExpiry.value = vExpValTB;
}

function fnLoadDefQty(){
	let objStartQtyM = JSON.parse(localStorage.getItem("StartQtyNoDeltaOSD"));
	let objQtyMul = JSON.parse(localStorage.getItem("OptQtyMulDeltaOSD"));

    let objQty = document.getElementById("txtQty");
    let objStartQty = document.getElementById("txtStartQty");

    if(objQtyMul === null || objQtyMul < 1 || objQtyMul < objStartQtyM){
	    if(objStartQtyM === null){
	    	objStartQty.value = 100;
	    	objQty.value = 100;
	    	localStorage.setItem("StartQtyNoDeltaOSD", objStartQty.value);
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

function fnLoadDefDelta(){
	let objDefDeltaM = JSON.parse(localStorage.getItem("DefOptDeltaOSD"));
	let objDelta = document.getElementById("txtSellDelta");

	if(objDefDeltaM === null){
		objDelta.value = 0.53;
	}
	else{
		objDelta.value = objDefDeltaM;
	}
}

function fnSetDefDelta(pThis){
	if(pThis.value === ""){
		pThis.value = 0.1;
		localStorage.setItem("DefOptDeltaOSD", JSON.stringify(0.1));
	}
	else{
		localStorage.setItem("DefOptDeltaOSD", JSON.stringify(pThis.value));
	}
}

function fnLoadLossRecoveryMultiplier(){
	let objLossRecM = JSON.parse(localStorage.getItem("LossRecMOSD"));
	let objProfitMultiX = JSON.parse(localStorage.getItem("MultiplierXOSD"));

	let objLossRecvPerctTxt = document.getElementById("txtLossRecvPerct");
	let objMultiplierXTxt = document.getElementById("txtMultiplierX");

	if(objLossRecM === null || objLossRecM === ""){
		objLossRecvPerctTxt.value = gLossRecPerct;
	}
	else{
		objLossRecvPerctTxt.value = localStorage.getItem("LossRecMOSD");
		gLossRecPerct = parseInt(localStorage.getItem("LossRecMOSD"));
	}

	if(objProfitMultiX === null || objProfitMultiX === ""){
		objMultiplierXTxt.value = gMultiplierX;
	}
	else{
		objMultiplierXTxt.value = localStorage.getItem("MultiplierXOSD");
		gMultiplierX = parseFloat(localStorage.getItem("MultiplierXOSD"));
	}
}

function fnUpdateLossRecPrct(pThisVal){
	localStorage.setItem("LossRecMOSD", pThisVal.value);
	gLossRecPerct = pThisVal.value;
}

function fnUpdateMultiplierX(pThisVal){
	localStorage.setItem("MultiplierXOSD", pThisVal.value);
	gMultiplierX = pThisVal.value;
}

function fnLoadMarti(){
    let vMartiM = JSON.parse(localStorage.getItem("DeltaOptMartiOSD"));
    let objSwtMarti = document.getElementById("swtMartingale");

    if(vMartiM){
    	objSwtMarti.checked = true;
    }
    else{
    	objSwtMarti.checked = false;
    }
}

function fnLoadMultiLeg(){
    let vMultiLegM = JSON.parse(localStorage.getItem("DeltaOptMultiLegOSD"));
    let objSwtMultiLeg = document.getElementById("swtMultiLeg");

    if(vMultiLegM){
    	objSwtMultiLeg.checked = true;
    }
    else{
    	objSwtMultiLeg.checked = false;
    }
}

function fnChangeStartQty(pThisVal){
    let objQty = document.getElementById("txtQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaOSD", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaOSD", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyNoDeltaOSD", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objQty.value = pThisVal.value;
            localStorage.setItem("OptQtyMulDeltaOSD", pThisVal.value);
        }
    }
}

function fnLoadCurrentTradePos(){
    let objCurrPos = JSON.parse(localStorage.getItem("DeltaCurrOptPosD"));

	gCurrPosOSD = objCurrPos;

    if(gCurrPosOSD === null){
        gCurrPosOSD = { TradeData : []};
    }
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
    let vUrl = "wss://socket.india.delta.exchange";
    objDeltaWS = new WebSocket(vUrl);

    objDeltaWS.onopen = function (){
        // let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": ["BTCUSD"] }]}};

        // objDeltaWS.send(JSON.stringify(vSendData));
        console.log("Conn Started......");

        fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
    }
    objDeltaWS.onclose = function (){
		let objSpotPrice = document.getElementById("txtSpotPrice");
		let objBestBuy = document.getElementById("txtBestBuyPrice");
		let objBestSell = document.getElementById("txtBestSellPrice");

		objDeltaWS = null;
		objSpotPrice.value = "";
		objBestBuy.value = "";
		objBestSell.value = "";

        console.log("Conn Closed....");
        fnGenMessage("Streaming Connection Closed!", `badge bg-danger`, "spnGenMsg");
    }
    objDeltaWS.onerror = function (){
        console.log("Conn Error");
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
				break;
			case "unsubscribed":

	            fnGenMessage("Streaming Unsubscribed!", `badge bg-warning`, "spnGenMsg");
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
	let objDdlSymbol = document.getElementById("ddlSymbols");

	if(objDeltaWS === null){
		fnConnectWS();
		// console.log("WS is looping to Connect.....");
		setTimeout(fnSubscribe, 3000);
	}
	else{
	    let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": [ objDdlSymbol.value + "USD" ] }]}};
		// console.log("Subscribing to Channel....");
	    objDeltaWS.send(JSON.stringify(vSendData));
	}
}

function fnUnsubscribe(){
	let objSpotPrice = document.getElementById("txtSpotPrice");
	let objBestBuy = document.getElementById("txtBestBuyPrice");
	let objBestSell = document.getElementById("txtBestSellPrice");

	if(objDeltaWS === null){
		// fnConnectWS();
		// console.log("WS Not Connected and looping again...");
		// setTimeout(fnUnsubscribe, 3000);
	    fnGenMessage("Already Streaming is Unsubscribed & Disconnected!", `badge bg-warning`, "spnGenMsg");
	}
	else{
	    let vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker" }]}};

	    objDeltaWS.send(JSON.stringify(vSendData));
	}
	objSpotPrice.value = "";
	objBestBuy.value = "";
	objBestSell.value = "";
}

function fnStartStrikeSub(){
	let objDdlSymbol = document.getElementById("ddlSymbols");
	let vSymbol = objDdlSymbol.value + "USD";

	if(objStrikeWS === null){
		fnConnectStrikeWS();
		// console.log("WS is looping to Connect.....");
		setTimeout(fnStartStrikeSub, 3000);
	}
	else{
	    let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": [ vSymbol ] }]}};
		// console.log("Subscribing to Channel....");
	    objStrikeWS.send(JSON.stringify(vSendData));
	}
}

function fnConnectStrikeWS(){
    let vUrl = "wss://socket.india.delta.exchange";
    objStrikeWS = new WebSocket(vUrl);

    objStrikeWS.onopen = function (){
	    console.log("Strike Conn Started......");
	    // fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
    }
    objStrikeWS.onclose = function (){
    	if(gManClsStrikeConn){
			let objStrikePrice = document.getElementById("txtStrikePrice");

			objStrikeWS = null;
			objStrikePrice.value = "";

	        fnGenMessage("Strike Streaming Connection Closed!", `badge bg-danger`, "spnGenMsg");
       	}
       	else{
       		fnStartStrikeSub();
       	}

        console.log("Strike Conn Closed....");
    }
    objStrikeWS.onerror = function (){
        console.log("Strike Conn has Error...");
    }
	objStrikeWS.onmessage = function (pMsg){
        let vTicData = JSON.parse(pMsg.data);

		// console.log(vTicData);
		switch (vTicData.type){
			case "v2/ticker":
				// console.log(vTicData);
				fnSetStrike(vTicData);
				break;
			case "subscriptions":
				console.log("Strike Streaming Subscribed and Started!");
	            // fnGenMessage("Strike Streaming Subscribed and Started!", `badge bg-success`, "spnGenMsg");
				break;
			case "unsubscribed":
				console.log("Strike Streaming Unsubscribed!");
	            // fnGenMessage("Streaming Unsubscribed!", `badge bg-warning`, "spnGenMsg");
				break;
		}
	}
}

function fnStopStrikeSub(){
	if(objStrikeWS !== null){
		gManClsStrikeConn = true;
		objStrikeWS.close();
	}
	else{
		console.log("There is no Open Strike WS Connection!")
	}
}

function fnSetStrike(pTicData){
	let vSpotPrice = pTicData.spot_price;
	// console.log(vSpotPrice);

	if(vSpotPrice !== ""){
		let objStrikePrice = document.getElementById("txtStrikePrice");

		let vTempVal = Math.round(parseInt(vSpotPrice) / 200) * 200;

		objStrikePrice.value = vTempVal;
	}
}

function fnGetRates(pTicData){
	let objSpotPrice = document.getElementById("txtSpotPrice");
	let objBestBuy = document.getElementById("txtBestBuyPrice");
	let objBestSell = document.getElementById("txtBestSellPrice");

	objSpotPrice.value = parseFloat(pTicData.mark_price).toFixed(2);
	objBestBuy.value = pTicData.quotes.best_ask;
	objBestSell.value = pTicData.quotes.best_bid;

	if(gCurrPosOSD.TradeData.length > 0){
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
    let isLsAutoTrader = localStorage.getItem("isDeltaAutoTrader");
    // let vTradeSide = localStorage.getItem("TradeSideSwtS");

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

		gCurrPosOSD.TradeData[0].SellPrice = gSellPrice;
		gCurrPosOSD.TradeData[0].Charges = gCharges;
		gCurrPosOSD.TradeData[0].ProfitLoss = gPL;

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

		gCurrPosOSD.TradeData[0].BuyPrice = gBuyPrice;
		gCurrPosOSD.TradeData[0].Charges = gCharges;
		gCurrPosOSD.TradeData[0].ProfitLoss = gPL;

		fnCheckSellSLTP(gBuyPrice);
	}
	else{
		fnGenMessage("No Open Position!", `badge bg-warning`, "spnGenMsg");
	}
}

function fnCheckBuySLTP(pCurrPrice){
    let vTotLossAmt = JSON.parse(localStorage.getItem("TotLossAmtDeltaOSD"));
    let vNewProfit = Math.abs(parseFloat(localStorage.getItem("TotLossAmtDeltaOSD")) * parseFloat(gMultiplierX));
	let objCounterSwt = document.getElementById("swtTradeCounter");
	let objBrkRec = document.getElementById("tdHeadBrkRec");

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

	if(pCurrPrice <= gAmtSL){
		// console.log("SL Hit");
		fnCloseManualFutures(gByorSl);
	}
	else if((parseFloat(vTotLossAmt) < 0) && (parseFloat(gPL) > parseFloat(vNewProfit)) && (parseInt(gQty) > 10)){
		// console.log("50 Profit Taken.............");
		fnClosePrctTrade();
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
	else if(pCurrPrice >= gAmtTP){
		// console.log("TP Hit");
		fnCloseManualFutures(gByorSl);
	}
	else{
		// console.log("Buy Trade is Still ON");
	}
}

function fnCheckSellSLTP(pCurrPrice){
    let vTotLossAmt = JSON.parse(localStorage.getItem("TotLossAmtDeltaOSD"));
    let vNewProfit = Math.abs(parseFloat(localStorage.getItem("TotLossAmtDeltaOSD")) * parseFloat(gMultiplierX));
	let objCounterSwt = document.getElementById("swtTradeCounter");
	let objBrkRec = document.getElementById("tdHeadBrkRec");

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

	if(pCurrPrice >= gAmtSL){
		// console.log("SL Hit");
		fnCloseManualFutures(gByorSl);
	}
	else if((parseFloat(vTotLossAmt) < 0) && (parseFloat(gPL) > parseFloat(vNewProfit)) && (parseInt(gQty) > 10)){
		// console.log("50 Profit Taken.............");
		fnClosePrctTrade();
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
	else if(pCurrPrice <= gAmtTP){
		// console.log("TP Hit");
		fnCloseManualFutures(gByorSl);
	}
	else{
		// console.log("Sell Trade is Still ON");
	}
}

function fnGetHistoricalOHLC(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ CandleMinutes : gHisCandleMins });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExcFut/getHistOHLC", requestOptions)
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
    let objCurrSlTp = JSON.parse(localStorage.getItem("DeltaCurrOptSlTpOSD"));
    let objTxtSL = document.getElementById("txtPercentSL");
    let objTxtTP = document.getElementById("txtPercentTP");

    if(objCurrSlTp === null){
    	let objSlTp = { PercentSL : 35, PercentTP : 100 };
    	localStorage.setItem("DeltaCurrOptSlTpOSD", JSON.stringify(objSlTp));
    	objTxtSL.value = 35;
    	objTxtTP.value = 100;
    }
    else{
    	objTxtSL.value = objCurrSlTp.PercentSL;
    	objTxtTP.value = objCurrSlTp.PercentTP;
    }
}

function fnUpdateSlTp(){
    let objTxtSL = document.getElementById("txtPercentSL");
    let objTxtTP = document.getElementById("txtPercentTP");

    let objSlTp = { PercentSL : objTxtSL.value, PercentTP : objTxtTP.value };
    localStorage.setItem("DeltaCurrOptSlTpOSD", JSON.stringify(objSlTp));

    fnGenMessage("Updated SL & TP!", `badge bg-success`, "spnGenMsg");    
}

async function fnInitiateManualFutures(pTransType){
    let objCurrPos = JSON.parse(localStorage.getItem("DeltaCurrOptPosD"));

    if (objCurrPos === null){
        let objBestRates = await fnGetFutBestRates();

        if(objBestRates.status === "success"){
            let vDate = new Date();
            let vOrdId = vDate.valueOf();
            let vMonth = vDate.getMonth() + 1;
            let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

		    let objFutDDL = document.getElementById("ddlSymbols");
		    let objQty = document.getElementById("txtQty");
		    let objLotSize = document.getElementById("txtLotSize");
		    let vSLPoints = parseFloat(document.getElementById("txtPercentSL").value);
		    let vTPPoints = parseFloat(document.getElementById("txtPercentTP").value);
		    let vBestBuy = parseFloat(objBestRates.data.BestBuy);
		    let vBestSell = parseFloat(objBestRates.data.BestSell);
			
			gByorSl = pTransType;

			if(gByorSl === "buy"){
                gAmtSL = (vBestBuy - vSLPoints).toFixed(2);
                gAmtTP = (vBestBuy + vTPPoints).toFixed(2);
			}
			else if(gByorSl === "sell"){
                gAmtSL = (vBestBuy + vSLPoints).toFixed(2);
                gAmtTP = (vBestBuy - vTPPoints).toFixed(2);
			}
			else{
				gAmtSL = 0;
				gAmtTP = 0;				
			}

            let vExcTradeDtls = { TradeData: [{ OrderID : vOrdId, OpenDT : vToday, FutSymbol : objFutDDL.value, TransType : pTransType, LotSize : objLotSize.value, Qty : objQty.value, BuyPrice : vBestBuy, SellPrice : vBestSell, AmtSL : gAmtSL, AmtTP : gAmtTP, StopLossPts: vSLPoints, TakeProfitPts : vTPPoints, OpenDTVal : vOrdId }] };
            let objExcTradeDtls = JSON.stringify(vExcTradeDtls);
            gCurrPosOSD = vExcTradeDtls;

            localStorage.setItem("DeltaCurrOptPosD", objExcTradeDtls);
			localStorage.setItem("OptQtyMulDeltaOSD", objQty.value);

            fnSetInitFutTrdDtls();

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

async function fnInitManualSellOpt(pOptType){
	let objSymbol = document.getElementById("ddlSymbols");
	let objLotSize = document.getElementById("txtLotSize");
	let objQty = document.getElementById("txtQty");
	let objExpiry = document.getElementById("txtExpDate");
	let objSellDelta = document.getElementById("txtSellDelta");
    let objSwtMultiLeg = document.getElementById("swtMultiLeg");
    let isMultiLegAllowed = false;

    if(objSwtMultiLeg.checked){
    	isMultiLegAllowed = true;
    }

	if(objSymbol.value === ""){
        fnGenMessage("Select Symbol to Start Trade!", `badge bg-warning`, "spnGenMsg");		
	}
	else if(objQty.value === "" || parseInt(objQty.value) < 1){
        fnGenMessage("Input Quantity to Start Trade!", `badge bg-warning`, "spnGenMsg");		
	}
	else if(objExpiry.value === ""){
        fnGenMessage("Input or Select Expiry to Start Trade!", `badge bg-warning`, "spnGenMsg");		
	}
	else if(objSellDelta.value === ""){
        fnGenMessage("Input Delta value to Start Trade!", `badge bg-warning`, "spnGenMsg");		
	}
	else{
		if(((gCurrPosOSD.TradeData.length === 0) && (isMultiLegAllowed === false)) || (isMultiLegAllowed)){
			let vSelDate = new Date(objExpiry.value);
		    let vExDay = (vSelDate.getDate()).toString().padStart(2, "0");
		    let vExMonth = (vSelDate.getMonth() + 1).toString().padStart(2, "0");
		    let vExYear = vSelDate.getFullYear();
		    // vExYear = ((vExYear).toString()).slice(2);
			let vExpValTB = vExDay + "-" + vExMonth + "-" + vExYear;
			let vContractType = "";

		    if(pOptType === "C"){
		        vContractType = "call_options";
		    }
		    else if(pOptType === "P"){
		        vContractType = "put_options";
		    }
		    else{
		        vContractType = "";
		    }

	        let objTradeDtls = await fnGetExecutedTrdDtls(pOptType, objSymbol.value, vExpValTB, objQty.value, objSellDelta.value, vContractType);
	        if(objTradeDtls.status === "success"){
	            let vDate = new Date();
	            let vOrdId = vDate.valueOf();
	            let vClientOrderID = vDate.valueOf();
	            let vMonth = vDate.getMonth() + 1;
	            let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
			    let objLotSize = document.getElementById("txtLotSize");
			    let vSLPercent = parseFloat(document.getElementById("txtPercentSL").value);
			    let vTPPercent = parseFloat(document.getElementById("txtPercentTP").value);
			    let vProductID = objTradeDtls.data.ProductID;
			    let vSymbol = objTradeDtls.data.Symbol;
				let vTransType = "sell";
				let vUndrAstSymb = objTradeDtls.data.UndrAsstSymb;
				let vCntrctType = objTradeDtls.data.ContType;
			    let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
			    let vBestSell = parseFloat(objTradeDtls.data.BestBid);
	            let vDelta = parseFloat(objTradeDtls.data.Delta);
	            let vVega = parseFloat(objTradeDtls.data.Vega);

			    let vSLPoints = (vBestSell * vSLPercent)/100;
			    let vTPPoints = (vBestSell * vTPPercent)/100;

	            let vAmtSL = (vBestSell + vSLPoints).toFixed(2);
	            let vAmtTP = (vBestSell - vTPPoints).toFixed(2);

	            let vExcTradeDtls = { OrderID : vOrdId, ClientOrderID : vClientOrderID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vTransType, OptionType : pOptType, LotSize : parseFloat(objLotSize.value), Qty : parseInt(objQty.value), BuyPrice : vBestBuy, SellPrice : vBestSell, AmtSL : parseFloat(vAmtSL), AmtTP : parseFloat(vAmtTP), PointsSL: vSLPoints, PointsTP : vTPPoints, Delta : vDelta, Vega : vVega, OpenDTVal : vClientOrderID, Status : "OPEN" };
		            gCurrPosOSD.TradeData.push(vExcTradeDtls);
		            let objExcTradeDtls = JSON.stringify(gCurrPosOSD);

		            localStorage.setItem("DeltaCurrOptPosD", objExcTradeDtls);
					localStorage.setItem("OptQtyMulDeltaOSD", objQty.value);

	        	    fnUpdateOpenPositions();

	            fnGenMessage(objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
	        }
	        else{
	            fnGenMessage(objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
	        }
		}
		else{
	        fnGenMessage("Multi Leg Position Switch is Off!", `badge bg-warning`, "spnGenMsg");
		}
	}
}

function fnUpdateOpenPositions(){
	console.log(gCurrPosOSD);
}

function fnGetExecutedTrdDtls(pOptType, pSymbol, pExpiry, pQty, pSellDelta, pContractType){
	const objPromise = new Promise((resolve, reject) => {

	    let objApiKey = document.getElementById("txtUserAPIKey");
	    let objApiSecret = document.getElementById("txtAPISecret");

	    let vHeaders = new Headers();
	    vHeaders.append("Content-Type", "application/json");

	    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, OptType : pOptType, Symbol : pSymbol, Expiry : pExpiry, Qty : pQty, SellDelta : pSellDelta, ContractType : pContractType });

	    let requestOptions = {
	        method: 'POST',
	        headers: vHeaders,
	        body: vAction,
	        redirect: 'follow'
	    };

	    fetch("/deltaExcOptSclprD/getSellOptOpenStatus", requestOptions)
	    .then(response => response.json())
	    .then(objResult => {

	        if(objResult.status === "success"){
	        	// let vRes = JSON.parse(objResult.data);

	            // let objData = { BestBuy : vRes.result.quotes.best_ask, BestSell : vRes.result.quotes.best_bid }

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
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

    console.log(gCurrPosOSD);

	if(gCurrPosOSD.TradeData.length > 0){
        gOrderDT = gCurrPosOSD.TradeData[0].OrderID;

	    let vDate = new Date();
	    let vCurrDT = vDate.valueOf();
	    let vTimeDiff = ((vCurrDT - gOrderDT)/60000) + 0.15;

		if(vTimeDiff < parseInt(objTrdExitTime.value))
		fnInnitiateTimer(parseInt(objTrdExitTime.value) - vTimeDiff);

		gBuyPrice = parseFloat(gCurrPosOSD.TradeData[0].BuyPrice).toFixed(2);
		gSellPrice = parseFloat(gCurrPosOSD.TradeData[0].SellPrice).toFixed(2);
		gLotSize = parseFloat(gCurrPosOSD.TradeData[0].LotSize);
		gQty = parseFloat(gCurrPosOSD.TradeData[0].Qty);
        gByorSl = gCurrPosOSD.TradeData[0].TransType;
		gAmtSL = gCurrPosOSD.TradeData[0].AmtSL;
		gAmtTP = gCurrPosOSD.TradeData[0].AmtTP;

		objDateTime.innerText = gCurrPosOSD.TradeData[0].OpenDT;
		objSymbol.innerText = gCurrPosOSD.TradeData[0].FutSymbol;
		objTransType.innerText = gCurrPosOSD.TradeData[0].TransType;
		objLotSize.innerText = gLotSize;
		objQty.innerText = gQty;
		gCapital = fnGetTradeCapital(gByorSl, gBuyPrice, gSellPrice, gLotSize, gQty);
		objCapital.innerText = (gCapital).toFixed(2);
		gCharges = fnGetTradeCharges(gOrderDT, vCurrDT, gLotSize, gQty, gBuyPrice, gSellPrice, gByorSl);
		objCharges.innerText = (gCharges).toFixed(3);
		let vPL = fnGetTradePL(gSellPrice, gBuyPrice, gLotSize, gQty, gCharges);
		objProfitLoss.innerText = (vPL).toFixed(2);

		if(gCurrPosOSD.TradeData[0].TransType === "buy"){
			objBuyPrice.innerHTML = gBuyPrice;
			objSellPrice.innerHTML = "<span class='blink'>" + gSellPrice + "</span>";
		}
		else if(gCurrPosOSD.TradeData[0].TransType === "sell"){
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
    	
		if(gCurrPosOSD.TradeData.length > 0){
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

	    let objFutDDL = document.getElementById("ddlSymbols");

	    let vHeaders = new Headers();
	    vHeaders.append("Content-Type", "application/json");

	    let vAction = JSON.stringify({ Symbol : objFutDDL.value });

	    let requestOptions = {
	        method: 'POST',
	        headers: vHeaders,
	        body: vAction,
	        redirect: 'follow'
	    };

	    fetch("/deltaExcFut/getCurrBSRates", requestOptions)
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
	if(gCurrPosOSD.TradeData.length === 0){
        fnGenMessage("No Open Position to Close!", `badge bg-warning`, "spnGenMsg");		
	}
	else if(gCurrPosOSD.TradeData[0].TransType !== pTransType){
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

    if(gCurrPosOSD.TradeData[0].Qty >= 2){
        objBtn50Prct.disabled = false;
    }
    else{
        objBtn50Prct.disabled = true;
    }
}

async function fnClosePrctTrade(){
    try{
        if (gCurrPosOSD.TradeData.length === 0){
            fnGenMessage("No Open Positions to Close 50% Qty!", `badge bg-warning`, "spnGenMsg");
        }
        else{
            let vPrctQty2Rec = (Math.round(parseInt(gCurrPosOSD.TradeData[0].Qty) * parseFloat(gLossRecPerct)) / 100);
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
    let vToCntuQty = parseInt(gCurrPosOSD.TradeData[0].Qty) - parseInt(pQty);

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

	    gCurrPosOSD.TradeData[0].CloseDT = vToday;

	    if(gByorSl === "buy"){
	    	gCurrPosOSD.TradeData[0].SellPrice = vBestSell;
	    }
	    else if(gByorSl === "sell"){
	    	gCurrPosOSD.TradeData[0].BuyPrice = vBestBuy;
	    }

	    gCurrPosOSD.TradeData[0].CloseDTVal = vDate.valueOf();

	    if(pQty !== 0){
		    gCurrPosOSD.TradeData[0].Qty = pQty;
		    let vCapital = fnGetTradeCapital(gByorSl, gCurrPosOSD.TradeData[0].BuyPrice, gCurrPosOSD.TradeData[0].SellPrice, gCurrPosOSD.TradeData[0].LotSize, pQty);
		    gCurrPosOSD.TradeData[0].Capital = vCapital;
		    let vCharges = fnGetTradeCharges(gCurrPosOSD.TradeData[0].OrderID, vDate.valueOf(), gCurrPosOSD.TradeData[0].LotSize, pQty, gCurrPosOSD.TradeData[0].BuyPrice, gCurrPosOSD.TradeData[0].SellPrice, gByorSl);
		    gCurrPosOSD.TradeData[0].Charges = vCharges;
		    let vTradePL = fnGetTradePL(gCurrPosOSD.TradeData[0].SellPrice, gCurrPosOSD.TradeData[0].BuyPrice, gCurrPosOSD.TradeData[0].LotSize, pQty, vCharges);
		    gCurrPosOSD.TradeData[0].ProfitLoss = vTradePL;

	        gOldPLAmt = JSON.parse(localStorage.getItem("TotLossAmtDeltaOSD"));
	        gNewPLAmt = vTradePL;
	    	let vTotNewPL = gOldPLAmt + gNewPLAmt;
	    	localStorage.setItem("OldPLAmtDeltaOSD", gOldPLAmt);
	    	localStorage.setItem("NewPLAmtDeltaOSD", gNewPLAmt);
	    	localStorage.setItem("TotLossAmtDeltaOSD", vTotNewPL);
	    }
	    else{
	    	gOldPLAmt = JSON.parse(localStorage.getItem("TotLossAmtDeltaOSD"));
	    	gNewPLAmt = gPL;
	    	let vTotNewPL = gOldPLAmt + gNewPLAmt;
	    	localStorage.setItem("OldPLAmtDeltaOSD", gOldPLAmt);
	    	localStorage.setItem("NewPLAmtDeltaOSD", gNewPLAmt);
	    	localStorage.setItem("TotLossAmtDeltaOSD", vTotNewPL);
	    }
	}
	else{

	}
	const objClsTrd = new Promise((resolve, reject) => {
	    let objTodayTrades = JSON.parse(localStorage.getItem("TrdBkFutOSD"));

	    if(objTodayTrades === null){
	        localStorage.setItem("TrdBkFutOSD", JSON.stringify(gCurrPosOSD));
	    }
	    else{
	        let vExistingData = objTodayTrades;
	        vExistingData.TradeData.push(gCurrPosOSD.TradeData[0]);
	        localStorage.setItem("TrdBkFutOSD", JSON.stringify(vExistingData));
	    }

	    if(pQty === 0){
		    localStorage.removeItem("DeltaCurrOptPosD");
		    gCurrPosOSD = { TradeData : []};
            fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
	    }
	    else{
	    	if(vToCntuQty === 0){
			    localStorage.removeItem("DeltaCurrOptPosD");

			    gCurrPosOSD = { TradeData : []};
	    	}
	    	else{
	            gCurrPosOSD.TradeData[0].Qty = vToCntuQty;
	            localStorage.setItem("DeltaCurrOptPosD", JSON.stringify(gCurrPosOSD));	    	
	    	}
	    }

	    fnSetNextOptTradeSettings();

        document.getElementById("spnLossTrd").className = "badge rounded-pill text-bg-danger";

	    // fnGenMessage("Trade Closed", `badge bg-success`, "spnGenMsg");
        resolve({ "status": "success", "message": "Future Paper Trade Closed Successfully!", "data": "" });
    });
    clearInterval(gTimerID);

    return objClsTrd;
}

function fnSetNextOptTradeSettings(){
    let objQty = document.getElementById("txtQty");
    let vOldLossAmt = localStorage.getItem("OldPLAmtDeltaOSD");
	let vNewLossAmt = localStorage.getItem("NewPLAmtDeltaOSD");
	let vTotLossAmt = localStorage.getItem("TotLossAmtDeltaOSD");

    let vOldQtyMul = JSON.parse(localStorage.getItem("OptQtyMulDeltaOSD"));
    let vStartLots = JSON.parse(localStorage.getItem("StartQtyNoDeltaOSD"));
    let objSwtMarti = document.getElementById("swtMartingale");

    if(objSwtMarti.checked){
		if(parseFloat(vNewLossAmt) < 0){
	        let vNextQty = parseInt(vOldQtyMul) * 2;
	        localStorage.setItem("OptQtyMulDeltaOSD", vNextQty);
	        objQty.value = vNextQty;
		}
		else if(parseFloat(vTotLossAmt) < 0){
	        let vDivAmt = parseFloat(vTotLossAmt) / parseFloat(vOldLossAmt);
	        let vNextQty = Math.round(vDivAmt * parseInt(vOldQtyMul));

	        if(vNextQty < vStartLots)
	        vNextQty += vStartLots;

	        localStorage.setItem("OptQtyMulDeltaOSD", vNextQty);
	        objQty.value = vNextQty;
		}
	    else {
	        localStorage.setItem("TotLossAmtDeltaOSD", 0);
	        localStorage.removeItem("OptQtyMulDeltaOSD");
	        // localStorage.setItem("TradeStep", 0);
	        fnSetLotsByQtyMulLossAmt();
	    }
    }
    else{
    	if(parseFloat(vTotLossAmt) > 0){
			localStorage.setItem("TotLossAmtDeltaOSD", 0);
    	}
    	
        fnSetLotsByQtyMulLossAmt();
    }

	// console.log(gCharges);

	if(gPL > 0){
		let vBalLossAmt = localStorage.getItem("TotLossAmtDeltaOSD");
		let vNewTarget = parseFloat(vBalLossAmt) - parseFloat(gCharges);
		localStorage.setItem("TotLossAmtDeltaOSD", vNewTarget);
		// console.log("ADD Brokerage");
	}
	// console.log(localStorage.getItem("TotLossAmtDeltaOSD"))
}

function fnChangeMartingale(){
    // let vMartiM = JSON.parse(localStorage.getItem("DeltaOptMartiOSD"));
    let objSwtMarti = document.getElementById("swtMartingale");

    localStorage.setItem("DeltaOptMartiOSD", JSON.stringify(objSwtMarti.checked));
    // alert(objSwtMarti.checked);
}

function fnChangeMultiLeg(){
    let objSwtMultiLeg = document.getElementById("swtMultiLeg");

    localStorage.setItem("DeltaOptMultiLegOSD", JSON.stringify(objSwtMultiLeg.checked));
}

function fnSetLotsByQtyMulLossAmt(){
    let vStartLots = JSON.parse(localStorage.getItem("StartQtyNoDeltaOSD"));
    let vQtyMul = JSON.parse(localStorage.getItem("OptQtyMulDeltaOSD"));
    let objOptQty = document.getElementById("txtQty");
    let vTotLossAmt = JSON.parse(localStorage.getItem("TotLossAmtDeltaOSD"));
    
    if (vQtyMul === null || vQtyMul === "") {
        localStorage.setItem("OptQtyMulDeltaOSD", vStartLots);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
    
    if (vTotLossAmt === null || vTotLossAmt === "" || vTotLossAmt === 0) {
        localStorage.setItem("OptQtyMulDeltaOSD", vStartLots);
        localStorage.setItem("TotLossAmtDeltaOSD", 0);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
}

function fnLoadTodayTrades(){
    let objTodayTradeList = document.getElementById("tBodyTodayPaperTrades");
   	let objTradeBook = JSON.parse(localStorage.getItem("TrdBkFutOSD"));
    let objHeadPL = document.getElementById("tdHeadPL");
    let objYtRL = document.getElementById("spnYtRL");
    
    if (objTradeBook == null) {
        objTodayTradeList.innerHTML = '<div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Trades Yet</div>';
    }
    else{
        let vTempHtml = "";
        let vTotalTrades = 0;
        let vNetProfit = 0;
        let vTotalCharges = 0;
        let vHighCapital = 0;

		for (let i = 0; i < objTradeBook.TradeData.length; i++){
			let vCharges = fnGetTradeCharges(objTradeBook.TradeData[i].OpenDTVal, objTradeBook.TradeData[i].CloseDTVal, objTradeBook.TradeData[i].LotSize, objTradeBook.TradeData[i].Qty, objTradeBook.TradeData[i].BuyPrice, objTradeBook.TradeData[i].SellPrice, objTradeBook.TradeData[i].TransType);
    		let vCapital = fnGetTradeCapital(objTradeBook.TradeData[i].TransType, objTradeBook.TradeData[i].BuyPrice, objTradeBook.TradeData[i].SellPrice, objTradeBook.TradeData[i].LotSize, objTradeBook.TradeData[i].Qty);
    		let vPL = fnGetTradePL(objTradeBook.TradeData[i].SellPrice, objTradeBook.TradeData[i].BuyPrice, objTradeBook.TradeData[i].LotSize, objTradeBook.TradeData[i].Qty, vCharges);
            vTotalTrades += 1;
            vTotalCharges += parseFloat(vCharges);
            vNetProfit += vPL;

	        if(parseFloat(vCapital) > vHighCapital){
	            vHighCapital = vCapital;
	        }

            vTempHtml += '<tr>';
            vTempHtml += '<td style="text-wrap: nowrap;" onclick=\'fnDeleteThisTrade(' + objTradeBook.TradeData[i].OrderID + ');\'>' + objTradeBook.TradeData[i].OpenDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + objTradeBook.TradeData[i].CloseDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + objTradeBook.TradeData[i].FutSymbol + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + objTradeBook.TradeData[i].TransType + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + objTradeBook.TradeData[i].LotSize + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + objTradeBook.TradeData[i].Qty + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + (parseFloat(objTradeBook.TradeData[i].BuyPrice)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (parseFloat(objTradeBook.TradeData[i].SellPrice)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:orange;text-align:right;">' + (parseFloat(vCapital)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:orange;text-align:right;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">'+ (vPL).toFixed(2) +'</td>';

            vTempHtml += '</tr>';
		}    	
		vTempHtml += '<tr><td>Total Trades </td><td>' + vTotalTrades + '</td><td colspan="3"></td><td colspan="3""></td><td style="font-weight:bold;text-align:right;">' + (vHighCapital).toFixed(2) + '</td><td style="font-weight:bold;text-align:right;color:red;">' + (vTotalCharges).toFixed(2) + '</td><td style="font-weight:bold;text-align:right;">' + (vNetProfit).toFixed(2) + '</td></tr>';

        objTodayTradeList.innerHTML = vTempHtml;

        if(vNetProfit < 0){
            objHeadPL.innerHTML = '<span Style="text-align:left;font-weight:bold;color:red;">' + (vNetProfit).toFixed(2) + '</span>';
        }
        else{
            objHeadPL.innerHTML = '<span Style="text-align:left;font-weight:bold;color:green;">' + (vNetProfit).toFixed(2) + '</span>';
        }
        objYtRL.innerText = parseFloat(localStorage.getItem("TotLossAmtDeltaOSD")).toFixed(2);
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
    localStorage.removeItem("DeltaCurrOptPosD");
	localStorage.removeItem("TrdBkFutOSD");
	localStorage.removeItem("StartQtyNoDeltaOSD");
	localStorage.removeItem("DeltaOptMartiOSD");
	localStorage.removeItem("DeltaOptMultiLegOSD");
	localStorage.setItem("OptQtyMulDeltaOSD", 0);
	localStorage.setItem("TotLossAmtDeltaOSD", 0);
    localStorage.removeItem("LossRecMOSD");
	localStorage.removeItem("MultiplierXOSD");
	localStorage.removeItem("DeltaCurrOptSlTpOSD");
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

function fnTest(pCorP){
	let objSelSymb = document.getElementById("ddlSymbols");
	let objStrikePrice = document.getElementById("txtStrikePrice");
	let objExpiry = document.getElementById("txtExpDate");

	let vSelDate = new Date(objExpiry.value);
    let vDay = (vSelDate.getDate()).toString().padStart(2, "0");
    let vMonth = (vSelDate.getMonth() + 1).toString().padStart(2, "0");
    let vYear = vSelDate.getFullYear();
    vYear = ((vYear).toString()).slice(2);
    
	let vExpValTB = vDay + vMonth + vYear;


	console.log(pCorP + "-" + objSelSymb.value + "-" + objStrikePrice.value + "-" + vExpValTB);
}

function fnPositionStatus(){
    let objBtnPosition = document.getElementById("btnPositionStatus");

    if(localStorage.getItem("DeltaCurrOptPosD") === null)
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

    localStorage.setItem("TradeSideSwtS", objTradeSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("TradeSideSwtS") === null){
        localStorage.setItem("TradeSideSwtS", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("TradeSideSwtS");
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
    let objFutDDL = document.getElementById("ddlSymbols");
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

    fetch("/deltaExcFut/placeLimitOrder", requestOptions)
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