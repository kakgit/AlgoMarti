
let objDeltaWR = null;
let gByorSl = "";
let gCurrPos = null;
let gCurrPosR = { TradeData : []};
let gBuyPrice, gSellPrice, gLotSize, gQty, gAmtSL, gAmtTP, gCharges, gCapital, gOrderDT = 0;
let gBrokerage = 0.02;
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
// let gSubInterval = 0;
let gManualSubIntvl = 0;
let gManCloseWSCon = false;
let gOpenOrdrCounter = 0;

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
        let isLsAutoTrader = localStorage.getItem("isDeltaAutoTraderR");
        let vTradeSide = localStorage.getItem("TradeSideSwtR");

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
		// fnValidateDeltaLogin();
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
		fnLoadDefSymbol();
		fnLoadMarti();
		fnLoadDefQty();
		fnLoadLossRecoveryMultiplier();
		fnLoadCurrentTradePos();
		fnCheckOpenStatePos();

		// // UNCOMMENT for LIVE TRADING in LIVE
		// fnSubscribe();
		// // fnGetHistoricalOHLC();
		// // fnSubscribeInterval();
		// // UNCOMMENT for LIVE TRADING in LIVE
		fnSetInitFutTrdDtls();
		fnLoadSlTp();
		fnLoadTodayTrades();
		fnLoadTradeCounter();

		fnLoadTradeSide();
	}
}

function fnLoadDefSymbol(){
	let objDefSymM = JSON.parse(localStorage.getItem("DeltaDefSymbFutR"));
	let objSelSymb = document.getElementById("ddlFuturesSymbols");

	if(objDefSymM === null){
		objDefSymM = "";
	}

	objSelSymb.value = objDefSymM;
	fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
	let objLotSize = document.getElementById("txtLotSize");

	localStorage.setItem("DeltaDefSymbFutR", JSON.stringify(pThisVal));

	if(pThisVal === "BTCUSD"){
		objLotSize.value = 0.001;
	}
	else if(pThisVal === "ETHUSD"){
		objLotSize.value = 0.01;
	}
	else if(pThisVal === "XRPUSD"){
		objLotSize.value = 1;
	}
	else{
		objLotSize.value = 0;
	}
}

