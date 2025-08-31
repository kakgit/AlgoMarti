let objDeltaWS = null;
let gByorSl = "";
let gCurrPos = null;
let gBuyPrice, gSellPrice, gLotSize, gQty, gAmtSL, gAmtTP, gCharges, gCapital, gPL, gOrderDT = 0;
let gBrokerage = 0.02;
let gMaxTradeTime = 15;

window.addEventListener("DOMContentLoaded", function(){
	fnGetAllStatus();
});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
		fnLoadDefQty();
		fnLoadCurrentTradePos();
		fnSubscribe();
		fnSetInitFutTrdDtls();
		fnLoadSlTp();
		fnLoadTodayTrades();
	}
}

function fnLoadDefQty(){
	let objStartQtyM = JSON.parse(localStorage.getItem("StartQtyNoDelta"));
	let objQtyMul = JSON.parse(localStorage.getItem("QtyMulDelta"));

    let objQty = document.getElementById("txtFuturesQty");
    let objStartQty = document.getElementById("txtStartQty");

    if(objQtyMul === null || objQtyMul < 1 || objQtyMul < objStartQtyM){
	    if(objStartQtyM === null){
	    	objStartQty.value = 100;
	    	objQty.value = 100;
	    	localStorage.setItem("StartQtyNoDelta", objStartQty.value);
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
    let objQty = document.getElementById("txtFuturesQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDelta", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDelta", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyNoDelta", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objQty.value = pThisVal.value;
            localStorage.setItem("QtyMulDelta", pThisVal.value);
        }
    }
}

function fnLoadCurrentTradePos(){
    let objCurrPos = JSON.parse(localStorage.getItem("DeltaCurrFutPosiS"));

	gCurrPos = objCurrPos;
}

function fnCloseWS(){
	if(objDeltaWS !== null){
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
				fnGetRates(vTicData);
				break;
			case "candlestick_5m":
				fnGetOHLC(vTicData);
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

function fnSubscribe(){
	let objDdlSymbol = document.getElementById("ddlFuturesSymbols");

	if(objDeltaWS === null){
		fnConnectWS();
		console.log("WS is looping to Connect.....");
		setTimeout(fnSubscribe, 3000);
	}
	else{
	    let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": [ objDdlSymbol.value ] }]}};
		console.log("Subscribing to Channel....");
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

function fnGetRates(pTicData){
	let objSpotPrice = document.getElementById("txtSpotPrice");
	let objBestBuy = document.getElementById("txtBestBuyPrice");
	let objBestSell = document.getElementById("txtBestSellPrice");

	objSpotPrice.value = parseFloat(pTicData.mark_price).toFixed(2);
	objBestBuy.value = pTicData.quotes.best_ask;
	objBestSell.value = pTicData.quotes.best_bid;

	fnUpdateOpnPosStatus();
	// console.log(pTicData);
}

function fnUpdateOpnPosStatus(){
    let objCharges = document.getElementById("tdCharges");
    let objProfitLoss = document.getElementById("tdProfitLoss");

    let vDate = new Date();
    let vCurrDT = vDate.valueOf();
    let vTimeDiff = (vCurrDT - gOrderDT)/60000;

	if(gByorSl === "buy"){
		if(vTimeDiff < gMaxTradeTime)
		fnInnitiateTimer(gMaxTradeTime - vTimeDiff);

		let objBestSell = document.getElementById("txtBestSellPrice");
		let objSellPrice = document.getElementById("tdSellPrice");
		
		gSellPrice = parseFloat(objBestSell.value).toFixed(2);
		gCharges = (((gBuyPrice * gLotSize * gQty) * gBrokerage) / 100) * 1.18;

		if(vTimeDiff > gMaxTradeTime){
			gCharges = ((((gSellPrice * gLotSize * gQty) * gBrokerage) / 100) * 1.18) + gCharges;
			objCharges.innerText = (gCharges).toFixed(3);
		}
		else{
			objCharges.innerText = (gCharges).toFixed(3);
		}

		objSellPrice.innerHTML = "<span class='blink'>" + gSellPrice + "</span>";
		objProfitLoss.innerText = (((gSellPrice - gBuyPrice) * gLotSize * gQty) - gCharges).toFixed(2);

		gCurrPos.TradeData[0].Charges = gCharges;
		gCurrPos.TradeData[0].SellPrice = gSellPrice;
		gCurrPos.TradeData[0].ProfitLoss = objProfitLoss.innerText;
		gPL = objProfitLoss.innerText;

		fnCheckBuySLTP(gSellPrice);
	}
	else if(gByorSl === "sell"){
		if(vTimeDiff < gMaxTradeTime)
		fnInnitiateTimer(gMaxTradeTime - vTimeDiff);

		let objBestBuy = document.getElementById("txtBestBuyPrice");
		let objBuyPrice = document.getElementById("tdBuyPrice");

		gBuyPrice = parseFloat(objBestBuy.value).toFixed(2);
		gCharges = (((gSellPrice * gLotSize * gQty) * gBrokerage) / 100) * 1.18;

		if(vTimeDiff > gMaxTradeTime){
			gCharges = ((((gBuyPrice * gLotSize * gQty) * gBrokerage) / 100) * 1.18) + gCharges;
			objCharges.innerText = (gCharges).toFixed(3);
		}
		else{
			objCharges.innerText = (gCharges).toFixed(3);
		}

		objBuyPrice.innerHTML = "<span class='blink'>" + gBuyPrice + "</span>";
		objProfitLoss.innerText = (((gSellPrice - gBuyPrice) * gLotSize * gQty) - gCharges).toFixed(2);

		gCurrPos.TradeData[0].Charges = gCharges;
		gCurrPos.TradeData[0].BuyPrice = gBuyPrice;
		gCurrPos.TradeData[0].ProfitLoss = objProfitLoss.innerText;
		gPL = objProfitLoss.innerText;

		fnCheckSellSLTP(gBuyPrice);
	}
	else{
		fnGenMessage("No Open Position!", `badge bg-warning`, "spnGenMsg");
	}
}

function fnCheckBuySLTP(pCurrPrice){
	if(pCurrPrice <= gAmtSL){
		console.log("SL Hit");
		fnCloseManualFutures(gByorSl);
	}
	else if(pCurrPrice >= gAmtTP){
		console.log("TP Hit");
		fnCloseManualFutures(gByorSl);
	}
	else{
		console.log("Still continuing");
	}
	// console.log(gAmtSL);
	// console.log(gAmtTP);
}

function fnCheckSellSLTP(pCurrPrice){
	if(pCurrPrice >= gAmtSL){
		console.log("SL Hit");
		fnCloseManualFutures(gByorSl);
	}
	else if(pCurrPrice <= gAmtTP){
		console.log("TP Hit");
		fnCloseManualFutures(gByorSl);
	}
	else{
		console.log("Still continuing");
	}
}

function fnGetHistoricalOHLC(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

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
            console.log(vRes);
            // console.log(vRes.result[0].close);

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
    let objCurrSlTp = JSON.parse(localStorage.getItem("DeltaCurrFutSlTp"));
    let objTxtSL = document.getElementById("txtPointsSL");
    let objTxtTP = document.getElementById("txtPointsTP");

    if(objCurrSlTp === null){
    	let objSlTp = { PointSL : 50, PointTP : 200 };
    	localStorage.setItem("DeltaCurrFutSlTp", JSON.stringify(objSlTp));
    	objTxtSL.value = 50;
    	objTxtTP.value = 200;
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
    localStorage.setItem("DeltaCurrFutSlTp", JSON.stringify(objSlTp));

    fnGenMessage("Updated SL & TP!", `badge bg-success`, "spnGenMsg");    
}

async function fnInitiateManualFutures(pTransType){
    let objCurrPos = JSON.parse(localStorage.getItem("DeltaCurrFutPosiS"));

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

            let vExcTradeDtls = { TradeData: [{ OrderID : vOrdId, OpenDT : vToday, FutSymbol : objFutDDL.value, TransType : pTransType, LotSize : objLotSize.value, Qty : objQty.value, BuyPrice : vBestBuy, SellPrice : vBestSell, AmtSL : gAmtSL, AmtTP : gAmtTP, StopLossPts: vSLPoints, TakeProfitPts : vTPPoints }] };
            let objExcTradeDtls = JSON.stringify(vExcTradeDtls);
            gCurrPos = vExcTradeDtls;

            localStorage.setItem("DeltaCurrFutPosiS", objExcTradeDtls);
			localStorage.setItem("QtyMulDelta", objQty.value);

            fnSetInitFutTrdDtls();

            fnGenMessage(objBestRates.message, `badge bg-${objBestRates.status}`, "spnGenMsg");
            console.log("Trade Executed....................");
        }
        else{
            fnGenMessage(objBestRates.message, `badge bg-${objBestRates.status}`, "spnGenMsg");
        }
    }
    else{
        fnGenMessage("Close the Open Position to Execute New Trade!", `badge bg-warning`, "spnGenMsg");
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

    console.log(gCurrPos);

	if(gCurrPos !== null){
		gBuyPrice = parseFloat(gCurrPos.TradeData[0].BuyPrice).toFixed(2);
		gSellPrice = parseFloat(gCurrPos.TradeData[0].SellPrice).toFixed(2);
		gLotSize = parseFloat(gCurrPos.TradeData[0].LotSize);
		gQty = parseFloat(gCurrPos.TradeData[0].Qty);
        let vDate = new Date();
        let vCurrDT = vDate.valueOf();
        gOrderDT = gCurrPos.TradeData[0].OrderID;
        let vTimeDiff = (vCurrDT - gOrderDT)/60000;

        gByorSl = gCurrPos.TradeData[0].TransType;

		objDateTime.innerText = gCurrPos.TradeData[0].OpenDT;
		objSymbol.innerText = gCurrPos.TradeData[0].FutSymbol;
		objTransType.innerText = gCurrPos.TradeData[0].TransType;
		objLotSize.innerText = gLotSize;
		objQty.innerText = gQty;

		gAmtSL = gCurrPos.TradeData[0].AmtSL;
		gAmtTP = gCurrPos.TradeData[0].AmtTP;

		if(gCurrPos.TradeData[0].TransType === "buy"){
			objBuyPrice.innerHTML = gBuyPrice;
			objSellPrice.innerHTML = "<span class='blink'>" + gSellPrice + "</span>";
			gCapital = ((gBuyPrice * gLotSize * gQty) / 160).toFixed(2);
			objCapital.innerText = gCapital;

			gCharges = (((gBuyPrice * gLotSize * gQty) * gBrokerage) / 100) * 1.18;

			if(vTimeDiff > 15){
				gCharges = ((((gSellPrice * gLotSize * gQty) * gBrokerage) / 100) * 1.18) + gCharges;
				objCharges.innerText = (gCharges).toFixed(3);
			}
			else{
				objCharges.innerText = (gCharges).toFixed(3);
			}
			objProfitLoss.innerText = (((gSellPrice - gBuyPrice) * gLotSize * gQty) - gCharges).toFixed(2);
		}
		else if(gCurrPos.TradeData[0].TransType === "sell"){
			objBuyPrice.innerHTML = "<span class='blink'>" + gBuyPrice + "</span>";
			objSellPrice.innerHTML = gSellPrice;
			gCapital = ((gSellPrice * gLotSize * gQty) / 160).toFixed(2);
			objCapital.innerText = gCapital;

			gCharges = (((gSellPrice * gLotSize * gQty) * gBrokerage) / 100) * 1.18;

			if(vTimeDiff > 15){
				gCharges = ((((gBuyPrice * gLotSize * gQty) * gBrokerage) / 100) * 1.18) + gCharges;
				objCharges.innerText = (gCharges).toFixed(3);
			}
			else{
				objCharges.innerText = (gCharges).toFixed(3);
			}
			objProfitLoss.innerText = (((gSellPrice - gBuyPrice) * gLotSize * gQty) - gCharges).toFixed(2);
		}
		else{
			objBuyPrice.innerHTML = 0.00;
			objSellPrice.innerHTML = 0.00;
			objCapital.innerText = 0.00;
			objCharges.innerText = 0.00;
		}
	    fnSet50PrctQty();
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
	        // console.log(objResult);
	        if(objResult.status === "success"){
	        	let vRes = JSON.parse(objResult.data);

	            // console.log(vRes);
	            // console.log(vRes.result.quotes.best_bid);
	            // console.log(vRes.result.quotes.best_ask);
	            let objBestRates = { BestBuy : vRes.result.quotes.best_ask, BestSell : vRes.result.quotes.best_bid }

                resolve({ "status": objResult.status, "message": objResult.message, "data": objBestRates });
	        }
	        else if(objResult.status === "danger"){
	            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
		            // console.log("Client IP: " + objResult.data.response.body.error.context.client_ip);
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
	        // console.log(error);
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

async function fnClose50PrctTrade(){
    try{
        if (gCurrPos === null){
            fnGenMessage("No Open Positions to Close 50% Qty!", `badge bg-warning`, "spnGenMsg");
        }
        else{
            let v50PrctQty = Math.round(parseInt(gCurrPos.TradeData[0].Qty) / 2);

            let objClsTrd = await fnInnitiateClsFutTrade(v50PrctQty);

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
	    let vBestBuy = parseFloat(objBestRates.data.BestBuy);
	    let vBestSell = parseFloat(objBestRates.data.BestSell);

	    gCurrPos.TradeData[0].CloseDT = vToday;

	    if(gByorSl === "buy"){
	    	gCurrPos.TradeData[0].SellPrice = vBestSell;
	    }
	    else if(gByorSl === "sell"){
	    	gCurrPos.TradeData[0].BuyPrice = vBestBuy;
	    }

	    gCurrPos.TradeData[0].Capital = gCapital;
	    gCurrPos.TradeData[0].Charges = gCharges;
	    if(pQty !== 0)
	    gCurrPos.TradeData[0].Qty = pQty;
	}
	else{

	}
	const objClsTrd = new Promise((resolve, reject) => {
	    let objTodayTrades = JSON.parse(localStorage.getItem("TrdBkFut"));

	    if(objTodayTrades === null){
	        localStorage.setItem("TrdBkFut", JSON.stringify(gCurrPos));
	    }
	    else{
	        let vExistingData = objTodayTrades;
	        vExistingData.TradeData.push(gCurrPos.TradeData[0])
	        localStorage.setItem("TrdBkFut", JSON.stringify(vExistingData));
	    }

	    if(pQty === 0){
		    localStorage.removeItem("DeltaCurrFutPosiS");
		    gCurrPos = null;
	    }
	    else{
            gCurrPos.TradeData[0].Qty = vToCntuQty;
            localStorage.setItem("DeltaCurrFutPosiS", JSON.stringify(gCurrPos));	    	
	    }

	    fnSetNextOptTradeSettings();
	    // fnGenMessage("Trade Closed", `badge bg-success`, "spnGenMsg");
        resolve({ "status": "success", "message": "Future Paper Trade Closed Successfully!", "data": "" });
    });
    return objClsTrd;
}

function fnSetNextOptTradeSettings(){
    let objQty = document.getElementById("txtFuturesQty");
    let vOldLossAmt = JSON.parse(localStorage.getItem("TotLossAmtDelta"));
    let vOldQtyMul = JSON.parse(localStorage.getItem("QtyMulDelta"));
    let vStartLots = JSON.parse(localStorage.getItem("StartQtyNoDelta"));

    if(vOldLossAmt === null)
        vOldLossAmt = 0;
    if(vOldQtyMul === null)
        vOldQtyMul = 0;

	let vNewLossAmt = parseFloat(vOldLossAmt) + parseFloat(gPL);

	console.log("gPL: " + gPL);
	console.log("vOldLossAmt: " + vOldLossAmt);
	console.log("New Loss Amt: " + vNewLossAmt);
	console.log("vStartLots: " + vStartLots);

	if(parseFloat(gPL) < 0){
        localStorage.setItem("TotLossAmtDelta", vNewLossAmt);

        let vNextQty = parseInt(vOldQtyMul) * 2;
        localStorage.setItem("QtyMulDelta", vNextQty);
        objQty.value = vNextQty;
	}
	else if(parseFloat(vNewLossAmt) < 0){
        localStorage.setItem("TotLossAmtDelta", vNewLossAmt);
        let vDivAmt = parseFloat(vNewLossAmt) / parseFloat(vOldLossAmt);
        let vNextQty = Math.round(vDivAmt * parseInt(vOldQtyMul));

        if(vNextQty < vStartLots)
        vNextQty = vStartLots;

        localStorage.setItem("QtyMulDelta", vNextQty);
        objQty.value = vNextQty;
	}
    else {
        localStorage.removeItem("TotLossAmtDelta");
        localStorage.removeItem("QtyMulDelta");
        // localStorage.setItem("TradeStep", 0);
        fnSetLotsByQtyMulLossAmt();
    }
}

function fnSetLotsByQtyMulLossAmt(){
    let vStartLots = localStorage.getItem("StartQtyNoDelta");
    let vQtyMul = JSON.parse(localStorage.getItem("QtyMulDelta"));
    let objOptQty = document.getElementById("txtFuturesQty");
    let vTotLossAmt = localStorage.getItem("TotLossAmtDelta");

    // console.log("Q: " + vQtyMul);
    
    if (vQtyMul === null || vQtyMul === "") {
        localStorage.setItem("QtyMulDelta", vStartLots);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
    
    if (vTotLossAmt === null || vTotLossAmt === "") {
        localStorage.setItem("QtyMulDelta", vStartLots);
        localStorage.setItem("TotLossAmtDelta", 0);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
}

function fnLoadTodayTrades(){
    let objTodayTradeList = document.getElementById("tBodyTodayPaperTrades");
   	let objTradeBook = JSON.parse(localStorage.getItem("TrdBkFut"));

   	// console.log(objTradeBook);
    
    if (objTradeBook == null) {
        objTodayTradeList.innerHTML = '<div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Trades Yet</div>';
    }
    else{
        let vTempHtml = "";
		
		for (let i = 0; i < objTradeBook.TradeData.length; i++){
            vTempHtml += '<tr>';
            vTempHtml += '<td style="text-wrap: nowrap;" onclick=\'fnDeleteThisTrade(' + objTradeBook.TradeData[i].OrderID + ');\'>' + objTradeBook.TradeData[i].OpenDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + objTradeBook.TradeData[i].CloseDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + objTradeBook.TradeData[i].FutSymbol + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + objTradeBook.TradeData[i].TransType + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + objTradeBook.TradeData[i].LotSize + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + objTradeBook.TradeData[i].Qty + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + (parseFloat(objTradeBook.TradeData[i].BuyPrice)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (parseFloat(objTradeBook.TradeData[i].SellPrice)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:orange;text-align:right;">' + (parseFloat(objTradeBook.TradeData[i].Capital)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:orange;text-align:right;">' + (parseFloat(objTradeBook.TradeData[i].Charges)).toFixed(2) + '</td>';
            let vPL = ((parseFloat(objTradeBook.TradeData[i].SellPrice) - parseFloat(objTradeBook.TradeData[i].BuyPrice)) * parseFloat(objTradeBook.TradeData[i].LotSize) * parseFloat(objTradeBook.TradeData[i].Qty)) - parseFloat(objTradeBook.TradeData[i].Charges);
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">'+ (vPL).toFixed(2) +'</td>';

            vTempHtml += '</tr>';
		}    	

        objTodayTradeList.innerHTML = vTempHtml;
    }
}

function fnClearLocalStorageTemp(){
	// console.log(localStorage.getItem("DeltaCurrFutPosiS"));
	// console.log(gCurrPos);
    localStorage.removeItem("DeltaCurrFutPosiS");
	localStorage.removeItem("TrdBkFut");
	localStorage.removeItem("StartQtyNoDelta");
	localStorage.removeItem("QtyMulDelta");
	localStorage.removeItem("TotLossAmtDelta");
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
    setInterval(timer, 1000);
}