function fnLoadDefQty(){
	let objStartQtyM = JSON.parse(localStorage.getItem("StartQtyNoDeltaR"));
	let objQtyMul = JSON.parse(localStorage.getItem("QtyMulDeltaR"));

    let objQty = document.getElementById("txtFuturesQty");
    let objStartQty = document.getElementById("txtStartQty");

    if(objQtyMul === null || objQtyMul < 1 || objQtyMul < objStartQtyM){
	    if(objStartQtyM === null){
	    	objStartQty.value = 1;
	    	objQty.value = 1;
	    	localStorage.setItem("StartQtyNoDeltaR", objStartQty.value);
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
	let objLossRecM = JSON.parse(localStorage.getItem("LossRecMR"));
	let objProfitMultiX = JSON.parse(localStorage.getItem("MultiplierXR"));

	let objLossRecvPerctTxt = document.getElementById("txtLossRecvPerct");
	let objMultiplierXTxt = document.getElementById("txtMultiplierX");

	if(objLossRecM === null || objLossRecM === ""){
		objLossRecvPerctTxt.value = gLossRecPerct;
	}
	else{
		objLossRecvPerctTxt.value = localStorage.getItem("LossRecMR");
		gLossRecPerct = parseInt(localStorage.getItem("LossRecMR"));
	}

	if(objProfitMultiX === null || objProfitMultiX === ""){
		objMultiplierXTxt.value = gMultiplierX;
	}
	else{
		objMultiplierXTxt.value = localStorage.getItem("MultiplierXR");
		gMultiplierX = parseFloat(localStorage.getItem("MultiplierXR"));
	}
}

function fnUpdateLossRecPrct(pThisVal){
	localStorage.setItem("LossRecMR", pThisVal.value);
	gLossRecPerct = pThisVal.value;
}

function fnUpdateMultiplierX(pThisVal){
	localStorage.setItem("MultiplierXR", pThisVal.value);
	gMultiplierX = pThisVal.value;
}

function fnLoadTradeCounter(){
	let objCounterSwtM = JSON.parse(localStorage.getItem("CounterSwtDeltaR"));
	let objCounterSwt = document.getElementById("swtTradeCounter");

	if(objCounterSwtM){
		objCounterSwt.checked = true;
	}
	else{
		objCounterSwt.checked = false;
	}
}

function fnLoadMarti(){
    let vMartiM = JSON.parse(localStorage.getItem("DeltaFutMartiR"));
    let objSwtMarti = document.getElementById("swtMartingale");

    if(vMartiM){
    	objSwtMarti.checked = true;
    }
    else{
    	objSwtMarti.checked = false;
    }
}

function fnUpdateTrdSwtCounter(){
	let objCounterSwt = document.getElementById("swtTradeCounter");

	if(objCounterSwt.checked){
		localStorage.setItem("CounterSwtDeltaR", true);
	}
	else{
		localStorage.setItem("CounterSwtDeltaR", false);
	}
}

function fnChangeStartQty(pThisVal){
    let objQty = document.getElementById("txtFuturesQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaR", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaR", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyNoDeltaR", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objQty.value = pThisVal.value;
            localStorage.setItem("QtyMulDeltaR", pThisVal.value);
        }
    }
}

function fnLoadCurrentTradePos(){
    let objCurrPos = JSON.parse(localStorage.getItem("DeltaCurrFutPosiSR"));

	gCurrPos = objCurrPos;
	gCurrPosR = objCurrPos;

    if(gCurrPosR === null){
        gCurrPosR = { TradeData : []};
    }
}

function fnCloseWS(){
	if(objDeltaWR !== null){
		gManCloseWSCon = true;
		objDeltaWR.close();
	}
	else{
		console.log("There is no Open WS Connection!")
	}
}

function fnConnectWS(){
    let vUrl = "wss://socket.india.delta.exchange";
    objDeltaWR = new WebSocket(vUrl);

    objDeltaWR.onopen = function (){
        console.log("Conn Started......");

        fnGenMessage("Streaming Connection is Open!", `badge bg-success`, "spnGenMsg");
    }
    objDeltaWR.onclose = function (){
    	if(gManCloseWSCon){
			let objSpotPrice = document.getElementById("txtSpotPrice");
			let objBestBuy = document.getElementById("txtBestBuyPrice");
			let objBestSell = document.getElementById("txtBestSellPrice");

			objDeltaWR = null;
			objSpotPrice.value = "";
			objBestBuy.value = "";
			objBestSell.value = "";

	        console.log("Conn Closed....");
	        fnGenMessage("Streaming Connection Closed!", `badge bg-danger`, "spnGenMsg");
       	}
       	else{
       		fnSubscribe();
       	}
    }
    objDeltaWR.onerror = function (){
        console.log("Conn Error");
    }
	objDeltaWR.onmessage = function (pMsg){
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
	gSubInterval = setInterval(fnSubscribe, 60000);
	// setInterval(fnGetHistoricalOHLC, 60000);
}

function fnSubscribe(){
	let objDdlSymbol = document.getElementById("ddlFuturesSymbols");

	if(objDdlSymbol.value === ""){
		fnGenMessage("Select Symbol and Start Streaming!", `badge bg-danger`, "spnGenMsg");
	}
	else{
		if(objDeltaWR === null){
			fnConnectWS();
			console.log("WS is looping to Connect.....");
			setTimeout(fnSubscribe, 5000);
		}
		else{
		    let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": [ objDdlSymbol.value ] }]}};
			// console.log("Subscribing to Channel....");
		    objDeltaWR.send(JSON.stringify(vSendData));
		}
	}
}

function fnUnsubscribe(){
	let objSpotPrice = document.getElementById("txtSpotPrice");
	let objBestBuy = document.getElementById("txtBestBuyPrice");
	let objBestSell = document.getElementById("txtBestSellPrice");

	if(objDeltaWR === null){
	    fnGenMessage("Already Streaming is Unsubscribed & Disconnected!", `badge bg-warning`, "spnGenMsg");
	}
	else{
	    let vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker" }]}};

	    objDeltaWR.send(JSON.stringify(vSendData));
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
    let isLsAutoTrader = localStorage.getItem("isDeltaAutoTraderR");
    // let vTradeSide = localStorage.getItem("TradeSideSwtR");

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

function fnCheckBuySLTP(pCurrPrice){
    let vTotLossAmt = JSON.parse(localStorage.getItem("TotLossAmtDeltaR"));
    let vNewProfit = Math.abs(parseFloat(localStorage.getItem("TotLossAmtDeltaR")) * parseFloat(gMultiplierX));
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
    let vTotLossAmt = JSON.parse(localStorage.getItem("TotLossAmtDeltaR"));
    let vNewProfit = Math.abs(parseFloat(localStorage.getItem("TotLossAmtDeltaR")) * parseFloat(gMultiplierX));
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
    let objCurrSlTp = JSON.parse(localStorage.getItem("DeltaCurrFutSlTpR"));
    let objTxtSL = document.getElementById("txtPointsSL");
    let objTxtTP = document.getElementById("txtPointsTP");

    if(objCurrSlTp === null){
    	let objSlTp = { PointSL : 100, PointTP : 300 };
    	localStorage.setItem("DeltaCurrFutSlTpR", JSON.stringify(objSlTp));
    	objTxtSL.value = 100;
    	objTxtTP.value = 300;
    }
    else{
    	objTxtSL.value = objCurrSlTp.PointSL;
    	objTxtTP.value = objCurrSlTp.PointTP;
    }
}

function fnUpdateSlTp(){
    let objTxtSL = document.getElementById("txtPointsSL");
    let objTxtTP = document.getElementById("txtPointsTP");

    let objSlTp = { PointSL : objTxtSL.value, PointTP : objTxtTP.value };
    localStorage.setItem("DeltaCurrFutSlTpR", JSON.stringify(objSlTp));

    fnGenMessage("Updated SL & TP!", `badge bg-success`, "spnGenMsg");    
}

async function fnInitRealFuturesTrade(pTransType){
	if(gCurrPosR.TradeData.length === 0){
	    let objFutDDL = document.getElementById("ddlFuturesSymbols");
	    let objQty = document.getElementById("txtFuturesQty");
	    let objLotSize = document.getElementById("txtLotSize");
	    let objOrderTypeDDL = document.getElementById("ddlOrderType");

	    if(objFutDDL.value === ""){
			fnGenMessage("Please Select Symbol to Place the Order!", `badge bg-warning`, "spnGenMsg");
	    }
	    else if(objQty.value === "" || parseInt(objQty.value) < 1){
			fnGenMessage("Please Input Quantity to Place the Order!", `badge bg-warning`, "spnGenMsg");
	    }
	    else if(objLotSize.value === "" || parseFloat(objLotSize.value) <= 0){
			fnGenMessage("Please Input Lot Size to Place the Order!", `badge bg-warning`, "spnGenMsg");
	    }
	    else{
            let vDate = new Date();
            let vClientOrdID = vDate.valueOf();

	        let objOrder = await fnPlaceRealOrder(vClientOrdID, objFutDDL.value, objOrderTypeDDL.value, objQty.value, pTransType);

	        if(objOrder.status === "success"){
			    console.log(objOrder);
			    let vOrdId = objOrder.data.result.id;
	            let vMonth = vDate.getMonth() + 1;
	            let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

	   		    let vSLPoints = parseFloat(document.getElementById("txtPointsSL").value);
			    let vTPPoints = parseFloat(document.getElementById("txtPointsTP").value);
			    let vState = objOrder.data.result.state;
			    let vOrderType = objOrder.data.result.order_type;
			    let vBestBuy = 0;
			    let vBestSell = 0;
			    let vBuyCommission = 0;
			    let vSellCommission = 0;
			    let vProductID = objOrder.data.result.product_id;
				gByorSl = pTransType;

				if(vState === "closed"){
				    vBestBuy = parseFloat(objOrder.data.result.average_fill_price);
				    vBestSell = parseFloat(objOrder.data.result.average_fill_price);
				}
				else{
				    vBestBuy = parseFloat(objOrder.data.result.limit_price);
				    vBestSell = parseFloat(objOrder.data.result.limit_price);
				}

				if(gByorSl === "buy"){
				    let vBuyCommission = objOrder.data.result.paid_commission;
	                gAmtSL = (vBestBuy - vSLPoints).toFixed(2);
	                gAmtTP = (vBestBuy + vTPPoints).toFixed(2);
				}
				else if(gByorSl === "sell"){
				    let vSellCommission = objOrder.data.result.paid_commission;
	                gAmtSL = (vBestBuy + vSLPoints).toFixed(2);
	                gAmtTP = (vBestBuy - vTPPoints).toFixed(2);
				}
				else{
					gAmtSL = 0;
					gAmtTP = 0;				
				}

	            let vExcTradeDtls = { OrderID : vOrdId, ClientOrderID : vClientOrdID, OpenDT : vToday, FutSymbol : objFutDDL.value, TransType : pTransType, LotSize : objLotSize.value, Qty : objQty.value, BuyPrice : vBestBuy, SellPrice : vBestSell, AmtSL : gAmtSL, AmtTP : gAmtTP, StopLossPts : vSLPoints, TakeProfitPts : vTPPoints, OpenDTVal : vClientOrdID, OrderType : vOrderType, OrderState : vState, ProductID : vProductID, BuyCommission : vBuyCommission, SellCommission : vSellCommission };

	            gCurrPosR.TradeData.push(vExcTradeDtls);

	            let objExcTradeDtls = JSON.stringify(gCurrPosR);

	            localStorage.setItem("DeltaCurrFutPosiSR", objExcTradeDtls);
				localStorage.setItem("QtyMulDeltaR", objQty.value);

	            fnSetInitFutTrdDtls();
			    console.log(gCurrPosR);

				fnGenMessage("Trade Order Placed!", `badge bg-success`, "spnGenMsg");

				if(vState === "open"){
					fnCheckOpenStatePos();
				}
	        }
	        else{
			    console.log(objOrder);
	            fnGenMessage(objOrder.message, `badge bg-${objOrder.status}`, "spnGenMsg");
	        }
	    }
	}
	else{
		fnGenMessage("A Position is Already Open or Pending, Please Check!", `badge bg-warning`, "spnGenMsg");

	}
}

function fnPlaceRealOrder(pOrdId, pSymbol, pOrderType, pQty, pTransType){
	const objPromise = new Promise((resolve, reject) => {
	    let objApiKey = document.getElementById("txtUserAPIKey");
	    let objApiSecret = document.getElementById("txtAPISecret");
	    let vHeaders = new Headers();
	    vHeaders.append("Content-Type", "application/json");

	    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, ClientOrdID : pOrdId, SymbolID : pSymbol, OrderType : pOrderType, Quantity : pQty, TransType : pTransType });

	    let requestOptions = {
	        method: 'POST',
	        headers: vHeaders,
	        body: vAction,
	        redirect: 'follow'
	    };

	    fetch("/deltaExcFutR/placeRealOrder", requestOptions)
	    .then(response => response.json())
	    .then(objResult => {

	        if(objResult.status === "success"){


	            // let objBestRates = { BestBuy : vRes.result.quotes.best_ask, BestSell : vRes.result.quotes.best_bid }

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
	        }
	        else if(objResult.status === "danger"){
	            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
	                resolve({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": "" });
	            }
	            else{
	                resolve({ "status": objResult.status, "message": "Error: " + objResult.data.response.body.error.code, "data": objResult.data });
	            }
	        }
	        else if(objResult.status === "warning"){
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
	        }
	        else{
	            fnGenMessage("Error in Placing the Order, Contact Admin!", `badge bg-danger`, "spnGenMsg");
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
	        }
	    })
	    .catch(error => {
            reject({ "status": "danger", "message": "Error in Placing Order...", "data": "" });
	    });
    });

    return objPromise;
}

async function fnInitiateManualFutures(pTransType){
    let objCurrPos = JSON.parse(localStorage.getItem("DeltaCurrFutPosiSR"));

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
		    let vSLPoints = parseFloat(document.getElementById("txtPointsSL").value);
		    let vTPPoints = parseFloat(document.getElementById("txtPointsTP").value);
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
            gCurrPos = vExcTradeDtls;

            localStorage.setItem("DeltaCurrFutPosiSR", objExcTradeDtls);
			localStorage.setItem("QtyMulDeltaR", objQty.value);

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

function fnCheckOpenStatePos(){
    //Get Order details by order id and keep checking for 15 secs and cancel order
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");

    if(gCurrPosR.TradeData.length > 0){
    	let vOrdId = gCurrPosR.TradeData[0].OrderID;
    	let vClientOrdID = gCurrPosR.TradeData[0].ClientOrderID;

	    let vHeaders = new Headers();
	    vHeaders.append("Content-Type", "application/json");

	    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, OrderID : vOrdId, ClientOrdID : vClientOrdID });

	    let requestOptions = {
	        method: 'POST',
	        headers: vHeaders,
	        body: vAction,
	        redirect: 'follow'
	    };

	    fetch("/deltaExcFutR/getOrderDetails", requestOptions)
	    .then(response => response.json())
	    .then(objResult => {
	    	console.log(objResult);
	        if(objResult.status === "success"){
	        	let vOrderFound = false;
	        	console.log("INSIDE getOrderDetails >>>>>>>>>");
	        	console.log(objResult);
	        	if(objResult.data.result.length > 0){
	        		for(let i=0; i<objResult.data.result.length; i++){
	        			if(objResult.data.result[i].id === vOrdId){
	        				vOrderFound = true;
			        		if(objResult.data.result[i].state === "open"){
			        			gOpenOrdrCounter +=1;
			        			if(gOpenOrdrCounter < 5){
			        				setTimeout(fnCheckOpenStatePos, 3000);
			        			}
			        			else{
			        				fnCancelPendingOrder();
			        			}
			        		}
			        		else if(objResult.data.result[i].state === "closed"){
			        			//Buy or Sell Order is Executed
					        	console.log("Executed. i.e., Closed");
					        	console.log(objResult);
			        		}
			        		else{
			        			console.log("Order Not Found");
			        			//Order is Cancelled
			        		}
	        			}
	        		}
	        	}
	        	if(vOrderFound === false){
	        		console.log("Order Not Found: " + vOrdId);
					fnGetFillPosition();
	        	}
	            // let objBestRates = { BestBuy : vRes.result.quotes.best_ask, BestSell : vRes.result.quotes.best_bid }

	            fnGenMessage(objResult.message, `badge bg-` + objResult.status, "spnGenMsg");
	        }
	        else if(objResult.status === "danger"){
	            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
		            fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-` + objResult.status, "spnGenMsg");
	            }
	            else{
		            fnGenMessage("Error: " + objResult.data.response.body.error.code, `badge bg-` + objResult.status, "spnGenMsg");
	            }
	        }
	        else if(objResult.status === "warning"){
	            fnGenMessage(objResult.message, `badge bg-` + objResult.status, "spnGenMsg");
	        }
	        else{
	            fnGenMessage(objResult.message, `badge bg-` + objResult.status, "spnGenMsg");
	        }
	    })
	    .catch(error => {
	        fnGenMessage("Error in Receiving Order Details...", `badge bg-danger`, "spnGenMsg");
	    });
    }
    else{
        fnGenMessage("No Order in Memory!", `badge bg-danger`, "spnGenMsg");
    }
}

function fnCancelPendingOrder(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");

    if(gCurrPosR.TradeData.length > 0){
    	let vOrdId = gCurrPosR.TradeData[0].OrderID;
    	let vClientOrdID = gCurrPosR.TradeData[0].ClientOrderID;
    	let vSymbol = gCurrPosR.TradeData[0].FutSymbol;
	    let vHeaders = new Headers();
	    vHeaders.append("Content-Type", "application/json");

	    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, OrderID : vOrdId, ClientOrdID : vClientOrdID, Symbol : vSymbol });

	    let requestOptions = {
	        method: 'POST',
	        headers: vHeaders,
	        body: vAction,
	        redirect: 'follow'
	    };

	    fetch("/deltaExcFutR/cancelPendingOrder", requestOptions)
	    .then(response => response.json())
	    .then(objResult => {

	        if(objResult.status === "success"){
	        	// console.log(objResult);
        		if(objResult.data.result.state === "cancelled"){
		   			let objSelData = null;
        			for(let i=0; i<gCurrPosR.TradeData.length; i++){
        				if(gCurrPosR.TradeData[i].OrderID === vOrdId){
		   					objSelData = gCurrPosR.TradeData[i];
        				}
        			}
	        		gCurrPosR.TradeData.pop(objSelData);
        		}

	            let objExcTradeDtls = JSON.stringify(gCurrPosR);
	            localStorage.setItem("DeltaCurrFutPosiSR", objExcTradeDtls);

	            fnSetInitFutTrdDtls();
	        	// console.log(gCurrPosR);
	            fnGenMessage(objResult.message, `badge bg-` + objResult.status, "spnGenMsg");
	        }
	        else if(objResult.status === "danger"){
	            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
		            fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-` + objResult.status, "spnGenMsg");
	            }
	            else{
		            fnGenMessage("Error: " + objResult.data.response.body.error.code, `badge bg-` + objResult.status, "spnGenMsg");
	            }
	        }
	        else if(objResult.status === "warning"){
	            fnGenMessage(objResult.message, `badge bg-` + objResult.status, "spnGenMsg");
	        }
	        else{
	            fnGenMessage(objResult.message, `badge bg-` + objResult.status, "spnGenMsg");
	        }
	    })
	    .catch(error => {
	    	console.log(error);
	        fnGenMessage("Error in Cancelling Pending Order...", `badge bg-danger`, "spnGenMsg");
	    });
    }
    else{
        fnGenMessage("No Order in Memory!", `badge bg-danger`, "spnGenMsg");
    }
}

function fnGetFillPosition(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");

    if(gCurrPosR.TradeData.length > 0){
    	let vOrdId = gCurrPosR.TradeData[0].OrderID;
    	let vClientOrdID = gCurrPosR.TradeData[0].ClientOrderID;
    	let vProductID = gCurrPosR.TradeData[0].ProductID;
    	let vStartValDT = gCurrPosR.TradeData[0].OpenDTVal;
    	let vTransType = gCurrPosR.TradeData[0].TransType;
    	let vPointSL = parseFloat(gCurrPosR.TradeData[0].StopLossPts);
    	let vPointTP = parseFloat(gCurrPosR.TradeData[0].TakeProfitPts);
    	vStartValDT = vStartValDT * 1000;

	    let vHeaders = new Headers();
	    vHeaders.append("Content-Type", "application/json");

	    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, ClientOrderID : vClientOrdID, ProductID : vProductID, StartValDT : vStartValDT });

	    let requestOptions = {
	        method: 'POST',
	        headers: vHeaders,
	        body: vAction,
	        redirect: 'follow'
	    };

	    fetch("/deltaExcFutR/getFilledPosById", requestOptions)
	    .then(response => response.json())
	    .then(objResult => {

	        if(objResult.status === "success"){
	        	for(let i=0; i<objResult.data.result.length; i++){
	        		if(objResult.data.result[i].id === vOrdId){
	        			if(vTransType === "buy"){
	        				let vFilledPrice = parseFloat(objResult.data.result[i].average_fill_price);
	        				let vAmtSL = vFilledPrice - vPointSL;
	        				let vAmtTP = vFilledPrice + vPointTP;

		        			gCurrPosR.TradeData[0].BuyPrice = vFilledPrice;
		        			gCurrPosR.TradeData[0].AmtSL = vAmtSL;
		        			gCurrPosR.TradeData[0].AmtTP = vAmtTP;
		        			gCurrPosR.TradeData[0].BuyCommission = parseFloat(objResult.data.result[i].paid_commission);
	        			}
	        			else if(vTransType === "sell"){
	        				let vFilledPrice = parseFloat(objResult.data.result[i].average_fill_price);
	        				let vAmtSL = vFilledPrice + vPointSL;
	        				let vAmtTP = vFilledPrice - vPointTP;

		        			gCurrPosR.TradeData[0].SellPrice = vFilledPrice;
		        			gCurrPosR.TradeData[0].AmtSL = vAmtSL;
		        			gCurrPosR.TradeData[0].AmtTP = vAmtTP;
		        			gCurrPosR.TradeData[0].SellCommission = parseFloat(objResult.data.result[i].paid_commission);
	        			}
	        		}
	        	}

	            let objExcTradeDtls = JSON.stringify(gCurrPosR);
	            localStorage.setItem("DeltaCurrFutPosiSR", objExcTradeDtls);

	            fnSetInitFutTrdDtls();
	            fnGenMessage(objResult.message, `badge bg-` + objResult.status, "spnGenMsg");
	            console.log(gCurrPosR);
	        }
	        else if(objResult.status === "danger"){
	            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
		            fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-` + objResult.status, "spnGenMsg");
	            }
	            else{
		            fnGenMessage("Error: " + objResult.data.response.body.error.code, `badge bg-` + objResult.status, "spnGenMsg");
	            }
	        }
	        else if(objResult.status === "warning"){
	            fnGenMessage(objResult.message, `badge bg-` + objResult.status, "spnGenMsg");
	        }
	        else{
	            fnGenMessage(objResult.message, `badge bg-` + objResult.status, "spnGenMsg");
	        }
	    })
	    .catch(error => {
	    	console.log(error);
	        fnGenMessage("Error in getting Curr Open Positions...", `badge bg-danger`, "spnGenMsg");
	    });
    }
    else{
        fnGenMessage("No Order in Memory!", `badge bg-danger`, "spnGenMsg");
    }
}

function fnSetInitFutTrdDtls(){
    let objStatus = document.getElementById("tdStatus");
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

    // console.log(gCurrPosR);

	if(gCurrPosR.TradeData.length > 0){
        gOrderDT = gCurrPosR.TradeData[0].OrderID;

	    let vDate = new Date();
	    let vCurrDT = vDate.valueOf();
	    let vTimeDiff = ((vCurrDT - gOrderDT)/60000) + 0.15;

		if(vTimeDiff < parseInt(objTrdExitTime.value))
		fnInnitiateTimer(parseInt(objTrdExitTime.value) - vTimeDiff);

		gBuyPrice = parseFloat(gCurrPosR.TradeData[0].BuyPrice).toFixed(2);
		gSellPrice = parseFloat(gCurrPosR.TradeData[0].SellPrice).toFixed(2);
		gLotSize = parseFloat(gCurrPosR.TradeData[0].LotSize);
		gQty = parseFloat(gCurrPosR.TradeData[0].Qty);
        gByorSl = gCurrPosR.TradeData[0].TransType;
		gAmtSL = gCurrPosR.TradeData[0].AmtSL;
		gAmtTP = gCurrPosR.TradeData[0].AmtTP;

		if(gCurrPosR.TradeData[0].OrderState === "open"){
			objStatus.innerText = "PENDING";
		}
		else if(gCurrPosR.TradeData[0].OrderState === "closed"){
			objStatus.innerText = "OPEN";
		}
		objDateTime.innerText = gCurrPosR.TradeData[0].OpenDT;
		objSymbol.innerText = gCurrPosR.TradeData[0].FutSymbol;
		objTransType.innerText = gCurrPosR.TradeData[0].TransType;
		objLotSize.innerText = gLotSize;
		objQty.innerText = gQty;
		gCapital = fnGetTradeCapital(gByorSl, gBuyPrice, gSellPrice, gLotSize, gQty);
		objCapital.innerText = (gCapital).toFixed(2);
		gCharges = fnGetTradeCharges(gOrderDT, vCurrDT, gLotSize, gQty, gBuyPrice, gSellPrice, gByorSl);
		objCharges.innerText = (gCharges).toFixed(3);
		let vPL = fnGetTradePL(gSellPrice, gBuyPrice, gLotSize, gQty, gCharges);
		objProfitLoss.innerText = (vPL).toFixed(2);

		if(gCurrPosR.TradeData[0].TransType === "buy"){
			objBuyPrice.innerHTML = gBuyPrice;
			objSellPrice.innerHTML = "<span class='blink'>" + gSellPrice + "</span>";
		}
		else if(gCurrPosR.TradeData[0].TransType === "sell"){
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
		objStatus.innerText = "";
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
	fnCloseWS();
	fnManualSubcription();

    fnGenMessage("Streaming Connection Closed & Rate Ticker started by 8 Secs!", `badge bg-warning`, "spnGenMsg");

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

async function fnClsRealFuturesTrade(pTransType){
	if(gCurrPosR.TradeData.length === 0){
		fnGenMessage("No Open Position to Close!", `badge bg-warning`, "spnGenMsg");
	}
	else if(gCurrPosR.TradeData[0].TransType !== pTransType){
        fnGenMessage("No " + pTransType + " Position to Close!", `badge bg-warning`, "spnGenMsg");		
	}
	else{
		let objClsTrd = await fnInnitiateClsFutRealTrade(0, pTransType);
		if(objClsTrd.status === "success"){
            // fnSetInitFutTrdDtls();
		    // fnLoadTodayTrades();
			console.log(objClsTrd);
            fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
		}
		else{
            fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
		}
	}
}

async function fnInnitiateClsFutRealTrade(pQty, pTransType){
    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    let vToCntuQty = parseInt(gCurrPosR.TradeData[0].Qty) - parseInt(pQty);

	const objClsTrd = new Promise((resolve, reject) => {
	    let objApiKey = document.getElementById("txtUserAPIKey");
	    let objApiSecret = document.getElementById("txtAPISecret");
	    let vOrderID = gCurrPosR.TradeData[0].OrderID;
	    let vClientOrderID = gCurrPosR.TradeData[0].ClientOrderID;
	    let vSymbol = gCurrPosR.TradeData[0].FutSymbol;
	    let vOrderType = "market_order";
	    let vTransType = "";
	    let vQty = parseInt(gCurrPosR.TradeData[0].Qty);
    	let vProductID = gCurrPosR.TradeData[0].ProductID;
    	let vStartValDT = gCurrPosR.TradeData[0].OpenDTVal;
    	vStartValDT = vStartValDT * 1000;

	    if(pQty > 0){
	    	vQty = pQty;
	    }

	    if(gCurrPosR.TradeData[0].TransType === "buy"){
	    	vTransType = "sell";
	    }
	    else if(gCurrPosR.TradeData[0].TransType === "sell"){
	    	vTransType = "buy";
	    }
	    else{
	    	vTransType = "";
	    }

	    if(vTransType === ""){
	        resolve({ "status": "warning", "message": "Invalid Transaction Type: Must Be BUY or SELL!", "data": "" });
	    }
	    else{
		    let vHeaders = new Headers();
		    vHeaders.append("Content-Type", "application/json");

		    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, OrderID : vOrderID, ClientOrdID : vClientOrderID, Symbol : vSymbol, OrderType : vOrderType, Quantity : vQty, TransType : vTransType, ProductID : vProductID, StartValDT : vStartValDT });

		    let requestOptions = {
		        method: 'POST',
		        headers: vHeaders,
		        body: vAction,
		        redirect: 'follow'
		    };

		    fetch("/deltaExcFutR/closeRealPosition", requestOptions)
		    .then(response => response.json())
		    .then(objResult => {

		        if(objResult.status === "success"){

		        	// console.log(objResult);
	                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
		        }
		        else if(objResult.status === "danger"){
		            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
		                resolve({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": "" });
		            }
		            else{
		                resolve({ "status": objResult.status, "message": "Error: " + objResult.data.response.body.error.code, "data": objResult.data });
		            }
		        }
		        else if(objResult.status === "warning"){
	                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
		        }
		        else{
		            fnGenMessage("Error in Placing the Close Order, Contact Admin!", `badge bg-danger`, "spnGenMsg");
	                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
		        }
		    })
		    .catch(error => {
	            reject({ "status": "danger", "message": "Error in Placing Close Order...", "data": "" });
		    });

        // resolve({ "status": "success", "message": "Future Real Trade Closed Successfully!", "data": "" });
	    }
	});
    return objClsTrd;
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

    if(gCurrPosR.TradeData[0].Qty >= 2){
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
            let vPrctQty2Rec = (Math.round(parseInt(gCurrPos.TradeData[0].Qty) * parseFloat(gLossRecPerct)) / 100);
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
    let vToCntuQty = parseInt(gCurrPos.TradeData[0].Qty) - parseInt(pQty);

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

	    if(pQty !== 0){
		    gCurrPos.TradeData[0].Qty = pQty;
		    let vCapital = fnGetTradeCapital(gByorSl, gCurrPos.TradeData[0].BuyPrice, gCurrPos.TradeData[0].SellPrice, gCurrPos.TradeData[0].LotSize, pQty);
		    gCurrPos.TradeData[0].Capital = vCapital;
		    let vCharges = fnGetTradeCharges(gCurrPos.TradeData[0].OrderID, vDate.valueOf(), gCurrPos.TradeData[0].LotSize, pQty, gCurrPos.TradeData[0].BuyPrice, gCurrPos.TradeData[0].SellPrice, gByorSl);
		    gCurrPos.TradeData[0].Charges = vCharges;
		    let vTradePL = fnGetTradePL(gCurrPos.TradeData[0].SellPrice, gCurrPos.TradeData[0].BuyPrice, gCurrPos.TradeData[0].LotSize, pQty, vCharges);
		    gCurrPos.TradeData[0].ProfitLoss = vTradePL;

	        gOldPLAmt = JSON.parse(localStorage.getItem("TotLossAmtDeltaR"));
	        gNewPLAmt = vTradePL;
	    	let vTotNewPL = gOldPLAmt + gNewPLAmt;
	    	localStorage.setItem("OldPLAmtDeltaR", gOldPLAmt);
	    	localStorage.setItem("NewPLAmtDeltaR", gNewPLAmt);
	    	localStorage.setItem("TotLossAmtDeltaR", vTotNewPL);
	    }
	    else{
	    	gOldPLAmt = JSON.parse(localStorage.getItem("TotLossAmtDeltaR"));
	    	gNewPLAmt = gPL;
	    	let vTotNewPL = gOldPLAmt + gNewPLAmt;
	    	localStorage.setItem("OldPLAmtDeltaR", gOldPLAmt);
	    	localStorage.setItem("NewPLAmtDeltaR", gNewPLAmt);
	    	localStorage.setItem("TotLossAmtDeltaR", vTotNewPL);
	    }
	}
	else{

	}
	const objClsTrd = new Promise((resolve, reject) => {
	    let objTodayTrades = JSON.parse(localStorage.getItem("TrdBkFutR"));

	    if(objTodayTrades === null){
	        localStorage.setItem("TrdBkFutR", JSON.stringify(gCurrPos));
	    }
	    else{
	        let vExistingData = objTodayTrades;
	        vExistingData.TradeData.push(gCurrPos.TradeData[0]);
	        localStorage.setItem("TrdBkFutR", JSON.stringify(vExistingData));
	    }

	    if(pQty === 0){
		    localStorage.removeItem("DeltaCurrFutPosiSR");
		    gCurrPos = null;
            fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
	    }
	    else{
	    	if(vToCntuQty === 0){
			    localStorage.removeItem("DeltaCurrFutPosiSR");

			    gCurrPos = null;
	    	}
	    	else{
	            gCurrPos.TradeData[0].Qty = vToCntuQty;
	            localStorage.setItem("DeltaCurrFutPosiSR", JSON.stringify(gCurrPos));	    	
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
    let objQty = document.getElementById("txtFuturesQty");
    let vOldLossAmt = localStorage.getItem("OldPLAmtDeltaR");
	let vNewLossAmt = localStorage.getItem("NewPLAmtDeltaR");
	let vTotLossAmt = localStorage.getItem("TotLossAmtDeltaR");

    let vOldQtyMul = JSON.parse(localStorage.getItem("QtyMulDeltaR"));
    let vStartLots = JSON.parse(localStorage.getItem("StartQtyNoDeltaR"));
    let objSwtMarti = document.getElementById("swtMartingale");

    if(objSwtMarti.checked){
		if(parseFloat(vNewLossAmt) < 0){
	        let vNextQty = parseInt(vOldQtyMul) * 2;
	        localStorage.setItem("QtyMulDeltaR", vNextQty);
	        objQty.value = vNextQty;
		}
		else if(parseFloat(vTotLossAmt) < 0){
	        let vDivAmt = parseFloat(vTotLossAmt) / parseFloat(vOldLossAmt);
	        let vNextQty = Math.round(vDivAmt * parseInt(vOldQtyMul));

	        if(vNextQty < vStartLots)
	        vNextQty += vStartLots;

	        localStorage.setItem("QtyMulDeltaR", vNextQty);
	        objQty.value = vNextQty;
		}
	    else {
	        localStorage.setItem("TotLossAmtDeltaR", 0);
	        localStorage.removeItem("QtyMulDeltaR");
	        fnSetLotsByQtyMulLossAmt();
	    }
    }
    else{
    	if(parseFloat(vTotLossAmt) > 0){
			localStorage.setItem("TotLossAmtDeltaR", 0);
    	}
    	
        fnSetLotsByQtyMulLossAmt();
    }

	// console.log(gCharges);

	if(gPL > 0){
		let vBalLossAmt = localStorage.getItem("TotLossAmtDeltaR");
		let vNewTarget = parseFloat(vBalLossAmt) - parseFloat(gCharges);
		localStorage.setItem("TotLossAmtDeltaR", vNewTarget);
		// console.log("ADD Brokerage");
	}
	// console.log(localStorage.getItem("TotLossAmtDeltaR"))
}

function fnChangeMartingale(){
    // let vMartiM = JSON.parse(localStorage.getItem("DeltaFutMartiR"));
    let objSwtMarti = document.getElementById("swtMartingale");

    localStorage.setItem("DeltaFutMartiR", JSON.stringify(objSwtMarti.checked));
    // alert(objSwtMarti.checked);
}

function fnSetLotsByQtyMulLossAmt(){
    let vStartLots = JSON.parse(localStorage.getItem("StartQtyNoDeltaR"));
    let vQtyMul = JSON.parse(localStorage.getItem("QtyMulDeltaR"));
    let objOptQty = document.getElementById("txtFuturesQty");
    let vTotLossAmt = JSON.parse(localStorage.getItem("TotLossAmtDeltaR"));
    
    if (vQtyMul === null || vQtyMul === "") {
        localStorage.setItem("QtyMulDeltaR", vStartLots);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
    
    if (vTotLossAmt === null || vTotLossAmt === "" || vTotLossAmt === 0) {
        localStorage.setItem("QtyMulDeltaR", vStartLots);
        localStorage.setItem("TotLossAmtDeltaR", 0);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
}

function fnLoadTodayTrades(){
    let objTodayTradeList = document.getElementById("tBodyTodayPaperTrades");
   	let objTradeBook = JSON.parse(localStorage.getItem("TrdBkFutR"));
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
        objYtRL.innerText = parseFloat(localStorage.getItem("TotLossAmtDeltaR")).toFixed(2);
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
    localStorage.removeItem("DeltaCurrFutPosiSR");
	localStorage.removeItem("TrdBkFutR");
	localStorage.removeItem("StartQtyNoDeltaR");
	localStorage.removeItem("DeltaFutMartiR");
	localStorage.setItem("QtyMulDeltaR", 0);
	localStorage.setItem("TotLossAmtDeltaR", 0);
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

function fnTest(){
	console.log("Total Loss in Momory: " + localStorage.getItem("TotLossAmtDeltaR"));
	console.log("gPL: " + gPL);
}

function fnPositionStatus(){
    let objBtnPosition = document.getElementById("btnPositionStatus");

    if(localStorage.getItem("DeltaCurrFutPosiSR") === null)
    {
        fnGenMessage("No Open Position!", `badge bg-success`, "spnGenMsg");
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

    localStorage.setItem("TradeSideSwtR", objTradeSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("TradeSideSwtR") === null){
        localStorage.setItem("TradeSideSwtR", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("TradeSideSwtR");
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